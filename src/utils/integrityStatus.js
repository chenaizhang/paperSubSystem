const INTEGRITY_LABELS = {
  Waiting: "待审核",
  True: "审核通过",
  False: "审核未通过",
};

const INTEGRITY_COLORS = {
  Waiting: "yellow",
  True: "green",
  False: "red",
};

export function getIntegrityStatusLabel(status) {
  return INTEGRITY_LABELS[status] || "未知状态";
}

export function getIntegrityStatusColor(status) {
  return INTEGRITY_COLORS[status] || "gray";
}

export function isIntegrityWaiting(status) {
  return status === "Waiting";
}
