import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  zh: {
    translation: {
      login: {
        title: '论文投稿系统登录',
        email: '邮箱',
        password: '密码',
        role: '角色',
        submit: '登录',
        error: '用户名或密码错误'
      },
      common: {
        logout: '退出登录',
        profile: '个人信息',
        notifications: '通知',
        dashboard: '仪表盘',
        loading: '加载中...',
        actions: '操作',
        save: '保存',
        cancel: '取消'
      }
    }
  },
  en: {
    translation: {
      login: {
        title: 'Paper Submission Login',
        email: 'Email',
        password: 'Password',
        role: 'Role',
        submit: 'Sign in',
        error: 'Incorrect email or password'
      },
      common: {
        logout: 'Log out',
        profile: 'Profile',
        notifications: 'Notifications',
        dashboard: 'Dashboard',
        loading: 'Loading...',
        actions: 'Actions',
        save: 'Save',
        cancel: 'Cancel'
      }
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh',
  fallbackLng: 'zh',
  interpolation: {
    escapeValue: false
  }
});

export default i18n;
