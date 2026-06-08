import React from 'react';
import { Title, Stack, Text, Group } from '@mantine/core';
import LeaderboardTable from '../ui/LeaderboardTable';
import { MainLayout } from '../ui/Layout';

/**
 * AllTimeLeaderboardPage Component
 *
 * Displays the leaderboard for all time.
 */
const AllTimeLeaderboardPage = () => {
  return (
    <MainLayout>
      <Stack spacing='xl'>
        <Group spacing='md' align='center'>
          <div>
            <br />
            <br />
            <Title order={1}>Leaderboard All-Time</Title>
            <Text size='md' c='dimmed'>
              Best scores of all time
            </Text>
          </div>
        </Group>

        <LeaderboardTable
          period='alltime'
          title='All-Time Champions'
          itemsPerPage={15}
          showSearch={false}
          showPeriodSelect={false}
          autoRefreshMs={30000}
        />
      </Stack>
    </MainLayout>
  );
};

export default AllTimeLeaderboardPage;
