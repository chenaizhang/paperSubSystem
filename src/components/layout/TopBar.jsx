import PropTypes from 'prop-types';
import {
  ActionIcon,
  Avatar,
  Burger,
  Group,
  Indicator,
  Menu,
  Text,
  Title
} from '@mantine/core';
import { IconBell, IconLogout, IconMoonStars, IconSun, IconUser } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { useTheme } from '../ThemeProvider.jsx';

export function TopBar({ opened = false, onToggle = () => {} }) {
  const navigate = useNavigate();
  const { colorScheme, toggleColorScheme } = useTheme();
  const { role, logout } = useAuth();
  const { data: unreadCount } = useQuery({
    queryKey: ['unread-indicator', role],
    enabled: role === 'author' || role === 'expert',
    queryFn: async () => {
      if (role === 'author') {
        const { data } = await api.get(endpoints.notifications.author, {
          params: { pageSize: 50 }
        });
        const list = data?.items ?? data ?? [];
        return list.filter((item) => item.is_read === false || item.is_read === 0).length;
      }
      if (role === 'expert') {
        const { data } = await api.get(endpoints.reviews.assignmentsUnreadCount);
        return Number(data?.unread_count) || 0;
      }
      return 0;
    },
    refetchInterval: 60000,
    staleTime: 60000
  });

  const roleLabel = {
    author: '作者',
    expert: '专家',
    editor: '编辑'
  }[role] || '访客';

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group>
        <Burger opened={opened} onClick={onToggle} hiddenFrom="sm" size="sm" aria-label="切换导航" />
        <Title order={4}>论文投稿系统</Title>
      </Group>
      <Group>
        <Text>当前角色：{roleLabel}</Text>
        <ActionIcon
          variant="default"
          onClick={() => toggleColorScheme()}
          size="lg"
          aria-label="切换主题"
        >
          {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoonStars size={18} />}
        </ActionIcon>
        <Indicator inline label={unreadCount || 0} size={18} disabled={!unreadCount}>
          <ActionIcon
            variant="light"
            color="blue"
            size="lg"
            onClick={() => {
              if (role === 'expert') {
                navigate('/expert/reviews');
              } else {
                navigate('/notifications');
              }
            }}
            aria-label="查看通知"
          >
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>
        <Menu shadow="md" width={180}>
          <Menu.Target>
            <Avatar radius="xl" color="blue">
              <IconUser size={18} />
            </Avatar>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>账户</Menu.Label>
            <Menu.Item onClick={() => navigate('/profile')}>个人信息</Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconLogout size={16} />}
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              退出登录
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}

TopBar.propTypes = {
  opened: PropTypes.bool,
  onToggle: PropTypes.func
};
