const ClientManager = require('./clientManager.js');

let ioInstanceRef; // Internal reference to the Socket.IO instance

/**
 * Initializes the GameNotifier with the Socket.IO server instance.
 * This must be called once when the server starts.
 * @param {object} io - The Socket.IO server instance.
 */
function initialize(io) {
  ioInstanceRef = io;
}

/**
 * Notifies TouchDesigner clients that a player has timed out due to stale stats.
 * @param {string} playerId - The ID of the timed-out player.
 * @param {number} newState - The new active state of the player (expected to be 0 for inactive).
 * @param {string} reason - The reason for the timeout.
 */
function notifyPlayerTimedOut(playerId, newState, reason) {
  if (!ioInstanceRef) {
    console.error('GameNotifier not initialized: Socket.IO instance missing.');
    return;
  }
  const tdSockets = ClientManager.getTouchDesignerSockets();
  if (tdSockets.size > 0) {
    const timeoutPayload = {
      type: 'player_timed_out',
      clientType: 'server',
      id: playerId,
      active: newState,
      state: newState, // Match active state for TD
      reason: reason,
    };
    tdSockets.forEach(tdSocketId => {
      ioInstanceRef.to(tdSocketId).emit('server_message', timeoutPayload);
    });
  }
  // Add logic here to notify mobile clients if needed in the future
  // For example:
  // const player = gameStateManager.getPlayer(playerId);
  // if (player && player.socketId) {
  //     ioInstanceRef.to(player.socketId).emit('connection_notice', { clientType:'server', message:'Connection lost with game server. Please check status.', status:'lost_td_sync' });
  // }
}

/**
 * Notifies TouchDesigner clients that they should remove a player from their state.
 * This is sent when TD sends stats for a player that doesn't exist on the server.
 * @param {string} playerId - The ID of the player that should be removed from TD state.
 */
function notifyPlayerRemoved(playerId) {
  if (!ioInstanceRef) {
    console.error('GameNotifier not initialized: Socket.IO instance missing.');
    return;
  }
  const tdSockets = ClientManager.getTouchDesignerSockets();
  if (tdSockets.size > 0) {
    const removePayload = {
      type: 'remove_player',
      clientType: 'server',
      id: playerId,
    };
    tdSockets.forEach(tdSocketId => {
      ioInstanceRef.to(tdSocketId).emit('server_message', removePayload);
    });

    // Use simple logger to avoid recursion
    const { logInfo: simpleLogInfo } = require('../utils/simpleLogger');
    simpleLogInfo(
      `[GAME_NOTIFIER] Sent remove_player for ${playerId} to ${tdSockets.size} TouchDesigner clients`
    );
  }
}

module.exports = {
  initialize,
  notifyPlayerTimedOut,
  notifyPlayerRemoved,
};
