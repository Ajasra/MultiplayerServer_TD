// const { logError, logInfo, logWarn, logDebug } = require('../../db/logging.js');
const GameStateManager = require('../../game/gameStateManager.js');
const ClientManager = require('../clientManager.js'); // Import ClientManager for ping updates and removal
const { updateSession } = require('../../db/sessions.js'); // Import DB functions
const { addLeaderboardEntry } = require('../../db/leaderboard.js'); // Import leaderboard functions

const WEBSOCKET_CONTEXT = 'WEBSOCKET_TD_HANDLER';

let ioInstance; // To hold the socket.io instance

/**
 * Initializes the TouchDesigner handler with the Socket.IO instance.
 * @param {object} io - The Socket.IO server instance.
 */
function initializeTouchDesignerHandler(io) {
  ioInstance = io;
  // logInfo('TouchDesigner Handler initialized with IO instance.', WEBSOCKET_CONTEXT);
  console.info(
    `[${WEBSOCKET_CONTEXT}] TouchDesigner Handler initialized with IO instance.`
  );
}

/**
 * Sets up event listeners specific to TouchDesigner clients.
 * @param {object} socket - The socket instance for the TD client.
 */
function setupTouchDesignerHandlers(socket) {
  const socketId = socket.id;

  // Idempotency check: prevent attaching handlers multiple times
  if (socket._touchDesignerHandlersAttached) {
    // logWarn(`TouchDesigner handlers already attached for socket ${socketId}. Skipping re-attachment.`, WEBSOCKET_CONTEXT);
    console.warn(
      `[${WEBSOCKET_CONTEXT}] TouchDesigner handlers already attached for socket ${socketId}. Skipping re-attachment.`
    );
    return;
  }
  socket._touchDesignerHandlersAttached = true; // Mark handlers as attached

  // logInfo(`Setting up TouchDesigner specific event handlers`, WEBSOCKET_CONTEXT, { socketId });
  console.info(
    `[${WEBSOCKET_CONTEXT}] Setting up TouchDesigner specific event handlers for ${socketId}`
  );

  // --- Event Listeners ---

  // Update ping time on ANY message received (except disconnect)
  socket.onAny(eventName => {
    if (eventName !== 'disconnect') {
      ClientManager.updateTDClientPing(socketId);
    }
  });

  // Listener for stats messages from this TD client
  socket.on('stats', async data => {
    // Ping is updated by onAny
    if (!validateTDMessage(data, 'stats', socketId)) return;

    if (Array.isArray(data.players)) {
      // logDebug(`Received stats batch from TD`, WEBSOCKET_CONTEXT, {
      //     socketId,
      //     playerCount: data.players.length,
      //     firstPlayerExample: data.players.length > 0 ? data.players[0] : 'N/A'
      // });
      // console.log(`[${WEBSOCKET_CONTEXT}] Received stats batch from TD ${socketId} (Players: ${data.players.length})`);
      // Optionally log first player for debug:
      // if (data.players.length > 0) console.debug('First player example:', data.players[0]);

      const completedPlayers = GameStateManager.updatePlayerStatsFromTD(
        data.players
      );

      if (completedPlayers.length > 0) {
        // logInfo(`Processing ${completedPlayers.length} completed players from TD stats update`, WEBSOCKET_CONTEXT, { socketId });
        console.info(
          `[${WEBSOCKET_CONTEXT}] Processing ${completedPlayers.length} completed players from TD stats update from ${socketId}`
        );
        await processCompletedPlayers(completedPlayers, socketId); // Pass originating socketId
      }
    } else {
      // logWarn(`Received invalid stats format (expected players array)`, WEBSOCKET_CONTEXT, { socketId, receivedData: data });
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Received invalid stats format from ${socketId} (expected players array)`,
        data
      );
    }
  });

  // Listener for game event triggers from this TD client
  socket.on('game_event_trigger', data => {
    // Ping is updated by onAny
    if (!validateTDMessage(data, 'game_event_trigger', socketId)) return;

    if (data.playerId && data.eventName) {
      // logInfo(`Received game_event_trigger`, WEBSOCKET_CONTEXT, { socketId, data });
      console.info(
        `[${WEBSOCKET_CONTEXT}] Received game_event_trigger from ${socketId}:`,
        data
      );
      const targetPlayer = GameStateManager.getPlayer(data.playerId);
      if (targetPlayer && targetPlayer.socketId && ioInstance) {
        const eventPayload = {
          type: 'event',
          clientType: 'server',
          event: data.eventName,
          details: data.eventDetails || {},
        };
        ioInstance.to(targetPlayer.socketId).emit('event', eventPayload);
        // logInfo(`Emitted game event to player`, WEBSOCKET_CONTEXT, {
        //     targetPlayerId: data.playerId,
        //     targetSocketId: targetPlayer.socketId,
        //     event: eventPayload
        // });
        console.info(
          `[${WEBSOCKET_CONTEXT}] Emitted game event to player ${data.playerId} (Socket: ${targetPlayer.socketId}):`,
          eventPayload
        );
      } else {
        // logWarn(`Cannot emit game event: Player/socket not found or IO instance missing`, WEBSOCKET_CONTEXT, {
        //     targetPlayerId: data.playerId,
        //     playerFound: !!targetPlayer,
        //     socketIdFound: targetPlayer?.socketId,
        //     ioAvailable: !!ioInstance
        // });
        console.warn(
          `[${WEBSOCKET_CONTEXT}] Cannot emit game event for target ${data.playerId}: Player found: ${!!targetPlayer}, Socket found: ${!!targetPlayer?.socketId}, IO available: ${!!ioInstance}`
        );
      }
    } else {
      // logWarn(`Received invalid game_event_trigger format (missing playerId or eventName)`, WEBSOCKET_CONTEXT, { socketId, receivedData: data });
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Received invalid game_event_trigger format from ${socketId} (missing playerId or eventName)`,
        data
      );
    }
  });

  // Listener for manual player control commands from TD
  socket.on('player_control', data => {
    // Ping is updated by onAny
    if (!validateTDMessage(data, 'player_control', socketId)) return;

    if (!data.action || !data.playerId) {
      // logWarn(`Received invalid player_control command (missing action or playerId)`, WEBSOCKET_CONTEXT, { socketId, data });
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Received invalid player_control command from ${socketId} (missing action or playerId)`,
        data
      );
      return;
    }

    const playerId = data.playerId;
    const action = data.action;
    const reason = data.reason || 'manual_control';

    // logInfo(`Received player_control command`, WEBSOCKET_CONTEXT, {
    //     socketId, action, playerId, reason
    // });
    console.info(
      `[${WEBSOCKET_CONTEXT}] Received player_control command from ${socketId}: Action: ${action}, PlayerID: ${playerId}, Reason: ${reason}`
    );

    if (action === 'freeze') {
      const frozenPlayer = GameStateManager.freezePlayer(playerId, reason);
      if (frozenPlayer) {
        // logInfo(`Manually froze player via TD command`, WEBSOCKET_CONTEXT, { playerId });
        console.info(
          `[${WEBSOCKET_CONTEXT}] Manually froze player ${playerId} via TD command`
        );
      }
    } else if (action === 'unfreeze') {
      const unfrozenPlayer = GameStateManager.unfreezePlayer(playerId);
      if (unfrozenPlayer) {
        // logInfo(`Manually unfroze player via TD command`, WEBSOCKET_CONTEXT, { playerId });
        console.info(
          `[${WEBSOCKET_CONTEXT}] Manually unfroze player ${playerId} via TD command`
        );
      }
    } else {
      // logWarn(`Unknown player_control action received`, WEBSOCKET_CONTEXT, { action, playerId });
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Unknown player_control action received from ${socketId}: Action: ${action}, PlayerID: ${playerId}`
      );
    }
  });

  // Listener for disconnect event
  socket.on('disconnect', reason => {
    // logInfo(`TouchDesigner client disconnected`, WEBSOCKET_CONTEXT, { socketId, reason });
    console.info(
      `[${WEBSOCKET_CONTEXT}] TouchDesigner client ${socketId} disconnected. Reason: ${reason}`
    );
    ClientManager.removeTDSocket(socketId); // Clean up tracking in ClientManager
    // logInfo(`Total TD clients remaining: ${ClientManager.getTouchDesignerSockets().size}`, WEBSOCKET_CONTEXT);
    console.info(
      `[${WEBSOCKET_CONTEXT}] Total TD clients remaining: ${ClientManager.getTouchDesignerSockets().size}`
    );

    // Clear the flag on disconnect
    delete socket._touchDesignerHandlersAttached;
  });

  // Send confirmation of connection to TD
  socket.emit('server_message', {
    type: 'td_connected',
    clientType: 'server',
    message:
      'Server acknowledges TouchDesigner connection and handlers are set up.',
    serverTime: Date.now(),
  });

  // Immediately send the current player state to the new TD client
  sendCurrentPlayerStatesToTD(socket);
}

