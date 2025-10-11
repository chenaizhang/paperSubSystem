import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

export function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <Stack align="center" justify="center" h="100%" p="xl" spacing="md">
      <Title order={2}>403 未授权访问</Title>
      <Text c="dimmed">您没有访问此页面的权限，如需访问请联系管理员。</Text>
      <Group>
        <Button onClick={() => navigate(-1)}>返回上一页</Button>
        <Button variant="outline" onClick={() => navigate('/')}>
          回到首页
        </Button>
      </Group>
    </Stack>
  );
}
