import {
  ActionIcon,
  Button,
  Card,
  Group,
  LoadingOverlay,
  Stack,
  Table,
  Text,
  Title,
  Modal,
  Divider,
  Badge,
  TextInput
} from '@mantine/core';
import { useState } from 'react';
import { useForm, zodResolver } from '@mantine/form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import dayjs from 'dayjs';
import { notifications } from '@mantine/notifications';
import { IconEye } from '@tabler/icons-react';

const schema = z.object({
  assignment_id: z
    .string()
    .trim()
    .min(1, '请输入任务ID')
    .regex(/^\d+$/, '任务ID必须为整数')
    .refine((value) => Number(value) > 0, '任务ID必须大于0')
});

export default function ExpertWithdrawalsPage() {
  const [isDetailOpen, setDetailOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const queryClient = useQueryClient();
  const getStatusMeta = (status) => {
    if (status === 1 || status === '1' || status === true) {
      return { label: '已提现', color: 'green' };
    }
    if (status === 0 || status === '0' || status === false) {
      return { label: '未提现', color: 'red' };
    }
    return { label: '处理中', color: 'gray' };
  };
  const formatDateTime = (value) => {
    if (!value) return '—';
    return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
  };

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: async () => {
      const response = await api.get(endpoints.payments.withdrawals);
      return response.data ?? [];
    }
  });

  const form = useForm({
    initialValues: {
      assignment_id: ''
    },
    validate: zodResolver(schema)
  });

  const mutation = useMutation({
    mutationFn: async (values) => {
      const response = await api.post(
        endpoints.payments.withdrawals,
        {
          assignment_id: Number(values.assignment_id)
        },
        { suppressDefaultError: true }
      );
      return response.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: '提现申请成功',
        message: data?.message ?? '提现申请提交成功',
        color: 'green'
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
    },
    onError: (error) => {
      const data = error.response?.data;
      const fieldErrors = data?.errors;
      const serverMessage = data?.message;
      if (fieldErrors) {
        form.setErrors(fieldErrors);
      }
      if (serverMessage) {
        form.setFieldError('assignment_id', serverMessage);
        notifications.show({
          title: '提现申请失败',
          message: serverMessage,
          color: 'red'
        });
      }
    }
  });

  return (
    <Stack>
      <Title order={2}>提现管理</Title>
      <Card withBorder shadow="sm">
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="md">
            <Group gap="md">
              <TextInput
                label="任务ID"
                withAsterisk
                placeholder="请输入任务ID"
                inputMode="numeric"
                pattern="[0-9]*"
                {...form.getInputProps('assignment_id')}
              />
            </Group>
            <Group justify="flex-end">
              <Button type="submit" loading={mutation.isPending}>
                提交申请
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
        <Title order={4} mb="md">
          提现记录
        </Title>
        <Table striped withBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>任务ID</Table.Th>
              <Table.Th>论文ID</Table.Th>
              <Table.Th>金额</Table.Th>
              <Table.Th>状态</Table.Th>
              <Table.Th>申请日期</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(withdrawals || []).map((item, index) => (
              <Table.Tr key={item.withdrawal_id ?? item.assignment_id ?? `withdrawal-${index}`}>
                <Table.Td>{item.assignment_id || '—'}</Table.Td>
                <Table.Td>{item.paper_id || '—'}</Table.Td>
                <Table.Td>{item.amount}</Table.Td>
                <Table.Td>
                  {(() => {
                    const { label, color } = getStatusMeta(item.status);
                    return (
                      <Badge color={color} variant="outline">
                        {label}
                      </Badge>
                    );
                  })()}
                </Table.Td>
                <Table.Td>{formatDateTime(item.request_date || item.withdrawal_date)}</Table.Td>
                <Table.Td>
                  <ActionIcon
                    variant="light"
                    onClick={() => {
                      setSelectedWithdrawal(item);
                      setDetailOpen(true);
                    }}
                    aria-label="查看提现详情"
                  >
                    <IconEye size={18} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {(withdrawals || []).length === 0 && <Text mt="md">暂无提现记录。</Text>}
      </Card>

      <Modal
        opened={isDetailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedWithdrawal(null);
        }}
        title="提现详情"
        centered
      >
        {selectedWithdrawal && (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={500}>任务ID</Text>
              <Text>{selectedWithdrawal.assignment_id ?? '—'}</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>论文ID</Text>
              <Text>{selectedWithdrawal.paper_id ?? '—'}</Text>
            </Group>
            <Divider />
            <Stack gap={4}>
              <Text fw={500}>论文题目（中文）</Text>
              <Text>{selectedWithdrawal.paper_title_zh ?? '—'}</Text>
            </Stack>
            <Stack gap={4}>
              <Text fw={500}>论文题目（英文）</Text>
              <Text>{selectedWithdrawal.paper_title_en ?? '—'}</Text>
            </Stack>
            <Divider />
            <Group justify="space-between">
              <Text fw={500}>金额</Text>
              <Text>{selectedWithdrawal.amount ?? '—'}</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>状态</Text>
              {(() => {
                const { label, color } = getStatusMeta(selectedWithdrawal.status);
                return (
                  <Badge color={color} variant="outline">
                    {label}
                  </Badge>
                );
              })()}
            </Group>
            <Group justify="space-between">
              <Text fw={500}>申请日期</Text>
              <Text>{formatDateTime(selectedWithdrawal.request_date || selectedWithdrawal.withdrawal_date)}</Text>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
