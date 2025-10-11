import {
  Badge,
  Button,
  Card,
  Group,
  LoadingOverlay,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { useState } from 'react';
import { useForm, zodResolver } from '@mantine/form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

const paymentSchema = z.object({
  paper_id: z.string().min(1, '请选择论文'),
  author_id: z.string().min(1, '请选择作者'),
  amount: z.coerce.number().gt(0, '请输入正确金额'),
  bank_account: z.string().min(1, '请输入收款信息')
});

export default function EditorPaymentsPage() {
  const [selectedPaper, setSelectedPaper] = useState(null);
  const queryClient = useQueryClient();

  const { data: papers } = useQuery({
    queryKey: ['papers', 'editor'],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.base);
      return response.data ?? [];
    }
  });

  const paymentsQuery = useQuery({
    queryKey: ['payments', selectedPaper],
    enabled: Boolean(selectedPaper),
    queryFn: async () => {
      const response = await api.get(endpoints.payments.paper(selectedPaper));
      return response.data ?? [];
    }
  });

  const { data: withdrawals } = useQuery({
    queryKey: ['withdrawals', 'admin'],
    queryFn: async () => {
      const response = await api.get(endpoints.payments.withdrawalAdmin);
      return response.data ?? [];
    }
  });

  const paymentForm = useForm({
    initialValues: {
      paper_id: '',
      author_id: '',
      amount: 0,
      bank_account: ''
    },
    validate: zodResolver(paymentSchema)
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (values) => {
      const response = await api.post(endpoints.payments.base, {
        paper_id: Number(values.paper_id),
        author_id: Number(values.author_id),
        amount: values.amount,
        bank_account: values.bank_account
      });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: '支付记录已创建',
        message: '已通知作者支付',
        color: 'green'
      });
      paymentForm.reset();
      queryClient.invalidateQueries({ queryKey: ['payments', selectedPaper] });
    },
    onError: (error) => {
      const fieldErrors = error.response?.data?.errors;
      if (fieldErrors) {
        paymentForm.setErrors(fieldErrors);
      }
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ paymentId, status }) => {
      await api.put(endpoints.payments.status(paymentId), { status });
    },
    onSuccess: () => {
      notifications.show({
        title: '状态已更新',
        message: '支付状态已同步',
        color: 'green'
      });
      queryClient.invalidateQueries({ queryKey: ['payments', selectedPaper] });
    }
  });

  const withdrawalMutation = useMutation({
    mutationFn: async ({ assignmentId, approved }) => {
      await api.put(endpoints.payments.withdrawalStatus(assignmentId), {
        status: approved
      });
    },
    onSuccess: () => {
      notifications.show({
        title: '提现申请已处理',
        message: '结果已通知专家',
        color: 'green'
      });
      queryClient.invalidateQueries({ queryKey: ['withdrawals', 'admin'] });
    }
  });

  return (
    <Stack gap="xl">
      <Title order={2}>支付管理</Title>

      <Card withBorder shadow="sm">
        <Title order={4} mb="md">
          创建支付记录
        </Title>
        <form onSubmit={paymentForm.onSubmit((values) => createPaymentMutation.mutate(values))}>
          <Stack gap="md">
            <Group gap="md">
              <Select
                label="选择论文"
                data={(papers || []).map((paper) => ({
                  value: String(paper.paper_id || paper.id),
                  label: paper.title_zh || paper.title_en
                }))}
                {...paymentForm.getInputProps('paper_id')}
              />
              <Select
                label="作者"
                data={(papers || []).map((paper) => ({
                  value: String(paper.author_id || paper.authors?.[0]?.author_id),
                  label: paper.author_name || paper.authors?.[0]?.name || '未知作者'
                }))}
                {...paymentForm.getInputProps('author_id')}
              />
            </Group>
            <Group gap="md">
              <NumberInput
                label="金额"
                min={0}
                precision={2}
                withAsterisk
                {...paymentForm.getInputProps('amount')}
              />
              <TextInput
                label="银行信息"
                placeholder="开户行/账号"
                withAsterisk
                {...paymentForm.getInputProps('bank_account')}
              />
            </Group>
            <Group justify="flex-end">
              <Button type="submit" loading={createPaymentMutation.isPending}>
                创建记录
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay visible={paymentsQuery.isFetching} overlayProps={{ blur: 2 }} />
        <Group gap="md" mb="md">
          <Select
            label="查看论文支付情况"
            placeholder="选择论文"
            value={selectedPaper}
            onChange={setSelectedPaper}
            data={(papers || []).map((paper) => ({
              value: String(paper.paper_id || paper.id),
              label: paper.title_zh || paper.title_en
            }))}
          />
        </Group>
        {selectedPaper ? (
          <Table striped withBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>支付ID</Table.Th>
                <Table.Th>金额</Table.Th>
                <Table.Th>状态</Table.Th>
                <Table.Th>支付日期</Table.Th>
                <Table.Th>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(paymentsQuery.data || []).map((payment) => (
                <Table.Tr key={payment.payment_id}>
                  <Table.Td>{payment.payment_id}</Table.Td>
                  <Table.Td>{payment.amount}</Table.Td>
                  <Table.Td>
                    <Badge color={payment.status === 'Paid' ? 'green' : 'orange'}>
                      {payment.status || 'Pending'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {payment.payment_date
                      ? dayjs(payment.payment_date).format('YYYY-MM-DD')
                      : '—'}
                  </Table.Td>
                  <Table.Td>
                    <Group>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            paymentId: payment.payment_id,
                            status: 'Paid'
                          })
                        }
                      >
                        标记已支付
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            paymentId: payment.payment_id,
                            status: 'Pending'
                          })
                        }
                      >
                        标记待支付
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text c="dimmed">请选择论文查看支付状态。</Text>
        )}
      </Card>

      <Card withBorder shadow="sm">
        <Title order={4} mb="md">
          专家提现审批
        </Title>
        <Table striped withBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>任务ID</Table.Th>
              <Table.Th>论文ID</Table.Th>
              <Table.Th>金额</Table.Th>
              <Table.Th>申请时间</Table.Th>
              <Table.Th>状态</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(withdrawals || []).map((item) => (
              <Table.Tr key={item.assignment_id}>
                <Table.Td>{item.assignment_id}</Table.Td>
                <Table.Td>{item.paper_id}</Table.Td>
                <Table.Td>{item.amount}</Table.Td>
                <Table.Td>
                  {item.request_date ? dayjs(item.request_date).format('YYYY-MM-DD') : '—'}
                </Table.Td>
                <Table.Td>
                  <Group>
                    <Badge color={item.status === 'Approved' ? 'green' : item.status === 'Rejected' ? 'red' : 'orange'}>
                      {item.status || 'Pending'}
                    </Badge>
                    {item.status === 'Pending' && (
                      <>
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() =>
                            withdrawalMutation.mutate({ assignmentId: item.assignment_id, approved: true })
                          }
                        >
                          通过
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          color="red"
                          onClick={() =>
                            withdrawalMutation.mutate({ assignmentId: item.assignment_id, approved: false })
                          }
                        >
                          拒绝
                        </Button>
                      </>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {(withdrawals || []).length === 0 && <Text mt="md">暂无提现申请。</Text>}
      </Card>
    </Stack>
  );
}
