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
  Title
} from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '待初审', value: 'initial_review' },
  { label: '外审中', value: 'peer_review' },
  { label: '修改中', value: 'revision' },
  { label: '录用', value: 'accepted' },
  { label: '拒稿', value: 'rejected' },
  { label: '支付完成', value: 'paid' }
];

export default function AuthorPapersListPage() {
  const [status, setStatus] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const navigate = useNavigate();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['papers', 'author', { status, keyword, dateRange }],
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
        <Table.Tr key={paper.id || paper.paper_id}>
          <Table.Td>{paper.paper_id || paper.id}</Table.Td>
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
              ? dayjs(paper.submission_date).format('YYYY-MM-DD')
              : '—'}
          </Table.Td>
          <Table.Td>
            <Badge>{paper.status || '未知'}</Badge>
          </Table.Td>
          <Table.Td>{paper.current_stage || '待更新'}</Table.Td>
          <Table.Td>
            <ActionIcon
              variant="light"
              onClick={() => navigate(`/author/papers/${paper.paper_id || paper.id}`)}
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
    <Stack gap="xl">
      <Group justify="space-between">
        <Title order={2}>我的论文</Title>
        <Button onClick={() => navigate('/author/papers/new')}>提交新论文</Button>
      </Group>
      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay visible={isLoading || isFetching} overlayProps={{ blur: 2 }} />
        <Group mb="md" wrap="wrap" gap="md">
          <Select
            data={statusOptions}
            value={status}
            onChange={(value) => setStatus(value || 'all')}
            aria-label="按状态筛选"
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
        <Table striped highlightOnHover withBorder horizontalSpacing="md" verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>标题</Table.Th>
              <Table.Th>提交日期</Table.Th>
              <Table.Th>状态</Table.Th>
              <Table.Th>当前进度</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
        {data?.length === 0 && <Text mt="md">暂无数据，去提交论文。</Text>}
      </Card>
    </Stack>
  );
}
