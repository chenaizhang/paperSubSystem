export const endpoints = {
  auth: {
    login: '/api/auth/login',
    check: '/api/auth/check-auth'
  },
  users: {
    profile: '/api/users/profile',
    authors: '/api/users/authors',
    experts: '/api/users/experts'
  },
  papers: {
    base: '/api/papers',
    detail: (id) => `/api/papers/${id}`,
    integrity: (id) => `/api/papers/${id}/integrity`
  },
  reviews: {
    assign: '/api/reviews/assign',
    assignments: '/api/reviews/assignments',
    assignment: (id) => `/api/reviews/assignments/${id}`,
    comments: (paperId) => `/api/reviews/papers/${paperId}/comments`,
    submit: '/api/reviews/submit'
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
