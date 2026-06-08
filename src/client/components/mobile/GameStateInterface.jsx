import React, { useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useGame, GAME_STATES } from '../../contexts/GameContext';
import { usePlayerState } from '../../hooks/usePlayerState';
import StatsDisplay from '../ui/StatsDisplay';
import './screens/MobileScreen.css';

import {
  ConnectingScreen,
  WaitingScreen,
  PlayingScreen,
  GameOverScreen,
  UsernameEntryScreen,
} from './screens';

const GameStateInterface = memo(() => {
  const {
    gameState,
    characterId,
    username,
    statusMessage,
    error,
    stats,
    setUsername,
    connect,
    saveUsernameAndConnect,
    startGame,
    setFinishedState,
  } = useGame();

  const { playerState, loading } = usePlayerState(characterId);
  const autoConnectAttemptedRef = useRef(false);

  const handleSaveUsername = useCallback(async (name) => {
    const saved = await saveUsernameAndConnect(name);
    if (saved) {
      setTimeout(() => connect(), 100);
    }
  }, [saveUsernameAndConnect, connect]);

  const playerStateEffectDeps = useMemo(
    () => ({
      hasPlayerState: !!playerState,
      hasCharacterId: !!characterId,
      hasUsername: !!username,
      playerUsername: playerState?.username,
      playerState: playerState?.state,
      gameState,
      playerStats: playerState?.gameStats,
    }),
    [playerState, characterId, username, gameState]
  );

  const screenProps = useMemo(
    () => ({
      name_entry: {
        characterId,
        onSaveUsername: handleSaveUsername,
        statusMessage,
        error,
      },
      connecting: { statusMessage },
      ready: { username, characterId, onStartGame: startGame, canStartGame: gameState === GAME_STATES.READY, statusMessage },
      playing: { username, characterId },
      finished: { finalStats: stats, username, characterId, onReturnToStart: () => window.location.reload() },
    }),
    [username, characterId, handleSaveUsername, error, statusMessage, startGame, gameState, stats]
  );

  const renderScreen = useCallback(() => {
    switch (gameState) {
      case GAME_STATES.NAME_ENTRY:
        return <UsernameEntryScreen {...screenProps.name_entry} />;
      case GAME_STATES.CONNECTING:
        return <ConnectingScreen {...screenProps.connecting} />;
      case GAME_STATES.READY:
        return <WaitingScreen {...screenProps.ready} />;
      case GAME_STATES.PLAYING:
        return <PlayingScreen {...screenProps.playing} />;
      case GAME_STATES.FINISHED:
        return <GameOverScreen {...screenProps.finished} />;
      default:
        return <ConnectingScreen statusMessage='Loading game...' />;
    }
  }, [gameState, screenProps]);

  // Auto-connect when player state has username
  useEffect(() => {
    if (
      playerStateEffectDeps.hasPlayerState &&
      playerStateEffectDeps.hasCharacterId
    ) {
      // Set username from server if available
      if (playerStateEffectDeps.playerUsername && !playerStateEffectDeps.hasUsername) {
        setUsername(playerStateEffectDeps.playerUsername);
      }

      // Handle finished state
      if (playerStateEffectDeps.playerState === 'finished') {
        setFinishedState(playerStateEffectDeps.playerStats);
        return;
      }

      // Auto-connect for returning players with username
      if (
        playerStateEffectDeps.playerUsername &&
        !autoConnectAttemptedRef.current
      ) {
        autoConnectAttemptedRef.current = true;
        setTimeout(() => connect(), 100);
      }
    }
  }, [playerStateEffectDeps, setUsername, connect, setFinishedState]);

  // Reset auto-connect flag on error
  useEffect(() => {
    if (error) {
      autoConnectAttemptedRef.current = false;
    }
  }, [error]);

  // Loading state
  if (loading) {
    return <ConnectingScreen statusMessage='Loading...' />;
  }

  // First visit - no username from server, need entry screen
  const needsUsernameEntry =
    playerState &&
    !playerState.username &&
    !username &&
    playerState.state !== 'finished';

  if (needsUsernameEntry) {
    return (
      <div className='mobileScreenOverlay'>
        <UsernameEntryScreen
          characterId={characterId}
          onSaveUsername={handleSaveUsername}
          statusMessage={statusMessage}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className='mobileScreenOverlay'>
      {gameState === GAME_STATES.PLAYING && (
        <div className='statsDisplay'>
          <StatsDisplay stats={stats} />
        </div>
      )}
      {renderScreen()}
    </div>
  );
});

GameStateInterface.displayName = 'GameStateInterface';

export default GameStateInterface;
