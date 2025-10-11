/**
 * 作者投稿表单负责新建/编辑及上传稿件。为了减少表单状态与副作用耦合，
 * 所有外部数据获取都集中在 React Query 中，表单仅负责渲染与收集值。
 */
import {
  ActionIcon,
  Button,
  Card,
  FileInput,
  Group,
  LoadingOverlay,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Title
} from '@mantine/core';
import { IconPlus, IconTrash, IconUpload } from '@tabler/icons-react';
import { useForm, zodResolver } from '@mantine/form';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import {
  createPaperSchema,
  editPaperSchema,
  sanitizeKeywords,
  ACCEPTED_FILE_TYPES
} from '../../features/papers/paperSchema.js';

const initialValues = {
  title_zh: '',
  title_en: '',
  abstract_zh: '',
  abstract_en: '',
  keywords_zh: [],
  keywords_en: [],
  fund_name: '',
  fund_code: '',
  authors: [{ author_id: '', institution_id: '' }],
  attachment: null
};

export default function AuthorPaperFormPage({ mode }) {
  const isEdit = mode === 'edit';
  const { paperId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingFile, setExistingFile] = useState(null);

  // 表单实例：依据 mode 加载不同的 Zod schema。
  const form = useForm({
    initialValues,
    validate: zodResolver(isEdit ? editPaperSchema : createPaperSchema)
  });

  // 基础资料：自动带出作者本人及单位信息，减少重复输入。
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get(endpoints.users.profile);
      return response.data;
    }
  });

  const { data: paperData, isLoading } = useQuery({
    queryKey: ['paper', paperId],
    enabled: isEdit && Boolean(paperId),
    queryFn: async () => {
      const response = await api.get(endpoints.papers.detail(paperId));
      return response.data;
    },
    onSuccess: (paper) => {
      form.setValues({
        title_zh: paper.title_zh || '',
        title_en: paper.title_en || '',
        abstract_zh: paper.abstract_zh || '',
        abstract_en: paper.abstract_en || '',
        keywords_zh: paper.keywords_zh || [],
        keywords_en: paper.keywords_en || [],
        fund_name: paper.fund_name || '',
        fund_code: paper.fund_code || '',
        authors:
          paper.authors?.map((author) => ({
            author_id: String(author.author_id),
            institution_id: String(author.institution_id)
          })) || [{ author_id: '', institution_id: '' }],
        attachment: null
      });
      setExistingFile(paper.attachment_url || null);
    }
  });

  /**
   * 非编辑态时默认把当前登录作者写入 authors 列表。由于作者可能有多个单位，这里仅选取第一个，
   * 后续允许在 UI 中再调整。
   */
  useEffect(() => {
    if (!isEdit && profile && userId) {
      form.setValues((prev) => ({
        ...prev,
        authors: [
          {
            author_id: String(userId),
            institution_id: profile.institutions?.[0]?.id
              ? String(profile.institutions[0].id)
              : ''
          }
        ]
      }));
    }
  }, [isEdit, profile, userId, form]);

  /**
   * 作者和单位的下拉数据：后端没有专门接口，这里复用用户 profile 中的缓存字段。
   * 注意 self（本人）选项优先显示，并带上 (本人) 标注。
   */
  const authorOptions = useMemo(() => {
    const authors = profile?.authorsList || profile?.authors || [];
    const self = profile
      ? [
          {
            value: String(profile.user_id || profile.id || userId),
            label: `${profile.name || '本人'} (本人)`
          }
        ]
      : [];
    return [
      ...self,
      ...authors.map((author) => ({
        value: String(author.author_id || author.id),
        label: author.name
      }))
    ];
  }, [profile, userId]);

  const institutionOptions = useMemo(() => {
    const institutions = profile?.institutions || [];
    return institutions.map((item) => ({
      value: String(item.id || item.institution_id),
      label: `${item.name}${item.city ? ` / ${item.city}` : ''}`
    }));
  }, [profile]);

  /**
   * 提交/更新论文：通过 FormData 上传文件，其他字段使用 JSON 序列化。
   * 上传进度通过 Axios onUploadProgress 收集，以便前端展示。
   */
  const mutation = useMutation({
    mutationFn: async (values) => {
      const endpoint = isEdit
        ? endpoints.papers.detail(paperId)
        : endpoints.papers.base;
      const method = isEdit ? api.put : api.post;

      const formData = new FormData();
      formData.append('title_zh', values.title_zh);
      if (values.title_en) formData.append('title_en', values.title_en);
      formData.append('abstract_zh', values.abstract_zh);
      if (values.abstract_en) formData.append('abstract_en', values.abstract_en);
      formData.append('keywords_zh', JSON.stringify(values.keywords_zh));
      formData.append('keywords_en', JSON.stringify(values.keywords_en));
      if (values.fund_name) formData.append('fund_name', values.fund_name);
      if (values.fund_code) formData.append('fund_code', values.fund_code);
      formData.append('authors', JSON.stringify(values.authors));
      if (values.attachment instanceof File) {
        formData.append('attachment', values.attachment);
      }

      const response = await method(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      });

      return response.data;
    },
    onSuccess: (result) => {
      notifications.show({
        title: isEdit ? '论文更新成功' : '论文提交成功',
        message: '您可以在列表中查看最新状态',
        color: 'green'
      });
      queryClient.invalidateQueries({ queryKey: ['papers', 'author'] });
      navigate(`/author/papers/${result.paper_id || paperId || result.id}`);
    },
    onError: (error) => {
      const fieldErrors = error.response?.data?.errors;
      if (fieldErrors) {
        form.setErrors(fieldErrors);
      }
    },
    onSettled: () => {
      setTimeout(() => setUploadProgress(0), 500);
    }
  });

  const handleSubmit = (values) => {
    if (!isEdit && !values.attachment) {
      form.setFieldError('attachment', '请上传稿件附件');
      return;
    }
    // 关键词去重与去空格，确保后台能接收规范数据。
    mutation.mutate({
      ...values,
      keywords_zh: sanitizeKeywords(values.keywords_zh),
      keywords_en: sanitizeKeywords(values.keywords_en)
    });
  };

  return (
    <Stack>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2}>{isEdit ? '编辑论文' : '提交新论文'}</Title>
          {paperData?.updated_at && (
            <Text size="sm" c="dimmed">
              最近更新：{dayjs(paperData.updated_at).format('YYYY-MM-DD HH:mm')}
            </Text>
          )}
        </div>
        <Button variant="light" onClick={() => navigate('/author/papers')}>
          返回列表
        </Button>
      </Group>
      <Card withBorder shadow="sm" radius="md" pos="relative">
        <LoadingOverlay visible={isLoading || mutation.isPending} overlayProps={{ blur: 2 }} />
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="xl">
            <Tabs defaultValue="basic">
              <Tabs.List>
                <Tabs.Tab value="basic">基本信息</Tabs.Tab>
                <Tabs.Tab value="authors">作者与单位</Tabs.Tab>
                <Tabs.Tab value="attachment">附件与提交</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="basic" pt="md">
                <Stack gap="md">
                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <TextInput label="中文标题" required {...form.getInputProps('title_zh')} />
                    <TextInput label="英文标题" {...form.getInputProps('title_en')} />
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <Textarea
                      label="中文摘要"
                      minRows={4}
                      required
                      {...form.getInputProps('abstract_zh')}
                    />
                    <Textarea
                      label="英文摘要"
                      minRows={4}
                      {...form.getInputProps('abstract_en')}
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <TagsInput
                      label="中文关键词"
                      description="1-8 个关键词，回车分隔"
                      required
                      {...form.getInputProps('keywords_zh')}
                    />
                    <TagsInput
                      label="英文关键词"
                      description="可选，回车分隔"
                      {...form.getInputProps('keywords_en')}
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <TextInput label="资助基金名称" {...form.getInputProps('fund_name')} />
                    <TextInput label="资助编号" {...form.getInputProps('fund_code')} />
                  </SimpleGrid>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="authors" pt="md">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={4}>作者与单位关联</Title>
                    <Button
                      leftSection={<IconPlus size={16} />}
                      variant="light"
                      onClick={() =>
                        form.insertListItem('authors', { author_id: '', institution_id: '' })
                      }
                    >
                      添加作者
                    </Button>
                  </Group>

                  {form.values.authors.map((item, index) => (
                    <Card withBorder key={index}>
                      <Group justify="space-between" mb="sm">
                        <Text fw={600}>作者 {index + 1}</Text>
                        {form.values.authors.length > 1 && (
                          <ActionIcon
                            color="red"
                            onClick={() => form.removeListItem('authors', index)}
                            aria-label="删除作者"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                      <SimpleGrid cols={{ base: 1, md: 2 }}>
                        <Select
                          label="作者"
                          placeholder="请选择作者"
                          data={authorOptions}
                          searchable
                          value={item.author_id ? String(item.author_id) : ''}
                          onChange={(value) =>
                            form.setFieldValue(`authors.${index}.author_id`, value || '')
                          }
                          error={form.errors[`authors.${index}.author_id`]}
                        />
                        <Select
                          label="所属单位"
                          placeholder="请选择单位"
                          data={institutionOptions}
                          searchable
                          value={item.institution_id ? String(item.institution_id) : ''}
                          onChange={(value) =>
                            form.setFieldValue(`authors.${index}.institution_id`, value || '')
                          }
                          error={form.errors[`authors.${index}.institution_id`]}
                        />
                      </SimpleGrid>
                    </Card>
                  ))}
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="attachment" pt="md">
                <Stack gap="md">
                  {existingFile && !form.values.attachment && (
                    <Card withBorder>
                      <Text>
                        当前附件：
                        <Button
                          component="a"
                          href={existingFile}
                          target="_blank"
                          variant="subtle"
                          leftSection={<IconUpload size={16} />}
                        >
                          下载查看
                        </Button>
                      </Text>
                    </Card>
                  )}
                  <FileInput
                    label="上传稿件附件"
                    placeholder="选择 PDF 或 Word 文件"
                    required={!isEdit}
                    accept=".pdf,.doc,.docx"
                    leftSection={<IconUpload size={16} />}
                    value={form.values.attachment}
                    onChange={(file) => form.setFieldValue('attachment', file)}
                    error={form.errors.attachment}
                  />
                  {uploadProgress > 0 && (
                    <Progress value={uploadProgress} size="lg" color="blue" />
                  )}
                  <Text size="sm" c="dimmed">
                    支持 PDF / DOC / DOCX，最大 20MB。
                  </Text>
                </Stack>
              </Tabs.Panel>
            </Tabs>

            <Group justify="flex-end" gap="md">
              <Button variant="default" onClick={() => navigate(-1)}>
                取消
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                {isEdit ? '保存修改' : '提交论文'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}

AuthorPaperFormPage.propTypes = {
  mode: PropTypes.oneOf(['create', 'edit']).isRequired
};
