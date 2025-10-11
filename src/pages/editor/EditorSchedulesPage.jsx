import {
  ActionIcon,
  Button,
  Card,
  Group,
  LoadingOverlay,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm, zodResolver } from '@mantine/form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import { notifications } from '@mantine/notifications';

const scheduleSchema = z.object({
  paper_id: z.string().min(1, '请选择论文'),
  issue: z.string().min(1, '请输入期号'),
  volume: z.string().min(1, '请输入卷号'),
  page: z.string().min(1, '请输入页码')
});

export default function EditorSchedulesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);

  const { data: schedules, isFetching } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const response = await api.get(endpoints.schedules.base);
      return response.data ?? [];
    }
  });

  const { data: papers } = useQuery({
    queryKey: ['papers', 'editor'],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.base);
      return response.data ?? [];
    }
  });

  const form = useForm({
    initialValues: {
      paper_id: '',
      issue: '',
      volume: '',
      page: ''
    },
    validate: zodResolver(scheduleSchema)
  });

  const createMutation = useMutation({
    mutationFn: async (values) => {
      const response = await api.post(endpoints.schedules.base, {
        paper_id: Number(values.paper_id),
        issue: values.issue,
        volume: values.volume,
        page: values.page
      });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({ title: '排期创建成功', message: '已保存排期信息', color: 'green' });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error) => form.setErrors(error.response?.data?.errors || {})
  });

  const updateMutation = useMutation({
    mutationFn: async (values) => {
      const response = await api.put(endpoints.schedules.detail(editingId), {
        paper_id: Number(values.paper_id),
        issue: values.issue,
        volume: values.volume,
        page: values.page
      });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({ title: '排期已更新', message: '修改已保存', color: 'green' });
      setEditingId(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error) => form.setErrors(error.response?.data?.errors || {})
  });

  const deleteMutation = useMutation({
    mutationFn: async (scheduleId) => {
      await api.delete(endpoints.schedules.detail(scheduleId));
    },
    onSuccess: () => {
      notifications.show({ title: '排期已删除', message: '', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  });

  const handleSubmit = (values) => {
    if (editingId) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (schedule) => {
    setEditingId(schedule.schedule_id || schedule.id);
    form.setValues({
      paper_id: String(schedule.paper_id),
      issue: schedule.issue || '',
      volume: schedule.volume || '',
      page: schedule.page || ''
    });
  };

  return (
    <Stack gap="xl">
      <Title order={2}>排期管理</Title>

      <Card withBorder shadow="sm">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Group gap="md">
              <Select
                label="论文"
                data={(papers || []).map((paper) => ({
                  value: String(paper.paper_id || paper.id),
                  label: paper.title_zh || paper.title_en
                }))}
                {...form.getInputProps('paper_id')}
              />
              <TextInput label="期号" withAsterisk {...form.getInputProps('issue')} />
              <TextInput label="卷号" withAsterisk {...form.getInputProps('volume')} />
              <TextInput label="页码" withAsterisk {...form.getInputProps('page')} />
            </Group>
            <Group justify="flex-end">
              {editingId && (
                <Button
                  variant="default"
                  onClick={() => {
                    setEditingId(null);
                    form.reset();
                  }}
                >
                  取消
                </Button>
              )}
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingId ? '保存修改' : '创建排期'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay visible={isFetching} overlayProps={{ blur: 2 }} />
        <Table striped withBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>排期ID</Table.Th>
              <Table.Th>论文ID</Table.Th>
              <Table.Th>期号</Table.Th>
              <Table.Th>卷号</Table.Th>
              <Table.Th>页码</Table.Th>
              <Table.Th>更新时间</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(schedules || []).map((schedule) => (
              <Table.Tr key={schedule.schedule_id || schedule.id}>
                <Table.Td>{schedule.schedule_id || schedule.id}</Table.Td>
                <Table.Td>{schedule.paper_id}</Table.Td>
                <Table.Td>{schedule.issue}</Table.Td>
                <Table.Td>{schedule.volume}</Table.Td>
                <Table.Td>{schedule.page}</Table.Td>
                <Table.Td>
                  {schedule.updated_at
                    ? dayjs(schedule.updated_at).format('YYYY-MM-DD')
                    : '—'}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="light" onClick={() => handleEdit(schedule)} aria-label="编辑排期">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      color="red"
                      variant="light"
                      onClick={() => deleteMutation.mutate(schedule.schedule_id || schedule.id)}
                      aria-label="删除排期"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {(schedules || []).length === 0 && <Text mt="md">暂无排期，请创建新的排期。</Text>}
      </Card>
    </Stack>
  );
}
