import {
  Badge,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';

export default function ExpertDashboardPage() {
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['reviews', 'assignments'],
    queryFn: async () => {
      const response = await api.get(endpoints.reviews.assignments);
      return response.data ?? [];
    }
  });

  const pendingAssignments = (assignments || []).filter(
    (item) => item.status === 'Pending' || item.status === 'assigned'
  );

  const acceptedCount = (assignments || []).filter((item) => item.conclusion === 'Accept').length;

  const { data: withdrawals } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: async () => {
      const response = await api.get(endpoints.payments.withdrawals);
      return response.data ?? [];
    }
  });

  if (isLoading) {
    return (
      <Stack align="center" justify="center" h="60vh">
        <Loader size="lg" />
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      <Title order={2}>专家仪表盘</Title>
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <DashboardCard title="待审任务" value={pendingAssignments.length} color="orange" />
        <DashboardCard title="已完成任务" value={(assignments || []).length - pendingAssignments.length} color="green" />
        <DashboardCard title="录用建议数" value={acceptedCount} color="blue" />
      </SimpleGrid>

      <Card withBorder shadow="sm">
        <Title order={4} mb="md">
          最近任务
        </Title>
        <Stack gap="sm">
          {pendingAssignments.slice(0, 5).map((assignment) => (
            <Card key={assignment.assignment_id} withBorder>
              <Group justify="space-between">
                <div>
                  <Text fw={600}>{assignment.paper_title || assignment.title}</Text>
                  <Text size="sm" c="dimmed">
                    截止时间：{assignment.due_date ? dayjs(assignment.due_date).format('YYYY-MM-DD') : '—'}
                  </Text>
                </div>
                <Badge color="orange">待处理</Badge>
              </Group>
            </Card>
          ))}
          {pendingAssignments.length === 0 && <Text>暂无待审任务。</Text>}
        </Stack>
      </Card>

      <Card withBorder shadow="sm">
        <Title order={4} mb="md">
          提现记录
        </Title>
        <Stack gap="sm">
          {(withdrawals || []).slice(0, 5).map((item) => (
            <Card key={item.withdrawal_id} withBorder>
              <Group justify="space-between">
                <div>
                  <Text fw={600}>金额：{item.amount}</Text>
                  <Text size="sm" c="dimmed">
                    申请时间：{item.request_date ? dayjs(item.request_date).format('YYYY-MM-DD') : '—'}
                  </Text>
                </div>
                <Badge color={item.status === 'Approved' ? 'green' : 'gray'}>
                  {item.status || '处理中'}
                </Badge>
              </Group>
            </Card>
          ))}
          {(withdrawals || []).length === 0 && <Text>暂无提现记录。</Text>}
        </Stack>
      </Card>
    </Stack>
  );
}

function DashboardCard({ title, value, color }) {
  return (
    <Card withBorder shadow="sm">
      <Stack>
        <Text c="dimmed">{title}</Text>
        <Text fw={700} fz={28}>
          {value}
        </Text>
        <Badge color={color}>统计</Badge>
      </Stack>
    </Card>
  );
}

DashboardCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired
};
