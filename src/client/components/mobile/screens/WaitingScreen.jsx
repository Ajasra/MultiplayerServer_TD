import { memo, useCallback, useState } from 'react';
import { Button, Container, Stack, Text, Loader } from '@mantine/core';
import PropTypes from 'prop-types';
import './MobileScreen.css';

/**
 * WaitingScreen Component
 * Shown when the player is connected but waiting for the game to start.
 * The background is now handled by a parent component.
 */
const WaitingScreen = memo(
  ({ onStartGame, canStartGame, username, characterId }) => {
    const [isStartPressed, setIsStartPressed] = useState(false);
    const [isAutoStartPressed, setIsAutoStartPressed] = useState(false);

    const handleStartGame = useCallback(() => {
      if (canStartGame) {
        onStartGame();
      }
    }, [canStartGame, onStartGame]);

    const handleStartAutoGame = useCallback(() => {
      if (canStartGame) {
        onStartGame({ auto: true });
      }
    }, [canStartGame, onStartGame]);

    return (
      <Container size='sm' className='screenCard large'>
        <Stack gap='lg' align='center'>
          {username && characterId && (
            <div className='characterCard' style={{ maxWidth: '200px' }}>
              <div
                className='characterImage'
                style={{ backgroundImage: `url(/uploads/${characterId})`, position: 'relative', width: '100%', height: '200px', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}
              />
              <Text className='username'>{username}</Text>
            </div>
          )}

          {!canStartGame && <Loader color='blue' />}

          <div className='waitingButtonsContainer'>
            <Button
              onClick={handleStartGame}
              disabled={!canStartGame}
              size='lg'
              className='gameButton'
              onMouseDown={() => setIsStartPressed(true)}
              onMouseUp={() => setIsStartPressed(false)}
              onTouchStart={() => setIsStartPressed(true)}
              onTouchEnd={() => setIsStartPressed(false)}
              style={{
                transform: isStartPressed ? 'scale(0.95)' : 'scale(1)',
                opacity: isStartPressed ? 0.8 : 1,
                transition: 'transform 0.1s ease, opacity 0.1s ease',
                boxShadow: isStartPressed
                  ? 'inset 0 2px 4px rgba(0,0,0,0.2)'
                  : '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              Start Game
            </Button>

            <Button
              onClick={handleStartAutoGame}
              disabled={!canStartGame}
              size='lg'
              className='gameButton autoButton'
              onMouseDown={() => setIsAutoStartPressed(true)}
              onMouseUp={() => setIsAutoStartPressed(false)}
              onTouchStart={() => setIsAutoStartPressed(true)}
              onTouchEnd={() => setIsAutoStartPressed(false)}
              style={{
                transform: isAutoStartPressed ? 'scale(0.95)' : 'scale(1)',
                opacity: isAutoStartPressed ? 0.8 : 1,
                transition: 'transform 0.1s ease, opacity 0.1s ease',
                boxShadow: isAutoStartPressed
                  ? 'inset 0 2px 4px rgba(0,0,0,0.2)'
                  : '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              Auto Play
            </Button>
          </div>
        </Stack>
      </Container>
    );
  }
);

WaitingScreen.displayName = 'WaitingScreen';

WaitingScreen.propTypes = {
  onStartGame: PropTypes.func.isRequired,
  canStartGame: PropTypes.bool,
  statusMessage: PropTypes.string,
  username: PropTypes.string,
  characterId: PropTypes.string,
};

export default WaitingScreen;
