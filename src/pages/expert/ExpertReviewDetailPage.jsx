import {
  Badge,
  Button,
  Card,
  Group,
  LoadingOverlay,
  Radio,
  Stack,
  Text,
  Textarea,
  Title
} from '@mantine/core';
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, zodResolver } from '@mantine/form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import { notifications } from '@mantine/notifications';

const schema = z.object({
  conclusion: z.enum(['Accept', 'Minor Revision', 'Major Revision', 'Reject'], {
    required_error: '请选择结论'
  }),
  positive_comments: z
    .string()
    .min(20, '不少于20字')
    .max(1000, '不超过1000字'),
  negative_comments: z
    .string()
    .min(20, '不少于20字')
    .max(1000, '不超过1000字'),
  modification_advice: z
    .string()
    .min(20, '不少于20字')
    .max(1000, '不超过1000字')
});

export default function ExpertReviewDetailPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['review', assignmentId],
    queryFn: async () => {
      const response = await api.get(endpoints.reviews.assignment(assignmentId));
      return response.data;
    }
  });

  const form = useForm({
    initialValues: {
      conclusion: 'Accept',
      positive_comments: '',
      negative_comments: '',
      modification_advice: ''
    },
    validate: zodResolver(schema)
  });

  useEffect(() => {
    if (data?.conclusion) {
      form.setValues({
        conclusion: data.conclusion,
        positive_comments: data.positive_comments || '',
        negative_comments: data.negative_comments || '',
        modification_advice: data.modification_advice || ''
      });
    }
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        ...values
      };
      const response = await api.put(endpoints.reviews.assignment(assignmentId), payload);
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: '审稿意见提交成功',
        message: '感谢您的审稿',
        color: 'green'
      });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'assignments'] });
      navigate('/expert/reviews');
    },
    onError: (error) => {
      const fieldErrors = error.response?.data?.errors;
      if (fieldErrors) {
        form.setErrors(fieldErrors);
      }
    }
  });

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>审稿任务详情</Title>
        <Button variant="light" onClick={() => navigate(-1)}>
          返回列表
        </Button>
      </Group>

      <Card withBorder shadow="sm" radius="md">
        <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
        <Stack gap="sm">
          <Group gap="xs">
            <Badge color="blue">论文ID：{data?.paper_id}</Badge>
            <Badge color="orange">状态：{data?.status || 'Pending'}</Badge>
          </Group>
          <Text fw={600}>标题</Text>
          <Text>{data?.paper_title || '—'}</Text>
          <Text fw={600}>截止日期</Text>
          <Text>
            {data?.due_date ? dayjs(data.due_date).format('YYYY-MM-DD HH:mm') : '—'}
          </Text>
          <Text fw={600}>稿件附件</Text>
          {data?.attachment_url ? (
            <Button component="a" href={data.attachment_url} target="_blank">
              下载稿件
            </Button>
          ) : (
            <Text>暂无附件</Text>
          )}
        </Stack>
      </Card>

      <Card withBorder shadow="sm" radius="md">
        <Title order={4} mb="md">
          提交审稿意见
        </Title>
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="md">
            <Radio.Group
              label="审稿结论"
              required
              {...form.getInputProps('conclusion')}
            >
              <Group>
                <Radio value="Accept" label="接受" />
                <Radio value="Minor Revision" label="小修" />
                <Radio value="Major Revision" label="大修" />
                <Radio value="Reject" label="拒稿" />
              </Group>
            </Radio.Group>
            <Textarea
              label="积极意见"
              minRows={4}
              required
              {...form.getInputProps('positive_comments')}
            />
            <Textarea
              label="不足之处"
              minRows={4}
              required
              {...form.getInputProps('negative_comments')}
            />
            <Textarea
              label="修改建议"
              minRows={4}
              required
              {...form.getInputProps('modification_advice')}
            />
            <Group justify="flex-end">
              <Button type="submit" loading={mutation.isPending}>
                提交意见
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
