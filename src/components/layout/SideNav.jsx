import PropTypes from 'prop-types';
import { NavLink, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IconLayoutDashboard,
  IconFileText,
  IconCash,
  IconUsersGroup,
  IconReportSearch
} from '@tabler/icons-react';
import { useAuth } from '../../features/auth/AuthProvider.jsx';

const baseItems = [
  {
    label: '个人信息',
    icon: IconUsersGroup,
    to: '/profile',
    roles: ['author', 'expert', 'editor']
  }
];

export function SideNav({ onNavigate = () => {} }) {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = useMemo(() => {
    const items = [...baseItems];

    if (role === 'author') {
      items.unshift(
        {
          label: '仪表盘',
          icon: IconLayoutDashboard,
          to: '/author/dashboard'
        },
        {
          label: '我的论文',
          icon: IconFileText,
          to: '/author/papers'
        }
      );
    }

    if (role === 'expert') {
      items.unshift(
        {
          label: '仪表盘',
          icon: IconLayoutDashboard,
          to: '/expert/dashboard'
        },
        {
          label: '审稿任务',
          icon: IconReportSearch,
          to: '/expert/reviews'
        },
        {
          label: '提现管理',
          icon: IconCash,
          to: '/expert/withdrawals'
        }
      );
    }

    if (role === 'editor') {
      items.unshift(
        {
          label: '仪表盘',
          icon: IconLayoutDashboard,
          to: '/editor/dashboard'
        },
        {
          label: '稿件管理',
          icon: IconFileText,
          to: '/editor/papers'
        }
      );
    }

    return items.filter((item) => !item.roles || item.roles.includes(role));
  }, [role]);

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm" c="dimmed">
        导航
      </Text>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          label={item.label}
          active={location.pathname.startsWith(item.to)}
          leftSection={<item.icon size={18} />}
          onClick={() => {
            navigate(item.to);
            onNavigate();
          }}
        />
      ))}
    </Stack>
  );
}

SideNav.propTypes = {
  onNavigate: PropTypes.func
};
