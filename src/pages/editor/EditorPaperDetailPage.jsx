import {
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  LoadingOverlay,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconDownload, IconSend } from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import dayjs from 'dayjs';
import { notifications } from '@mantine/notifications';
import { useForm, zodResolver } from '@mantine/form';
import { z } from 'zod';
import { useDisclosure } from '@mantine/hooks';
import { useMemo } from 'react';

const assignSchema = z.object({
  experts: z.array(z.string()).min(1, '请选择专家').max(3, '最多选择3位专家'),
  due_date: z.date({ required_error: '请选择截止日期' })
});

const notificationSchema = z.object({
  type: z.string().min(1, '请选择通知类型'),
  deadline: z.date().optional(),
  title: z.string().min(1, '请输入标题'),
  content: z.string().min(1, '请输入通知内容')
});

const notificationTypes = [
  { label: '录用通知', value: 'Acceptance' },
  { label: '拒稿通知', value: 'Rejection' },
  { label: '大修通知', value: 'Major Revision' },
  { label: '审稿任务', value: 'Review Assignment' },
  { label: '支付确认', value: 'Payment Confirmation' }
];

export default function EditorPaperDetailPage() {
  const { paperId } = useParams();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);

  const { data: paper, isLoading } = useQuery({
    queryKey: ['paper', paperId],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.detail(paperId));
      return response.data;
    }
  });

  const { data: experts } = useQuery({
    queryKey: ['experts'],
    queryFn: async () => {
      const response = await api.get(endpoints.users.experts);
      return response.data ?? [];
    }
  });

  const { data: comments } = useQuery({
    queryKey: ['review-comments', paperId],
    queryFn: async () => {
      const response = await api.get(endpoints.reviews.comments(paperId));
      return response.data ?? [];
    }
  });

  const integrityMutation = useMutation({
    mutationFn: async (isComplete) => {
      const response = await api.put(endpoints.papers.integrity(paperId), { is_complete: isComplete });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: '更新成功',
        message: '形式审查状态已更新',
        color: 'green'
      });
      queryClient.invalidateQueries({ queryKey: ['paper', paperId] });
    }
  });

  const assignForm = useForm({
    initialValues: {
      experts: [],
      due_date: null
    },
    validate: zodResolver(assignSchema)
  });

  const assignMutation = useMutation({
    mutationFn: async (values) => {
      const due = dayjs(values.due_date).format('YYYY-MM-DD');
      const requests = values.experts.map((expertId) =>
        api.post(endpoints.reviews.assign, {
          paper_id: Number(paperId),
          expert_id: Number(expertId),
          assigned_due_date: due
        })
      );
      await Promise.all(requests);
    },
    onSuccess: () => {
      notifications.show({
        title: '分配成功',
        message: '已通知专家审稿',
        color: 'green'
      });
      assignForm.reset();
      queryClient.invalidateQueries({ queryKey: ['review-comments', paperId] });
    }
  });

  const notificationForm = useForm({
    initialValues: {
      type: 'Review Assignment',
      deadline: null,
      title: '',
      content: ''
    },
    validate: zodResolver(notificationSchema)
  });

  const notificationMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        type: values.type,
        title: values.title,
        content: values.content
      };
      if (values.deadline) {
        payload.deadline = dayjs(values.deadline).toISOString();
      }
      const response = await api.post(endpoints.notifications.author, {
        ...payload,
        paper_id: Number(paperId)
      });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: '通知已发送',
        message: '作者会立即收到通知',
        color: 'green'
      });
      notificationForm.reset();
      close();
    }
  });

  const aggregatedConclusion = useMemo(() => {
    const summary = { Accept: 0, 'Minor Revision': 0, 'Major Revision': 0, Reject: 0 };
    (comments || []).forEach((comment) => {
      if (summary[comment.conclusion] !== undefined) {
        summary[comment.conclusion] += 1;
      }
    });
    const entries = Object.entries(summary).filter(([, count]) => count > 0);
    return entries.length > 0 ? entries : null;
  }, [comments]);

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2}>{paper?.title_zh || paper?.title_en || '稿件详情'}</Title>
          <Text size="sm" c="dimmed">
            提交日期：{paper?.submission_date ? dayjs(paper.submission_date).format('YYYY-MM-DD') : '—'}
          </Text>
        </div>
        {paper?.attachment_url && (
          <Button component="a" href={paper.attachment_url} target="_blank" leftSection={<IconDownload size={16} />}>
            下载稿件
          </Button>
        )}
      </Group>

      <Card withBorder shadow="sm" radius="md">
        <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
        <Stack gap="md">
          <Group gap="xs">
            <Badge color="blue">{paper?.status}</Badge>
            {paper?.is_complete !== undefined && (
              <Badge color={paper.is_complete ? 'green' : 'red'}>
                {paper.is_complete ? '形式审查通过' : '待完善'}
              </Badge>
            )}
          </Group>
          <Text fw={600}>摘要</Text>
          <Text>{paper?.abstract_zh || '—'}</Text>
          <Text fw={600}>作者</Text>
          <Stack gap={4}>
            {(paper?.authors || []).map((author) => (
              <Text key={`${author.author_id}-${author.institution_id}`}>
                {author.name} / {author.institution_name}
              </Text>
            ))}
          </Stack>
        </Stack>
      </Card>

      <Card withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <div>
            <Title order={4}>形式完整性检查</Title>
            <Text size="sm" c="dimmed">
              确认稿件是否符合投稿模板、材料完整等要求
            </Text>
          </div>
          <Checkbox
            label="审核通过"
            checked={Boolean(paper?.is_complete)}
            onChange={(event) => integrityMutation.mutate(event.currentTarget.checked)}
          />
        </Group>
      </Card>

      <Card withBorder shadow="sm">
        <Title order={4} mb="md">
          分配审稿专家
        </Title>
        <form onSubmit={assignForm.onSubmit((values) => assignMutation.mutate(values))}>
          <Stack gap="md">
            <MultiSelect
              label="选择专家（最多3位）"
              data={(experts || []).map((expert) => ({
                value: String(expert.expert_id || expert.id),
                label: `${expert.name} / ${expert.research_direction || ''}`
              }))}
              value={assignForm.values.experts}
              onChange={(value) => assignForm.setFieldValue('experts', value)}
              searchable
              placeholder="输入姓名或研究方向"
              error={assignForm.errors.experts}
            />
            <DatePickerInput
              label="审稿截止日期"
              value={assignForm.values.due_date}
              onChange={(value) => assignForm.setFieldValue('due_date', value)}
              error={assignForm.errors.due_date}
              minDate={dayjs().add(1, 'day').toDate()}
            />
            <Group justify="flex-end">
              <Button type="submit" loading={assignMutation.isPending}>
                分配审稿
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      <Card withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <Title order={4}>审稿意见</Title>
          <Button variant="light" onClick={open} leftSection={<IconSend size={16} />}>
            发送通知
          </Button>
        </Group>
        {aggregatedConclusion && (
          <Stack gap="xs" mb="md">
            <Text fw={600}>结论投票结果</Text>
            <Group gap="sm">
              {aggregatedConclusion.map(([key, count]) => (
                <Badge key={key} color="blue" variant="light">
                  {key}：{count}
                </Badge>
              ))}
            </Group>
          </Stack>
        )}
        <Table striped withBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>专家</Table.Th>
              <Table.Th>结论</Table.Th>
              <Table.Th>意见摘要</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(comments || []).map((comment) => (
              <Table.Tr key={comment.assignment_id}>
                <Table.Td>{comment.expert_name || comment.expert_id}</Table.Td>
                <Table.Td>{comment.conclusion}</Table.Td>
                <Table.Td>
                  <Text size="sm">{comment.positive_comments}</Text>
                  <Text size="sm" c="dimmed">
                    {comment.negative_comments}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {(comments || []).length === 0 && <Text mt="md">暂无审稿意见。</Text>}
      </Card>

      <Modal opened={opened} onClose={close} title="发送作者通知" size="lg">
        <form onSubmit={notificationForm.onSubmit((values) => notificationMutation.mutate(values))}>
          <Stack gap="md">
            <Select
              label="通知类型"
              data={notificationTypes}
              value={notificationForm.values.type}
              onChange={(value) =>
                notificationForm.setFieldValue('type', value || 'Review Assignment')
              }
              error={notificationForm.errors.type}
            />
            <TextInput label="通知标题" {...notificationForm.getInputProps('title')} />
            <Textarea label="通知内容" minRows={4} {...notificationForm.getInputProps('content')} />
            <DatePickerInput
              label="截止时间（可选）"
              value={notificationForm.values.deadline}
              onChange={(value) => notificationForm.setFieldValue('deadline', value)}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
                取消
              </Button>
              <Button type="submit" loading={notificationMutation.isPending}>
                发送
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
