import { useMemo, useEffect } from 'react';
import { Autocomplete, Loader } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import api from '../api/axios.js';
import { endpoints } from '../api/endpoints.js';

/**
 * 资助基金名称联想输入
 * - 根据输入搜索基金项目名称
 * - 选择建议时自动填充项目编号
 */
export default function FundSearch({
  value,
  onChange,
  onFundSelect, // (fund) => void
  onExactMatchChange, // (boolean) => void
  label = '资助基金名称',
  placeholder = '输入基金项目名称',
  required = false,
  disabled = false,
  error = null,
}) {
  const [debounced] = useDebouncedValue(value || '', 300);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['funds-search', debounced],
    queryFn: async () => {
      const q = (debounced || '').trim();
      if (!q) return [];
      const resp = await api.get(endpoints.funds.search, { params: { query: q } });
      const list = Array.isArray(resp.data) ? resp.data : [];
      return list;
    },
    enabled: Boolean((debounced || '').trim()),
  });

  const options = useMemo(() => {
    const seen = new Set();
    const unique = [];
    for (const r of results) {
      const name = (r?.project_name || '').trim();
      if (!name) continue;
      if (!seen.has(name)) {
        seen.add(name);
        unique.push(name);
      }
    }
    return unique;
  }, [results]);

  // 通知父组件：当前输入是否为数据库中的“精确匹配”名称
  useEffect(() => {
    if (!onExactMatchChange) return;
    const q = (debounced || '').trim();
    const current = (value || '').trim();
    if (!q) {
      onExactMatchChange(false);
      return;
    }
    const matched = results.filter((r) => (r?.project_name || '').trim() === q);
    const hasExact = matched.length > 0;
    onExactMatchChange(hasExact);
    // 仅当“防抖后的值”与当前输入一致时才自动填充，避免用户刚开始删除时反复回填
    if (hasExact && onFundSelect && q === current) {
      const picked = matched[0];
      onFundSelect(picked);
    }
  }, [debounced, results, onExactMatchChange, onFundSelect, value]);

  const handleOptionSubmit = (val) => {
    const picked = results.find((r) => (r.project_name || '').trim() === (val || '').trim());
    onChange(val);
    if (picked && onFundSelect) {
      onFundSelect(picked);
    }
    if (onExactMatchChange) onExactMatchChange(Boolean(picked));
  };

  return (
    <Autocomplete
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={(v) => {
        // 修改名称时清空编号（避免名称与编号不一致）
        if (onFundSelect) onFundSelect(null);
        onChange(v);
      }}
      data={options}
      required={required}
      disabled={disabled}
      rightSection={isFetching ? <Loader size={16} /> : null}
      onOptionSubmit={handleOptionSubmit}
      error={error}
    />
  );
}

FundSearch.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onFundSelect: PropTypes.func,
  onExactMatchChange: PropTypes.func,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};