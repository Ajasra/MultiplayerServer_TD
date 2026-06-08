import { useState, useCallback, memo } from 'react';
import { Button, Container, Stack, Text, TextInput } from '@mantine/core';
import PropTypes from 'prop-types';

/**
 * UsernameEntryScreen Component
 *
 * Shown when a player visits for the first time and needs to enter a name.
 * Simple input form that saves the username before connecting to the game.
 */
const UsernameEntryScreen = memo(
  ({ onSaveUsername, statusMessage, error, characterId }) => {
    const [username, setUsername] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = useCallback(async () => {
      if (!username.trim() || isSubmitting) return;
      setIsSubmitting(true);
      try {
        await onSaveUsername(username.trim());
      } finally {
        setIsSubmitting(false);
      }
    }, [username, isSubmitting, onSaveUsername]);

    const handleKeyDown = useCallback(
      e => {
        if (e.key === 'Enter') {
          handleSubmit();
        }
      },
      [handleSubmit]
    );

    return (
      <Container size='sm' className='screenCard large' style={{ marginTop: '15%' }}>
        <Stack gap='lg' align='center' pb='xl'>
          <Text ta='center' fw={700} size='xl' c='white'>
            Welcome!
          </Text>

          {characterId && (
            <div
              className='characterImage'
              style={{
                backgroundImage: `url(/uploads/${characterId})`,
                width: '120px',
                height: '120px',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}
            />
          )}

          <Text ta='center' size='sm' c='dimmed'>
            Enter your name to join the game
          </Text>

          <TextInput
            placeholder='Your name'
            value={username}
            onChange={e => setUsername(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            maxLength={16}
            size='lg'
            style={{ width: '100%', maxWidth: '280px' }}
            disabled={isSubmitting}
          />

          {error && (
            <Text size='sm' c='red' ta='center'>
              {error}
            </Text>
          )}

          {statusMessage && (
            <Text size='sm' c='dimmed' ta='center'>
              {statusMessage}
            </Text>
          )}

          <Button
            onClick={handleSubmit}
            size='lg'
            disabled={!username.trim() || isSubmitting}
            loading={isSubmitting}
            style={{ width: '224px', minHeight: '64px', borderRadius: '12px' }}
          >
            Join Game
          </Button>
        </Stack>
      </Container>
    );
  }
);

UsernameEntryScreen.displayName = 'UsernameEntryScreen';

UsernameEntryScreen.propTypes = {
  onSaveUsername: PropTypes.func.isRequired,
  statusMessage: PropTypes.string,
  error: PropTypes.string,
  characterId: PropTypes.string,
};

export default UsernameEntryScreen;
