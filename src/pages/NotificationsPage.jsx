import {
  ActionIcon,
  Badge,
  Card,
  Group,
  LoadingOverlay,
  Modal,
  Select,
  Table,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios.js";
import { endpoints } from "../api/endpoints.js";
import dayjs from "dayjs";

const readOptions = [
  { label: "全部", value: "all" },
  { label: "未读", value: "unread" },
  { label: "已读", value: "read" },
];

const typeOptions = [
  { label: "全部类型", value: "all" },
  { label: "审稿通知", value: "Review Assignment" },
  { label: "支付确认", value: "Payment Confirmation" },
  { label: "录用通知", value: "Acceptance Notification" },
  { label: "拒稿通知", value: "Rejection Notification" },
];

const typeLabels = {
  "Review Assignment": "审稿通知",
  "Payment Confirmation": "支付确认",
  "Acceptance Notification": "录用通知",
  "Rejection Notification": "拒稿通知",
};

export default function NotificationsPage() {
  const [type, setType] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailOpened, setDetailOpened] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.get(endpoints.notifications.author);
      return response.data;
    },
    keepPreviousData: true,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(endpoints.notifications.markRead(id));
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData(["notifications"], (prev) => {
        if (!prev) return prev;
        return prev.map((notification) =>
          notification.notification_id === id
            ? { ...notification, is_read: true }
            : notification
        );
      });
      setSelectedNotification((current) =>
        current?.notification_id === id
          ? { ...current, is_read: true }
          : current
      );
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      });
    },
  });

  const notifications = data || [];
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (type !== "all" && item.notification_type !== type) return false;
      if (readFilter === "read" && !item.is_read) return false;
      if (readFilter === "unread" && item.is_read) return false;
      return true;
    });
  }, [notifications, type, readFilter]);

  const closeDetail = () => {
    setDetailOpened(false);
    setSelectedNotification(null);
  };

  const formatDeadlineDisplay = (value) =>
    dayjs(value).format("YYYY年MM月DD日HH:mm");

  const renderDetailContent = () => {
    if (!selectedNotification) return null;

    if (selectedNotification.notification_type === "Acceptance Notification") {
      const formattedDeadline = selectedNotification.deadline
        ? formatDeadlineDisplay(selectedNotification.deadline)
        : null;

      return (
        <Stack gap="sm">
          <Text>
            您的论文已被录用！
            {formattedDeadline ? (
              <>
                请在
                <Text span fw={500}>
                  {formattedDeadline}
                </Text>
                前向下面的账户支付版面费。
              </>
            ) : (
              "请尽快向下面的账户支付版面费。"
            )}
          </Text>
          <Table withTableBorder>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>银行卡号</Table.Td>
                <Table.Td>银行</Table.Td>
                <Table.Td>开户名</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>9558800544337553</Table.Td>
                <Table.Td>工商银行</Table.Td>
                <Table.Td>编辑001</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
      );
    }

    if (selectedNotification.content || selectedNotification.message) {
      return (
        <Text>
          <Text span fw={500}>
            内容：
          </Text>
          {selectedNotification.content || selectedNotification.message}
        </Text>
      );
    }

    return <Text c="dimmed">暂无详细内容</Text>;
  };

  const handleViewDetail = (notification) => {
    setSelectedNotification({ ...notification, is_read: true });
    setDetailOpened(true);
    if (!notification.is_read) {
      markReadMutation.mutate(notification.notification_id);
    }
  };

  return (
    <Stack>
      <Title order={2}>通知中心</Title>
      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay
          visible={isLoading || isFetching}
          overlayProps={{ blur: 2 }}
        />
        <Group align="center" justify="space-between" mb="md">
          <Group align="center">
            <Select
              data={typeOptions}
              value={type}
              onChange={(value) => {
                setType(value || "all");
              }}
              aria-label="通知类型筛选"
            />
            <Select
              data={readOptions}
              value={readFilter}
              onChange={(value) => {
                setReadFilter(value || "all");
              }}
              aria-label="通知是否已读筛选"
            />
          </Group>
        </Group>
        <Stack gap="sm">
          {filteredNotifications.length === 0 && (
            <Card shadow="xs" withBorder>
              <Text>暂无通知，去提交论文或等待系统通知。</Text>
            </Card>
          )}
          {filteredNotifications.map((item) => (
            <Card key={item.notification_id} withBorder shadow="xs">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Title order={4}>
                    {typeLabels[item.notification_type] ||
                      item.notification_type}
                  </Title>
                  <Badge color={item.is_read ? "gray" : "blue"}>
                    {item.is_read ? "已读" : "未读"}
                  </Badge>
                  {item.deadline && (
                    <Badge color="red" variant="light">
                      截止：{dayjs(item.deadline).format("YYYY-MM-DD HH:mm")}
                    </Badge>
                  )}
                </Group>
                <Group gap="xs">
                  <Text size="sm" c="dimmed">
                    发送时间：{dayjs(item.sent_at).format("YYYY-MM-DD HH:mm")}
                  </Text>
                  <ActionIcon
                    variant="light"
                    onClick={() => handleViewDetail(item)}
                    aria-label="查看通知详情"
                  >
                    <IconEye size={18} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      </Card>
      <Modal
        opened={detailOpened}
        onClose={closeDetail}
        title="通知详情"
        size="md"
      >
        {selectedNotification ? (
          <Stack gap="sm">
            <Text>
              <Text span fw={500}>
                通知类型：
              </Text>
              {typeLabels[selectedNotification.notification_type] ||
                selectedNotification.notification_type}
            </Text>
            <Text>
              <Text span fw={500}>
                发送时间：
              </Text>
              {dayjs(selectedNotification.sent_at).format("YYYY-MM-DD HH:mm")}
            </Text>
            {selectedNotification.deadline && (
              <Text>
                <Text span fw={500}>
                  截止时间：
                </Text>
                {formatDeadlineDisplay(selectedNotification.deadline)}
              </Text>
            )}
            {selectedNotification.paper_id && (
              <Text>
                <Text span fw={500}>
                  关联论文ID：
                </Text>
                {selectedNotification.paper_id}
              </Text>
            )}
            {renderDetailContent()}
          </Stack>
        ) : (
          <Text c="dimmed">请选择一条通知查看详情。</Text>
        )}
      </Modal>
    </Stack>
  );
}
