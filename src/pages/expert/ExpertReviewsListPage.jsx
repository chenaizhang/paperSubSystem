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
  { label: '待审中', value: 'Assigned' },
  { label: '逾期', value: 'Overdue' },
  { label: '已完成', value: 'Completed' }
];

const statusLabelMap = {
  Assigned: '待审中',
  Overdue: '已逾期',
  Completed: '已完成',
  Pending: '待审中'
};

const statusColorMap = {
  Assigned: 'orange',
  Pending: 'orange',
  Overdue: 'red',
  Completed: 'green'
};

// 审稿结论中文映射
const conclusionLabelMap = {
  Accept: '接受',
  'Minor Revision': '小修',
  'Major Revision': '大修',
  'Not Reviewed': '未审稿',
  Reject: '拒稿'
};

const formatDate = (value, format = 'YYYY-MM-DD') =>
  value ? dayjs(value).format(format) : '—';

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
          <Table.Td>{assignment.title_zh || assignment.title_en || '—'}</Table.Td>
          <Table.Td>{formatDate(assignment.assigned_date)}</Table.Td>
          <Table.Td>{formatDate(assignment.assigned_due_date)}</Table.Td>
          <Table.Td>
            <Badge color={assignment.is_read ? 'green' : 'red'} variant="light">
              {assignment.is_read ? '已读' : '未读'}
            </Badge>
          </Table.Td>
          <Table.Td>{conclusionLabelMap[assignment.conclusion] || assignment.conclusion || '—'}</Table.Td>
          <Table.Td>
            <Badge color={statusColorMap[assignment.status] || 'gray'}>
              {statusLabelMap[assignment.status] || assignment.status || '待审中'}
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
        <Table.ScrollContainer minWidth={960}>
          <Table striped highlightOnHover withBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 90 }}>任务ID</Table.Th>
                <Table.Th style={{ width: 90 }}>论文ID</Table.Th>
                <Table.Th style={{ minWidth: 240 }}>论文标题</Table.Th>
                <Table.Th style={{ width: 140 }}>指派日期</Table.Th>
                <Table.Th style={{ width: 140 }}>截止日期</Table.Th>
                <Table.Th style={{ width: 120 }}>阅读状态</Table.Th>
                <Table.Th style={{ width: 120 }}>审稿结论</Table.Th>
                <Table.Th style={{ width: 120 }}>状态</Table.Th>
                <Table.Th style={{ width: 80 }}>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        {data?.length === 0 && <Text mt="md">暂无任务。</Text>}
      </Card>
    </Stack>
  );
}
