import {
  Badge,
  Button,
  Card,
  Group,
  LoadingOverlay,
  Modal,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconDownload, IconSend } from "@tabler/icons-react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios.js";
import { endpoints } from "../../api/endpoints.js";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { useForm, zodResolver } from "@mantine/form";
import { z } from "zod";
import { useDisclosure } from "@mantine/hooks";
import { useMemo, useState } from "react";
import {
  getIntegrityStatusColor,
  getIntegrityStatusLabel,
  isIntegrityWaiting,
} from "../../utils/integrityStatus.js";

const assignSchema = z.object({
  experts: z.array(z.string()).min(1, "请选择专家").max(3, "最多选择3位专家"),
  due_date: z.date({ required_error: "请选择截止日期" }),
});

const notificationSchema = z.object({
  type: z.string().min(1, "请选择通知类型"),
  deadline: z.date().optional(),
  title: z.string().min(1, "请输入标题"),
  content: z.string().min(1, "请输入通知内容"),
});

const notificationTypes = [
  { label: "录用通知", value: "Acceptance" },
  { label: "拒稿通知", value: "Rejection" },
  { label: "大修通知", value: "Major Revision" },
  { label: "审稿任务", value: "Review Assignment" },
  { label: "支付确认", value: "Payment Confirmation" },
];

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

  const { data: experts } = useQuery({
    queryKey: ["experts"],
    queryFn: async () => {
      const response = await api.get(endpoints.users.experts);
      return response.data ?? [];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["review-comments", paperId],
    queryFn: async () => {
      const response = await api.get(endpoints.reviews.comments(paperId));
      return response.data ?? [];
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["paper", paperId] });
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
      const requests = values.experts.map((expertId) =>
        api.post(endpoints.reviews.assign, {
          paper_id: Number(paperId),
          expert_id: Number(expertId),
          assigned_due_date: due,
        })
      );
      await Promise.all(requests);
    },
    onSuccess: () => {
      notifications.show({
        title: "分配成功",
        message: "已通知专家审稿",
        color: "green",
      });
      assignForm.reset();
      queryClient.invalidateQueries({ queryKey: ["review-comments", paperId] });
    },
  });

  const notificationForm = useForm({
    initialValues: {
      type: "Review Assignment",
      deadline: null,
      title: "",
      content: "",
    },
    validate: zodResolver(notificationSchema),
  });

  const notificationMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        type: values.type,
        title: values.title,
        content: values.content,
      };
      if (values.deadline) {
        payload.deadline = dayjs(values.deadline).toISOString();
      }
      const response = await api.post(endpoints.notifications.author, {
        ...payload,
        paper_id: Number(paperId),
      });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: "通知已发送",
        message: "作者会立即收到通知",
        color: "green",
      });
      notificationForm.reset();
      close();
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
    return list.map((item) => (Array.isArray(item) ? item[1] : item)).filter(Boolean);
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
      const resp = await api.get(endpoints.papers.download(paperId), { responseType: "blob" });
      const disposition =
        resp.headers["content-disposition"] || resp.headers["Content-Disposition"];
      const blob = resp.data;
      const mime = blob?.type || resp.headers["content-type"] || resp.headers["Content-Type"] || "";

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
        message: error?.response?.data?.message || error?.friendlyMessage || "文件下载失败",
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
          {paper?.title_en && (
            <Text size="sm" c="dimmed">
              英文标题：{paper.title_en}
            </Text>
          )}
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
            <Badge color="blue">{paper?.status}</Badge>
            {paper?.integrity && (
              <Badge color={getIntegrityStatusColor(paper.integrity)}>
                {getIntegrityStatusLabel(paper.integrity)}
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
            <Table striped withBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>项目名称</Table.Th>
                  <Table.Th>项目编号</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paper.funds.map((fund) => (
                  <Table.Tr key={fund.fund_id || `${fund.project_name}-${fund.project_number}`}>
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

      <Card withBorder shadow="sm">
        <Title order={4} mb="md">
          分配审稿专家
        </Title>
        <form
          onSubmit={assignForm.onSubmit((values) =>
            assignMutation.mutate(values)
          )}
        >
          <Stack gap="md">
            <MultiSelect
              label="选择专家（最多3位）"
              data={(experts || []).map((expert) => ({
                value: String(expert.expert_id || expert.id),
                label: `${expert.name} / ${expert.research_areas || ""}`,
              }))}
              value={assignForm.values.experts}
              onChange={(value) => assignForm.setFieldValue("experts", value)}
              searchable
              placeholder="输入姓名或研究方向"
              error={assignForm.errors.experts}
            />
            <DatePickerInput
              label="审稿截止日期"
              value={assignForm.values.due_date}
              onChange={(value) => assignForm.setFieldValue("due_date", value)}
              error={assignForm.errors.due_date}
              minDate={dayjs().add(1, "day").toDate()}
            />
            <Group justify="flex-end">
              <Button type="submit" loading={assignMutation.isPending}>
                分配审稿
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

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
                  {key}：{count}
                </Badge>
              ))}
            </Group>
          </Stack>
        )}
        <Table striped withBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>专家</Table.Th>
              <Table.Th>结论</Table.Th>
              <Table.Th>意见摘要</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(comments || []).map((comment) => (
              <Table.Tr key={comment.assignment_id}>
                <Table.Td>{comment.expert_name || comment.expert_id}</Table.Td>
                <Table.Td>{comment.conclusion}</Table.Td>
                <Table.Td>
                  <Text size="sm">{comment.positive_comments}</Text>
                  <Text size="sm" c="dimmed">
                    {comment.negative_comments}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {(comments || []).length === 0 && <Text mt="md">暂无审稿意见。</Text>}
      </Card>

      <Modal opened={opened} onClose={close} title="发送作者通知" size="lg">
        <form
          onSubmit={notificationForm.onSubmit((values) =>
            notificationMutation.mutate(values)
          )}
        >
          <Stack gap="md">
            <Select
              label="通知类型"
              data={notificationTypes}
              value={notificationForm.values.type}
              onChange={(value) =>
                notificationForm.setFieldValue(
                  "type",
                  value || "Review Assignment"
                )
              }
              error={notificationForm.errors.type}
            />
            <TextInput
              label="通知标题"
              {...notificationForm.getInputProps("title")}
            />
            <Textarea
              label="通知内容"
              minRows={4}
              {...notificationForm.getInputProps("content")}
            />
            <DatePickerInput
              label="截止时间（可选）"
              value={notificationForm.values.deadline}
              onChange={(value) =>
                notificationForm.setFieldValue("deadline", value)
              }
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
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
