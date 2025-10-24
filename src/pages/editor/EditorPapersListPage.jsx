import {
  ActionIcon,
  Badge,
  Card,
  Group,
  LoadingOverlay,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios.js";
import { endpoints } from "../../api/endpoints.js";
import dayjs from "dayjs";
import {
  PROGRESS_STATUS_FILTER_OPTIONS,
  getProgressStatusLabel,
} from "../../utils/progressStatus.js";
import {
  getIntegrityStatusColor,
  getIntegrityStatusLabel,
} from "../../utils/integrityStatus.js";

const ITEMS_PER_PAGE = 30;

export default function EditorPapersListPage() {
  const [status, setStatus] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [paperId, setPaperId] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const isPaperIdSearch = paperId.trim().length > 0;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["papers", "editor", { status, keyword, paperId, page }],
    keepPreviousData: true,
    queryFn: async () => {
      const params = {
        page,
        pageSize: ITEMS_PER_PAGE,
        sortBy: "paper_id",
        sortOrder: "DESC",
      };

      const trimmedId = paperId.trim();
      if (trimmedId) {
        const numericId = Number(trimmedId);
        if (!Number.isNaN(numericId)) {
          params.id = numericId;
        } else {
          return { items: [], total: 0, totalPages: 1, page: 1 };
        }
      } else {
        if (status !== "all") params.progress = status;
        const trimmedKeyword = keyword.trim();
        if (trimmedKeyword) params.search = trimmedKeyword;
      }

      const response = await api.get(endpoints.papers.base, { params });
      return response.data ?? {};
    },
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? page;

  useEffect(() => {
    setPage(1);
  }, [status, keyword, paperId]);

  const handlePaperIdChange = (event) => {
    const digitsOnly = event.currentTarget.value.replace(/\D/g, "");
    setPaperId(digitsOnly);
  };

  useEffect(() => {
    if (!data) return;
    const total = data.totalPages ?? 1;
    if (page > total) {
      setPage(total || 1);
    }
  }, [data, page]);

  const rows = useMemo(
    () =>
      items.map((paper) => (
        <Table.Tr key={paper.paper_id || paper.id}>
          <Table.Td>{paper.paper_id || paper.id}</Table.Td>
          <Table.Td>{paper.title_zh || paper.title_en}</Table.Td>
          <Table.Td>
            {paper.submission_date
              ? dayjs(paper.submission_date).format("YYYY-MM-DD")
              : "—"}
          </Table.Td>
          <Table.Td>
            {paper.update_date
              ? dayjs(paper.update_date).format("YYYY-MM-DD")
              : "—"}
          </Table.Td>
          <Table.Td>
            <Badge>
              {getProgressStatusLabel(paper.progress ?? paper.status)}
            </Badge>
          </Table.Td>
          <Table.Td>
            {paper.integrity ? (
              <Badge
                color={getIntegrityStatusColor(paper.integrity)}
                variant="light"
              >
                {getIntegrityStatusLabel(paper.integrity)}
              </Badge>
            ) : (
              "—"
            )}
          </Table.Td>
          <Table.Td>
            <ActionIcon
              variant="light"
              onClick={() =>
                navigate(`/editor/papers/${paper.paper_id || paper.id}`)
              }
              aria-label="查看稿件详情"
            >
              <IconEye size={18} />
            </ActionIcon>
          </Table.Td>
        </Table.Tr>
      )),
    [items, navigate]
  );

  return (
    <Stack>
      <Title order={2}>稿件管理</Title>
      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay
          visible={isLoading || isFetching}
          overlayProps={{ blur: 2 }}
        />
        <Group gap="md" mb="md" wrap="wrap">
          <TextInput
            placeholder="按论文ID搜索"
            value={paperId}
            onChange={handlePaperIdChange}
            aria-label="论文ID搜索"
            inputMode="numeric"
          />
          <Select
            data={PROGRESS_STATUS_FILTER_OPTIONS}
            value={status}
            onChange={(value) => setStatus(value || "all")}
            aria-label="进度筛选"
            disabled={isPaperIdSearch}
          />
          <TextInput
            placeholder="搜索标题或摘要"
            value={keyword}
            onChange={(event) => setKeyword(event.currentTarget.value)}
            aria-label="关键词搜索"
            disabled={isPaperIdSearch}
          />
        </Group>
        <Table striped highlightOnHover withBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>论文ID</Table.Th>
              <Table.Th>标题</Table.Th>
              <Table.Th>提交日期</Table.Th>
              <Table.Th>更新时间</Table.Th>
              <Table.Th>状态</Table.Th>
              <Table.Th>完整性</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
        {items.length === 0 && <Text mt="md">暂无数据。</Text>}
        {totalPages > 1 && (
          <Group justify="flex-end" mt="md">
            <Pagination total={totalPages} value={page} onChange={setPage} />
          </Group>
        )}
      </Card>
    </Stack>
  );
}