/**
 * Validates incoming messages from TouchDesigner clients.
 * @param {object} data - The message data.
 * @param {string} eventName - The name of the event for logging.
 * @param {string} socketId - The socket ID for logging.
 * @returns {boolean} True if the message is valid, false otherwise.
 */
function validateTDMessage(data, eventName, socketId) {
  if (!data) {
    // logWarn(`Received empty data for event '${eventName}'`, WEBSOCKET_CONTEXT, { socketId });
    console.warn(
      `[${WEBSOCKET_CONTEXT}] Received empty data for event '${eventName}' from ${socketId}`
    );
    return false;
  }
  if (!data.clientType) {
    // logWarn(`Missing clientType in '${eventName}' message`, WEBSOCKET_CONTEXT, { socketId });
    console.warn(
      `[${WEBSOCKET_CONTEXT}] Missing clientType in '${eventName}' message from ${socketId}`
    );
    return false;
  }
  if (data.clientType !== 'touchdesigner') {
    // logWarn(`Unexpected clientType '${data.clientType}' in '${eventName}' message`, WEBSOCKET_CONTEXT, { socketId });
    console.warn(
      `[${WEBSOCKET_CONTEXT}] Unexpected clientType '${data.clientType}' in '${eventName}' message from ${socketId}`
    );
    return false;
  }
  return true;
}

