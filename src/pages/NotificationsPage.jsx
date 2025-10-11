import {
  Badge,
  Button,
  Card,
  Group,
  LoadingOverlay,
  Pagination,
  Select,
  Stack,
  Text,
  Title
} from '@mantine/core';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios.js';
import { endpoints } from '../api/endpoints.js';
import dayjs from 'dayjs';

const readOptions = [
  { label: '全部', value: 'all' },
  { label: '未读', value: 'unread' },
  { label: '已读', value: 'read' }
];

const typeOptions = [
  { label: '全部类型', value: 'all' },
  { label: '审稿通知', value: 'Review Assignment' },
  { label: '录用通知', value: 'Acceptance' },
  { label: '退修通知', value: 'Major Revision' },
  { label: '支付确认', value: 'Payment Confirmation' },
  { label: '拒稿通知', value: 'Rejection' }
];

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['notifications', page, type, readFilter],
    queryFn: async () => {
      const params = {
        page,
        pageSize: 10
      };
      if (type !== 'all') params.type = type;
      if (readFilter !== 'all') params.read = readFilter === 'read';
      const response = await api.get(endpoints.notifications.author, { params });
      return response.data;
    },
    keepPreviousData: true
  });

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(endpoints.notifications.markRead(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    }
  });

  const notifications = data?.items || data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <Stack>
      <Title order={2}>通知中心</Title>
      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay visible={isLoading || isFetching} overlayProps={{ blur: 2 }} />
        <Group align="center" justify="space-between" mb="md">
          <Group align="center">
            <Select
              data={typeOptions}
              value={type}
              onChange={(value) => {
                setType(value || 'all');
                setPage(1);
              }}
              aria-label="通知类型筛选"
            />
            <Select
              data={readOptions}
              value={readFilter}
              onChange={(value) => {
                setReadFilter(value || 'all');
                setPage(1);
              }}
              aria-label="通知是否已读筛选"
            />
          </Group>
        </Group>
        <Stack gap="sm">
          {notifications.length === 0 && (
            <Card shadow="xs" withBorder>
              <Text>暂无通知，去提交论文或等待系统通知。</Text>
            </Card>
          )}
          {notifications.map((item) => (
            <Card key={item.id} withBorder shadow="xs">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Title order={4}>{item.title || item.type}</Title>
                  <Badge color={item.read ? 'gray' : 'blue'}>
                    {item.read ? '已读' : '未读'}
                  </Badge>
                  {item.deadline && (
                    <Badge color="red" variant="light">
                      截止：{dayjs(item.deadline).format('YYYY-MM-DD')}
                    </Badge>
                  )}
                </Group>
                <Text size="sm" c="dimmed">
                  {dayjs(item.created_at || item.createdAt).format('YYYY-MM-DD HH:mm')}
                </Text>
              </Group>
              <Text mb="sm" size="sm">
                {item.content || item.message}
              </Text>
              {!item.read && (
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => markReadMutation.mutate(item.id)}
                >
                  标记已读
                </Button>
              )}
            </Card>
          ))}
        </Stack>
        <Group justify="center" mt="lg">
          <Pagination value={page} onChange={setPage} total={totalPages} />
        </Group>
      </Card>
    </Stack>
  );
}
