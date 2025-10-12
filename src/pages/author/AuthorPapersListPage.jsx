/**
 * 文稿列表页负责列表查询、条件筛选与跳转，不在组件内持久化状态。
 * 与后端约定：GET /api/papers 返回的字段中，作者仅能看到自己的稿件。
 */
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  HoverCard,
  LoadingOverlay,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { DatePickerInput } from "@mantine/dates";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import api from "../../api/axios.js";
import { endpoints } from "../../api/endpoints.js";
import {
  deriveCurrentStage,
  mapProgressToStages,
} from "../../utils/paperProgress.js";
import {
  REVIEW_STATUS_OPTIONS,
  getReviewStatusLabel,
  getReviewStatusColor,
} from "../../utils/reviewStatus.js";

export default function AuthorPapersListPage() {
  // 三类筛选条件：评审意见、关键字、时间区间
  const [status, setStatus] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [dateRange, setDateRange] = useState([null, null]);
  const navigate = useNavigate();

  /**
   * 列表查询与筛选：依赖数组包含筛选条件，React Query 会自动做缓存和增量刷新。
   * 注意：后端分页能力未在文档体现，如需支持可在 params 中加 page/pageSize。
   */
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["papers", "author", { status, keyword, dateRange }],
    queryFn: async () => {
      const params = {};
      if (status !== "all") params.status = status;
      if (keyword) params.keyword = keyword;
      if (dateRange[0])
        params.start_date = dayjs(dateRange[0]).format("YYYY-MM-DD");
      if (dateRange[1])
        params.end_date = dayjs(dateRange[1]).format("YYYY-MM-DD");
      const response = await api.get(endpoints.papers.base, { params });
      return response.data ?? [];
    },
  });

  const {
    data: progressList,
    isLoading: isProgressLoading,
    error: progressError,
  } = useQuery({
    queryKey: ["papers", "progress", "author"],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.progressList);
      return response.data ?? [];
    },
  });

  const progressIndex = useMemo(() => {
    const map = new Map();
    (progressList || []).forEach((progress) => {
      const paperId = progress.paper_id ?? progress.id;
      if (paperId === undefined || paperId === null) {
        return;
      }
      const stages = mapProgressToStages(progress);
      const activeStage =
        stages.find((stage) => stage.status !== "finished") ||
        stages[stages.length - 1];
      map.set(String(paperId), {
        currentStage: deriveCurrentStage(progress),
        currentStageStatus: activeStage?.statusText,
        currentStageColor: activeStage?.color || "blue",
      });
    });
    return map;
  }, [progressList]);

  /**
   * 将接口数据映射成表格行：保持纯函数式，以便 React 在查询更新时最小化 diff。
   * 处理 paper_id/id 混用，以兼容旧数据。
   */
  const rows = useMemo(() => {
    return (data || []).map((paper) => {
      const paperId = paper.paper_id || paper.id;
      const progress =
        paperId !== undefined ? progressIndex.get(String(paperId)) : undefined;
      const stageLabel =
        progress?.currentStage || paper.current_stage || "待更新";
      const stageStatus = progress?.currentStageStatus;
      const stageColor = progress?.currentStageColor || "gray";

      return (
        <Table.Tr key={paperId}>
          <Table.Td>{paperId}</Table.Td>
          <Table.Td>
            <Stack gap={4}>
              <Text fw={600}>{paper.title_zh}</Text>
              {paper.title_en && (
                <HoverCard width={320} shadow="sm">
                  <HoverCard.Target>
                    <Text size="sm" c="blue">
                      英文标题
                    </Text>
                  </HoverCard.Target>
                  <HoverCard.Dropdown>
                    <Text size="sm">{paper.title_en}</Text>
                  </HoverCard.Dropdown>
                </HoverCard>
              )}
            </Stack>
          </Table.Td>
          <Table.Td>
            {paper.submission_date
              ? dayjs(paper.submission_date).format("YYYY-MM-DD")
              : "—"}
          </Table.Td>
          <Table.Td>
            <Badge color={getReviewStatusColor(paper.status)}>
              {getReviewStatusLabel(paper.status)}
            </Badge>
          </Table.Td>
          <Table.Td>
            <Stack gap={4}>
              <Text size="sm">{stageLabel}</Text>
              {stageStatus && (
                <Badge size="sm" variant="light" color={stageColor}>
                  {stageStatus}
                </Badge>
              )}
            </Stack>
          </Table.Td>
          <Table.Td>
            <ActionIcon
              variant="light"
              onClick={() => navigate(`/author/papers/${paperId}`)}
              aria-label="查看详情"
            >
              <IconEye size={18} />
            </ActionIcon>
          </Table.Td>
        </Table.Tr>
      );
    });
  }, [data, navigate, progressIndex]);

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Title order={2}>我的论文</Title>
        <Button onClick={() => navigate("/author/papers/new")}>投稿</Button>
      </Group>
      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay
          visible={isLoading || isFetching || isProgressLoading}
          overlayProps={{ blur: 2 }}
        />
        <Group mb="md" wrap="wrap" gap="md">
          <Select
            data={REVIEW_STATUS_OPTIONS}
            value={status}
            onChange={(value) => setStatus(value || "all")}
            aria-label="按评审意见筛选"
          />
          <DatePickerInput
            type="range"
            value={dateRange}
            onChange={setDateRange}
            placeholder="提交时间范围"
            aria-label="按提交时间筛选"
          />
          <TextInput
            placeholder="搜索关键词"
            value={keyword}
            onChange={(event) => setKeyword(event.currentTarget.value)}
            aria-label="按关键词筛选"
          />
        </Group>
        <Table
          striped
          highlightOnHover
          withBorder
          horizontalSpacing="md"
          verticalSpacing="sm"
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>标题</Table.Th>
              <Table.Th>提交日期</Table.Th>
              <Table.Th>评审意见</Table.Th>
              <Table.Th>当前进度</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
        {progressError && (
          <Text size="sm" c="red" mt="sm">
            无法获取最新进度，列表中显示的阶段基于已有数据。
          </Text>
        )}
        {data?.length === 0 && <Text mt="md">暂无数据，去提交论文。</Text>}
      </Card>
    </Stack>
  );
}
