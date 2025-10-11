/**
 * 论文详情页包含稿件基础信息与修改稿提交流程。这里聚焦于数据展示与附件上传，
 * 不在前端混入状态流转逻辑，确保功能职责清晰。
 */
import {
  Anchor,
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  LoadingOverlay,
  Progress,
  Stack,
  Text,
  Title,
  Timeline
} from '@mantine/core';
import { IconDownload, IconSend } from '@tabler/icons-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import dayjs from 'dayjs';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';

export default function AuthorPaperDetailPage() {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [revisionFile, setRevisionFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 单篇论文详情：缓存 key 带上 paperId，方便提交后针对性失效。
  const { data: paper, isLoading } = useQuery({
    queryKey: ['paper', paperId],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.detail(paperId));
      return response.data;
    }
  });

  /**
   * 修改稿上传：只负责附件替换，其他元信息不允许在此处修改。
   * 上传成功后刷新当前详情，确保最新附件链接立即可见。
   */
  const updateMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('attachment', file);
      const response = await api.put(endpoints.papers.detail(paperId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded * 100) / event.total));
          }
        }
      });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: '修改稿已提交',
        message: '请等待编辑部审核',
        color: 'green'
      });
      queryClient.invalidateQueries({ queryKey: ['paper', paperId] });
    },
    onError: (error) => {
      notifications.show({
        title: '提交失败',
        message: error.friendlyMessage || '提交修改稿失败，请稍后再试',
        color: 'red'
      });
    },
    onSettled: () => {
      setTimeout(() => setUploadProgress(0), 400);
    }
  });

  /**
   * 后端若尚未提供完整时间线，前端给出默认流程，确保界面始终有反馈。
   * 一旦接口返回 timeline 字段，将直接使用真实数据。
   */
  const stages = paper?.timeline || [
    { id: 1, name: '收稿', status: 'done', date: paper?.submission_date },
    { id: 2, name: '初审', status: 'pending' },
    { id: 3, name: '评审', status: 'pending' },
    { id: 4, name: '修改', status: 'pending' },
    { id: 5, name: '复审', status: 'pending' },
    { id: 6, name: '录用', status: 'pending' },
    { id: 7, name: '支付版面费', status: 'pending' },
    { id: 8, name: '排期', status: 'pending' }
  ];

  // 仅在待修状态下展示上传区，与业务约定保持一致。
  const canSubmitRevision = ['revision', 'major_revision'].includes(paper?.status);

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2}>{paper?.title_zh || '论文详情'}</Title>
          <Text size="sm" c="dimmed">
            提交日期：{paper?.submission_date ? dayjs(paper.submission_date).format('YYYY-MM-DD') : '—'}
          </Text>
        </div>
        <Button variant="light" onClick={() => navigate(`/author/papers/${paperId}/edit`)}>
          编辑信息
        </Button>
      </Group>

      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
        <Stack gap="md">
          <Group gap="xs">
            <Badge color="blue">{paper?.status || '未知状态'}</Badge>
            {paper?.current_stage && <Badge variant="light">{paper.current_stage}</Badge>}
          </Group>
          <Text fw={600}>英文标题</Text>
          <Text>{paper?.title_en || '—'}</Text>
          <Text fw={600}>中文摘要</Text>
          <Text>{paper?.abstract_zh || '—'}</Text>
          <Text fw={600}>英文摘要</Text>
          <Text>{paper?.abstract_en || '—'}</Text>
          <Text fw={600}>关键词</Text>
          <Group gap="xs">
            {(paper?.keywords_zh || []).map((keyword) => (
              <Badge key={keyword} color="blue" variant="light">
                {keyword}
              </Badge>
            ))}
            {(paper?.keywords_en || []).map((keyword) => (
              <Badge key={keyword} color="grape" variant="light">
                {keyword}
              </Badge>
            ))}
          </Group>
          <Text fw={600}>资助基金</Text>
          <Text>
            {paper?.fund_name || '—'} {paper?.fund_code ? `(${paper.fund_code})` : ''}
          </Text>
          <Text fw={600}>作者列表</Text>
          <Stack gap={4}>
            {(paper?.authors || []).map((author) => (
              <Text key={`${author.author_id}-${author.institution_id}`}>
                {author.name} - {author.institution_name}
              </Text>
            ))}
          </Stack>
          <Text fw={600}>附件</Text>
          {paper?.attachment_url ? (
            <Button
              component="a"
              href={paper.attachment_url}
              target="_blank"
              leftSection={<IconDownload size={16} />}
            >
              下载附件
            </Button>
          ) : (
            <Text>暂无附件</Text>
          )}
        </Stack>
      </Card>

      <Card withBorder shadow="sm" radius="md">
        <Title order={4} mb="md">
          进度时间线
        </Title>
        <Timeline bulletSize={24} lineWidth={2}>
          {stages.map((stage) => (
            <Timeline.Item
              key={stage.id || stage.name}
              title={stage.name}
              bullet={stage.status === 'done' ? '✓' : undefined}
            >
              <Text size="sm">
                {stage.date ? dayjs(stage.date).format('YYYY-MM-DD') : '待更新'}
              </Text>
              {stage.comment && (
                <Text size="sm" c="dimmed">
                  {stage.comment}
                </Text>
              )}
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>

      {canSubmitRevision && (
        <Card withBorder shadow="sm" radius="md">
          <Title order={4} mb="md">
            修改稿提交
          </Title>
          <Stack>
            <Text size="sm" c="dimmed">
              请在截止时间前上传修改稿，提交后编辑将进行复审。
            </Text>
            <FileInput
              label="选择修改稿附件"
              accept=".pdf,.doc,.docx"
              placeholder="上传修改稿"
              value={revisionFile}
              onChange={setRevisionFile}
              leftSection={<IconSend size={16} />}
            />
            {uploadProgress > 0 && <Progress value={uploadProgress} />}
            <Group justify="flex-end">
              <Button
                onClick={() => revisionFile && updateMutation.mutate(revisionFile)}
                disabled={!revisionFile}
                loading={updateMutation.isPending}
              >
                提交修改稿
              </Button>
            </Group>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
