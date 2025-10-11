import { Button, Stack, Text, Title } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Stack align="center" justify="center" h="100%" p="xl">
      <Title order={2}>404 页面不存在</Title>
      <Text c="dimmed">您访问的页面已被移除或暂不可用。</Text>
      <Button onClick={() => navigate('/')}>回到首页</Button>
    </Stack>
  );
}
