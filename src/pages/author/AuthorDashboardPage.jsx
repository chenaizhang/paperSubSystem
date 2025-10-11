/**
 * Author dashboards aggregate assorted data queries. To keep the component readable,
 * the data processing logic is intentionally split into small helpers with clear
 * responsibilities and documented assumptions.
 */
import {
  Badge,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Timeline,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios.js";
import { endpoints } from "../../api/endpoints.js";
import dayjs from "dayjs";
import PropTypes from "prop-types";

const statusColors = {
  submitted: "blue",
  reviewing: "orange",
  revision: "yellow",
  accepted: "green",
  rejected: "red",
};

export default function AuthorDashboardPage() {
  // 拉取作者可见的论文列表。接口已经做权限控制，这里不额外过滤。
  const { data: papers, isLoading } = useQuery({
    queryKey: ["papers", "author"],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.base);
      return response.data ?? [];
    },
  });

  // 最新通知仅需展示少量，UI 层不做分页，按时间倒序即可。
  const { data: notifications } = useQuery({
    queryKey: ["notifications", "latest"],
    queryFn: async () => {
      const response = await api.get(endpoints.notifications.author, {
        params: { pageSize: 5 },
      });
      return response.data?.items ?? response.data ?? [];
    },
  });

  if (isLoading) {
    return (
      <Stack align="center" justify="center" h="60vh">
        <Loader size="lg" />
      </Stack>
    );
  }

  const stats = (papers || []).reduce(
    (acc, paper) => {
      const status = paper.status || "draft";
      acc.total += 1;
      acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;
      return acc;
    },
    { total: 0, byStatus: {} }
  );

  // “最近进度”按照更新时间排序，前端不做分页，最多展示 5 条。
  const recentPapers = [...(papers || [])]
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.submission_date) -
        new Date(a.updated_at || a.submission_date)
    )
    .slice(0, 5);

  return (
    <Stack gap="xl">
      <Title order={2}>仪表盘</Title>
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <DashboardStat title="论文总数" value={stats.total} />
        {Object.entries(stats.byStatus).map(([status, count]) => (
          <DashboardStat
            key={status}
            title={`状态：${status}`}
            value={count}
            badgeColor={statusColors[status]}
          />
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Card withBorder shadow="sm" radius="md">
          <Title order={4} mb="md">
            最近进度
          </Title>
          {recentPapers.length === 0 && <Text>暂无论文，请提交新稿件。</Text>}
          <Stack gap="sm">
            {recentPapers.map((paper) => (
              <Card key={paper.id} withBorder radius="md">
                <Group justify="space-between" mb="xs">
                  <Text fw={600}>{paper.title_zh || paper.title_en}</Text>
                  <Badge color={statusColors[paper.status] || "gray"}>
                    {paper.status || "草稿"}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  提交时间：{dayjs(paper.submission_date).format("YYYY-MM-DD")}
                </Text>
                {paper.current_stage && (
                  <Text size="sm">当前阶段：{paper.current_stage}</Text>
                )}
              </Card>
            ))}
          </Stack>
        </Card>

        <Card withBorder shadow="sm" radius="md">
          <Title order={4} mb="md">
            最新通知
          </Title>
          {notifications?.length === 0 && <Text>暂无通知。</Text>}
          <Stack gap="sm">
            {notifications?.map((notification) => (
              <Card key={notification.id} withBorder>
                <Group justify="space-between" mb="xs">
                  <Text fw={600}>
                    {notification.title || notification.type}
                  </Text>
                  <Badge color={notification.read ? "gray" : "blue"}>
                    {notification.read ? "已读" : "未读"}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  {dayjs(
                    notification.created_at || notification.createdAt
                  ).format("YYYY-MM-DD HH:mm")}
                </Text>
                <Text size="sm">
                  {notification.content || notification.message}
                </Text>
              </Card>
            ))}
          </Stack>
        </Card>
      </SimpleGrid>

      <Card withBorder shadow="sm" radius="md">
        <Title order={4} mb="md">
          流程示意
        </Title>
        <Timeline active={2} bulletSize={24} lineWidth={2}>
          <Timeline.Item title="收稿" />
          <Timeline.Item title="初审" />
          <Timeline.Item title="外审" />
          <Timeline.Item title="修改/复审" />
          <Timeline.Item title="录用" />
          <Timeline.Item title="支付版面费" />
          <Timeline.Item title="排期出版" />
        </Timeline>
      </Card>
    </Stack>
  );
}

/**
 * Presentational card for dashboard counters. Keeps layout logic isolated
 * so the parent component focuses purely on data orchestration.
 */
function DashboardStat({ title, value, badgeColor }) {
  return (
    <Card withBorder shadow="sm" radius="md">
      <Stack>
        <Text c="dimmed">{title}</Text>
        <Text fw={700} fz={28}>
          {value}
        </Text>
        {badgeColor && <Badge color={badgeColor}>状态统计</Badge>}
      </Stack>
    </Card>
  );
}

DashboardStat.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  badgeColor: PropTypes.string,
};

DashboardStat.defaultProps = {
  badgeColor: undefined,
};
