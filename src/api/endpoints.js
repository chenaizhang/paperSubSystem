export const endpoints = {
  auth: {
    login: '/api/auth/login',
    check: '/api/auth/check-auth'
  },
  users: {
    profile: '/api/users/profile',
    authors: '/api/users/authors',
    experts: '/api/users/experts',
    searchExperts: '/api/users/search-experts',
    search: '/api/users/search'
  },
  institutions: {
    search: '/api/institutions/search',
    create: '/api/institutions',
    my: '/api/institutions/my',
    linkAuthor: '/api/institutions/author/link',
    unlinkAuthor: (id) => `/api/institutions/author/unlink/${id}`,
    linkExpert: '/api/institutions/expert/link',
    unlinkExpert: (id) => `/api/institutions/expert/unlink/${id}`
  },
  keywords: {
    searchZh: '/api/keywords/search/zh',
    searchEn: '/api/keywords/search/en',
    create: '/api/keywords'
  },
  funds: {
    search: '/api/funds/search'
  },
  papers: {
    base: '/api/papers',
    uploadAttachment: '/api/papers/upload-attachment',
    detail: (id) => `/api/papers/${id}`,
    download: (id) => `/api/papers/${id}/download`,
    integrity: (id) => `/api/papers/${id}/integrity`,
    progress: (id) => `/api/papers/${id}/progress`,
    progressList: '/api/papers/progress'
  },
  reviews: {
    assignments: '/api/reviews/assignments',
    assignment: (id) => `/api/reviews/assignments/${id}`,
    paperExperts: (paperId) => `/api/reviews/papers/${paperId}/expert`,
    comments: (paperId) => `/api/reviews/papers/${paperId}/comments`,
    submit: '/api/reviews/submit',
    assignmentsUnreadCount: '/api/reviews/assignments/unread-count'
  },
  payments: {
    base: '/api/payments',
    status: (id) => `/api/payments/${id}/status`,
    paper: (paperId) => `/api/payments/papers/${paperId}`,
    withdrawals: '/api/payments/withdrawals',
    withdrawalAdmin: '/api/payments/admin/withdrawals',
    withdrawalStatus: (assignmentId) =>
      `/api/payments/withdrawals/${assignmentId}/status`
  },
  notifications: {
    author: '/api/notifications/author',
    markRead: (id) => `/api/notifications/${id}/read`,
    unreadCount: '/api/notifications/unread-count'
  },
  schedules: {
    base: '/api/schedules',
    detail: (id) => `/api/schedules/${id}`
  }
};
