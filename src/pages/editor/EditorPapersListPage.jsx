import {
  ActionIcon,
  Badge,
  Card,
  Group,
  LoadingOverlay,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import dayjs from 'dayjs';

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '待初审', value: 'initial_review' },
  { label: '外审中', value: 'peer_review' },
  { label: '待修改', value: 'revision' },
  { label: '已录用', value: 'accepted' },
  { label: '已拒稿', value: 'rejected' },
  { label: '支付待确认', value: 'payment_pending' }
];

export default function EditorPapersListPage() {
  const [status, setStatus] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const navigate = useNavigate();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['papers', 'editor', { status, keyword, dateRange }],
    queryFn: async () => {
      const params = {};
      if (status !== 'all') params.status = status;
      if (keyword) params.keyword = keyword;
      if (dateRange[0]) params.start_date = dayjs(dateRange[0]).format('YYYY-MM-DD');
      if (dateRange[1]) params.end_date = dayjs(dateRange[1]).format('YYYY-MM-DD');
      const response = await api.get(endpoints.papers.base, { params });
      return response.data ?? [];
    }
  });

  const rows = useMemo(
    () =>
      (data || []).map((paper) => (
        <Table.Tr key={paper.paper_id || paper.id}>
          <Table.Td>{paper.paper_id || paper.id}</Table.Td>
          <Table.Td>{paper.title_zh || paper.title_en}</Table.Td>
          <Table.Td>
            {paper.submission_date ? dayjs(paper.submission_date).format('YYYY-MM-DD') : '—'}
          </Table.Td>
          <Table.Td>
            <Badge>{paper.status}</Badge>
          </Table.Td>
          <Table.Td>{paper.editor_assignee || '未分配'}</Table.Td>
          <Table.Td>
            <ActionIcon
              variant="light"
              onClick={() => navigate(`/editor/papers/${paper.paper_id || paper.id}`)}
              aria-label="查看稿件详情"
            >
              <IconEye size={18} />
            </ActionIcon>
          </Table.Td>
        </Table.Tr>
      )),
    [data, navigate]
  );

  return (
    <Stack>
      <Title order={2}>稿件管理</Title>
      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay visible={isLoading || isFetching} overlayProps={{ blur: 2 }} />
        <Group gap="md" mb="md" wrap="wrap">
          <Select
            data={statusOptions}
            value={status}
            onChange={(value) => setStatus(value || 'all')}
            aria-label="状态筛选"
          />
          <DatePickerInput
            type="range"
            value={dateRange}
            onChange={setDateRange}
            placeholder="提交日期"
          />
          <TextInput
            placeholder="搜索标题或作者"
            value={keyword}
            onChange={(event) => setKeyword(event.currentTarget.value)}
          />
        </Group>
        <Table striped highlightOnHover withBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>论文ID</Table.Th>
              <Table.Th>标题</Table.Th>
              <Table.Th>提交日期</Table.Th>
              <Table.Th>状态</Table.Th>
              <Table.Th>处理人</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
        {data?.length === 0 && <Text mt="md">暂无数据。</Text>}
      </Card>
    </Stack>
  );
}
