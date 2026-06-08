// const { logWarn, logInfo, logDebug } = require('../db/logging.js');

// --- Client Collections & Constants ---
const touchDesignerSockets = new Set(); // Set<socketId> - Placeholder for identifying TD clients
const unknownClientSockets = new Set(); // Set<socketId> - For connections with unknown client type

// Constants for collection management
const MAX_TD_CLIENTS = 5; // Maximum allowed TouchDesigner clients
const MAX_UNKNOWN_CLIENTS = 20; // Maximum allowed unknown clients
const TD_INACTIVITY_TIMEOUT_MS = 30000; // 30 seconds of inactivity before considering a TD client stale

// Tracking TD client activity - map socketId to last ping time
const touchDesignerLastPing = new Map(); // Map<socketId, timestamp>

const WEBSOCKET_CONTEXT = 'WEBSOCKET_CLIENT_MANAGER'; // Context for logs from this module

let ioInstance; // To hold the socket.io instance for disconnecting clients

/**
 * Initializes the ClientManager with the Socket.IO instance.
 * @param {object} io - The Socket.IO server instance.
 */
function initializeClientManager(io) {
  ioInstance = io;
  // logInfo('ClientManager initialized with IO instance.', WEBSOCKET_CONTEXT);
  console.info(
    `[${WEBSOCKET_CONTEXT}] ClientManager initialized with IO instance.`
  );
}

/**
 * Adds a TouchDesigner socket, manages collection size, and initializes ping time.
 * @param {string} socketId - The ID of the socket to add.
 * @returns {number} The current number of TouchDesigner clients.
 */
function manageTDSocketCollection(socketId) {
  // Add new socket to the collection
  touchDesignerSockets.add(socketId);

  // Initialize last ping time
  touchDesignerLastPing.set(socketId, Date.now());

  // Check if we need to enforce the limit
  if (touchDesignerSockets.size > MAX_TD_CLIENTS) {
    // logWarn(`TouchDesigner client limit (${MAX_TD_CLIENTS}) exceeded - removing oldest connections`, WEBSOCKET_CONTEXT);
    console.warn(
      `[${WEBSOCKET_CONTEXT}] TouchDesigner client limit (${MAX_TD_CLIENTS}) exceeded - removing oldest connections`
    );

    // Get all socket IDs as an array, ordered by time added (Sets maintain insertion order)
    const socketIds = Array.from(touchDesignerSockets);

    // Calculate how many to remove
    const removeCount = touchDesignerSockets.size - MAX_TD_CLIENTS;

    // Remove oldest sockets to meet the limit
    for (let i = 0; i < removeCount; i++) {
      const oldSocketId = socketIds[i];

      // Get the socket and disconnect it using the stored ioInstance
      const socket = ioInstance?.sockets?.sockets?.get(oldSocketId);
      if (socket && socket.connected) {
        // logInfo(`Forcibly disconnecting oldest TD client to maintain collection limit`, WEBSOCKET_CONTEXT, {
        //     socketId: oldSocketId
        // });
        console.info(
          `[${WEBSOCKET_CONTEXT}] Forcibly disconnecting oldest TD client ${oldSocketId} to maintain collection limit`
        );
        socket.emit('server_message', {
          type: 'connection_error',
          clientType: 'server',
          reason:
            'Maximum TouchDesigner client limit reached - disconnecting oldest client',
        });
        socket.disconnect(true); // Disconnect will trigger cleanup in the handler
      } else {
        // If socket is not available or connected, just remove from our tracking
        touchDesignerSockets.delete(oldSocketId);
        touchDesignerLastPing.delete(oldSocketId);
        // logWarn(`Could not find or disconnect oldest TD client socket, removing tracking info directly.`, WEBSOCKET_CONTEXT, { socketId: oldSocketId });
        console.warn(
          `[${WEBSOCKET_CONTEXT}] Could not find or disconnect oldest TD client socket ${oldSocketId}, removing tracking info directly.`
        );
      }
      // Note: No need to delete from touchDesignerSockets here if socket.disconnect(true)
      // is called, as the disconnect handler should take care of it.
      // However, we keep it in the 'else' case for safety.
    }
  }

  return touchDesignerSockets.size;
}

/**
 * Removes a TouchDesigner socket and its ping tracking info.
 * @param {string} socketId - The ID of the socket to remove.
 */
function removeTDSocket(socketId) {
  touchDesignerSockets.delete(socketId);
  touchDesignerLastPing.delete(socketId);
  // logDebug(`Removed TD socket and ping info`, WEBSOCKET_CONTEXT, { socketId });
  console.log(
    `[${WEBSOCKET_CONTEXT}] Removed TD socket and ping info for ${socketId}`
  );
}

/**
 * Adds an unknown socket and manages collection size.
 * @param {string} socketId - The ID of the socket to add.
 * @returns {number} The current number of unknown clients.
 */
