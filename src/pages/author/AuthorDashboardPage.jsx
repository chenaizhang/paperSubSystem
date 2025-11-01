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
import { useMemo } from "react";
import { ensureArray } from "../../utils/ensureArray.js";
import {
  deriveLastUpdatedAt,
  mapProgressToStages,
} from "../../utils/paperProgress.js";
import {
  getReviewStatusColor,
  getReviewStatusLabel,
  normalizeReviewStatus,
} from "../../utils/reviewStatus.js";

const notificationTypeLabels = {
  "Review Assignment": "审稿通知",
  "Payment Confirmation": "支付确认",
  "Acceptance Notification": "录用通知",
  "Rejection Notification": "拒稿通知",
  "Major Revision": "大修通知",
  "Minor Revision": "小修通知",
};

function normalizeDateInput(value) {
  if (!value || typeof value !== "string") {
    return value;
  }
  return value.includes("T") ? value : value.replace(" ", "T");
}

export default function AuthorDashboardPage() {
  // 拉取作者可见的论文列表。接口已经做权限控制，这里不额外过滤。
  const { data: papers, isLoading } = useQuery({
    queryKey: ["papers", "author"],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.base);
      return response.data ?? [];
    },
  });

  const paperList = useMemo(() => ensureArray(papers), [papers]);

  const {
    data: progressList,
    isLoading: isProgressLoading,
    error: progressError,
  } = useQuery({
    queryKey: ["papers", "progress", "author"],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.progressList);
      return response.data ?? [];
    },
  });

  const progressArray = useMemo(
    () => ensureArray(progressList),
    [progressList]
  );

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

  const notificationList = useMemo(
    () => ensureArray(notifications),
    [notifications]
  );

  const paperIndex = useMemo(() => {
    const index = new Map();
    paperList.forEach((paper) => {
      const id = paper.paper_id ?? paper.id;
      if (id !== undefined && id !== null) {
        index.set(String(id), paper);
      }
    });
    return index;
  }, [paperList]);

  const recentProgressItems = useMemo(() => {
    if (progressArray.length > 0) {
      return progressArray
        .map((progress) => {
          const paperId = progress.paper_id ?? progress.id;
          const paperMeta =
            paperId !== undefined && paperId !== null
              ? paperIndex.get(String(paperId))
              : undefined;
          const stages = mapProgressToStages(progress);
          const activeStage =
            stages.find((stage) => stage.status !== "finished") ||
            stages[stages.length - 1];
          const lastUpdated =
            deriveLastUpdatedAt(progress) ||
            (progress.submission_time
              ? new Date(normalizeDateInput(progress.submission_time))
              : undefined) ||
            (paperMeta?.updated_at
              ? new Date(normalizeDateInput(paperMeta.updated_at))
              : undefined) ||
            (paperMeta?.submission_date
              ? new Date(normalizeDateInput(paperMeta.submission_date))
              : undefined);
          return {
            paperId,
            title:
              progress.title_zh ||
              progress.title_en ||
              paperMeta?.title_zh ||
              paperMeta?.title_en ||
              "未命名稿件",
            status: normalizeReviewStatus(paperMeta?.status),
            submissionDate:
              progress.submission_time ||
              paperMeta?.submission_date ||
              paperMeta?.submission_time,
            currentStage: activeStage?.label,
            currentStageStatus: activeStage?.statusText,
            currentStageColor: activeStage?.color || "blue",
            lastUpdated,
          };
        })
        .sort(
          (a, b) =>
            (b.lastUpdated ? b.lastUpdated.getTime() : 0) -
            (a.lastUpdated ? a.lastUpdated.getTime() : 0)
        )
        .slice(0, 5);
    }

    return [...paperList]
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.submission_date) -
          new Date(a.updated_at || a.submission_date)
      )
      .slice(0, 5)
      .map((paper) => ({
        paperId: paper.id || paper.paper_id,
        title: paper.title_zh || paper.title_en,
        status: normalizeReviewStatus(paper.status),
        submissionDate: paper.submission_date,
        currentStage: paper.current_stage,
        currentStageStatus: paper.current_stage ? "处理中" : undefined,
        currentStageColor: paper.current_stage ? "blue" : "gray",
        lastUpdated: paper.updated_at
          ? new Date(normalizeDateInput(paper.updated_at))
          : paper.submission_date
          ? new Date(normalizeDateInput(paper.submission_date))
          : undefined,
      }));
  }, [paperList, progressArray, paperIndex]);

  if (isLoading) {
    return (
      <Stack align="center" justify="center" h="60vh">
        <Loader size="lg" />
      </Stack>
    );
  }

  const stats = paperList.reduce(
    (acc, paper) => {
      const status = normalizeReviewStatus(paper.status);
      acc.total += 1;
      acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;
      return acc;
    },
    { total: 0, byStatus: {} }
  );

  // “最近进度”按照更新时间排序，前端不做分页，最多展示 5 条。
  return (
    <Stack gap="xl">
      <Title order={2}>仪表盘</Title>
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <DashboardStat title="论文总数" value={stats.total} />
        {Object.entries(stats.byStatus).map(([status, count]) => (
          <DashboardStat
            key={status}
            title={`评审意见：${getReviewStatusLabel(status)}`}
            value={count}
            badgeColor={getReviewStatusColor(status)}
          />
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Card withBorder shadow="sm" radius="md">
          <Title order={4} mb="md">
            最近进度
          </Title>
          {isProgressLoading && (
            <Group justify="center" py="md">
              <Loader size="sm" />
            </Group>
          )}
          {progressError && (
            <Text size="sm" c="red" mb="sm">
              进度信息暂时无法加载，以下数据来自最近的稿件更新。
            </Text>
          )}
          {recentProgressItems.length === 0 && !isProgressLoading && (
            <Text>暂无论文，请提交新稿件。</Text>
          )}
          <Stack gap="sm">
            {recentProgressItems.map((item) => (
              <Card key={item.paperId} withBorder radius="md">
                <Group justify="space-between" mb="xs">
                  <Text fw={600}>{item.title}</Text>
                  <Badge color={getReviewStatusColor(item.status)}>
                    {getReviewStatusLabel(item.status)}
                  </Badge>
                </Group>
                {item.currentStage && (
                  <Group gap="xs" mb="xs">
                    <Badge variant="light" color={item.currentStageColor}>
                      {item.currentStageStatus}
                    </Badge>
                    <Text size="sm">当前阶段：{item.currentStage}</Text>
                  </Group>
                )}
                <Text size="sm" c="dimmed">
                  提交时间：
                  {item.submissionDate
                    ? dayjs(normalizeDateInput(item.submissionDate)).format(
                        "YYYY-MM-DD"
                      )
                    : "—"}
                </Text>
                <Text size="sm" c="dimmed">
                  最近更新：
                  {item.lastUpdated
                    ? dayjs(item.lastUpdated).format("YYYY-MM-DD HH:mm")
                    : "待更新"}
                </Text>
              </Card>
            ))}
          </Stack>
        </Card>

        <Card withBorder shadow="sm" radius="md">
          <Title order={4} mb="md">
            最新通知
          </Title>
          {notificationList.length === 0 && <Text>暂无通知。</Text>}
          <Stack gap="sm">
            {notificationList.map((notification, index) => {
              const id =
                notification.id ??
                notification.notification_id ??
                `notification-${index}`;
              const isRead =
                notification.read ??
                notification.is_read ??
                notification.isRead ??
                false;
              const typeLabel =
                notificationTypeLabels[notification.notification_type] ||
                notification.notification_type ||
                notification.type;
              const timestamp =
                notification.created_at ||
                notification.createdAt ||
                notification.sent_at;
              const displayTime = timestamp
                ? "发送时间: " + dayjs(timestamp).format("YYYY-MM-DD HH:mm")
                : "发送时间未知";

              return (
                <Card key={id} withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>
                      {notification.title || typeLabel || "系统通知"}
                    </Text>
                    <Badge color={isRead ? "gray" : "blue"}>
                      {isRead ? "已读" : "未读"}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {displayTime}
                  </Text>
                  <Text size="sm">
                    {notification.content ||
                      notification.message ||
                      "暂无详细内容"}
                  </Text>
                </Card>
              );
            })}
          </Stack>
        </Card>
      </SimpleGrid>

      <Card withBorder shadow="sm" radius="md">
        <Title order={4} mb="md">
          流程示意
        </Title>
        <Timeline active={3} bulletSize={24} lineWidth={2}>
          <Timeline.Item title="收稿" />
          <Timeline.Item title="初审" />
          <Timeline.Item title="评审" />
          <Timeline.Item title="修改" />
          <Timeline.Item title="复审" />
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
        {badgeColor && <Badge color={badgeColor}>评审意见统计</Badge>}
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
