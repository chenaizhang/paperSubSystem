import {
  ActionIcon,
  Button,
  Card,
  Group,
  LoadingOverlay,
  NumberInput,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useForm, zodResolver } from "@mantine/form";
import { z } from "zod";
import { useAuth } from "../features/auth/AuthProvider.jsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/axios.js";
import { endpoints } from "../api/endpoints.js";
import { notifications } from "@mantine/notifications";
import PropTypes from "prop-types";
import { useDebouncedValue } from "@mantine/hooks";

const authorInstitutionSchema = z.object({
  uuid: z.string().optional(),
  institution_id: z.union([z.string(), z.number()]).optional(),
  is_new: z.boolean().optional(),
  name: z.string().optional(),
  city: z.string().optional(),
  zip_code: z.string().optional(),
});

const authorSchema = z.object({
  name: z.string().trim().min(1, "请输入姓名"),
  age: z.coerce.number().min(18, "年龄需要大于18").max(120, "年龄过大"),
  email: z.string().email("请输入正确的邮箱"),
  author_id: z.string().optional(),
  institutions: z.array(authorInstitutionSchema).optional(),
  degree: z.string().optional(),
  title: z.string().optional(),
  hometown: z.string().optional(),
  research_areas: z.string().optional(),
  bio: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.trim().length >= 6,
      "请输入正确的手机号"
    ),
});

const expertInstitutionSchema = z.object({
  uuid: z.string().optional(),
  institution_id: z.union([z.string(), z.number()]).optional(),
  is_new: z.boolean().optional(),
  name: z.string().min(1, "请输入单位名称"),
  city: z.string().min(1, "请输入城市"),
  zip_code: z.string().min(1, "请输入邮编"),
});

const expertSchema = z.object({
  name: z.string().min(1, "请输入姓名"),
  title: z.string().min(1, "请输入职称"),
  institutions: z.array(expertInstitutionSchema).min(1, "至少填写一个单位"),
  email: z.string().email("请输入正确的邮箱"),
  phone: z.string().min(6, "请输入电话"),
  research_areas: z.string().min(1, "请输入研究方向"),
  bank_account: z.string().min(8, "请输入正确的银行卡号"),
  bank_name: z.string().min(1, "请输入银行名称"),
  account_holder: z.string().min(1, "请输入开户名"),
});

const editorSchema = z.object({
  name: z.string().trim().min(1, "请输入姓名"),
  email: z.string().email("请输入正确的邮箱"),
});

const createTempId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const toStringOrEmpty = (value) => {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
};

const trimString = (value) => toStringOrEmpty(value).trim();

function createInstitutionEntry(data = {}) {
  return {
    uuid: data.uuid || createTempId(),
    institution_id:
      data.institution_id !== undefined
        ? toStringOrEmpty(data.institution_id)
        : data.id !== undefined
        ? toStringOrEmpty(data.id)
        : "",
    name: data.name || "",
    city: data.city || "",
    zip_code: data.zip_code || data.postal_code || "",
    is_new: Boolean(data.is_new),
  };
}

const defaultValues = {
  name: "",
  age: 30,
  email: "",
  author_id: "",
  institutions: [createInstitutionEntry()],
  degree: "",
  title: "",
  hometown: "",
  research_areas: "",
  bio: "",
  phone: "",
  bank_account: "",
  bank_name: "",
  account_holder: "",
  department: "",
};

