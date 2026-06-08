import { useCallback, useMemo, memo, useState, useRef, useEffect } from 'react';
import { Container, Stack, Group, Button, Text } from '@mantine/core';
import ThrottledJoystick from '../ui/ThrottledJoystick';
import { useGame } from '../../../contexts/GameContext';
import './MobileScreen.css';

/**
 * PlayingScreen Component
 * Displays the main game interface with player controls.
 * The background is handled by a parent component.
 * Memoized since it doesn't receive frequently changing props.
 */
const PlayingScreen = memo(({ username, characterId }) => {
  const { sendJoystick, sendButton, isAuto, switchToManual, switchToAuto } =
    useGame();
  const [isAction1Pressed, setIsAction1Pressed] = useState(false);
  const [confirmAuto, setConfirmAuto] = useState(false);
  const confirmTimeoutRef = useRef(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const handleAutoClick = useCallback(() => {
    if (confirmAuto) {
      switchToAuto();
      setConfirmAuto(false);
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    } else {
      setConfirmAuto(true);
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
      confirmTimeoutRef.current = setTimeout(() => {
        setConfirmAuto(false);
      }, 2500);
    }
  }, [confirmAuto, switchToAuto]);

  // Joystick handler - will be throttled by ThrottledJoystick component
  const handleJoystickMove = useCallback(
    (x, y) => {
      sendJoystick(x, y);
    },
    [sendJoystick]
  );

  // Button handlers - send immediately on every press/release
  const handleButtonPress = useCallback(
    (button, pressed) => {
      sendButton(button, pressed);

      // Update visual state for button feedback
      if (button === 'action1') {
        setIsAction1Pressed(pressed);
      }
    },
    [sendButton]
  );

  // Memoize button event handlers to prevent recreation on each render
  const action1Handlers = useMemo(
    () => ({
      onMouseDown: () => handleButtonPress('action1', true),
      onMouseUp: () => handleButtonPress('action1', false),
      onTouchStart: () => handleButtonPress('action1', true),
      onTouchEnd: () => handleButtonPress('action1', false),
    }),
    [handleButtonPress]
  );

  const action2Handlers = useMemo(
    () => ({
      onMouseDown: () => handleButtonPress('action2', true),
      onMouseUp: () => handleButtonPress('action2', false),
      onTouchStart: () => handleButtonPress('action2', true),
      onTouchEnd: () => handleButtonPress('action2', false),
    }),
    [handleButtonPress]
  );

  return (
    <div>
      <Container size='sm' className='screenCard large controller'>
        {/* Controls */}
        <Stack gap='md' align='center' w='100%'>
          {username && characterId && (
            <div className='characterCard noFrame' style={{ maxWidth: '200px' }}>
              <div
                className='characterImage'
                style={{ backgroundImage: `url(/uploads/${characterId})`, position: 'relative', width: '100%', height: '200px', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}
              />
              <Text ta='center' fw={700} c='white' mt='xs'>{username}</Text>
            </div>
          )}

          {isAuto ? (
            <div className='autoModeStatus'>
              <span className='pulseDot'></span>
              <Text size='lg' fw={700} ta='center' className='autoText'>
                AUTO-PILOT ACTIVE
              </Text>

              <Button
                onClick={switchToManual}
                size='md'
                variant='outline'
                color='teal'
                mt='md'
                style={{ borderRadius: '20px', borderWidth: '2px' }}
              >
                Manual Control
              </Button>
            </div>
          ) : (
            <>
              <ThrottledJoystick onMove={handleJoystickMove} size={220} />

              <Button
                onClick={handleAutoClick}
                size="xs"
                variant={confirmAuto ? 'filled' : 'outline'}
                color="teal"
                style={{
                  borderRadius: '16px',
                  borderWidth: '1px',
                  position: 'fixed',
                  bottom: '30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 100,
                  fontSize: '0.75rem',
                  height: '28px',
                  padding: '0 12px',
                  transition: 'all 0.2s ease',
                  backgroundColor: confirmAuto ? '#20c997' : 'rgba(0, 0, 0, 0.4)',
                  borderColor: confirmAuto ? '#20c997' : 'rgba(32, 201, 151, 0.4)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {confirmAuto ? 'Confirm' : 'Auto-Pilot'}
              </Button>
            </>
          )}
        </Stack>
      </Container>
    </div>
  );
});

PlayingScreen.displayName = 'PlayingScreen';

export default PlayingScreen;
