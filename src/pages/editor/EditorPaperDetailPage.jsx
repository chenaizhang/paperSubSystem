import {
  Badge,
  Button,
  Card,
  Group,
  Highlight,
  LoadingOverlay,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  TextInput,
  Text,
  Title,
} from "@mantine/core";
import { DatePickerInput, DateTimePicker } from "@mantine/dates";
import { IconCheck, IconDownload, IconSend } from "@tabler/icons-react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios.js";
import { endpoints } from "../../api/endpoints.js";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { useForm, zodResolver } from "@mantine/form";
import { z } from "zod";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { useEffect, useMemo, useState } from "react";
import {
  getIntegrityStatusColor,
  getIntegrityStatusLabel,
  isIntegrityWaiting,
} from "../../utils/integrityStatus.js";
import {
  getProgressStatusLabel,
  getProgressStatusColor,
  normalizeProgressStatus,
} from "../../utils/progressStatus.js";

const assignSchema = z.object({
  experts: z.array(z.string()).length(3, "必须一次性选择3位专家"),
  due_date: z.date({ required_error: "请选择截止日期" }),
});

const notificationSchema = z
  .object({
    notification_type: z.string().min(1, "请选择通知类型"),
    deadline: z.date().optional().nullable(),
    amount: z.number().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.notification_type === "Acceptance Notification") {
      const amount = data.amount;
      if (amount === null || amount === undefined || Number.isNaN(amount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: "请输入支付金额",
        });
        return;
      }
      if (amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: "支付金额必须大于0",
        });
      }
    }
  });

const scheduleSchema = z.object({
  issue_number: z.string().trim().min(1, "请输入期号"),
  volume_number: z.string().trim().min(1, "请输入卷号"),
  page_number: z.string().trim().min(1, "请输入页码"),
});

const notificationTypes = [
  { label: "录用通知", value: "Acceptance Notification" },
  { label: "拒稿通知", value: "Rejection Notification" },
  { label: "大修通知", value: "Major Revision" },
  { label: "支付确认", value: "Payment Confirmation" },
];

const mapExpertToOption = (expert) => {
  if (!expert) {
    return null;
  }
  const id = expert.expert_id ?? expert.id ?? expert.user_id ?? expert.userId;
  if (id === undefined || id === null) {
    return null;
  }
  const value = String(id);
  if (!value) {
    return null;
  }
  const rawName =
    expert.name ??
    expert.expert_name ??
    expert.full_name ??
    expert.username ??
    "";
  const name = String(rawName || `专家 ${value}`);
  const researchAreas =
    expert.research_areas ??
    expert.researchAreas ??
    expert.research_area ??
    expert.field ??
    expert.fields ??
    "";
  const title =
    expert.title ?? expert.job_title ?? expert.position ?? expert.role ?? "";
  const detailParts = [title, researchAreas]
    .map((part) => (part ? String(part).trim() : ""))
    .filter((part) => part.length > 0);
  return {
    value,
    label: name,
    detail: detailParts.join(" · "),
    id,
  };
};

// 审稿结论中文映射
const conclusionLabelMap = {
  Accept: "接受",
  "Minor Revision": "小修",
  "Major Revision": "大修",
  Reject: "拒稿",
  "Not Reviewed": "未审稿",
};

