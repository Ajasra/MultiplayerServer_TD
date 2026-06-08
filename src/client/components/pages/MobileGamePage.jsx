import React from 'react';
import { useParams } from 'react-router-dom';
import GameStateInterface from '../mobile/GameStateInterface';
import { PlayerLayout } from '../ui/Layout';
import { GameProvider } from '../../contexts/GameContext';

/**
 * Mobile Game Page
 *
 * Clean implementation using single-context architecture with integrated
 * WebSocket management and working joystick controls.
 */
const MobileGamePage = () => {
  const { characterId } = useParams();

  return (
    <GameProvider characterId={characterId}>
      <PlayerLayout>
        <GameStateInterface />
      </PlayerLayout>
    </GameProvider>
  );
};

export default MobileGamePage;
