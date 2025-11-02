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
  Timeline,
  SimpleGrid,
  Table
} from '@mantine/core';
import { IconDownload, IconSend } from '@tabler/icons-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { mapProgressToStages } from '../../utils/paperProgress.js';
import {
  getReviewStatusColor,
  getReviewStatusLabel,
  normalizeReviewStatus
} from '../../utils/reviewStatus.js';
import { normalizeProgressStatus } from '../../utils/progressStatus.js';
import { useAuth } from '../../features/auth/AuthProvider.jsx';

export default function AuthorPaperDetailPage() {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [revisionFile, setRevisionFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { userId } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get(endpoints.users.profile);
      return response.data;
    }
  });

  // 单篇论文详情：缓存 key 带上 paperId，方便提交后针对性失效。
  const { data: paper, isLoading } = useQuery({
    queryKey: ['paper', paperId],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.detail(paperId));
      return response.data;
    }
  });

  const {
    data: progress,
    isLoading: isProgressLoading,
    error: progressError
  } = useQuery({
    queryKey: ['paper-progress', paperId],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.progress(paperId));
      return response.data;
    },
    enabled: Boolean(paperId)
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

  // 关键词可能是字符串数组，或 [id, label] 形式的二维数组，这里做统一处理
  const normalizeKeywords = (list) => {
    if (!Array.isArray(list)) return [];
    return list.map((item) => (Array.isArray(item) ? item[1] : item)).filter(Boolean);
  };

  const submissionDate = paper?.submission_date;

  const timelineStages = useMemo(() => {
    const mapped = mapProgressToStages(progress);
    if (submissionDate) {
      return mapped.map((stage) =>
        stage.key === 'submission' && !stage.time ? { ...stage, time: submissionDate } : stage
      );
    }
    return mapped;
  }, [progress, submissionDate]);

  const normalizedProgress = normalizeProgressStatus(paper?.progress);
  const reviewStatus = normalizeReviewStatus(paper?.status);
  // 仅在小修或大修评审意见下展示上传区，与业务约定保持一致。
  const canSubmitRevision = ['Minor Revision', 'Major Revision'].includes(reviewStatus);
  const currentAuthorIds = useMemo(() => {
    const ids = new Set();
    const add = (val) => {
      if (val === undefined || val === null || val === '') return;
      ids.add(String(val));
    };
    add(profile?.author_id);
    add(profile?.default_author_id);
    const possibleLists = [profile?.authorsList, profile?.authors];
    possibleLists.forEach((list) => {
      if (!Array.isArray(list)) return;
      list.forEach((item) => {
        add(item?.author_id ?? item?.id);
      });
    });
    return Array.from(ids);
  }, [profile]);
  const normalizedUserId = useMemo(() => (userId != null ? String(userId) : null), [userId]);
  const isCorrespondingAuthor = useMemo(() => {
    if (!Array.isArray(paper?.authors)) {
      return false;
    }
    return paper.authors.some(
      (author) =>
        author?.is_corresponding &&
        ((author?.author_id != null && currentAuthorIds.includes(String(author.author_id))) ||
          (author?.user_id != null &&
            normalizedUserId &&
            String(author.user_id) === normalizedUserId))
    );
  }, [paper?.authors, currentAuthorIds, normalizedUserId]);

  const handleDownload = async () => {
    const parseFilename = (disposition) => {
      if (!disposition) return null;
      const star = /filename\*=(?:UTF-8''|)([^;\n]+)/i.exec(disposition);
      if (star && star[1]) {
        try {
          return decodeURIComponent(star[1].replace(/\"/g, '').trim());
        } catch (_) {
          return star[1].replace(/\"/g, '').trim();
        }
      }
      const normal = /filename=("?)([^";\n]+)\1/i.exec(disposition);
      if (normal && normal[2]) return normal[2].trim();
      return null;
    };
    const extFromMime = (mime) => {
      const m = (mime || '').toLowerCase();
      if (m.includes('pdf')) return 'pdf';
      if (m.includes('msword')) return 'doc';
      if (m.includes('officedocument.wordprocessingml.document')) return 'docx';
      if (m.includes('zip')) return 'zip';
      if (m.includes('rar')) return 'rar';
      if (m.includes('7z')) return '7z';
      if (m.includes('jpeg')) return 'jpg';
      if (m.includes('jpg')) return 'jpg';
      if (m.includes('png')) return 'png';
      if (m.includes('gif')) return 'gif';
      if (m.includes('plain')) return 'txt';
      return 'bin';
    };

    try {
      const resp = await api.get(endpoints.papers.download(paperId), { responseType: 'blob' });
      const disposition = resp.headers['content-disposition'] || resp.headers['Content-Disposition'];
      const blob = resp.data;
      const mime = blob?.type || resp.headers['content-type'] || resp.headers['Content-Type'] || '';

      let filename = parseFilename(disposition) || `paper-${paperId}`;
      if (!/\.[a-z0-9]+$/i.test(filename)) {
        const ext = extFromMime(mime);
        filename = `${filename}.${ext}`;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      notifications.show({
        title: '下载失败',
        message: error.friendlyMessage || '文件下载失败',
        color: 'red'
      });
    }
  };

  const canEditPaperInfo = normalizedProgress === 'Revisioning' && isCorrespondingAuthor;

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2}>{paper?.title_zh || '论文详情'}</Title>
          <Text size="sm" c="dimmed">
            提交日期：{paper?.submission_date ? dayjs(paper.submission_date).format('YYYY-MM-DD') : '—'}
          </Text>
        </div>
        {canEditPaperInfo && (
          <Button variant="light" onClick={() => navigate(`/author/papers/${paperId}/edit`)}>
            编辑信息
          </Button>
        )}
      </Group>

      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
        <Stack gap="md">
          <Group gap="xs">
            <Badge color={getReviewStatusColor(paper?.status)}>
              {getReviewStatusLabel(paper?.status)}
            </Badge>
            {paper?.current_stage && <Badge variant="light">{paper.current_stage}</Badge>}
          </Group>
          <Text fw={600}>英文标题</Text>
          <Text>{paper?.title_en || '—'}</Text>
          <Text fw={600}>中文摘要</Text>
          <Text>{paper?.abstract_zh || '—'}</Text>
          <Text fw={600}>英文摘要</Text>
          <Text>{paper?.abstract_en || '—'}</Text>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Stack gap={4}>
              <Text fw={600}>中文关键词</Text>
              <Group gap="xs">
                {normalizeKeywords(paper?.keywords_zh).map((keyword, idx) => (
                  <Badge key={`zh-${idx}`} color="blue" variant="light">
                    {keyword}
                  </Badge>
                ))}
                {normalizeKeywords(paper?.keywords_zh).length === 0 && (
                  <Text c="dimmed">—</Text>
                )}
              </Group>
            </Stack>
            <Stack gap={4}>
              <Text fw={600}>英文关键词</Text>
              <Group gap="xs">
                {normalizeKeywords(paper?.keywords_en).map((keyword, idx) => (
                  <Badge key={`en-${idx}`} color="grape" variant="light">
                    {keyword}
                  </Badge>
                ))}
                {normalizeKeywords(paper?.keywords_en).length === 0 && (
                  <Text c="dimmed">—</Text>
                )}
              </Group>
            </Stack>
          </SimpleGrid>

          <Text fw={600}>资助资金</Text>
          {Array.isArray(paper?.funds) && paper.funds.length > 0 ? (
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>项目名称</Table.Th>
                  <Table.Th>项目编号</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paper.funds.map((fund) => (
                  <Table.Tr key={fund.fund_id || `${fund.project_name}-${fund.project_number}`}>
                    <Table.Td>{fund.project_name || '—'}</Table.Td>
                    <Table.Td>{fund.project_number || '—'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Text>—</Text>
          )}
          <Text fw={600}>作者列表</Text>
          <Stack gap={4}>
            {(paper?.authors || []).map((author) => (
              <Text key={`${author.author_id}-${author.institution_id}`}>
                {author.name} - {author.institution_name}
              </Text>
            ))}
          </Stack>
          <Text fw={600}>附件</Text>
          <Button onClick={handleDownload} leftSection={<IconDownload size={16} />}>下载附件</Button>
        </Stack>
      </Card>

      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay visible={isLoading || isProgressLoading} overlayProps={{ blur: 2 }} />
        <Title order={4} mb="md">
          进度时间线
        </Title>
        {progressError ? (
          <Text c="red" size="sm">
            无法加载最新进度，请稍后重试。
          </Text>
        ) : (
          <Timeline bulletSize={24} lineWidth={2}>
            {timelineStages.map((stage) => (
              <Timeline.Item
                key={stage.key}
                title={stage.label}
                bullet={stage.status === 'finished' ? '✓' : undefined}
                color={stage.color}
              >
                <Text size="sm">状态：{stage.statusText}</Text>
                {stage.status === 'finished' && stage.time ? (
                  <Text size="sm" c="dimmed">
                    完成时间：{dayjs(stage.time).format('YYYY-MM-DD HH:mm')}
                  </Text>
                ) : (
                  <Text size="sm" c="dimmed">
                    等待完成
                  </Text>
                )}
              </Timeline.Item>
            ))}
          </Timeline>
        )}
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