function manageUnknownSocketCollection(socketId) {
  // Add new socket to the collection
  unknownClientSockets.add(socketId);

  // Check if we need to enforce the limit
  if (unknownClientSockets.size > MAX_UNKNOWN_CLIENTS) {
    // logWarn(`Unknown client limit (${MAX_UNKNOWN_CLIENTS}) exceeded - removing oldest connections`, WEBSOCKET_CONTEXT);
    console.warn(
      `[${WEBSOCKET_CONTEXT}] Unknown client limit (${MAX_UNKNOWN_CLIENTS}) exceeded - removing oldest connections`
    );

    // Get all socket IDs as an array, ordered by time added (Sets maintain insertion order)
    const socketIds = Array.from(unknownClientSockets);

    // Calculate how many to remove
    const removeCount = unknownClientSockets.size - MAX_UNKNOWN_CLIENTS;

    // Remove oldest sockets to meet the limit
    for (let i = 0; i < removeCount; i++) {
      const oldSocketId = socketIds[i];

      // Get the socket and disconnect it using the stored ioInstance
      const socket = ioInstance?.sockets?.sockets?.get(oldSocketId);
      if (socket && socket.connected) {
        // logInfo(`Forcibly disconnecting oldest unknown client to maintain collection limit`, WEBSOCKET_CONTEXT, {
        //     socketId: oldSocketId
        // });
        console.info(
          `[${WEBSOCKET_CONTEXT}] Forcibly disconnecting oldest unknown client ${oldSocketId} to maintain collection limit`
        );
        socket.emit('connection_notice', {
          clientType: 'server',
          message:
            'Maximum unknown client limit reached - please reconnect with proper client type identification',
          status: 'disconnected_limit',
        });
        socket.disconnect(true); // Disconnect will trigger cleanup in the handler
      } else {
        // If socket is not available or connected, just remove from our tracking info directly
        unknownClientSockets.delete(oldSocketId);
        // logWarn(`Could not find or disconnect oldest unknown client socket, removing tracking info directly.`, WEBSOCKET_CONTEXT, { socketId: oldSocketId });
        console.warn(
          `[${WEBSOCKET_CONTEXT}] Could not find or disconnect oldest unknown client socket ${oldSocketId}, removing tracking info directly.`
        );
      }
      // Note: No need to delete from unknownClientSockets here if socket.disconnect(true)
      // is called, as the disconnect handler should take care of it.
      // We keep it in the 'else' case for safety.
    }
  }

  return unknownClientSockets.size;
}

/**
 * Removes an unknown socket.
 * @param {string} socketId - The ID of the socket to remove.
 */
function removeUnknownSocket(socketId) {
  unknownClientSockets.delete(socketId);
  // logDebug(`Removed unknown socket`, WEBSOCKET_CONTEXT, { socketId });
  console.log(`[${WEBSOCKET_CONTEXT}] Removed unknown socket ${socketId}`);
}

/**
 * Updates the last ping time for a TouchDesigner client.
 * @param {string} socketId - The ID of the socket to update.
 * @returns {boolean} True if the client exists and was updated, false otherwise.
 */
function updateTDClientPing(socketId) {
  if (touchDesignerSockets.has(socketId)) {
    touchDesignerLastPing.set(socketId, Date.now());
    return true;
  }
  return false;
}

/**
 * Finds and disconnects stale TouchDesigner clients based on inactivity.
 */
function cleanupStaleTDClients() {
  if (!ioInstance) {
    // logWarn('IO instance not available in ClientManager, skipping TD cleanup.', WEBSOCKET_CONTEXT);
    console.warn(
      `[${WEBSOCKET_CONTEXT}] IO instance not available in ClientManager, skipping TD cleanup.`
    );
    return 0;
  }

  const now = Date.now();
  const staleThreshold = now - TD_INACTIVITY_TIMEOUT_MS;
  let removedCount = 0;

  // Find stale TD clients
  const staleTDClients = [];
  touchDesignerSockets.forEach(socketId => {
    const lastPing = touchDesignerLastPing.get(socketId) || 0;
    if (lastPing < staleThreshold) {
      staleTDClients.push(socketId);
    }
  });

  // Remove stale clients
  staleTDClients.forEach(socketId => {
    // Get the socket and disconnect it
    const socket = ioInstance?.sockets?.sockets?.get(socketId);
    if (socket && socket.connected) {
      // logInfo(`Disconnecting stale TD client due to inactivity`, WEBSOCKET_CONTEXT, {
      //     socketId,
      //     lastPingAgo: Math.round((now - (touchDesignerLastPing.get(socketId) || 0)) / 1000) + 's'
      // });
      const lastPingAgo = Math.round(
        (now - (touchDesignerLastPing.get(socketId) || 0)) / 1000
      );
      console.info(
        `[${WEBSOCKET_CONTEXT}] Disconnecting stale TD client ${socketId} due to inactivity (${lastPingAgo}s ago)`
      );
      socket.emit('server_message', {
        type: 'connection_error',
        clientType: 'server',
        reason: 'Disconnected due to inactivity',
      });
      socket.disconnect(true); // Disconnect triggers the cleanup in the handler
      removedCount++;
    } else {
      // If socket is not connected/found, clean up tracking manually
      // logWarn(`Stale TD client socket not found or already disconnected, cleaning up tracking info.`, WEBSOCKET_CONTEXT, { socketId });
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Stale TD client socket ${socketId} not found or already disconnected, cleaning up tracking info.`
      );
      removeTDSocket(socketId); // Manually remove tracking info
    }
    // Note: disconnect handler should call removeTDSocket, so we don't call it again if disconnect succeeds.
  });

  if (removedCount > 0) {
    // logInfo(`Cleanup initiated disconnect for ${removedCount} stale TD clients`, WEBSOCKET_CONTEXT, {
    //     remainingTDClients: touchDesignerSockets.size // Note: Size might not be fully updated until disconnect events fire
    // });
    console.info(
      `[${WEBSOCKET_CONTEXT}] Cleanup initiated disconnect for ${removedCount} stale TD clients. Remaining: ${touchDesignerSockets.size}`
    );
  }

  return removedCount;
}

// --- Getters for external use (e.g., stats logging, emitters) ---

function getTouchDesignerSockets() {
  return touchDesignerSockets;
}

function getUnknownSockets() {
  return unknownClientSockets;
}

module.exports = {
  initializeClientManager,
  manageTDSocketCollection,
  removeTDSocket,
  manageUnknownSocketCollection,
  removeUnknownSocket,
  updateTDClientPing,
  cleanupStaleTDClients,
  getTouchDesignerSockets,
  getUnknownSockets,
};
