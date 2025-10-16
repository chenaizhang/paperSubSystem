import { useState, useEffect } from "react";
import { Group, ActionIcon, Stack, Text, Card } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import AuthorSearch from "./AuthorSearch.jsx";
import InstitutionSearch from "./InstitutionSearch.jsx";
import PropTypes from "prop-types";
import api from "../api/axios.js";
import { endpoints } from "../api/endpoints.js";

/**
 * 作者单位联动输入组件
 * 实现作者与单位的复杂联动逻辑和状态管理
 */
export default function AuthorInstitutionInput({
  value = { author_id: null, author_info: null, institution_id: null },
  onChange,
  onRemove,
  index,
  currentUserId,
  isFirstAuthor = false,
  canRemove = true,
  errors = {},
}) {
  const [authorLocked, setAuthorLocked] = useState(false);

  // 获取当前用户的个人信息
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await api.get(endpoints.users.profile);
      return response.data;
    },
    enabled: isFirstAuthor, // 只有第一作者时才获取
  });

  // 处理作者变更
  const handleAuthorChange = (author) => {
    // 如果选择了新作者，清空单位选择
    const authorId = author
      ? typeof author === "object"
        ? author.author_id
        : author
      : null;
    const authorInfo = author && typeof author === "object" ? author : null;

    onChange({
      author_id: authorId,
      author_info: authorInfo,
      institution_id: null,
    });

    // 重置作者锁定状态
    setAuthorLocked(false);
  };

  // 处理单位变更
  const handleInstitutionChange = (institutionId) => {
    onChange({
      ...value,
      institution_id: institutionId,
    });

    // 当选择单位后，锁定作者输入框
    if (institutionId) {
      setAuthorLocked(true);
    } else {
      setAuthorLocked(false);
    }
  };

  // 初始化第一作者
  useEffect(() => {
    if (isFirstAuthor && userProfile && !value.author_id) {
      // 自动设置第一作者为当前用户，使用API返回的author_id和name
      onChange({
        author_id: userProfile.author_id,
        author_info: {
          author_id: userProfile.author_id,
          name: userProfile.name,
        },
        institution_id: null,
      });
    }
  }, [isFirstAuthor, userProfile, value.author_id, onChange]);

  // 判断是否为锁定状态
  const isAuthorLocked =
    authorLocked || (isFirstAuthor && userProfile && value.author_id === userProfile.author_id);
  const isInstitutionDisabled = !value.author_id;

  return (
    <Card withBorder>
      <Group justify="space-between" mb="sm">
        <Text fw={500}>作者 {index + 1}</Text>
        {canRemove && !isFirstAuthor && (
          <ActionIcon
            color="red"
            onClick={onRemove}
            aria-label="删除作者"
          >
            <IconTrash size={16} />
          </ActionIcon>
        )}
      </Group>
      
      <Stack gap="sm">
        <Group align="flex-start" gap="md">
          <div style={{ flex: 1 }}>
            <AuthorSearch
              value={value.author_info || value.author_id}
              onChange={handleAuthorChange}
              label="作者姓名"
              placeholder="搜索作者姓名或ID"
              required
              locked={isAuthorLocked}
              currentUserId={currentUserId}
              isFirstAuthor={isFirstAuthor}
              error={errors.author_id}
            />
          </div>

          <div style={{ flex: 1 }}>
            <InstitutionSearch
              value={value.institution_id}
              onChange={handleInstitutionChange}
              label="所属单位"
              placeholder="选择工作单位"
              required
              disabled={isInstitutionDisabled}
              authorId={value.author_id}
              institutionInfo={value.institution_info}
              error={errors.institution_id}
            />
          </div>
        </Group>

        {/* 状态提示 */}
        {isFirstAuthor && userProfile && value.author_id === userProfile.author_id && (
          <Text size="xs" c="blue">
            作者1已自动锁定为当前账号所有人：{userProfile.name}
          </Text>
        )}

        {isAuthorLocked && !isFirstAuthor && (
          <Text size="xs" c="orange">
            已选择单位，作者输入框已锁定。清空单位可解锁作者输入框。
          </Text>
        )}

        {isInstitutionDisabled && (
          <Text size="xs" c="dimmed">
            请先选择作者，然后选择对应的工作单位
          </Text>
        )}
      </Stack>
    </Card>
  );
}

AuthorInstitutionInput.propTypes = {
  value: PropTypes.shape({
    author_id: PropTypes.number,
    author_info: PropTypes.object,
    institution_id: PropTypes.number,
    institution_info: PropTypes.object, // 新增：机构信息对象
  }),
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func,
  index: PropTypes.number.isRequired,
  currentUserId: PropTypes.number,
  isFirstAuthor: PropTypes.bool,
  canRemove: PropTypes.bool,
  errors: PropTypes.shape({
    author_id: PropTypes.string,
    institution_id: PropTypes.string,
  }),
};
