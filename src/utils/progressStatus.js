const RAW_STATUS_SEQUENCE = [
  ["Draft", "草稿"],
  ["Initial Reviewing", "初审中"],
  ["Reviewing", "评审中"],
  ["Revisioning", "修改中"],
  ["Second Reviewing", "二次评审"],
  ["Final Review Completed", "最终评审完成"],
  ["Final Reviewing", "最终评审中"],
  ["Paying", "支付中"],
  ["Scheduling", "排期中"],
  ["Published", "已发表"],
  ["Accept", "已录用"],
  ["Reject", "已拒绝"],
];

const LABEL_ENTRIES = RAW_STATUS_SEQUENCE.map(([value, label]) => [value, label]);

export const PROGRESS_STATUS_LABELS = Object.fromEntries(LABEL_ENTRIES);

const PROGRESS_STATUS_ALIASES = LABEL_ENTRIES.reduce((aliases, [value, _label]) => {
  aliases[value.toLowerCase()] = value;
  aliases[value.replace(/\s+/g, "_").toLowerCase()] = value;
  return aliases;
}, {});

export function normalizeProgressStatus(status) {
  if (status === undefined || status === null) {
    return null;
  }
  const normalized = String(status).trim();
  if (!normalized) {
    return null;
  }
  const key = normalized.toLowerCase();
  return PROGRESS_STATUS_ALIASES[key] || PROGRESS_STATUS_ALIASES[key.replace(/-/g, "_")] || normalized;
}

export function getProgressStatusLabel(status) {
  const normalized = normalizeProgressStatus(status);
  if (!normalized) {
    return "未知状态";
  }
  return PROGRESS_STATUS_LABELS[normalized] || normalized;
}

export const PROGRESS_STATUS_FILTER_OPTIONS = [
  { label: "全部状态", value: "all" },
  ...RAW_STATUS_SEQUENCE.map(([value, label]) => ({ label, value })),
];
