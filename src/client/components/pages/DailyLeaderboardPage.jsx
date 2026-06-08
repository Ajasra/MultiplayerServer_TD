import React from 'react';
import { Title, Stack, Text, Group } from '@mantine/core';
import LeaderboardTable from '../ui/LeaderboardTable';
import { MainLayout } from '../ui/Layout';

/**
 * DailyLeaderboardPage Component
 *
 * Displays the leaderboard for the current day.
 */
const DailyLeaderboardPage = () => {
  return (
    <MainLayout>
      <Stack spacing='xl'>
        <Group spacing='md' align='center'>
          <div>
            <br />
            <br />
            <Title order={1}>Leaderboard Today</Title>
            <Text size='md' c='dimmed'>
              Top players and scores from today
            </Text>
          </div>
        </Group>

        <LeaderboardTable
          period='daily'
          title="Today's Top Scores"
          itemsPerPage={15}
          showSearch={false}
          showPeriodSelect={false}
          autoRefreshMs={30000}
        />
      </Stack>
    </MainLayout>
  );
};

export default DailyLeaderboardPage;
