import { memo, useState } from 'react';
import { Stack, Text, Button, Container } from '@mantine/core';
import PropTypes from 'prop-types';
import FinalImageGenerator from './FinalImageGenerator';
import './MobileScreen.css';

/**
 * GameOverScreen Component
 * Renders the content for the game over screen with final image generation.
 */
const GameOverScreen = memo(
  ({ finalStats, username, characterId, onReturnToStart }) => {
    return (
      <Container size='sm' className='screenCard large gameover'>
        <Stack gap='md' align='center'>
          <Text
            size='sm'
            ta='center'
            c='white'
            mt='4rem'
            mb='-3rem'
            style={{ position: 'relative', zIndex: 20 }}
          >
            Game completed! Check the{' '}
            <a href='/leaderboard/daily' style={{ color: '#74c0fc' }}>
              leaderboard
            </a>{' '}
            to see your ranking.
          </Text>

          {/* Final Image Generation Component */}
          <FinalImageGenerator
            characterId={characterId}
            username={username}
            stats={finalStats}
            onReturnToStart={onReturnToStart}
          />
        </Stack>
      </Container>
    );
  }
);

// Add displayName for better debugging
GameOverScreen.displayName = 'GameOverScreen';

GameOverScreen.propTypes = {
  finalStats: PropTypes.shape({
    score: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  username: PropTypes.string.isRequired,
  characterId: PropTypes.string.isRequired,
  onReturnToStart: PropTypes.func.isRequired,
};

export default GameOverScreen;
