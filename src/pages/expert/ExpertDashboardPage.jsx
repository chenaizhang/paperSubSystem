import {
  Badge,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios.js";
import { endpoints } from "../../api/endpoints.js";
import dayjs from "dayjs";
import PropTypes from "prop-types";

const statusLabelMap = {
  Assigned: "待审中",
  Pending: "待审中",
  Overdue: "已逾期",
  Completed: "已完成",
};

const statusColorMap = {
  Assigned: "orange",
  Pending: "orange",
  Overdue: "red",
  Completed: "green",
};

const formatDate = (value, format = "YYYY-MM-DD") =>
  value ? dayjs(value).format(format) : "—";

const isPendingStatus = (status) =>
  ["assigned", "pending", "overdue"].includes((status || "").toLowerCase());

export default function ExpertDashboardPage() {
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["reviews", "assignments"],
    queryFn: async () => {
      const response = await api.get(endpoints.reviews.assignments);
      return response.data ?? [];
    },
  });

  const pendingAssignments = (assignments || []).filter((item) =>
    isPendingStatus(item.status)
  );

  const { data: withdrawals } = useQuery({
    queryKey: ["withdrawals"],
    queryFn: async () => {
      const response = await api.get(endpoints.payments.withdrawals);
      return response.data ?? [];
    },
  });

  const pendingWithdrawalAmount = (withdrawals || []).reduce((sum, item) => {
    const s = item?.status;
    const isUnwithdrawn = s === false || s === 0 || s === "0";
    return isUnwithdrawn ? sum + (Number(item?.amount) || 0) : sum;
  }, 0);
  const pendingWithdrawalAmountDisplay = Number.isFinite(pendingWithdrawalAmount)
    ? pendingWithdrawalAmount.toFixed(2)
    : "0.00";

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
        <DashboardCard
          title="待审任务"
          value={pendingAssignments.length}
          color="orange"
        />
        <DashboardCard
          title="已完成任务"
          value={(assignments || []).length - pendingAssignments.length}
          color="green"
        />

        <DashboardCard
          title="待提现金额"
          value={pendingWithdrawalAmountDisplay}
          color="blue"
        />
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
                  <Text fw={600}>
                    {assignment.title_zh || assignment.title_en || "—"}
                  </Text>
                  <Text size="sm" c="dimmed">
                    指派时间：{formatDate(assignment.assigned_date)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    截止时间：{formatDate(assignment.assigned_due_date)}
                  </Text>
                </div>
                <Badge color={statusColorMap[assignment.status] || "orange"}>
                  {statusLabelMap[assignment.status] || "待审中"}
                </Badge>
              </Group>
            </Card>
          ))}
          {pendingAssignments.length === 0 && <Text>暂无待审任务。</Text>}
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
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  color: PropTypes.string.isRequired,
};
