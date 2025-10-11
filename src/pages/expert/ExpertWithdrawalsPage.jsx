import {
  Button,
  Card,
  Group,
  LoadingOverlay,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Title
} from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import dayjs from 'dayjs';
import { notifications } from '@mantine/notifications';

const schema = z.object({
  amount: z.coerce.number().gt(0, '请输入提现金额'),
  bank_account_id: z.string().min(1, '请选择银行卡')
});

export default function ExpertWithdrawalsPage() {
  const queryClient = useQueryClient();

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: async () => {
      const response = await api.get(endpoints.payments.withdrawals);
      return response.data ?? [];
    }
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get(endpoints.users.profile);
      return response.data;
    }
  });

  const form = useForm({
    initialValues: {
      amount: 0,
      bank_account_id: ''
    },
    validate: zodResolver(schema)
  });

  const mutation = useMutation({
    mutationFn: async (values) => {
      const response = await api.post(endpoints.payments.withdrawals, values);
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: '提现申请成功',
        message: '管理员将尽快处理',
        color: 'green'
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
    },
    onError: (error) => {
      const fieldErrors = error.response?.data?.errors;
      if (fieldErrors) {
        form.setErrors(fieldErrors);
      }
    }
  });

  const bankOptions = (profile?.bank_accounts || []).map((account) => ({
    value: String(account.id || account.bank_account_id),
    label: `${account.bank_name || ''} - ${account.account_holder || ''}`
  }));

  return (
    <Stack>
      <Title order={2}>提现管理</Title>
      <Card withBorder shadow="sm">
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="md">
            <Group gap="md">
              <NumberInput
                label="提现金额"
                min={0}
                precision={2}
                withAsterisk
                {...form.getInputProps('amount')}
              />
              <Select
                label="提现银行卡"
                placeholder="选择银行卡"
                data={bankOptions}
                withAsterisk
                {...form.getInputProps('bank_account_id')}
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
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(withdrawals || []).map((item) => (
              <Table.Tr key={item.withdrawal_id}>
                <Table.Td>{item.assignment_id || '—'}</Table.Td>
                <Table.Td>{item.paper_id || '—'}</Table.Td>
                <Table.Td>{item.amount}</Table.Td>
                <Table.Td>{item.status || '处理中'}</Table.Td>
                <Table.Td>
                  {item.request_date ? dayjs(item.request_date).format('YYYY-MM-DD') : '—'}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {(withdrawals || []).length === 0 && <Text mt="md">暂无提现记录。</Text>}
      </Card>
    </Stack>
  );
}