export default function ProfilePage() {
  const { role, refreshProfile } = useAuth();

  const schema = useMemo(() => {
    if (role === "author") return authorSchema;
    if (role === "expert") return expertSchema;
    return editorSchema;
  }, [role]);

  const [isEditing, setIsEditing] = useState(false);
  const initialInstitutionIdsRef = useRef([]);
  const isInstitutionRole = role === "author" || role === "expert";

  const form = useForm({
    initialValues: defaultValues,
    validate: zodResolver(schema),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await api.get(endpoints.users.profile);
      return response.data;
    },
  });

  useEffect(() => {
    if (data) {
      applyProfileToForm(data);
      setIsEditing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, role]);

  function extractPhone(profile) {
    return (
      profile.phone ??
      profile.phone_number ??
      profile.phoneNumber ??
      profile.mobile ??
      profile.mobile_phone ??
      ""
    );
  }

  function applyProfileToForm(profile) {
    const phoneValue = extractPhone(profile);
    const authorIdValue = toStringOrEmpty(profile.author_id);
    let values;
    if (role === "author") {
      values = {
        name: profile.name || "",
        age: profile.age || 30,
        email: profile.email || "",
        institutions:
          profile.institutions?.length > 0
            ? profile.institutions.map((item) => createInstitutionEntry(item))
            : [createInstitutionEntry()],
        degree: profile.degree || "",
        title: profile.title || "",
        hometown: profile.hometown || "",
        research_areas: profile.research_areas || "",
        bio: profile.bio || "",
        phone: phoneValue,
        author_id: authorIdValue,
      };
    } else if (role === "expert") {
      const normalizedInstitutions =
        profile.institutions && profile.institutions.length > 0
          ? profile.institutions
          : profile.institution
          ? Array.isArray(profile.institution)
            ? profile.institution
            : [
                {
                  name:
                    typeof profile.institution === "object"
                      ? profile.institution?.name
                      : profile.institution || "",
                  city:
                    typeof profile.institution === "object"
                      ? profile.institution?.city
                      : profile.institution_city || "",
                  zip_code:
                    typeof profile.institution === "object"
                      ? profile.institution?.zip_code
                      : profile.institution_zip_code || "",
                },
              ]
          : [];
      values = {
        name: profile.name || "",
        title: profile.title || "",
        email: profile.email || "",
        phone: phoneValue,
        research_areas: profile.research_areas || "",
        institutions:
          normalizedInstitutions.length > 0
            ? normalizedInstitutions.map((item) => createInstitutionEntry(item))
            : [createInstitutionEntry()],
        bank_account: profile.bank_account || "",
        bank_name: profile.bank_name || "",
        account_holder: profile.account_holder || "",
      };
    } else {
      values = {
        name: profile.name || "",
        email: profile.email || "",
      };
    }
    if (values && values.author_id === undefined) {
      values.author_id = authorIdValue;
    }
    const nextValues = values ?? defaultValues;
    form.setValues(nextValues);
    form.resetDirty(nextValues);
    form.clearErrors();
    if (isInstitutionRole) {
      const ids =
        nextValues.institutions
          ?.map((item) => toStringOrEmpty(item?.institution_id))
          .filter((id) => id) ?? [];
      initialInstitutionIdsRef.current = ids;
    } else {
      initialInstitutionIdsRef.current = [];
    }
  }

  async function syncInstitutions(rawInstitutions) {
    if (!isInstitutionRole) {
      return [];
    }

    if (!Array.isArray(rawInstitutions)) {
      rawInstitutions = [];
    }

    const initialIdsSet = new Set(
      (initialInstitutionIdsRef.current ?? [])
        .map((item) => toStringOrEmpty(item))
        .filter(Boolean)
    );

    const normalized = [];
    const linkIds = new Set();
    const currentIds = new Set();
    const toCreate = [];
    const fieldErrors = {};

    rawInstitutions.forEach((item, index) => {
      const trimmedName = trimString(item?.name);
      const trimmedCity = trimString(item?.city);
      const trimmedZip = trimString(item?.zip_code);
      const rawId = item?.institution_id ?? item?.id;
      const institutionId = rawId ? toStringOrEmpty(rawId) : "";
      const hasContent =
        Boolean(institutionId) ||
        Boolean(trimmedName) ||
        Boolean(trimmedCity) ||
        Boolean(trimmedZip);

      if (!hasContent) {
        return;
      }

      const normalizedEntry = {
        index,
        name: trimmedName,
        city: trimmedCity,
        zip_code: trimmedZip,
        institution_id: institutionId,
      };

      normalized.push(normalizedEntry);

      if (institutionId) {
        currentIds.add(institutionId);
        if (!initialIdsSet.has(institutionId)) {
          linkIds.add(institutionId);
        }
        return;
      }

      if (!trimmedName) {
        fieldErrors[`institutions.${index}.name`] = "请输入单位名称";
        return;
      }

      if (!trimmedCity) {
        fieldErrors[`institutions.${index}.city`] =
          "未找到匹配机构时，请填写城市信息";
      }

      if (Object.keys(fieldErrors).length === 0) {
        toCreate.push(normalizedEntry);
      }
    });

    if (Object.keys(fieldErrors).length > 0) {
      const validationError = new Error("INSTITUTION_VALIDATION_FAILED");
      validationError.fieldErrors = fieldErrors;
      throw validationError;
    }

    const unlinkIds = Array.from(initialIdsSet).filter(
      (id) => !currentIds.has(id)
    );

    for (const entry of toCreate) {
      const createPayload = {
        name: entry.name,
        city: entry.city,
      };
      if (entry.zip_code) {
        createPayload.zip_code = entry.zip_code;
      }
      const response = await api.post(
        endpoints.institutions.create,
        createPayload
      );
      const createdId = response.data?.institution_id ?? response.data?.id;
      if (!createdId) {
        throw new Error("创建机构失败");
      }
      const idStr = toStringOrEmpty(createdId);
      entry.institution_id = idStr;
      linkIds.add(idStr);
      currentIds.add(idStr);
      form.setFieldValue(`institutions.${entry.index}.institution_id`, idStr);
      form.setFieldValue(`institutions.${entry.index}.is_new`, false);
    }

    const linkEndpoint =
      role === "author"
        ? endpoints.institutions.linkAuthor
        : endpoints.institutions.linkExpert;
    const unlinkEndpoint =
      role === "author"
        ? endpoints.institutions.unlinkAuthor
        : endpoints.institutions.unlinkExpert;

    const safeLink = async (id) => {
      try {
        await api.post(linkEndpoint, { institution_id: id });
      } catch (error) {
        const message = error.response?.data?.message;
        if (
          error.response?.status === 400 &&
          message &&
          message.includes("已关联")
        ) {
          return;
        }
        throw error;
      }
    };

    const safeUnlink = async (id) => {
      try {
        await api.delete(unlinkEndpoint(id));
      } catch (error) {
        const message = error.response?.data?.message;
        if (
          error.response?.status === 404 &&
          message &&
          message.includes("未关联")
        ) {
          return;
        }
        throw error;
      }
    };

    for (const id of linkIds) {
      await safeLink(id);
    }

    for (const id of unlinkIds) {
      await safeUnlink(id);
    }

    initialInstitutionIdsRef.current = Array.from(currentIds);

    return normalized;
  }

  const mutation = useMutation({
    mutationFn: async (values) => {
      const {
        author_id: authorId,
        institutions: rawInstitutions,
        ...restValues
      } = values;
      const payload =
        role === "editor"
          ? {
              name: restValues.name,
              email: restValues.email,
            }
          : {
              ...restValues,
              phone: trimString(restValues.phone),
            };

      let normalizedInstitutions = [];
      const shouldSyncInstitutions =
        isInstitutionRole && Array.isArray(rawInstitutions);

      if (shouldSyncInstitutions) {
        normalizedInstitutions = await syncInstitutions(rawInstitutions);
        payload.institutions = normalizedInstitutions.map((item) => ({
          name: item.name,
          city: item.city,
          zip_code: item.zip_code,
        }));
      } else if (!shouldSyncInstitutions) {
        delete payload.institutions;
      }

      await api.put(endpoints.users.profile, payload);
      await refreshProfile();

      const result = {
        ...payload,
      };

      if (shouldSyncInstitutions) {
        result.institutions = normalizedInstitutions.map((item) => ({
          institution_id: item.institution_id,
          name: item.name,
          city: item.city,
          zip_code: item.zip_code,
        }));
      }

      if (authorId !== undefined) {
        result.author_id = toStringOrEmpty(authorId);
      }

      return result;
    },
    onSuccess: (payload) => {
      notifications.show({
        title: "保存成功",
        message: "个人信息已更新",
        color: "green",
      });
      applyProfileToForm(payload);
      setIsEditing(false);
    },
    onError: (error) => {
      if (error.fieldErrors) {
        form.setErrors(error.fieldErrors);
        return;
      }
      const fieldErrors = error.response?.data?.errors;
      if (fieldErrors) {
        form.setErrors(fieldErrors);
      }
    },
  });

  return (
    <Stack>
      <Title order={2}>个人信息</Title>
      <Card shadow="sm" radius="md" withBorder pos="relative">
        <LoadingOverlay
          visible={isLoading || mutation.isPending}
          overlayProps={{ blur: 2 }}
        />
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="xl">
            {role === "author" && (
              <AuthorFields form={form} isEditing={isEditing} />
            )}
            {role === "expert" && (
              <ExpertFields form={form} isEditing={isEditing} />
            )}
            {role === "editor" && (
              <EditorFields form={form} isEditing={isEditing} />
            )}
            <Group justify="flex-end">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (data) {
                        applyProfileToForm(data);
                      } else {
                        form.reset();
                        form.clearErrors();
                      }
                      setIsEditing(false);
                    }}
                    disabled={mutation.isPending}
                  >
                    取消保存
                  </Button>
                  <Button type="submit" loading={mutation.isPending}>
                    保存信息
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    form.clearErrors();
                    setIsEditing(true);
                  }}
                >
                  编辑信息
                </Button>
              )}
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}

