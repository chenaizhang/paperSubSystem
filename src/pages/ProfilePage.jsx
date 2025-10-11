import {
  ActionIcon,
  Button,
  Card,
  Group,
  LoadingOverlay,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useForm, zodResolver } from '@mantine/form';
import { z } from 'zod';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import { useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../api/axios.js';
import { endpoints } from '../api/endpoints.js';
import { notifications } from '@mantine/notifications';
import PropTypes from 'prop-types';

const authorSchema = z.object({
  name: z.string().min(1, '请输入姓名'),
  age: z.coerce.number().min(18, '年龄需要大于18').max(120, '年龄过大'),
  email: z.string().email('请输入正确的邮箱'),
  institutions: z
    .array(
      z.object({
        name: z.string().min(1, '请输入单位名称'),
        city: z.string().min(1, '请输入城市'),
        postal_code: z.string().min(1, '请输入邮编')
      })
    )
    .min(1, '至少填写一个单位'),
  degree: z.string().min(1, '请输入学位'),
  title: z.string().min(1, '请输入职称'),
  origin: z.string().min(1, '请输入籍贯'),
  research_direction: z.string().min(1, '请输入研究方向'),
  bio: z.string().optional(),
  phone: z.string().min(6, '请输入正确的手机号')
});

const expertSchema = z.object({
  name: z.string().min(1, '请输入姓名'),
  title: z.string().min(1, '请输入职称'),
  institution: z.string().min(1, '请输入单位'),
  email: z.string().email('请输入正确的邮箱'),
  phone: z.string().min(6, '请输入电话'),
  research_direction: z.string().min(1, '请输入研究方向'),
  bank_account: z.string().min(8, '请输入正确的银行卡号'),
  bank_name: z.string().min(1, '请输入银行名称'),
  account_holder: z.string().min(1, '请输入开户名')
});

const editorSchema = z.object({
  name: z.string().min(1, '请输入姓名'),
  email: z.string().email('请输入正确的邮箱'),
  phone: z.string().min(6, '请输入联系电话'),
  department: z.string().min(1, '请输入所属部门').optional(),
  title: z.string().optional()
});

const defaultValues = {
  name: '',
  age: 30,
  email: '',
  institutions: [{ name: '', city: '', postal_code: '' }],
  degree: '',
  title: '',
  origin: '',
  research_direction: '',
  bio: '',
  phone: '',
  institution: '',
  bank_account: '',
  bank_name: '',
  account_holder: '',
  department: ''
};

export default function ProfilePage() {
  const { role, refreshProfile } = useAuth();

  const schema = useMemo(() => {
    if (role === 'author') return authorSchema;
    if (role === 'expert') return expertSchema;
    return editorSchema;
  }, [role]);

  const form = useForm({
    initialValues: defaultValues,
    validate: zodResolver(schema)
  });

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get(endpoints.users.profile);
      return response.data;
    },
    onSuccess: (profile) => {
      applyProfileToForm(profile);
    }
  });

  useEffect(() => {
    if (data) {
      applyProfileToForm(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function extractPhone(profile) {
    return (
      profile.phone ??
      profile.phone_number ??
      profile.phoneNumber ??
      profile.mobile ??
      profile.mobile_phone ??
      ''
    );
  }

  function applyProfileToForm(profile) {
    const phoneValue = extractPhone(profile);
    if (role === 'author') {
      form.setValues({
        name: profile.name || '',
        age: profile.age || 30,
        email: profile.email || '',
        institutions:
          profile.institutions?.length > 0
            ? profile.institutions.map((item) => ({
                name: item.name || '',
                city: item.city || '',
                postal_code: item.postal_code || ''
              }))
            : [{ name: '', city: '', postal_code: '' }],
        degree: profile.degree || '',
        title: profile.title || '',
        origin: profile.origin || '',
        research_direction: profile.research_direction || '',
        bio: profile.bio || '',
        phone: phoneValue
      });
    } else if (role === 'expert') {
      form.setValues({
        name: profile.name || '',
        title: profile.title || '',
        institution: profile.institution || '',
        email: profile.email || '',
        phone: phoneValue,
        research_direction: profile.research_direction || '',
        bank_account: profile.bank_account || '',
        bank_name: profile.bank_name || '',
        account_holder: profile.account_holder || ''
      });
    } else {
      form.setValues({
        name: profile.name || '',
        email: profile.email || '',
        phone: phoneValue,
        department: profile.department || '',
        title: profile.title || ''
      });
    }
  }

  const mutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        ...values,
        phone: values.phone?.trim?.() || ''
      };
      await api.put(endpoints.users.profile, payload);
      await refreshProfile();
      return payload;
    },
    onSuccess: () => {
      notifications.show({
        title: '保存成功',
        message: '个人信息已更新',
        color: 'green'
      });
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
      <Title order={2}>个人信息</Title>
      <Card shadow="sm" radius="md" withBorder pos="relative">
        <LoadingOverlay visible={isLoading || mutation.isPending} overlayProps={{ blur: 2 }} />
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="xl">
            {role === 'author' && <AuthorFields form={form} />}
            {role === 'expert' && <ExpertFields form={form} />}
            {role === 'editor' && <EditorFields form={form} />}
            <Group justify="flex-end">
              <Button type="submit" loading={mutation.isPending}>
                保存信息
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}

function AuthorFields({ form }) {
  const institutions = form.values.institutions;
  return (
    <Stack gap="md">
      <Title order={4}>基础信息</Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput label="姓名" required {...form.getInputProps('name')} />
        <NumberInput
          label="年龄"
          required
          min={18}
          max={120}
          {...form.getInputProps('age')}
        />
        <TextInput label="邮箱" required {...form.getInputProps('email')} />
        <TextInput label="手机" required {...form.getInputProps('phone')} />
        <TextInput label="学位" required {...form.getInputProps('degree')} />
        <TextInput label="职称" required {...form.getInputProps('title')} />
        <TextInput label="籍贯" required {...form.getInputProps('origin')} />
        <TextInput label="研究方向" required {...form.getInputProps('research_direction')} />
      </SimpleGrid>
      <Textarea label="个人简介" minRows={3} {...form.getInputProps('bio')} />

      <Group justify="space-between">
        <Title order={4}>工作单位</Title>
        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={() =>
            form.insertListItem('institutions', { name: '', city: '', postal_code: '' })
          }
        >
          添加单位
        </Button>
      </Group>
      <Stack gap="sm">
        {institutions.map((field, index) => (
          <Card key={index} withBorder>
            <Group justify="space-between" mb="sm">
              <Text fw={500}>单位 {index + 1}</Text>
              {institutions.length > 1 && (
                <ActionIcon
                  color="red"
                  onClick={() => form.removeListItem('institutions', index)}
                  aria-label="删除单位"
                >
                  <IconTrash size={16} />
                </ActionIcon>
              )}
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <TextInput
                label="单位名称"
                required
                {...form.getInputProps(`institutions.${index}.name`)}
              />
              <TextInput
                label="城市"
                required
                {...form.getInputProps(`institutions.${index}.city`)}
              />
              <TextInput
                label="邮编"
                required
                {...form.getInputProps(`institutions.${index}.postal_code`)}
              />
            </SimpleGrid>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}

AuthorFields.propTypes = {
  form: PropTypes.object.isRequired
};

function ExpertFields({ form }) {
  return (
    <Stack gap="md">
      <Title order={4}>专家信息</Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput label="姓名" required {...form.getInputProps('name')} />
        <TextInput label="职称" required {...form.getInputProps('title')} />
        <TextInput label="单位" required {...form.getInputProps('institution')} />
        <TextInput label="邮箱" required {...form.getInputProps('email')} />
        <TextInput label="联系电话" required {...form.getInputProps('phone')} />
        <TextInput label="研究方向" required {...form.getInputProps('research_direction')} />
      </SimpleGrid>

      <Title order={4}>收款信息</Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput label="银行卡号" required {...form.getInputProps('bank_account')} />
        <TextInput label="银行名称" required {...form.getInputProps('bank_name')} />
        <TextInput label="开户名" required {...form.getInputProps('account_holder')} />
      </SimpleGrid>
    </Stack>
  );
}

ExpertFields.propTypes = {
  form: PropTypes.object.isRequired
};

function EditorFields({ form }) {
  return (
    <Stack gap="md">
      <Title order={4}>编辑信息</Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput label="姓名" required {...form.getInputProps('name')} />
        <TextInput label="邮箱" required {...form.getInputProps('email')} />
        <TextInput label="联系电话" required {...form.getInputProps('phone')} />
        <TextInput label="职称" {...form.getInputProps('title')} />
        <TextInput label="所属部门" {...form.getInputProps('department')} />
      </SimpleGrid>
    </Stack>
  );
}

EditorFields.propTypes = {
  form: PropTypes.object.isRequired
};
