const REVIEW_STATUS_LABELS = {
  Accept: '接收',
  'Minor Revision': '小修',
  'Major Revision': '大修',
  Reject: '拒稿',
  Unknown: '暂无评审意见'
};

const REVIEW_STATUS_COLORS = {
  Accept: 'green',
  'Minor Revision': 'yellow',
  'Major Revision': 'orange',
  Reject: 'red',
  Unknown: 'gray'
};

const STATUS_ALIAS_LOOKUP = {
  accept: 'Accept',
  accepted: 'Accept',
  acceptance: 'Accept',
  'minor revision': 'Minor Revision',
  'minor_revision': 'Minor Revision',
  minorrevision: 'Minor Revision',
  'major revision': 'Major Revision',
  'major_revision': 'Major Revision',
  majorrevision: 'Major Revision',
  reject: 'Reject',
  rejected: 'Reject',
  rejection: 'Reject',
  '': 'Unknown',
  unknown: 'Unknown',
  pending: 'Unknown',
  draft: 'Unknown'
};

export function normalizeReviewStatus(status) {
  if (status === undefined || status === null) {
    return 'Unknown';
  }
  const key = String(status).trim().toLowerCase();
  return STATUS_ALIAS_LOOKUP[key] || 'Unknown';
}

export function getReviewStatusLabel(status) {
  return REVIEW_STATUS_LABELS[normalizeReviewStatus(status)];
}

export function getReviewStatusColor(status) {
  return REVIEW_STATUS_COLORS[normalizeReviewStatus(status)];
}

export const REVIEW_STATUS_OPTIONS = [
  { label: '全部评审意见', value: 'all' },
  { label: REVIEW_STATUS_LABELS.Accept, value: 'Accept' },
  { label: REVIEW_STATUS_LABELS['Minor Revision'], value: 'Minor Revision' },
  { label: REVIEW_STATUS_LABELS['Major Revision'], value: 'Major Revision' },
  { label: REVIEW_STATUS_LABELS.Reject, value: 'Reject' }
];