/**
 * Sends the state of all current players to a newly connected TouchDesigner client.
 * @param {object} tdSocket - The socket instance of the new TD client.
 */
function sendCurrentPlayerStatesToTD(tdSocket) {
  const allPlayers = GameStateManager.getAllPlayers(); // Get all players regardless of state
  if (allPlayers.length > 0) {
    allPlayers.forEach(player => {
      const playerData = {
        type: 'player_joined', // Or maybe 'player_state_update'?
        clientType: 'server',
        id: player.playerId,
        username: player.username,
        character: player.imageUrl,
        active: player.active,
        state:
          player.stats?.tdState !== undefined
            ? player.stats.tdState
            : player.active || 0,
        auto: player.isAuto ? 1 : 0,
      };
      tdSocket.emit('server_message', playerData);
    });
    // logInfo(`Sent existing ${allPlayers.length} player states to new TD client`, WEBSOCKET_CONTEXT, { socketId: tdSocket.id });
    console.info(
      `[${WEBSOCKET_CONTEXT}] Sent existing ${allPlayers.length} player states to new TD client ${tdSocket.id} (including auto states)`
    );
  }
}

/**
 * Processes players marked as completed by TouchDesigner.
 * Updates DB, adds to leaderboard, notifies player and other TD clients.
 * @param {Array<object>} completedPlayers - Array of player objects with { playerId, stats }.
 * @param {string} originatingSocketId - The socket ID of the TD client that sent the stats.
 */
