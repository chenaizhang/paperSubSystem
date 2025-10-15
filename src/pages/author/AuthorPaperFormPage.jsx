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
import AuthorInstitutionInput from '../../components/AuthorInstitutionInput.jsx';
import KeywordTagsInput from '../../components/KeywordTagsInput.jsx';
import FundSearch from '../../components/FundSearch.jsx';

const initialValues = {
  title_zh: '',
  title_en: '',
  abstract_zh: '',
  abstract_en: '',
  keywords_zh: [],
  keywords_en: [],
  fund_name: '',
  fund_code: '',
  authors: [{ author_id: null, institution_id: null }],
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
  const [fundCodeLocked, setFundCodeLocked] = useState(true);

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
            author_id: author.author_id,
            institution_id: author.institution_id
          })) || [{ author_id: null, institution_id: null }],
        attachment: null
      });
      setExistingFile(paper.attachment_url || null);
      // 如果已有资助编号，默认锁定编号输入框
      setFundCodeLocked(Boolean(paper.fund_code));
    }
  });

  /**
   * 非编辑态时默认把当前登录作者写入 authors 列表。
   * 新的组件会自动处理第一作者的锁定逻辑。
   */
  useEffect(() => {
    if (!isEdit && userId) {
      form.setValues((prev) => ({
        ...prev,
        authors: [
          {
            author_id: null, // 让组件自动处理第一作者锁定
            institution_id: null
          }
        ]
      }));
    }
  }, [isEdit, userId, form]);

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

  // 在总提交前，确保数据库中存在所有关键词；若不存在则创建
  const ensureKeywordsExist = async (zhList, enList) => {
    const ensureByType = async (names, type) => {
      const searchEndpoint = type === 'en' ? endpoints.keywords.searchEn : endpoints.keywords.searchZh;
      for (const rawName of names) {
        const name = (rawName || '').trim();
        if (!name) continue;
        try {
          const resp = await api.get(searchEndpoint, { params: { query: name } });
          const existed = (Array.isArray(resp.data) ? resp.data : []).some(
            (item) => (item.keyword_name || '').trim() === name
          );
          if (!existed) {
            await api.post(endpoints.keywords.create, {
              keyword_name: name,
              keyword_type: type,
            });
          }
        } catch (e) {
          // 交由 axios 拦截器提示；不中断整体验证与提交
        }
      }
    };

    await Promise.all([ensureByType(zhList, 'zh'), ensureByType(enList, 'en')]);
  };

  const handleSubmit = async (values) => {
    if (!isEdit && !values.attachment) {
      form.setFieldError('attachment', '请上传稿件附件');
      return;
    }
    // 关键词去重与去空格
    const zh = sanitizeKeywords(values.keywords_zh);
    const en = sanitizeKeywords(values.keywords_en);
    // 确保数据库存在新关键词（仅在提交时创建）
    await ensureKeywordsExist(zh, en);
    // 提交论文
    mutation.mutate({
      ...values,
      keywords_zh: zh,
      keywords_en: en
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
            <Stack gap="md">
              <Title order={3}>基本信息</Title>
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
                <KeywordTagsInput
                  label="中文关键词"
                  description="1-8 个关键词，支持输入联想"
                  required
                  type="zh"
                  value={form.values.keywords_zh}
                  onChange={(vals) => form.setFieldValue('keywords_zh', vals)}
                  error={form.errors.keywords_zh}
                />
                <KeywordTagsInput
                  label="英文关键词"
                  description="可选，支持输入联想"
                  type="en"
                  value={form.values.keywords_en}
                  onChange={(vals) => form.setFieldValue('keywords_en', vals)}
                  error={form.errors.keywords_en}
                />
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <FundSearch
                  value={form.values.fund_name}
                  onChange={(v) => {
                    // 修改名称即认为可能为非数据库中的项目名称：先解锁编号并清空
                    form.setFieldValue('fund_name', v);
                    form.setFieldValue('fund_code', '');
                    setFundCodeLocked(false);
                  }}
                  onFundSelect={(fund) => {
                    form.setFieldValue('fund_code', fund?.project_number || '');
                    setFundCodeLocked(true);
                  }}
                  onExactMatchChange={(isExact) => setFundCodeLocked(isExact)}
                  error={form.errors.fund_name}
                />
                <TextInput
                  label="资助编号"
                  {...form.getInputProps('fund_code')}
                  disabled={fundCodeLocked}
                />
              </SimpleGrid>
            </Stack>

            <Stack gap="md">
              <Group justify="space-between">
                <Title order={3}>作者与单位</Title>
                <Button
                  leftSection={<IconPlus size={16} />}
                  variant="light"
                  onClick={() =>
                    form.insertListItem('authors', { author_id: null, institution_id: null })
                  }
                >
                  添加作者
                </Button>
              </Group>

              {form.values.authors.map((item, index) => (
                <AuthorInstitutionInput
                  key={index}
                  value={item}
                  onChange={(newValue) => form.setFieldValue(`authors.${index}`, newValue)}
                  onRemove={() => form.removeListItem('authors', index)}
                  index={index}
                  currentUserId={userId}
                  isFirstAuthor={index === 0}
                  canRemove={form.values.authors.length > 1}
                  errors={{
                    author_id: form.errors[`authors.${index}.author_id`],
                    institution_id: form.errors[`authors.${index}.institution_id`]
                  }}
                />
              ))}
            </Stack>

            <Stack gap="md">
              <Title order={3}>附件与提交</Title>
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
              {uploadProgress > 0 && <Progress value={uploadProgress} size="lg" color="blue" />}
              <Text size="sm" c="dimmed">
                支持 PDF / DOC / DOCX，最大 20MB。
              </Text>
            </Stack>

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