export default function EditorPaperDetailPage() {
  const { paperId } = useParams();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: paper, isLoading } = useQuery({
    queryKey: ["paper", paperId],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.detail(paperId));
      return response.data;
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["review-comments", paperId],
    queryFn: async () => {
      const response = await api.get(endpoints.reviews.comments(paperId));
      return response.data ?? [];
    },
  });
  const { data: assignmentInfo, isLoading: isAssignmentInfoLoading } = useQuery(
    {
      queryKey: ["paper-experts", paperId],
      enabled: Boolean(paperId),
      queryFn: async () => {
        const response = await api.get(endpoints.reviews.paperExperts(paperId));
        return response.data;
      },
    }
  );
  const assignedExperts = assignmentInfo?.experts ?? [];
  const [expertSearch, setExpertSearch] = useState("");
  const [debouncedExpertSearch] = useDebouncedValue(expertSearch, 300);
  const normalizedExpertSearch = debouncedExpertSearch.trim();
  const { data: searchedExperts = [], isFetching: isSearchingExperts } =
    useQuery({
      queryKey: ["search-experts", normalizedExpertSearch],
      enabled: normalizedExpertSearch.length > 0,
      queryFn: async () => {
        const response = await api.get(endpoints.users.searchExperts, {
          params: {
            query: normalizedExpertSearch,
            page: 1,
            limit: 10,
          },
        });
        const payload = response.data;
        if (Array.isArray(payload?.experts)) {
          return payload.experts;
        }
        if (Array.isArray(payload)) {
          return payload;
        }
        return [];
      },
    });
  const assignedExpertOptions = useMemo(() => {
    if (!Array.isArray(assignedExperts)) {
      return [];
    }
    const map = new Map();
    assignedExperts.forEach((expert) => {
      const option = mapExpertToOption(expert);
      if (option && !map.has(option.value)) {
        map.set(option.value, { ...option, source: "assigned" });
      }
    });
    return Array.from(map.values());
  }, [assignedExperts]);
  const searchedExpertOptions = useMemo(() => {
    if (!Array.isArray(searchedExperts)) {
      return [];
    }
    const map = new Map();
    searchedExperts.forEach((expert) => {
      const option = mapExpertToOption(expert);
      if (option && !map.has(option.value)) {
        map.set(option.value, { ...option, source: "search" });
      }
    });
    return Array.from(map.values());
  }, [searchedExperts]);
  const expertOptions = useMemo(() => {
    const map = new Map();
    assignedExpertOptions.forEach((option) => map.set(option.value, option));
    searchedExpertOptions.forEach((option) => map.set(option.value, option));
    return Array.from(map.values());
  }, [assignedExpertOptions, searchedExpertOptions]);
  const highlightTerms = useMemo(() => {
    const trimmed = expertSearch.trim();
    return trimmed.length > 0 ? trimmed.split(/\s+/).filter(Boolean) : [];
  }, [expertSearch]);

  const normalizedProgress = normalizeProgressStatus(paper?.progress);
  const isSchedulingStage = normalizedProgress === "Scheduling";

  const integrityMutation = useMutation({
    mutationFn: async (integrity) => {
      const response = await api.put(endpoints.papers.integrity(paperId), {
        integrity,
      });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: "更新成功",
        message: "形式审查状态已更新",
        color: "green",
      });
      // 使相关查询失效并立即刷新，确保无需手动刷新即可分配审稿
      queryClient.invalidateQueries({ queryKey: ["paper", paperId] });
      queryClient.invalidateQueries({ queryKey: ["paper-experts", paperId] });
      queryClient.refetchQueries({ queryKey: ["paper-experts", paperId] });
    },
    onError: (error) => {
      notifications.show({
        title: "更新失败",
        message:
          error?.response?.data?.message ||
          error?.friendlyMessage ||
          "无法更新形式审查状态",
        color: "red",
      });
    },
  });

  const assignForm = useForm({
    initialValues: {
      experts: [],
      due_date: null,
    },
    validate: zodResolver(assignSchema),
  });

  const assignMutation = useMutation({
    mutationFn: async (values) => {
      const due = dayjs(values.due_date).format("YYYY-MM-DD");
      const payload = values.experts.map((expertId) => ({
        paper_id: Number(paperId),
        expert_id: Number(expertId),
        assigned_due_date: due,
      }));
      await api.post(endpoints.reviews.assignments, payload);
    },
    onSuccess: () => {
      notifications.show({
        title: "分配成功",
        message: "已通知专家审稿",
        color: "green",
      });
      assignForm.reset();
      setExpertSearch("");
      queryClient.invalidateQueries({ queryKey: ["review-comments", paperId] });
      queryClient.invalidateQueries({ queryKey: ["paper-experts", paperId] });
    },
    onError: (error) => {
      notifications.show({
        title: "分配失败",
        message:
          error?.response?.data?.message ||
          error?.friendlyMessage ||
          "无法分配审稿任务，请稍后再试",
        color: "red",
      });
    },
  });

  const scheduleForm = useForm({
    initialValues: {
      issue_number: "",
      volume_number: "",
      page_number: "",
    },
    validate: zodResolver(scheduleSchema),
  });

  const scheduleMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        paper_id: Number(paperId),
        issue_number: values.issue_number.trim(),
        volume_number: values.volume_number.trim(),
        page_number: values.page_number.trim(),
      };
      const response = await api.post(endpoints.schedules.base, payload);
      return response.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: "排期已创建",
        message: data?.message || "最终期号、卷号、页码已保存",
        color: "green",
      });
      scheduleForm.reset();
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["paper", paperId] });
    },
    onError: (error) => {
      const errors =
        error?.response?.data?.errors ||
        error?.response?.data?.data ||
        error?.response?.data?.fieldErrors ||
        null;
      if (errors && typeof errors === "object") {
        scheduleForm.setErrors(errors);
      }
      notifications.show({
        title: "创建排期失败",
        message:
          error?.response?.data?.message ||
          error?.friendlyMessage ||
          "无法创建排期，请稍后再试",
        color: "red",
      });
    },
  });

  const notificationForm = useForm({
    initialValues: {
      notification_type: "Acceptance Notification",
      deadline: null,
      amount: null,
    },
    validate: zodResolver(notificationSchema),
  });

  useEffect(() => {
    if (
      notificationForm.values.notification_type !== "Acceptance Notification" &&
      notificationForm.values.amount !== null
    ) {
      notificationForm.setFieldValue("amount", null);
    }
  }, [notificationForm.values.notification_type, notificationForm.values.amount]);

  const notificationMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        paper_id: Number(paperId),
        notification_type: values.notification_type,
      };
      if (
        values.deadline instanceof Date &&
        !Number.isNaN(values.deadline.getTime())
      ) {
        payload.deadline = dayjs(values.deadline).format("YYYY-MM-DD HH:mm:ss");
      }
      if (values.notification_type === "Acceptance Notification") {
        await api.post(endpoints.payments.base, {
          paper_id: Number(paperId),
          amount: values.amount,
        });
      }
      const response = await api.post(endpoints.notifications.author, payload);
      return response.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: "通知已发送",
        message: data?.message || "作者会立即收到通知",
        color: "green",
      });
      notificationForm.reset();
      close();
    },
    onError: (error) => {
      notifications.show({
        title: "发送失败",
        message:
          error?.response?.data?.message ||
          error?.friendlyMessage ||
          "无法发送通知，请稍后再试",
        color: "red",
      });
    },
  });

  const aggregatedConclusion = useMemo(() => {
    const summary = {
      Accept: 0,
      "Minor Revision": 0,
      "Major Revision": 0,
      Reject: 0,
    };
    (comments || []).forEach((comment) => {
      if (summary[comment.conclusion] !== undefined) {
        summary[comment.conclusion] += 1;
      }
    });
    const entries = Object.entries(summary).filter(([, count]) => count > 0);
    return entries.length > 0 ? entries : null;
  }, [comments]);

  const normalizeKeywords = (list) => {
    if (!Array.isArray(list)) return [];
    return list
      .map((item) => (Array.isArray(item) ? item[1] : item))
      .filter(Boolean);
  };

  const handleDownload = async () => {
    const parseFilename = (disposition) => {
      if (!disposition) return null;
      const star = /filename\*=(?:UTF-8''|)([^;\n]+)/i.exec(disposition);
      if (star && star[1]) {
        try {
          return decodeURIComponent(star[1].replace(/\"/g, "").trim());
        } catch (_) {
          return star[1].replace(/\"/g, "").trim();
        }
      }
      const normal = /filename=("?)([^";\n]+)\1/i.exec(disposition);
      if (normal && normal[2]) return normal[2].trim();
      return null;
    };
    const extFromMime = (mime) => {
      const m = (mime || "").toLowerCase();
      if (m.includes("pdf")) return "pdf";
      if (m.includes("msword")) return "doc";
      if (m.includes("officedocument.wordprocessingml.document")) return "docx";
      if (m.includes("zip")) return "zip";
      if (m.includes("rar")) return "rar";
      if (m.includes("7z")) return "7z";
      if (m.includes("jpeg")) return "jpg";
      if (m.includes("jpg")) return "jpg";
      if (m.includes("png")) return "png";
      if (m.includes("gif")) return "gif";
      if (m.includes("plain")) return "txt";
      return "bin";
    };

    try {
      setIsDownloading(true);
      const resp = await api.get(endpoints.papers.download(paperId), {
        responseType: "blob",
      });
      const disposition =
        resp.headers["content-disposition"] ||
        resp.headers["Content-Disposition"];
      const blob = resp.data;
      const mime =
        blob?.type ||
        resp.headers["content-type"] ||
        resp.headers["Content-Type"] ||
        "";

      let filename = parseFilename(disposition) || `paper-${paperId}`;
      if (!/\.[a-z0-9]+$/i.test(filename)) {
        const ext = extFromMime(mime);
        filename = `${filename}.${ext}`;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      notifications.show({
        title: "下载失败",
        message:
          error?.response?.data?.message ||
          error?.friendlyMessage ||
          "文件下载失败",
        color: "red",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2}>
            {paper?.title_zh || paper?.title_en || "稿件详情"}
          </Title>
          <Text size="sm" c="dimmed">
            提交日期：
            {paper?.submission_date
              ? dayjs(paper.submission_date).format("YYYY-MM-DD")
              : "—"}
          </Text>
        </div>
        <Button
          leftSection={<IconDownload size={16} />}
          onClick={handleDownload}
          loading={isDownloading}
          disabled={isLoading || !paper}
        >
          下载附件
        </Button>
      </Group>

      <Card withBorder shadow="sm" radius="md">
        <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
        <Stack gap="md">
          <Group gap="xs">
            {paper && (
              <Badge
                color={getProgressStatusColor(paper.progress)}
                variant="light"
              >
                {getProgressStatusLabel(paper.progress)}
              </Badge>
            )}
          </Group>
          <Text fw={600}>中文标题</Text>
          <Text>{paper?.title_zh || "—"}</Text>
          <Text fw={600}>英文标题</Text>
          <Text>{paper?.title_en || "—"}</Text>
          <Text fw={600}>摘要</Text>
          <Text>{paper?.abstract_zh || "—"}</Text>
          <Text fw={600}>英文摘要</Text>
          <Text>{paper?.abstract_en || "—"}</Text>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Stack gap={4}>
              <Text fw={600}>中文关键词</Text>
              <Group gap="xs">
                {normalizeKeywords(paper?.keywords_zh).map((keyword, idx) => (
                  <Badge key={`zh-${idx}`} color="blue" variant="light">
                    {keyword}
                  </Badge>
                ))}
                {normalizeKeywords(paper?.keywords_zh).length === 0 && (
                  <Text c="dimmed">—</Text>
                )}
              </Group>
            </Stack>
            <Stack gap={4}>
              <Text fw={600}>英文关键词</Text>
              <Group gap="xs">
                {normalizeKeywords(paper?.keywords_en).map((keyword, idx) => (
                  <Badge key={`en-${idx}`} color="grape" variant="light">
                    {keyword}
                  </Badge>
                ))}
                {normalizeKeywords(paper?.keywords_en).length === 0 && (
                  <Text c="dimmed">—</Text>
                )}
              </Group>
            </Stack>
          </SimpleGrid>
          <Text fw={600}>资助资金</Text>
          {Array.isArray(paper?.funds) && paper.funds.length > 0 ? (
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>项目名称</Table.Th>
                  <Table.Th>项目编号</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paper.funds.map((fund) => (
                  <Table.Tr
                    key={
                      fund.fund_id ||
                      `${fund.project_name}-${fund.project_number}`
                    }
                  >
                    <Table.Td>{fund.project_name || "—"}</Table.Td>
                    <Table.Td>{fund.project_number || "—"}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Text>—</Text>
          )}
          <Text fw={600}>作者</Text>
          <Stack gap={4}>
            {(paper?.authors || []).map((author) => (
              <Text key={`${author.author_id}-${author.institution_id}`}>
                {author.name} / {author.institution_name}
              </Text>
            ))}
            {(paper?.authors || []).length === 0 && <Text c="dimmed">—</Text>}
          </Stack>
        </Stack>
      </Card>

      <Card withBorder shadow="sm">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={4}>形式完整性检查</Title>
              <Text size="sm" c="dimmed">
                确认稿件是否符合投稿模板、材料完整等要求
              </Text>
              {paper?.check_time && (
                <Text size="xs" c="dimmed">
                  最近检查：{dayjs(paper.check_time).format("YYYY-MM-DD HH:mm")}
                </Text>
              )}
            </div>
            {paper?.integrity && (
              <Badge color={getIntegrityStatusColor(paper.integrity)}>
                {getIntegrityStatusLabel(paper.integrity)}
              </Badge>
            )}
          </Group>
          {isIntegrityWaiting(paper?.integrity) ? (
            <Group justify="flex-end">
              <Button
                color="green"
                loading={integrityMutation.isPending}
                onClick={() => integrityMutation.mutate("True")}
              >
                审核通过
              </Button>
              <Button
                color="red"
                variant="outline"
                loading={integrityMutation.isPending}
                onClick={() => integrityMutation.mutate("False")}
              >
                审核拒绝
              </Button>
            </Group>
          ) : (
            <Text size="sm" c="dimmed">
              当前状态：{getIntegrityStatusLabel(paper?.integrity)}
            </Text>
          )}
        </Stack>
      </Card>

      <Card withBorder shadow="sm" pos="relative">
        <LoadingOverlay
          visible={isAssignmentInfoLoading}
          overlayProps={{ blur: 2 }}
        />
        <Title order={4} mb="md">
          分配审稿专家
        </Title>
        {!isAssignmentInfoLoading && assignmentInfo?.editable === false && (
          <Text size="sm" c="dimmed" mb="sm">
            当前论文不允许继续分配审稿专家。
          </Text>
        )}
        <form
          onSubmit={assignForm.onSubmit((values) =>
            assignMutation.mutate(values)
          )}
        >
          <Stack gap="md">
            <MultiSelect
              label="选择专家（需选择3位）"
              data={expertOptions}
              searchValue={expertSearch}
              onSearchChange={(value) => setExpertSearch(value || "")}
              value={assignForm.values.experts}
              onChange={(value) => assignForm.setFieldValue("experts", value)}
              searchable
              placeholder="输入专家ID、姓名或研究领域"
              error={assignForm.errors.experts}
              maxValues={3}
              nothingFound={
                expertSearch.trim().length > 0
                  ? "未找到相关专家"
                  : "请输入ID、姓名或研究领域搜索"
              }
              loading={isSearchingExperts}
              withCheckIcon={false}
              filter={({ options, search }) => {
                if (!search) {
                  return options;
                }
                const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
                if (terms.length === 0) {
                  return options;
                }
                return options.filter((option) => {
                  if (option.source === "search") {
                    return true;
                  }
                  const haystack = [
                    option.label,
                    option.detail,
                    option.id ? `#${option.id}` : "",
                  ]
                    .join(" ")
                    .toLowerCase();
                  return terms.every((term) => haystack.includes(term));
                });
              }}
              renderOption={({ option, checked }) => (
                <Group
                  justify="space-between"
                  gap="sm"
                  wrap="nowrap"
                  style={{ width: "100%" }}
                >
                  <div>
                    <Highlight highlight={highlightTerms}>
                      {option.label}
                    </Highlight>
                    {option.detail && (
                      <Text size="xs" c="dimmed">
                        <Highlight highlight={highlightTerms}>
                          {option.detail}
                        </Highlight>
                      </Text>
                    )}
                  </div>
                  <Group gap={4} wrap="nowrap">
                    {option.id !== undefined && option.id !== null && (
                      <Badge size="xs" variant="light">
                        #{option.id}
                      </Badge>
                    )}
                    {checked && <IconCheck size={14} />}
                  </Group>
                </Group>
              )}
              disabled={
                isAssignmentInfoLoading ||
                assignmentInfo?.editable === false ||
                assignMutation.isPending
              }
            />
            <DatePickerInput
              label="审稿截止日期"
              value={assignForm.values.due_date}
              onChange={(value) => assignForm.setFieldValue("due_date", value)}
              error={assignForm.errors.due_date}
              minDate={dayjs().add(1, "day").toDate()}
              disabled={
                isAssignmentInfoLoading ||
                assignmentInfo?.editable === false ||
                assignMutation.isPending
              }
            />
            <Group justify="flex-end">
              <Button
                type="submit"
                loading={assignMutation.isPending}
                disabled={
                  isAssignmentInfoLoading ||
                  assignmentInfo?.editable === false ||
                  assignForm.values.experts.length !== 3 ||
                  !assignForm.values.due_date
                }
              >
                分配审稿
              </Button>
            </Group>
          </Stack>
        </form>
        {assignedExperts.length > 0 && (
          <Stack gap="xs" mt="md">
            <Text size="sm" fw={600}>
              已分配专家
            </Text>
            {assignedExperts.map((assignment) => (
              <Text
                size="sm"
                key={assignment.assignment_id || assignment.expert_id}
              >
                {assignment.expert_name || assignment.expert_id}（截止：
                {assignment.assigned_due_date
                  ? dayjs(assignment.assigned_due_date).format("YYYY-MM-DD")
                  : "—"}
                ）
              </Text>
            ))}
          </Stack>
        )}
      </Card>

      {isSchedulingStage && (
        <Card withBorder shadow="sm" pos="relative">
          <Title order={4} mb="sm">
            创建论文排期
          </Title>
          <Text size="sm" c="dimmed" mb="md">
            填写期号、卷号与页码，确认稿件的最终出版信息。
          </Text>
          <form
            onSubmit={scheduleForm.onSubmit((values) =>
              scheduleMutation.mutate(values)
            )}
          >
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, md: 3 }}>
                <TextInput
                  label="期号"
                  placeholder="例如：2024年第5期"
                  withAsterisk
                  disabled={scheduleMutation.isPending}
                  {...scheduleForm.getInputProps("issue_number")}
                />
                <TextInput
                  label="卷号"
                  placeholder="例如：第12卷"
                  withAsterisk
                  disabled={scheduleMutation.isPending}
                  {...scheduleForm.getInputProps("volume_number")}
                />
                <TextInput
                  label="页码"
                  placeholder="例如：123-135"
                  withAsterisk
                  disabled={scheduleMutation.isPending}
                  {...scheduleForm.getInputProps("page_number")}
                />
              </SimpleGrid>
              <Group justify="flex-end">
                <Button
                  type="submit"
                  loading={scheduleMutation.isPending}
                  disabled={scheduleMutation.isPending}
                >
                  保存排期
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>
      )}

      <Card withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <Title order={4}>审稿意见</Title>
          <Button
            variant="light"
            onClick={open}
            leftSection={<IconSend size={16} />}
          >
            发送通知
          </Button>
        </Group>
        {aggregatedConclusion && (
          <Stack gap="xs" mb="md">
            <Text fw={600}>结论投票结果</Text>
            <Group gap="sm">
              {aggregatedConclusion.map(([key, count]) => (
                <Badge key={key} color="blue" variant="light">
                  {conclusionLabelMap[key] || key}：{count}
                  {"人"}
                </Badge>
              ))}
            </Group>
          </Stack>
        )}
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>专家</Table.Th>
              <Table.Th>结论</Table.Th>
              <Table.Th>意见详情</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(comments || []).map((comment) => (
              <Table.Tr key={comment.assignment_id}>
                <Table.Td>
                  <Text size="sm">
                    {comment.expert_name || comment.expert_id}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {"审稿时间: "}
                    {comment.submission_date
                      ? dayjs(comment.submission_date).format(
                          "YYYY-MM-DD HH:mm"
                        )
                      : "—"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {conclusionLabelMap[comment.conclusion] || comment.conclusion}
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    <Text span c="dimmed">
                      正面意见：
                    </Text>
                    {comment.positive_comments || "—"}
                  </Text>
                  <Text size="sm">
                    <Text span c="dimmed">
                      负面意见：
                    </Text>
                    {comment.negative_comments || "—"}
                  </Text>
                  <Text size="sm">
                    <Text span c="dimmed">
                      修改建议：
                    </Text>
                    {comment.modification_advice || "—"}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {(comments || []).length === 0 && <Text mt="md">暂无审稿意见。</Text>}
      </Card>

      <Modal
        opened={opened}
        onClose={() => {
          notificationForm.reset();
          close();
        }}
        title="发送作者通知"
        size="lg"
      >
        <form
          onSubmit={notificationForm.onSubmit((values) =>
            notificationMutation.mutate(values)
          )}
        >
          <Stack gap="md">
            <Select
              label="通知类型"
              data={notificationTypes}
              value={notificationForm.values.notification_type}
              onChange={(value) =>
                notificationForm.setFieldValue(
                  "notification_type",
                  value || "Acceptance Notification"
                )
              }
              placeholder="请选择要发送的通知类型"
              error={notificationForm.errors.notification_type}
            />
            <DateTimePicker
              label="截止时间（可选）"
              valueFormat="YYYY-MM-DD HH:mm"
              clearable
              value={notificationForm.values.deadline}
              onChange={(value) =>
                notificationForm.setFieldValue("deadline", value)
              }
            />
            {notificationForm.values.notification_type ===
              "Acceptance Notification" && (
              <NumberInput
                label="支付金额"
                placeholder="请输入版面费金额"
                min={0}
                step={0.01}
                value={notificationForm.values.amount ?? undefined}
                onChange={(value) =>
                  notificationForm.setFieldValue(
                    "amount",
                    typeof value === "number" ? value : null
                  )
                }
                error={notificationForm.errors.amount}
                hideControls
              />
            )}
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => {
                  notificationForm.reset();
                  close();
                }}
              >
                取消
              </Button>
              <Button type="submit" loading={notificationMutation.isPending}>
                发送
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
