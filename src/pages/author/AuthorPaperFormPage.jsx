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
  const [existingAttachmentPath, setExistingAttachmentPath] = useState(null);
  const [fundCodeLocked, setFundCodeLocked] = useState(true);
  const [hasPrefilledEditForm, setHasPrefilledEditForm] = useState(false);
  const [canEdit, setCanEdit] = useState(!isEdit);

  // 表单实例：依据 mode 加载不同的 Zod schema。
  const form = useForm({
    initialValues,
    validate: zodResolver(isEdit ? editPaperSchema : createPaperSchema)
  });

  // 基础资料：自动带出作者本人及单位信息，减少重复输入。
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get(endpoints.users.profile);
      return response.data;
    }
  });
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

  const { data: paperData, isLoading } = useQuery({
    queryKey: ['paper', paperId],
    enabled: isEdit && Boolean(paperId),
    queryFn: async () => {
      const response = await api.get(endpoints.papers.detail(paperId));
      return response.data;
    }
  });

  // 处理论文数据填充
  useEffect(() => {
    if (paperData && isEdit) {
      // 处理关键词数组格式：API返回的是 [["id", "keyword"], ...] 格式
      const processKeywords = (keywordArray) => {
        if (!Array.isArray(keywordArray)) return [];
        return keywordArray.map(item => {
          if (Array.isArray(item) && item.length >= 2) {
            return item[1]; // 取关键词文本，忽略ID
          }
          return typeof item === 'string' ? item : '';
        }).filter(Boolean);
      };

      // 处理作者信息：包含姓名、机构和通讯作者标识
      const processAuthors = (authorsArray) => {
        if (!Array.isArray(authorsArray)) return [{ author_id: null, institution_id: null }];
        return authorsArray.map(author => ({
          author_id: author.author_id || null,
          author_info: author.author_id ? {
            author_id: author.author_id,
            name: author.name || '',
          } : null,
          institution_id: author.institution_id || null,
          institution_info: author.institution_id ? {
            institution_id: author.institution_id,
            name: author.institution_name || '',
          } : null,
          is_corresponding: Boolean(author.is_corresponding)
        }));
      };

      // 处理基金信息：提取第一个基金的名称和编号
      const processFunds = (fundsArray) => {
        if (!Array.isArray(fundsArray) || fundsArray.length === 0) {
          return { fund_name: '', fund_code: '' };
        }
        const firstFund = fundsArray[0];
        return {
          fund_name: firstFund.project_name || '',
          fund_code: firstFund.project_number || ''
        };
      };

      const fundInfo = processFunds(paperData.funds);

      const attachmentPath =
        paperData.attachment_path ||
        (() => {
          const url = paperData.attachment_url;
          if (!url) return null;
          try {
            const base =
              typeof window !== 'undefined' && window.location?.origin
                ? window.location.origin
                : 'http://localhost';
            const parsed = new URL(url, base);
            return parsed.pathname?.replace(/^\/+/, '') || null;
          } catch (_) {
            return typeof url === 'string' && url.startsWith('uploads/') ? url : null;
          }
        })();

      setExistingAttachmentPath(attachmentPath);
      setExistingFile(paperData.attachment_url || null);

      if (hasPrefilledEditForm) {
        return;
      }

      // 如果已有资助编号，默认锁定编号输入框
      setFundCodeLocked(Boolean(fundInfo.fund_code));

      form.setValues({
        title_zh: paperData.title_zh || '',
        title_en: paperData.title_en || '',
        abstract_zh: paperData.abstract_zh || '',
        abstract_en: paperData.abstract_en || '',
        keywords_zh: processKeywords(paperData.keywords_zh),
        keywords_en: processKeywords(paperData.keywords_en),
        fund_name: fundInfo.fund_name,
        fund_code: fundInfo.fund_code,
        authors: processAuthors(paperData.authors),
        attachment: null
      });
      setHasPrefilledEditForm(true);
    }
  }, [paperData, isEdit, form, hasPrefilledEditForm]);

  useEffect(() => {
    if (isEdit) {
      setHasPrefilledEditForm(false);
    }
  }, [isEdit, paperId]);

  const normalizedUserId = useMemo(() => (userId != null ? String(userId) : null), [userId]);

  useEffect(() => {
    if (!isEdit || !paperData) {
      if (!isEdit) {
        setCanEdit(true);
      }
      return;
    }

    if (isProfileLoading) {
      return;
    }

    const correspondingAuthors = Array.isArray(paperData.authors)
      ? paperData.authors.filter((author) => author?.is_corresponding)
      : [];

    const hasPermission =
      correspondingAuthors.length > 0 &&
      correspondingAuthors.some((author) => {
        const authorId = author?.author_id != null ? String(author.author_id) : null;
        const authorUserId = author?.user_id != null ? String(author.user_id) : null;
        const matchByAuthorId = authorId && currentAuthorIds.includes(authorId);
        const matchByUserId = authorUserId && normalizedUserId && authorUserId === normalizedUserId;
        return matchByAuthorId || matchByUserId;
      });

    setCanEdit(hasPermission);

    if (!hasPermission) {
      const redirectPath = paperId ? `/author/papers/${paperId}` : '/author/papers';
      notifications.show({
        title: '无法编辑论文',
        message: '仅通讯作者可编辑该论文',
        color: 'red'
      });
      navigate(redirectPath);
    }
  }, [
    isEdit,
    paperData,
    normalizedUserId,
    currentAuthorIds,
    navigate,
    paperId,
    isProfileLoading
  ]);

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
   * 提交/更新论文：
   * - 新建：先上传附件（/api/papers/upload-attachment），取返回的 path 作为 attachment_path，再以 JSON 提交 /api/papers
   * - 编辑：若更换附件，同样先上传获取路径，然后以 JSON PUT 更新
   * 上传进度通过 Axios onUploadProgress 收集，以便前端展示。
   */
  const mapAuthorsForSubmission = (authorList = []) => {
    const authors = [];
    const institutions = [];
    const isCorresponding = [];

    authorList.forEach((item) => {
      if (item?.author_id == null || item.author_id === '') {
        return;
      }
      authors.push(String(item.author_id));
      if (item?.institution_id != null && item.institution_id !== '') {
        institutions.push(String(item.institution_id));
      }
      const flag =
        typeof item?.is_corresponding === 'boolean'
          ? item.is_corresponding
          : authors.length === 1;
      isCorresponding.push(flag);
    });

    return { authors, institutions, isCorresponding };
  };

  const buildFundPayload = (values) => {
    const payload = {};
    const fundName = (values.fund_name || '').trim();
    const fundCode = (values.fund_code || '').trim();

    if (fundName) {
      payload.funds = [fundName];
      if (!fundCodeLocked) {
        payload.funds_new = [{ name: fundName, number: fundCode || fundName }];
      }
    }

    return payload;
  };

  const uploadAttachmentFile = async (file) => {
    const fd = new FormData();
    fd.append('attachment', file);
    const uploadResp = await api.post(endpoints.papers.uploadAttachment, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      }
    });

    const attachmentPath = uploadResp?.data?.file?.path;
    if (!attachmentPath) {
      throw new Error('附件上传失败：未返回路径');
    }
    return attachmentPath;
  };

  const mutation = useMutation({
    mutationFn: async (values) => {
      const { authors, institutions, isCorresponding } = mapAuthorsForSubmission(values.authors);
      const fundPayload = buildFundPayload(values);

      if (!isEdit) {
        // 第一步：上传附件，仅发送文件
        if (!(values.attachment instanceof File)) {
          throw new Error('请上传稿件附件');
        }
        const attachmentPath = await uploadAttachmentFile(values.attachment);

        const body = {
          title_zh: values.title_zh,
          title_en: values.title_en || '',
          abstract_zh: values.abstract_zh,
          abstract_en: values.abstract_en || '',
          keywords_zh: values.keywords_zh || [],
          keywords_en: values.keywords_en || [],
          keywords_new: values.keywords_new || [],
          attachment_path: attachmentPath,
          authors,
          institutions,
          is_corresponding: isCorresponding,
          ...fundPayload
        };

        const response = await api.post(endpoints.papers.base, body);
        return response.data;
      }

      const endpoint = endpoints.papers.detail(paperId);
      let attachmentPath = existingAttachmentPath;
      if (values.attachment instanceof File) {
        attachmentPath = await uploadAttachmentFile(values.attachment);
      }

      const body = {
        title_zh: values.title_zh,
        title_en: values.title_en || '',
        abstract_zh: values.abstract_zh,
        abstract_en: values.abstract_en || '',
        keywords_zh: values.keywords_zh || [],
        keywords_en: values.keywords_en || [],
        keywords_new: values.keywords_new || [],
        authors,
        institutions,
        is_corresponding: isCorresponding,
        ...fundPayload
      };

      if (attachmentPath) {
        body.attachment_path = attachmentPath;
      }

      const response = await api.put(endpoint, body);
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

  // 识别 keywords_new：查询数据库，无精确匹配的作为新关键词
  const collectNewKeywords = async (zhList, enList) => {
    const result = [];
    const checkByType = async (names, type) => {
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
            result.push({ name, type });
          }
        } catch (_) {
          // 出错时不打断整体提交，保守视为“新关键词”
          result.push({ name, type });
        }
      }
    };
    await Promise.all([checkByType(zhList, 'zh'), checkByType(enList, 'en')]);
    return result;
  };

  const handleSubmit = async (values) => {
    if (isEdit && !canEdit) {
      notifications.show({
        title: '无法提交修改',
        message: '仅通讯作者可编辑该论文',
        color: 'red'
      });
      return;
    }
    if (!isEdit && !values.attachment) {
      form.setFieldError('attachment', '请上传稿件附件');
      return;
    }
    // 关键词去重与去空格
    const zh = sanitizeKeywords(values.keywords_zh);
    const en = sanitizeKeywords(values.keywords_en);
    // 识别新关键词用于 keywords_new 字段
    const keywordsNew = await collectNewKeywords(zh, en);
    // 提交论文（新建：两步流；编辑：沿用原逻辑）
    mutation.mutate({
      ...values,
      keywords_zh: zh,
      keywords_en: en,
      keywords_new: keywordsNew
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
                <TextInput label="英文标题" required {...form.getInputProps('title_en')} />
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
                  required
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
                  description="1-8 个关键词，支持输入联想"
                  required
                  type="en"
                  value={form.values.keywords_en}
                  onChange={(vals) => form.setFieldValue('keywords_en', vals)}
                  error={form.errors.keywords_en}
                />
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <FundSearch
                  required
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
                  required
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
                required
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
