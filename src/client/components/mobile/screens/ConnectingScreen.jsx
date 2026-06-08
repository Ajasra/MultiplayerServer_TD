import React from 'react';
import { Stack, Text, Loader, Center } from '@mantine/core';
import PropTypes from 'prop-types';

/**
 * ConnectingScreen Component
 *
 * Displays loading state while connecting to the game server.
 * Simple focused component for the connection process.
 */
const ConnectingScreen = ({ statusMessage }) => {
  return (
    <Center>
      <Stack gap='md' align='center'>
        <Loader size='lg' color='blue' />

        <Text ta='center' fw={500} c='blue'>
          Connecting to game server...
        </Text>

        {statusMessage && (
          <Text size='sm' ta='center' c='dimmed'>
            {statusMessage}
          </Text>
        )}

        <Text size='xs' ta='center' c='dimmed'>
          Please wait while we establish your connection
        </Text>
      </Stack>
    </Center>
  );
};

ConnectingScreen.propTypes = {
  statusMessage: PropTypes.string,
};

export default ConnectingScreen;
