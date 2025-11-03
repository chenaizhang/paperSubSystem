import {
  ActionIcon,
  Badge,
  Button,
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
import { notifications } from "@mantine/notifications";

const readOptions = [
  { label: "全部", value: "all" },
  { label: "未读", value: "unread" },
  { label: "已读", value: "read" },
];

const typeOptions = [
  { label: "全部类型", value: "all" },
  { label: "修稿通知", value: "Review Assignment" },
  { label: "支付确认", value: "Payment Confirmation" },
  { label: "录用通知", value: "Acceptance Notification" },
  { label: "拒稿通知", value: "Rejection Notification" },
];

const typeLabels = {
  "Review Assignment": "修稿通知",
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
      queryClient.invalidateQueries({
        queryKey: ["unread-indicator"],
      });
    },
  });

  const notificationList = data || [];
  const filteredNotifications = useMemo(() => {
    return notificationList.filter((item) => {
      if (type !== "all" && item.notification_type !== type) return false;
      if (readFilter === "read" && !item.is_read) return false;
      if (readFilter === "unread" && item.is_read) return false;
      return true;
    });
  }, [notificationList, type, readFilter]);

  const closeDetail = () => {
    setDetailOpened(false);
    setSelectedNotification(null);
  };

  const formatDeadlineDisplay = (value) =>
    dayjs(value).format("YYYY年MM月DD日HH:mm");

  const isAcceptanceSelected =
    selectedNotification?.notification_type === "Acceptance Notification";
  const isRevisionSelected =
    selectedNotification?.notification_type === "Review Assignment";
  const isRejectionSelected =
    selectedNotification?.notification_type === "Rejection Notification";
  const selectedPaperId = selectedNotification?.paper_id ?? null;

  const {
    data: paymentData,
    isLoading: isLoadingPayment,
    isFetching: isFetchingPayment,
  } = useQuery({
    queryKey: ["payments", "paper", selectedPaperId],
    queryFn: async () => {
      const response = await api.get(endpoints.payments.paper(selectedPaperId));
      return response.data;
    },
    enabled: Boolean(isAcceptanceSelected && selectedPaperId),
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ paperId, amount }) => {
      const response = await api.post(endpoints.payments.authorPay, {
        paper_id: paperId,
        amount,
      });
      return response.data;
    },
    onSuccess: (result, variables) => {
      notifications.show({
        title: "支付申请已提交",
        message: result?.message || "请等待编辑审核支付申请",
        color: "green",
      });
      queryClient.invalidateQueries({
        queryKey: ["payments", "paper", variables.paperId],
      });
    },
    onError: (error) => {
      notifications.show({
        title: "支付失败",
        message:
          error?.response?.data?.message ||
          error?.friendlyMessage ||
          "无法提交支付申请，请稍后再试",
        color: "red",
      });
    },
  });

  const amountFormatter = useMemo(
    () =>
      new Intl.NumberFormat("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const shouldLoadPaperDetail = Boolean(
    selectedPaperId &&
      (isRejectionSelected || isAcceptanceSelected || isRevisionSelected)
  );

  const {
    data: paperDetail,
    isLoading: isLoadingPaperDetail,
    isFetching: isFetchingPaperDetail,
  } = useQuery({
    queryKey: ["paper-detail", selectedPaperId],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.detail(selectedPaperId));
      return response.data;
    },
    enabled: shouldLoadPaperDetail,
  });

  const renderDetailContent = () => {
    if (!selectedNotification) return null;

    const isPaperTitleLoading =
      shouldLoadPaperDetail && (isLoadingPaperDetail || isFetchingPaperDetail);
    const rawTitle =
      paperDetail?.title_zh ??
      paperDetail?.title_en ??
      selectedNotification.paper_title_zh ??
      selectedNotification.paper_title ??
      selectedNotification.paper_title_en ??
      selectedNotification.title ??
      "";
    const formattedTitle =
      rawTitle && (rawTitle.includes("《") || rawTitle.includes("》"))
        ? rawTitle
        : rawTitle
        ? `《${rawTitle}》`
        : "《您的论文》";
    const showTitleLoading = isPaperTitleLoading && !paperDetail;

    if (isRejectionSelected) {
      return (
        <Stack gap="xs">
          {showTitleLoading && <Text c="dimmed">正在获取论文标题...</Text>}
          <Text>
            感谢您向本刊投稿您的论文
            {formattedTitle}
            。我们已完成评审程序，并认真考虑了审稿人及编辑部的意见。
          </Text>
          <Text>
            经过充分讨论与评估，我们遗憾地通知您，本刊决定不录用您的稿件发表。具体意见可见论文详细页。
          </Text>
          <Text>
            我们真诚感谢您选择本刊投稿，也希望这些意见能对您后续的研究有所帮助。若您根据审稿意见对论文进行大幅修改，也欢迎将改进后的研究成果再次提交至本刊或其他合适的期刊。
          </Text>
          <Text>祝您研究顺利！</Text>
        </Stack>
      );
    }

    if (isRevisionSelected) {
      const formattedDeadline = selectedNotification.deadline
        ? dayjs(selectedNotification.deadline).format("YYYY年MM月DD日")
        : null;

      return (
        <Stack gap="xs">
          {showTitleLoading && <Text c="dimmed">正在获取论文标题...</Text>}
          <Text>
            感谢您向本刊投稿您的论文
            {formattedTitle}
            。您的稿件已完成同行评审。经编辑部与审稿专家综合评议，我们认为该研究具有一定的学术价值和发表潜力，但目前的稿件尚需进一步修改和完善，方可进入下一步审稿流程。
          </Text>
          <Text>
            请您仔细阅读论文详细页的审稿意见，并据此对稿件进行充分修改。修改稿请于
            {formattedDeadline ? (
              <Text span fw={500}>
                {formattedDeadline}
              </Text>
            ) : (
              <Text span fw={500}>系统指定的截止日期</Text>
            )}
            前通过投稿系统提交。
          </Text>
          <Text>
            收到您的修改稿后，我们将根据修订质量决定是否进入下一轮审稿或直接录用。
          </Text>
          <Text>感谢您对本刊的支持与信任，期待您的修订稿。</Text>
        </Stack>
      );
    }

    if (selectedNotification.notification_type === "Acceptance Notification") {
      const formattedDeadline = selectedNotification.deadline
        ? formatDeadlineDisplay(selectedNotification.deadline)
        : null;
      const paymentRecords = Array.isArray(paymentData) ? paymentData : [];
      const primaryPayment = paymentRecords[0] ?? null;
      const rawAmount =
        primaryPayment?.amount !== undefined && primaryPayment?.amount !== null
          ? Number(primaryPayment.amount)
          : null;
      const hasValidAmount =
        rawAmount !== null && !Number.isNaN(rawAmount) && rawAmount > 0;
      const paymentStatus = primaryPayment?.status ?? null;
      const isPaid = paymentStatus === "Paid";
      const isPaymentLoading = isLoadingPayment || isFetchingPayment;
      const handlePaymentSubmit = () => {
        if (
          isPaid ||
          !selectedPaperId ||
          rawAmount === null ||
          Number.isNaN(rawAmount)
        ) {
          if (!isPaid) {
            notifications.show({
              title: "无法提交支付申请",
              message: "当前无法确定支付金额，请稍后再试或联系编辑。",
              color: "red",
            });
          }
          return;
        }
        paymentMutation.mutate({
          paperId: selectedPaperId,
          amount: rawAmount,
        });
      };

      return (
        <Stack gap="sm">
          {showTitleLoading && <Text c="dimmed">正在获取论文标题...</Text>}
          <Text>
            您的论文{" "}
            <Text span fw={500}>
              {formattedTitle}
            </Text>{" "}
            已被录用！
            {formattedDeadline ? (
              <>
                请在{" "}
                <Text span fw={500}>
                  {formattedDeadline}
                </Text>{" "}
                前向下面的账户支付{" "}
                {hasValidAmount ? (
                  <Text span fw={500}>
                    {amountFormatter.format(rawAmount)}元
                  </Text>
                ) : (
                  <Text span fw={500} c="red">
                    版面费金额获取中
                  </Text>
                )}
                。
              </>
            ) : (
              <>
                请尽快向下面的账户支付{" "}
                {hasValidAmount ? (
                  <Text span fw={500}>
                    {amountFormatter.format(rawAmount)}元
                  </Text>
                ) : (
                  <Text span fw={500} c="red">
                    版面费金额获取中
                  </Text>
                )}
                。
              </>
            )}
          </Text>
          {(isLoadingPayment || isFetchingPayment) && (
            <Text c="dimmed">正在获取支付信息...</Text>
          )}
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
          {isPaid && <Text c="green">系统已记录支付，无需重复提交。</Text>}
          <Group justify="flex-start">
            <Button
              onClick={handlePaymentSubmit}
              loading={paymentMutation.isPending}
              disabled={
                paymentMutation.isPending ||
                isPaymentLoading ||
                !hasValidAmount ||
                isPaid
              }
            >
              {isPaid ? "已支付" : "支付"}
            </Button>
          </Group>
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
                  {item.deadline &&
                    item.notification_type !== "Rejection Notification" && (
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
            {selectedNotification.deadline &&
              selectedNotification.notification_type !==
                "Rejection Notification" && (
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
