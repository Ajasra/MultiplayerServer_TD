import React from 'react';
import {
  Title,
  Text,
  Stack,
  Center,
  Group,
  Button,
  Card,
  ThemeIcon,
  List,
} from '@mantine/core';
import IconCheck from '@tabler/icons-react/dist/esm/icons/IconCheck.mjs';
import { MainLayout } from '../ui/Layout';

function HeroSection() {
  return (
    <Card
      radius='md'
      p={0}
      withBorder={false}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <div
        aria-hidden
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          width: '100%',
          height: 420,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.65) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Stack spacing='md' p='xl' maw={720}>
          <Title order={1} ta='left' fz='h1'>
            Game Server
          </Title>
          <Text size='lg' c='gray.1'>
            A real-time multiplayer game server with WebSocket communication.
            Connect, play, and compete on the leaderboard.
          </Text>
          <Group spacing='md'>
            <Button
              component='a'
              href='/leaderboard/daily'
              variant='filled'
              color='violet'
            >
              View Leaderboard
            </Button>
            <Button
              component='a'
              href='/leaderboard/alltime'
              variant='outline'
              color='violet'
            >
              All-Time Scores
            </Button>
          </Group>
        </Stack>
      </div>
    </Card>
  );
}

function DescriptionSection() {
  return (
    <Center>
      <Stack spacing='sm' maw={900} align='center'>
        <Text size='lg' ta='center' c='gray.2'>
          A real-time game server template built with Express, Socket.io, and
          React. Features WebSocket communication, in-memory game state
          management, leaderboard tracking, and a mobile-friendly player
          controller interface.
        </Text>
      </Stack>
    </Center>
  );
}

function HowItWorksSection() {
  return (
    <Stack spacing='md' p='xl'>
      <Title order={3}>How it works</Title>
      <List
        spacing='sm'
        size='md'
        icon={
          <ThemeIcon color='violet' size={20} radius='xl'>
            <IconCheck size={14} />
          </ThemeIcon>
        }
      >
        <List.Item>Create a player session via the API</List.Item>
        <List.Item>Connect with the mobile controller interface</List.Item>
        <List.Item>Control your character in real-time</List.Item>
        <List.Item>Track scores and view the leaderboard</List.Item>
      </List>
    </Stack>
  );
}

const HomePage = () => {
  return (
    <MainLayout>
      <Stack spacing='xl'>
        <br />
        <br />
        <HeroSection />
        <DescriptionSection />
        <HowItWorksSection />
      </Stack>
    </MainLayout>
  );
};

export default HomePage;
