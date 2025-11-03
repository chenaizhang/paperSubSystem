import { Badge, Card, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';

function ensureArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.list)) return payload.list;
  }
  return [];
}

export default function EditorDashboardPage() {
  const { data: papers, isLoading } = useQuery({
    queryKey: ['papers', 'editor'],
    queryFn: async () => {
      const response = await api.get(endpoints.papers.base);
      return response.data ?? [];
    }
  });

  const paperList = ensureArray(papers);

  if (isLoading) {
    return (
      <Stack align="center" justify="center" h="60vh">
        <Loader size="lg" />
      </Stack>
    );
  }

  const newSubmissions = paperList.filter((paper) => {
    if (!paper.submission_date) return false;
    return dayjs().diff(dayjs(paper.submission_date), 'day') <= 7;
  });

  return (
    <Stack gap="xl">
      <Title order={2}>编辑仪表盘</Title>
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <DashboardCard title="新增稿件 (7天)" value={newSubmissions.length} color="blue" />
      </SimpleGrid>
    </Stack>
  );
}

function DashboardCard({ title, value, color }) {
  return (
    <Card withBorder shadow="sm">
      <Stack>
        <Text c="dimmed">{title}</Text>
        <Text fw={700} fz={28}>
          {value}
        </Text>
        <Badge color={color}>统计</Badge>
      </Stack>
    </Card>
  );
}

DashboardCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired
};
