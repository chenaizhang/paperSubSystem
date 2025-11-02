import { useState, useMemo } from "react";
import { Combobox, InputBase, useCombobox, Text, Loader, Paper, Stack, Button, ScrollArea } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios.js";
import { endpoints } from "../api/endpoints.js";
import PropTypes from "prop-types";

/**
 * 作者搜索组件
 * 支持自动完成、锁定状态和当前用户自动锁定功能
 */
export default function AuthorSearch({
  value,
  onChange,
  label = "作者",
  placeholder = "搜索作者姓名或ID",
  required = false,
  disabled = false,
  locked = false,
  currentUserId = null,
  isFirstAuthor = false,
  error = null,
}) {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue] = useDebouncedValue(searchValue, 300);
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const normalizedCurrentUserId =
    currentUserId == null ? null : String(currentUserId);

  // 查询作者列表
  const { data: authors = [], isLoading } = useQuery({
    queryKey: ["authors-search", debouncedSearchValue],
    queryFn: async () => {
      if (!debouncedSearchValue || debouncedSearchValue.length < 1) {
        return [];
      }
      const response = await api.get(endpoints.users.search, {
        params: { query: debouncedSearchValue },
      });
      return response.data;
    },
    enabled: Boolean(debouncedSearchValue && debouncedSearchValue.length >= 1),
  });

  // 当前选中的作者信息
  const selectedAuthor = useMemo(() => {
    if (!value) return null;

    // 如果value是对象，直接使用
    if (typeof value === "object" && value.author_id) {
      return value;
    }

    // 如果value是ID，从authors列表中查找
    if (typeof value === "number") {
      return authors.find((author) => author.author_id === value) || null;
    }
    if (typeof value === "string") {
      return (
        authors.find(
          (author) => String(author.author_id) === value
        ) || null
      );
    }

    return null;
  }, [value, authors]);

  // 显示文本
  const normalizedSelectedAuthorId =
    selectedAuthor?.author_id == null
      ? null
      : String(selectedAuthor.author_id);
  const shouldLockFirstAuthor =
    isFirstAuthor &&
    normalizedSelectedAuthorId &&
    normalizedCurrentUserId &&
    normalizedSelectedAuthorId === normalizedCurrentUserId;

  const displayValue = useMemo(() => {
    if (!selectedAuthor) return "";

    if (
      locked ||
      shouldLockFirstAuthor
    ) {
      return `${selectedAuthor.name} / ID: ${selectedAuthor.author_id} (已锁定)`;
    }

    return `${selectedAuthor.name} / ID: ${selectedAuthor.author_id}`;
  }, [selectedAuthor, locked, shouldLockFirstAuthor]);

  // 处理选择
  const handleSelect = (author) => {
    onChange(author); // 传递完整的作者对象而不是只传递ID
    setSearchValue("");
    combobox.closeDropdown();
  };

  // 处理清空
  const handleClear = () => {
    if (
      locked ||
      shouldLockFirstAuthor
    ) {
      return; // 锁定状态不允许清空
    }
    onChange(null);
    setSearchValue("");
  };

  const isLocked =
    locked || shouldLockFirstAuthor;

  // 是否显示联想建议
  const showSuggestions = !isLocked && debouncedSearchValue && authors.length > 0;

  return (
    <Stack gap="sm">
      <Combobox
        store={combobox}
        withinPortal={false}
        onOptionSubmit={() => {}} // 禁用默认的选择行为
      >
        <Combobox.Target>
          <InputBase
            label={label}
            placeholder={placeholder}
            value={displayValue || searchValue}
            onChange={(event) => {
              if (isLocked) {
                return;
              }
              const newValue = event.currentTarget.value;
              setSearchValue(newValue);

              // 如果用户清空了输入框或者修改了已选择的内容，清除选择
              if (
                selectedAuthor &&
                (newValue === "" || newValue !== displayValue)
              ) {
                onChange(null);
              }

              combobox.openDropdown();
              combobox.updateSelectedOptionIndex();
            }}
            onKeyDown={(event) => {
              if (isLocked) {
                return;
              }

              // 处理退格键和删除键
              if (
                (event.key === "Backspace" || event.key === "Delete") &&
                selectedAuthor
              ) {
                // 如果有选中的作者且输入框为空或等于显示值，清除选择
                const currentValue = event.currentTarget.value;
                if (currentValue === displayValue || currentValue === "") {
                  event.preventDefault();
                  onChange(null);
                  setSearchValue("");
                  combobox.openDropdown();
                }
              }
            }}
            onClick={() => {
              if (!isLocked) {
                combobox.openDropdown();
              }
            }}
            onFocus={() => {
              if (!isLocked) {
                combobox.openDropdown();
              }
            }}
            onBlur={() => {
              // 延迟关闭以允许点击建议项
              setTimeout(() => {
                combobox.closeDropdown();
                setSearchValue("");
              }, 200);
            }}
            rightSection={isLoading ? <Loader size={18} /> : <Combobox.Chevron />}
            required={required}
            error={error}
            rightSectionPointerEvents="none"
            clearable={!isLocked && Boolean(selectedAuthor)}
            onClear={handleClear}
            disabled={isLocked}
          />
        </Combobox.Target>
      </Combobox>

      {/* 独立的联想建议卡片 */}
      {showSuggestions && (
        <Paper withBorder radius="md" p="sm">
          <Stack gap={8}>
            <Text size="sm" fw={500} lh={1.4}>
              匹配的作者
            </Text>
            <ScrollArea.Autosize mah={240} scrollbarSize={6}>
              <Stack gap={6}>
                {authors.map((author) => (
                  <Button
                    key={author.author_id}
                    variant="subtle"
                    color="gray"
                    fullWidth
                    justify="flex-start"
                    onClick={() => handleSelect(author)}
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
                        {author.name}
                      </Text>
                      <Text size="xs" c="dimmed" lh={1.2}>
                        ID: {author.author_id}
                      </Text>
                    </Stack>
                  </Button>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          </Stack>
        </Paper>
      )}

      {/* 无结果提示 */}
      {!isLocked && debouncedSearchValue && authors.length === 0 && !isLoading && (
        <Text size="sm" c="dimmed">
          未找到匹配的作者
        </Text>
      )}
    </Stack>
  );
}

AuthorSearch.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  locked: PropTypes.bool,
  currentUserId: PropTypes.number,
  isFirstAuthor: PropTypes.bool,
  error: PropTypes.string,
};
