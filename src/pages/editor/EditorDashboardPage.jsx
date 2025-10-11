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

export default function EditorDashboardPage() {
  const { data: papers, isLoading } = useQuery({
    queryKey: ['papers', 'editor'],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.base);
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

  if (isLoading) {
    return (
      <Stack align="center" justify="center" h="60vh">
        <Loader size="lg" />
      </Stack>
    );
  }

  const pendingAssignments = (papers || []).filter((paper) => paper.status === 'initial_review');
  const newSubmissions = (papers || []).filter((paper) =>
    dayjs().diff(dayjs(paper.submission_date), 'day') <= 7
  );
  const awaitingSchedule = (papers || []).filter((paper) => paper.status === 'accepted');

  return (
    <Stack gap="xl">
      <Title order={2}>编辑仪表盘</Title>
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <DashboardCard title="新增稿件 (7天)" value={newSubmissions.length} color="blue" />
        <DashboardCard title="待分配审稿" value={pendingAssignments.length} color="orange" />
        <DashboardCard title="待排期稿件" value={awaitingSchedule.length} color="teal" />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Card withBorder shadow="sm">
          <Title order={4} mb="md">
            待处理提现
          </Title>
          <Stack gap="sm">
            {(withdrawals || [])
              .filter((item) => item.status === 'Pending')
              .slice(0, 5)
              .map((item) => (
                <Card key={item.assignment_id} withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text fw={600}>任务ID：{item.assignment_id}</Text>
                      <Text size="sm" c="dimmed">
                        提现金额：{item.amount}
                      </Text>
                    </div>
                    <Badge color="orange">待审批</Badge>
                  </Group>
                </Card>
              ))}
            {(withdrawals || []).filter((item) => item.status === 'Pending').length === 0 && (
              <Text>暂无待处理提现。</Text>
            )}
          </Stack>
        </Card>

        <Card withBorder shadow="sm">
          <Title order={4} mb="md">
            待排期稿件
          </Title>
          <Stack gap="sm">
            {awaitingSchedule.slice(0, 5).map((paper) => (
              <Card key={paper.paper_id} withBorder>
                <Group justify="space-between">
                  <div>
                    <Text fw={600}>{paper.title_zh || paper.title_en}</Text>
                    <Text size="sm" c="dimmed">
                      状态：{paper.status}
                    </Text>
                  </div>
                  <Badge color="teal">待排期</Badge>
                </Group>
              </Card>
            ))}
            {awaitingSchedule.length === 0 && <Text>暂无待排期稿件。</Text>}
          </Stack>
        </Card>
      </SimpleGrid>
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