async function processCompletedPlayers(completedPlayers, originatingSocketId) {
  if (!ioInstance) {
    // logError('Cannot process completed players: IO instance not available', WEBSOCKET_CONTEXT);
    console.error(
      `[${WEBSOCKET_CONTEXT}] Cannot process completed players: IO instance not available`
    );
    return;
  }
  const tdSockets = ClientManager.getTouchDesignerSockets();

  for (const completedPlayer of completedPlayers) {
    const playerId = completedPlayer.playerId;
    const stats = completedPlayer.stats;

    if (!playerId || !stats) {
      // logWarn('Skipping completed player processing due to missing data', WEBSOCKET_CONTEXT, { completedPlayer });
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Skipping completed player processing due to missing data:`,
        completedPlayer
      );
      continue;
    }

    try {
      // 1. Update the session in the database
      // logInfo(`Updating session for completed player`, WEBSOCKET_CONTEXT, { playerId, score: stats.score });
      console.info(
        `[${WEBSOCKET_CONTEXT}] Updating session for completed player ${playerId} (Score: ${stats.score})`
      );
      const updatedSession = await updateSession(playerId, {
        $set: {
          active: 2, // Completed state
          score: stats.score,
          completed_at: new Date(),
          last_ping: new Date(), // Update ping on completion
          // Optionally add final time/lives if available in stats
          final_time_played: stats.time,
          final_lives_remaining: stats.lives,
        },
      });

      if (!updatedSession) {
        // This might happen if the session was already removed or player ID is wrong
        // logWarn(`Failed to update session for completed player (session not found or no changes needed)`, WEBSOCKET_CONTEXT, { playerId });
        console.warn(
          `[${WEBSOCKET_CONTEXT}] Failed to update session for completed player ${playerId} (session not found or no changes needed)`
        );
        // Continue processing other players even if one fails
      }

      // 2. Add to leaderboard (use username from updatedSession if possible)
      const username = updatedSession
        ? updatedSession.username
        : GameStateManager.getPlayer(playerId)?.username || 'Unknown';
      // logInfo(`Adding player to leaderboard`, WEBSOCKET_CONTEXT, {
      //     playerId, username, score: stats.score
      // });
      console.info(
        `[${WEBSOCKET_CONTEXT}] Adding player ${playerId} (${username}) to leaderboard (Score: ${stats.score})`
      );

      await addLeaderboardEntry({
        player_id: playerId,
        username: username,
        character_id: playerId, // Assuming character_id is the same as player_id
        score: stats.score,
        game_type: 'standard', // Consider making this configurable or dynamic
        date: new Date(),
        time_played: stats.time || 0,
        lives_remaining: stats.lives || 0,
      });

      // 3. Notify the specific player client (if connected)
      const playerSocketId = GameStateManager.getPlayer(playerId)?.socketId;
      if (playerSocketId) {
        // logInfo(`Notifying player of game completion`, WEBSOCKET_CONTEXT, { playerId, playerSocketId });
        console.info(
          `[${WEBSOCKET_CONTEXT}] Notifying player ${playerId} (${playerSocketId}) of game completion`
        );

        // Send elimination event first for state transition
        ioInstance.to(playerSocketId).emit('event', {
          clientType: 'server',
          event: 'eliminated',
          details: { reason: 'game_completed' },
        });

        // Send final completion message with stats
        ioInstance.to(playerSocketId).emit('game_completed', {
          clientType: 'server',
          message: 'Game completed! Check your final score.',
          stats: {
            // Send back the stats received from TD
            score: stats.score,
            time: stats.time,
            lives: stats.lives,
          },
        });
      } else {
        // logInfo(`Player ${playerId} not connected, cannot send game_completed message.`, WEBSOCKET_CONTEXT);
        console.info(
          `[${WEBSOCKET_CONTEXT}] Player ${playerId} not connected, cannot send game_completed message.`
        );
      }

      // 4. Notify other TouchDesigner clients (excluding the one that sent the stats)
      const gameCompletedPayload = {
        type: 'player_completed',
        clientType: 'server',
        id: playerId,
        active: 2, // GameStateManager state should already be 2
        state: 2, // TD state is 2
        stats: {
          // Include final stats
          score: stats.score,
          time: stats.time,
          lives: stats.lives,
        },
      };

      let notifiedTdCount = 0;
      tdSockets.forEach(tdSocketId => {
        // Don't send back to the originating TD client
        if (tdSocketId !== originatingSocketId) {
          ioInstance
            .to(tdSocketId)
            .emit('server_message', gameCompletedPayload);
          notifiedTdCount++;
        }
      });
      if (notifiedTdCount > 0) {
        // logInfo(`Notified ${notifiedTdCount} other TD clients about player completion`, WEBSOCKET_CONTEXT, { playerId });
        console.info(
          `[${WEBSOCKET_CONTEXT}] Notified ${notifiedTdCount} other TD clients about player ${playerId} completion`
        );
      }
    } catch (error) {
      // logError(`Error processing game completion for player ${playerId}`, WEBSOCKET_CONTEXT, error, {
      //     playerId, stats
      // });
      console.error(
        `[${WEBSOCKET_CONTEXT}] Error processing game completion for player ${playerId}:`,
        error,
        { stats }
      );
      // Continue processing other completed players
    }
  }
}

module.exports = {
  initializeTouchDesignerHandler,
  setupTouchDesignerHandlers,
};