function AuthorFields({ form, isEditing }) {
  const institutions = form.values.institutions ?? [];
  const authorIdDisplay = toStringOrEmpty(form.values.author_id) || "—";
  return (
    <Stack gap="md">
      <Title order={4}>基础信息</Title>
      <Text>作者ID: {authorIdDisplay}</Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput
          label="姓名"
          required
          {...form.getInputProps("name")}
          disabled={!isEditing}
        />
        <NumberInput
          label="年龄"
          required
          min={18}
          max={120}
          {...form.getInputProps("age")}
          disabled={!isEditing}
        />
        <TextInput
          label="邮箱"
          required
          {...form.getInputProps("email")}
          disabled={!isEditing}
        />
        <TextInput
          label="手机"
          {...form.getInputProps("phone")}
          disabled={!isEditing}
        />
        <TextInput
          label="学位"
          {...form.getInputProps("degree")}
          disabled={!isEditing}
        />
        <TextInput
          label="职称"
          {...form.getInputProps("title")}
          disabled={!isEditing}
        />
        <TextInput
          label="籍贯"
          {...form.getInputProps("hometown")}
          disabled={!isEditing}
        />
        <TextInput
          label="研究方向"
          {...form.getInputProps("research_areas")}
          disabled={!isEditing}
        />
      </SimpleGrid>
      <Textarea
        label="个人简介"
        minRows={3}
        {...form.getInputProps("bio")}
        disabled={!isEditing}
      />

      <Group justify="space-between">
        <Title order={4}>工作单位</Title>
        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={() =>
            form.insertListItem("institutions", createInstitutionEntry())
          }
          disabled={!isEditing}
        >
          添加单位
        </Button>
      </Group>
      <Stack gap="sm">
        {institutions.map((_, index) => (
          <Card key={index} withBorder>
            <Group justify="space-between" mb="sm">
              <Text fw={500}>单位 {index + 1}</Text>
              {institutions.length > 1 && (
                <ActionIcon
                  color="red"
                  onClick={() => form.removeListItem("institutions", index)}
                  aria-label="删除单位"
                  disabled={!isEditing}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              )}
            </Group>
            <InstitutionField form={form} index={index} isEditing={isEditing} />
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}

AuthorFields.propTypes = {
  form: PropTypes.object.isRequired,
  isEditing: PropTypes.bool.isRequired,
};

function InstitutionField({
  form,
  index,
  isEditing,
  requiredName = false,
  requiredCity = false,
  requiredZip = false,
}) {
  const value = form.values.institutions?.[index] ?? {};
  const namePath = `institutions.${index}.name`;
  const cityPath = `institutions.${index}.city`;
  const zipPath = `institutions.${index}.zip_code`;
  const idPath = `institutions.${index}.institution_id`;

  const nameField = form.getInputProps(namePath);
  const cityField = form.getInputProps(cityPath);
  const zipField = form.getInputProps(zipPath);

  const nameValue = value.name ?? "";
  const [debouncedName] = useDebouncedValue(nameValue, 300);
  const [allowManualEntry, setAllowManualEntry] = useState(() => {
    if (value.institution_id) {
      return false;
    }
    return Boolean(value.city || value.zip_code);
  });
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setSuggestions([]);
      return;
    }

    const trimmedName = debouncedName?.trim();
    if (!trimmedName) {
      setSuggestions([]);
      setAllowManualEntry(
        !value.institution_id && Boolean(value.city || value.zip_code)
      );
      return;
    }

    if (value.institution_id && trimmedName === (value.name || "").trim()) {
      setSuggestions([]);
      return;
    }

    let canceled = false;
    setIsSearching(true);
    api
      .get(endpoints.institutions.search, { params: { name: trimmedName } })
      .then((response) => {
        if (canceled) return;
        const list = Array.isArray(response.data) ? response.data : [];
        setSuggestions(list);
        setAllowManualEntry(!value.institution_id && list.length === 0);
      })
      .catch(() => {
        if (canceled) return;
        setSuggestions([]);
        setAllowManualEntry(!value.institution_id);
      })
      .finally(() => {
        if (!canceled) {
          setIsSearching(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [
    debouncedName,
    isEditing,
    value.city,
    value.zip_code,
    value.institution_id,
    value.name,
  ]);

  const handleNameChange = (event) => {
    if (!isEditing) return;
    const nextValue = event.currentTarget.value;
    const wasManual = allowManualEntry;
    form.setFieldValue(namePath, nextValue);
    form.setFieldValue(idPath, "");
    form.setFieldValue(`institutions.${index}.is_new`, false);
    if (!wasManual) {
      form.setFieldValue(cityPath, "");
      form.setFieldValue(zipPath, "");
      setAllowManualEntry(false);
    }
    if (!nextValue) {
      setSuggestions([]);
    }
  };

  const handleSuggestionSelect = (item) => {
    const institutionId =
      item?.institution_id ?? item?.id ?? item?.institutionId ?? "";
    form.setFieldValue(namePath, item?.name || "");
    form.setFieldValue(cityPath, item?.city || "");
    form.setFieldValue(zipPath, item?.zip_code || item?.postal_code || "");
    form.setFieldValue(idPath, toStringOrEmpty(institutionId));
    form.setFieldValue(`institutions.${index}.is_new`, false);
    form.clearFieldError?.(namePath);
    form.clearFieldError?.(cityPath);
    form.clearFieldError?.(zipPath);
    setAllowManualEntry(false);
    setSuggestions([]);
  };

  useEffect(() => {
    if (!isEditing) {
      setAllowManualEntry((prev) => prev && !value.institution_id);
    }
  }, [isEditing, value.institution_id]);

  useEffect(() => {
    if (value.institution_id) {
      setAllowManualEntry(false);
    }
  }, [value.institution_id]);

  const canEditDetails = isEditing && allowManualEntry;
  const showNoResultHint =
    isEditing &&
    !isSearching &&
    !value.institution_id &&
    debouncedName?.trim() &&
    suggestions.length === 0;

  return (
    <Stack gap={5}>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <TextInput
          label="单位名称"
          value={nameValue}
          onChange={handleNameChange}
          onBlur={nameField.onBlur}
          onFocus={nameField.onFocus}
          error={nameField.error}
          disabled={!isEditing}
          withAsterisk={requiredName}
        />
        <TextInput
          label="城市"
          {...cityField}
          disabled={!canEditDetails}
          withAsterisk={requiredCity}
        />
        <TextInput
          label="邮编"
          {...zipField}
          disabled={!canEditDetails}
          withAsterisk={requiredZip}
        />
      </SimpleGrid>

      {isEditing && isSearching && (
        <Text size="sm" c="dimmed">
          正在搜索匹配的机构...
        </Text>
      )}

      {isEditing && !isSearching && suggestions.length > 0 && (
        <Paper withBorder radius="md" p="sm">
          <Stack gap={8}>
            <Text size="sm" fw={500} lh={1.4}>
              匹配的机构
            </Text>
            <ScrollArea.Autosize mah={240} scrollbarSize={6}>
              <Stack gap={6}>
                {suggestions.map((item) => {
                  const key =
                    item?.institution_id ??
                    item?.id ??
                    `${item?.name}-${item?.city}-${item?.zip_code}`;
                  const detailLine = [item?.city, item?.zip_code]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <Button
                      key={key}
                      variant="subtle"
                      color="gray"
                      fullWidth
                      justify="flex-start"
                      onClick={() => handleSuggestionSelect(item)}
                      radius="md"
                      styles={() => ({
                        root: {
                          padding: "10px 12px",
                          height: "auto",
                          alignItems: "flex-start",
                        },
                        label: { width: "100%" },
                      })}
                    >
                      <Stack gap={2} align="flex-start">
                        <Text size="sm" fw={600} lh={1.4}>
                          {item?.name || "--"}
                        </Text>
                        {detailLine && (
                          <Text size="xs" c="dimmed" lh={1.2}>
                            {detailLine}
                          </Text>
                        )}
                      </Stack>
                    </Button>
                  );
                })}
              </Stack>
            </ScrollArea.Autosize>
          </Stack>
        </Paper>
      )}

      {isEditing && showNoResultHint && (
        <Text size="sm" c="dimmed">
          未找到匹配的机构，可手动填写城市和邮编后保存。
        </Text>
      )}
    </Stack>
  );
}

InstitutionField.propTypes = {
  form: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isEditing: PropTypes.bool.isRequired,
  requiredName: PropTypes.bool,
  requiredCity: PropTypes.bool,
  requiredZip: PropTypes.bool,
};

function ExpertFields({ form, isEditing }) {
  const institutions = form.values.institutions ?? [];
  return (
    <Stack gap="md">
      <Title order={4}>专家信息</Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput
          label="姓名"
          required
          {...form.getInputProps("name")}
          disabled={!isEditing}
        />
        <TextInput
          label="职称"
          required
          {...form.getInputProps("title")}
          disabled={!isEditing}
        />
        <TextInput
          label="邮箱"
          required
          {...form.getInputProps("email")}
          disabled={!isEditing}
        />
        <TextInput
          label="联系电话"
          required
          {...form.getInputProps("phone")}
          disabled={!isEditing}
        />
        <TextInput
          label="研究方向"
          required
          {...form.getInputProps("research_areas")}
          disabled={!isEditing}
        />
      </SimpleGrid>
      <Title order={4}>收款信息</Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput
          label="银行卡号"
          required
          {...form.getInputProps("bank_account")}
          disabled={!isEditing}
        />
        <TextInput
          label="银行名称"
          required
          {...form.getInputProps("bank_name")}
          disabled={!isEditing}
        />
        <TextInput
          label="开户名"
          required
          {...form.getInputProps("account_holder")}
          disabled={!isEditing}
        />
      </SimpleGrid>

      <Group justify="space-between">
        <Title order={4}>工作单位</Title>
        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={() =>
            form.insertListItem("institutions", createInstitutionEntry())
          }
          disabled={!isEditing}
        >
          添加单位
        </Button>
      </Group>
      <Stack gap="sm">
        {institutions.map((_, index) => (
          <Card key={index} withBorder>
            <Group justify="space-between" mb="sm">
              <Text fw={500}>单位 {index + 1}</Text>
              {institutions.length > 1 && (
                <ActionIcon
                  color="red"
                  onClick={() => form.removeListItem("institutions", index)}
                  aria-label="删除单位"
                  disabled={!isEditing}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              )}
            </Group>
            <InstitutionField
              form={form}
              index={index}
              isEditing={isEditing}
              requiredName
              requiredCity
              requiredZip
            />
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}

ExpertFields.propTypes = {
  form: PropTypes.object.isRequired,
  isEditing: PropTypes.bool.isRequired,
};

function EditorFields({ form, isEditing }) {
  return (
    <Stack gap="md">
      <Title order={4}>编辑信息</Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput
          label="姓名"
          required
          {...form.getInputProps("name")}
          disabled={!isEditing}
        />
        <TextInput
          label="邮箱"
          required
          {...form.getInputProps("email")}
          disabled={!isEditing}
        />
      </SimpleGrid>
    </Stack>
  );
}

EditorFields.propTypes = {
  form: PropTypes.object.isRequired,
  isEditing: PropTypes.bool.isRequired,
};
