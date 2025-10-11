/**
 * 作者支付信息页：聚焦查看消费记录，不涉及支付创建。
 * 选择不同论文时，只刷新对应列表以减少不必要的网络请求。
 */
import {
  Badge,
  Button,
  Card,
  Group,
  LoadingOverlay,
  Select,
  Stack,
  Table,
  Text,
  Title
} from '@mantine/core';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import dayjs from 'dayjs';

export default function AuthorPaymentsPage() {
  const [selectedPaper, setSelectedPaper] = useState(null);

  // 作者论文列表用于下拉筛选，复用论文接口避免维护额外 API。
  const { data: papers } = useQuery({
    queryKey: ['papers', 'author'],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.base);
      return response.data ?? [];
    }
  });

  // 仅在选择论文后拉取支付记录，避免空查询。
  const { data: payments, isFetching } = useQuery({
    queryKey: ['payments', selectedPaper],
    enabled: Boolean(selectedPaper),
    queryFn: async () => {
      const response = await api.get(endpoints.payments.paper(selectedPaper));
      return response.data ?? [];
    }
  });

  return (
    <Stack>
      <Title order={2}>支付信息</Title>
      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay visible={isFetching} overlayProps={{ blur: 2 }} />
        <Stack gap="md">
          <Group justify="space-between">
            <Select
              placeholder="选择论文查看支付信息"
              data={(papers || []).map((paper) => ({
                value: String(paper.paper_id || paper.id),
                label: paper.title_zh || paper.title_en
              }))}
              value={selectedPaper}
              onChange={setSelectedPaper}
              aria-label="选择论文"
              searchable
              nothingFoundMessage="暂无论文"
            />
            {payments?.some((item) => item.status !== 'Paid') && (
              <Button variant="light" disabled>
                待支付
              </Button>
            )}
          </Group>

          {selectedPaper && (
            <Card withBorder radius="md">
              <Stack gap="sm">
                <Text fw={600}>支付记录</Text>
                <Table striped withBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>支付ID</Table.Th>
                      <Table.Th>金额</Table.Th>
                      <Table.Th>状态</Table.Th>
                      <Table.Th>支付日期</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(payments || []).map((payment) => (
                      <Table.Tr key={payment.payment_id}>
                        <Table.Td>{payment.payment_id}</Table.Td>
                        <Table.Td>{payment.amount || '—'}</Table.Td>
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
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
                {payments?.length === 0 && <Text>暂无支付记录。</Text>}
              </Stack>
            </Card>
          )}

          {/* 初始态：引导用户先做筛选 */}
          {!selectedPaper && <Text c="dimmed">请选择论文查看详细支付信息。</Text>}
        </Stack>
      </Card>
    </Stack>
  );
}
