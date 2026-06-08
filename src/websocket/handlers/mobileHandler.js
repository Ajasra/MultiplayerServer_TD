// const { logError, logInfo, logWarn, logDebug } = require('../../db/logging.js');
const GameStateManager = require('../../game/gameStateManager.js');
const ClientManager = require('../clientManager.js'); // To potentially access TD sockets
const { updateSession, getSessionById } = require('../../db/sessions.js'); // Import DB functions

const WEBSOCKET_CONTEXT = 'WEBSOCKET_MOBILE_HANDLER';

let ioInstance; // To hold the socket.io instance

/**
 * Initializes the Mobile handler with the Socket.IO instance.
 * @param {object} io - The Socket.IO server instance.
 */
function initializeMobileHandler(io) {
  ioInstance = io;
  // logInfo('Mobile Handler initialized with IO instance.', WEBSOCKET_CONTEXT);
  console.info(
    `[${WEBSOCKET_CONTEXT}] Mobile Handler initialized with IO instance.`
  );
}

/**
 * Sets up event listeners specific to Mobile clients.
 * @param {object} socket - The socket instance for the mobile client.
 * @param {string} characterId - The player/character ID associated with this client.
 */
function setupMobileClientHandlers(socket, characterId) {
  const socketId = socket.id;

  // logInfo(`Setting up Mobile specific event handlers`, WEBSOCKET_CONTEXT, { socketId, characterId });
  console.info(
    `[${WEBSOCKET_CONTEXT}] Setting up Mobile specific event handlers for ${socketId} (Player: ${characterId})`
  );

  // --- Event Listeners ---

  socket.on('start_game', async data => {
    const playerId = GameStateManager.getPlayerIdBySocketId(socketId);
    if (!playerId) {
      // logWarn('Received start_game from socket with no associated player', WEBSOCKET_CONTEXT, { socketId });
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Received start_game from socket ${socketId} with no associated player`
      );
      return; // Should not happen if setup is correct
    }
    // Ensure the correct player is starting
    if (playerId !== characterId) {
      // logWarn(`Received start_game for wrong player`, WEBSOCKET_CONTEXT, { socketId, expectedPlayerId: characterId, actualPlayerId: playerId });
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Received start_game for wrong player on socket ${socketId}. Expected: ${characterId}, Got: ${playerId}`
      );
      return;
    }

    const isAuto = !!(data && (data.isAuto === true || data.auto === true));

    try {
      // logInfo(`Received start_game request`, WEBSOCKET_CONTEXT, { playerId, socketId });
      console.info(
        `[${WEBSOCKET_CONTEXT}] Received start_game request from ${playerId} (${socketId})${isAuto ? ' (AUTO mode)' : ''}`
      );

      // Get current session userdata to update
      const currentSession = await getSessionById(playerId);
      const currentUserdata = currentSession?.userdata || {};
      currentUserdata.isAuto = isAuto;

      // Update DB state first
      const startedSession = await updateSession(playerId, {
        $set: { active: 1, last_ping: new Date(), userdata: currentUserdata },
      });
      if (!startedSession)
        throw new Error('Failed to update DB session state to active');

      // Update Game State Manager state
      GameStateManager.updatePlayerActiveState(playerId, 1);
      const player = GameStateManager.getPlayer(playerId);
      if (player) {
        player.isAuto = isAuto;
      }

      // Notify player
      socket.emit('game_started', {
        clientType: 'server',
        message: 'Game started! Get ready to play.',
        active: 1, // Confirm active state
        isAuto: isAuto,
      });

      // Notify TouchDesigner
      const gameStartPayload = {
        type: 'player_started',
        clientType: 'server',
        id: playerId,
        active: 1,
        state: 1, // State representing active game
        auto: isAuto ? 1 : 0,
      };
      const tdSockets = ClientManager.getTouchDesignerSockets();
      tdSockets.forEach(tdSocketId => {
        ioInstance.to(tdSocketId).emit('server_message', gameStartPayload);
      });
      // logInfo(`Player started game and notified ${tdSockets.size} TD clients`, WEBSOCKET_CONTEXT, { playerId, socketId });
      console.info(
        `[${WEBSOCKET_CONTEXT}] Player ${playerId} started game (Auto: ${isAuto}) and notified ${tdSockets.size} TD clients`
      );
    } catch (error) {
      // logError(`Error processing start_game request`, WEBSOCKET_CONTEXT, error, { playerId, socketId });
      console.error(
        `[${WEBSOCKET_CONTEXT}] Error processing start_game request for ${playerId} (${socketId}):`,
        error
      );
      socket.emit('error', {
        clientType: 'server',
        message: 'Failed to start game. Please try again.',
      });
    }
  });

  socket.on('switch_to_manual', async () => {
    const playerId = GameStateManager.getPlayerIdBySocketId(socketId);
    if (!playerId) {
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Received switch_to_manual from socket ${socketId} with no associated player`
      );
      return;
    }
    if (playerId !== characterId) {
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Received switch_to_manual for wrong player on socket ${socketId}. Expected: ${characterId}, Got: ${playerId}`
      );
      return;
    }

    try {
      console.info(
        `[${WEBSOCKET_CONTEXT}] Received switch_to_manual request from ${playerId} (${socketId})`
      );

      // Update DB session userdata first
      const currentSession = await getSessionById(playerId);
      const currentUserdata = currentSession?.userdata || {};
      currentUserdata.isAuto = false;

      await updateSession(playerId, {
        $set: { userdata: currentUserdata },
      });

      // Update Game State Manager state
      const player = GameStateManager.getPlayer(playerId);
      if (player) {
        player.isAuto = false;
      }

      // Notify player
      socket.emit('control_mode_updated', {
        clientType: 'server',
        isAuto: false,
      });

      // Notify TouchDesigner
      const modeChangePayload = {
        type: 'control_mode_changed',
        clientType: 'server',
        id: playerId,
        auto: 0,
      };
      const tdSockets = ClientManager.getTouchDesignerSockets();
      tdSockets.forEach(tdSocketId => {
        ioInstance.to(tdSocketId).emit('server_message', modeChangePayload);
      });
      console.info(
        `[${WEBSOCKET_CONTEXT}] Player ${playerId} switched to manual controls and notified ${tdSockets.size} TD clients`
      );
    } catch (error) {
      console.error(
        `[${WEBSOCKET_CONTEXT}] Error processing switch_to_manual request for ${playerId} (${socketId}):`,
        error
      );
    }
  });

  socket.on('switch_to_auto', async () => {
    const playerId = GameStateManager.getPlayerIdBySocketId(socketId);
    if (!playerId) {
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Received switch_to_auto from socket ${socketId} with no associated player`
      );
      return;
    }
    if (playerId !== characterId) {
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Received switch_to_auto for wrong player on socket ${socketId}. Expected: ${characterId}, Got: ${playerId}`
      );
      return;
    }

    try {
      console.info(
        `[${WEBSOCKET_CONTEXT}] Received switch_to_auto request from ${playerId} (${socketId})`
      );

      // Update DB session userdata first
      const currentSession = await getSessionById(playerId);
      const currentUserdata = currentSession?.userdata || {};
      currentUserdata.isAuto = true;

      await updateSession(playerId, {
        $set: { userdata: currentUserdata },
      });

      // Update Game State Manager state
      const player = GameStateManager.getPlayer(playerId);
      if (player) {
        player.isAuto = true;
      }

      // Notify player
      socket.emit('control_mode_updated', {
        clientType: 'server',
        isAuto: true,
      });

      // Notify TouchDesigner
      const modeChangePayload = {
        type: 'control_mode_changed',
        clientType: 'server',
        id: playerId,
        auto: 1,
      };
      const tdSockets = ClientManager.getTouchDesignerSockets();
      tdSockets.forEach(tdSocketId => {
        ioInstance.to(tdSocketId).emit('server_message', modeChangePayload);
      });
      console.info(
        `[${WEBSOCKET_CONTEXT}] Player ${playerId} switched to auto control and notified ${tdSockets.size} TD clients`
      );
    } catch (error) {
      console.error(
        `[${WEBSOCKET_CONTEXT}] Error processing switch_to_auto request for ${playerId} (${socketId}):`,
        error
      );
    }
  });

  socket.on('joystick', data => {
    if (!validateMobileMessage(data, 'joystick', socketId)) return;

    const playerId = GameStateManager.getPlayerIdBySocketId(socketId);
    if (playerId === characterId) {
      // Default to 0 if values are undefined or not numbers
      const x = typeof data.x === 'number' ? data.x : 0;
      const y = typeof data.y === 'number' ? data.y : 0;
      GameStateManager.updatePlayerControls(playerId, { x, y });
    } else {
      // logWarn('Received joystick data for mismatched player', WEBSOCKET_CONTEXT, { socketId, expectedPlayerId: characterId, actualPlayerId: playerId });
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Received joystick data for mismatched player on socket ${socketId}. Expected: ${characterId}, Got: ${playerId}`
      );
    }
  });

  socket.on('button', data => {
    if (!validateMobileMessage(data, 'button', socketId)) return;

    const playerId = GameStateManager.getPlayerIdBySocketId(socketId);
    if (playerId === characterId) {
      // Only update if button name and state are defined
      if (data.button !== undefined && data.state !== undefined) {
        GameStateManager.updatePlayerControls(playerId, {
          button: data.button,
          state: data.state,
        });
      } else {
        // logWarn(`Incomplete button data received (skipping update)`, WEBSOCKET_CONTEXT, {
        //     playerId,
        //     button: data.button,
        //     state: data.state
        // });
        console.warn(
          `[${WEBSOCKET_CONTEXT}] Incomplete button data received from ${playerId} (skipping update):`,
          data
        );
      }
    } else {
      // logWarn('Received button data for mismatched player', WEBSOCKET_CONTEXT, { socketId, expectedPlayerId: characterId, actualPlayerId: playerId });
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Received button data for mismatched player on socket ${socketId}. Expected: ${characterId}, Got: ${playerId}`
      );
    }
  });

  socket.on('heartbeat', data => {
    // clientType validation is optional for heartbeat but good practice
    // validateMobileMessage(data, 'heartbeat', socketId);

    const clientType = data?.clientType || 'unknown';
    // logDebug(`Heartbeat received`, WEBSOCKET_CONTEXT, { socketId, characterId, clientType });
    console.log(
      `[${WEBSOCKET_CONTEXT}] Heartbeat received from ${socketId} (Player: ${characterId}, Type: ${clientType})`
    );

    const playerId = GameStateManager.getPlayerIdBySocketId(socketId);
    if (playerId === characterId) {
      GameStateManager.updatePlayerPing(playerId);
      // Also update DB ping asynchronously
      updateSession(playerId, { $set: { last_ping: new Date() } })
        // .catch(err => logError('Async DB ping update failed', WEBSOCKET_CONTEXT, err, { playerId }));
        .catch(err =>
          console.error(
            `[${WEBSOCKET_CONTEXT}] Async DB ping update failed for ${playerId}:`,
            err
          )
        );
    } else {
      // logWarn('Received heartbeat for mismatched player', WEBSOCKET_CONTEXT, { socketId, expectedPlayerId: characterId, actualPlayerId: playerId });
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Received heartbeat for mismatched player on socket ${socketId}. Expected: ${characterId}, Got: ${playerId}`
      );
    }
  });

  socket.on('disconnect', reason => {
    const playerId = GameStateManager.getPlayerIdBySocketId(socketId);
    // Use the characterId passed during setup for consistency in logs if playerId isn't found
    const logPlayerId = playerId || characterId || 'unknown';

    // logInfo(`Mobile client disconnected`, WEBSOCKET_CONTEXT, { socketId, playerId: logPlayerId, reason });
    console.info(
      `[${WEBSOCKET_CONTEXT}] Mobile client ${socketId} disconnected (Player: ${logPlayerId}). Reason: ${reason}`
    );

    // Player state is handled by GameStateManager's inactivity check now,
    // but we can log that the socket is gone.
    const disconnectedPlayer = GameStateManager.getPlayer(logPlayerId);
    if (disconnectedPlayer) {
      // logInfo(`Player disconnected, GameStateManager will handle inactivity timeout`, WEBSOCKET_CONTEXT, { playerId: logPlayerId });
      console.info(
        `[${WEBSOCKET_CONTEXT}] Player ${logPlayerId} disconnected, GameStateManager will handle inactivity timeout.`
      );
      // Optionally, notify TD immediately that the player's *socket* disconnected,
      // even if the player state remains active for a while.
      // const playerDisconnectPayload = {
      //     type: 'player_socket_disconnected',
      //     clientType: 'server',
      //     id: logPlayerId,
      // };
      // const tdSockets = ClientManager.getTouchDesignerSockets();
      // tdSockets.forEach(tdSocketId => {
      //     ioInstance.to(tdSocketId).emit('server_message', playerDisconnectPayload);
      // });
    } else if (logPlayerId !== 'unknown') {
      // logWarn(`Disconnect event for mobile socket, but player state not found`, WEBSOCKET_CONTEXT, { socketId, playerId: logPlayerId });
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Disconnect event for mobile socket ${socketId}, but player state not found for ${logPlayerId}`
      );
    }
    // No need to remove player from GameStateManager here, let timeout handle it
  });
}

