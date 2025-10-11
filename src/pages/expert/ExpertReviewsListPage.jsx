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
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '待处理', value: 'Pending' },
  { label: '已提交', value: 'Submitted' },
  { label: '逾期', value: 'Overdue' }
];

export default function ExpertReviewsListPage() {
  const [status, setStatus] = useState('all');
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['reviews', 'assignments', { status, keyword }],
    queryFn: async () => {
      const params = {};
      if (status !== 'all') params.status = status;
      if (keyword) params.keyword = keyword;
      const response = await api.get(endpoints.reviews.assignments, { params });
      return response.data ?? [];
    }
  });

  const rows = useMemo(
    () =>
      (data || []).map((assignment) => (
        <Table.Tr key={assignment.assignment_id}>
          <Table.Td>{assignment.assignment_id}</Table.Td>
          <Table.Td>{assignment.paper_id}</Table.Td>
          <Table.Td>{assignment.paper_title || assignment.title}</Table.Td>
          <Table.Td>
            {assignment.due_date ? dayjs(assignment.due_date).format('YYYY-MM-DD') : '—'}
          </Table.Td>
          <Table.Td>
            <Badge color={assignment.status === 'Submitted' ? 'green' : 'orange'}>
              {assignment.status || 'Pending'}
            </Badge>
          </Table.Td>
          <Table.Td>
            <ActionIcon
              variant="light"
              onClick={() => navigate(`/expert/reviews/${assignment.assignment_id}`)}
              aria-label="查看详情"
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
      <Title order={2}>审稿任务</Title>
      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay visible={isLoading || isFetching} overlayProps={{ blur: 2 }} />
        <Group gap="md" mb="md" wrap="wrap">
          <Select
            data={statusOptions}
            value={status}
            onChange={(value) => setStatus(value || 'all')}
            aria-label="按状态筛选"
          />
          <TextInput
            placeholder="搜索论文标题"
            value={keyword}
            onChange={(event) => setKeyword(event.currentTarget.value)}
            aria-label="按标题筛选"
          />
        </Group>
        <Table striped highlightOnHover withBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>任务ID</Table.Th>
              <Table.Th>论文ID</Table.Th>
              <Table.Th>标题</Table.Th>
              <Table.Th>截止日期</Table.Th>
              <Table.Th>状态</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
        {data?.length === 0 && <Text mt="md">暂无任务。</Text>}
      </Card>
    </Stack>
  );
}
