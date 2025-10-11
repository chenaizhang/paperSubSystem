import axios from 'axios';
import { notifications } from '@mantine/notifications';
import {
  getAuthToken,
  clearAuthSession,
  getAuthRole,
  getAuthUserId
} from '../stores/authStorage.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  withCredentials: false
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      '请求发生错误，请稍后重试';

    if (status === 401 || status === 403) {
      clearAuthSession();
      notifications.show({
        title: '认证已过期',
        message: '请重新登录账号',
        color: 'red'
      });
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    } else {
      notifications.show({
        title: '请求失败',
        message,
        color: 'red'
      });
    }

    return Promise.reject({
      ...error,
      friendlyMessage: message,
      status,
      role: getAuthRole(),
      userId: getAuthUserId()
    });
  }
);

export default api;