/**
 * Validates incoming messages from Mobile clients.
 * @param {object} data - The message data.
 * @param {string} eventName - The name of the event for logging.
 * @param {string} socketId - The socket ID for logging.
 * @returns {boolean} True if the message is valid, false otherwise.
 */
function validateMobileMessage(data, eventName, socketId) {
  if (!data) {
    // logWarn(`Received empty data for event '${eventName}'`, WEBSOCKET_CONTEXT, { socketId });
    console.warn(
      `[${WEBSOCKET_CONTEXT}] Received empty data for event '${eventName}' from ${socketId}`
    );
    return false;
  }
  // For mobile, we expect clientType to be 'mobile'
  if (!data.clientType) {
    // logWarn(`Missing clientType in '${eventName}' message`, WEBSOCKET_CONTEXT, { socketId });
    console.warn(
      `[${WEBSOCKET_CONTEXT}] Missing clientType in '${eventName}' message from ${socketId}`
    );
    // Allow missing clientType for now for backward compatibility or simple messages?
    // return false;
  } else if (data.clientType !== 'mobile') {
    // logWarn(`Unexpected clientType '${data.clientType}' in '${eventName}' message`, WEBSOCKET_CONTEXT, { socketId });
    console.warn(
      `[${WEBSOCKET_CONTEXT}] Unexpected clientType '${data.clientType}' in '${eventName}' message from ${socketId}`
    );
    // Don't necessarily reject, but log warning
    // return false;
  }
  return true;
}

module.exports = {
  initializeMobileHandler,
  setupMobileClientHandlers,
};
