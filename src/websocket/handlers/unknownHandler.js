// const { logError, logInfo, logWarn, logDebug } = require('../../db/logging.js');
const ClientManager = require('../clientManager.js');
const GameStateManager = require('../../game/gameStateManager.js');
// Import setup functions from other handlers to transition clients
const { setupTouchDesignerHandlers } = require('./touchdesignerHandler.js');
const { setupMobileClientHandlers } = require('./mobileHandler.js');

const WEBSOCKET_CONTEXT = 'WEBSOCKET_UNKNOWN_HANDLER';

let ioInstance; // To hold the socket.io instance

/**
 * Initializes the Unknown Client handler with the Socket.IO instance.
 * @param {object} io - The Socket.IO server instance.
 */
function initializeUnknownHandler(io) {
  ioInstance = io;
  // logInfo('Unknown Client Handler initialized with IO instance.', WEBSOCKET_CONTEXT);
  console.info(
    `[${WEBSOCKET_CONTEXT}] Unknown Client Handler initialized with IO instance.`
  );
}

/**
 * Sets up initial event listeners for clients with an unknown type.
 * These listeners attempt to identify the client type from messages.
 * @param {object} socket - The socket instance for the unknown client.
 */
function setupUnknownClientHandlers(socket) {
  const socketId = socket.id;

  // logInfo(`Setting up handlers for unknown client`, WEBSOCKET_CONTEXT, { socketId });
  console.info(
    `[${WEBSOCKET_CONTEXT}] Setting up handlers for unknown client ${socketId}`
  );

  // Handler for explicit identify messages
  const identifyHandler = data => {
    // logInfo(`Received 'identify' message from unknown client`, WEBSOCKET_CONTEXT, { socketId, data });
    console.info(
      `[${WEBSOCKET_CONTEXT}] Received 'identify' message from unknown client ${socketId}:`,
      data
    );
    handleClientTypeDetection(socket, data?.clientType);
  };
  socket.on('identify', identifyHandler);
  socket._identifyHandler = identifyHandler; // Store reference for removal

  // Generic message handler to sniff clientType from any message
  const onAnyHandler = (eventName, ...args) => {
    // Avoid infinite loops or processing internal/already handled events
    if (
      eventName === 'identify' ||
      eventName === 'disconnect' ||
      eventName === 'connection_notice'
    ) {
      return;
    }

    const data = args[0];
    if (data && typeof data === 'object' && data.clientType) {
      // logInfo(`Detected clientType '${data.clientType}' in event '${eventName}'`, WEBSOCKET_CONTEXT, { socketId });
      console.info(
        `[${WEBSOCKET_CONTEXT}] Detected clientType '${data.clientType}' in event '${eventName}' from ${socketId}`
      );
      // Attempt to convert the client based on the detected type
      handleClientTypeDetection(socket, data.clientType);
    }
    // We could add more heuristics here if needed (e.g., specific event names)
  };
  socket.onAny(onAnyHandler);
  socket._onAnyHandler = onAnyHandler; // Store reference for removal

  // Handle disconnection for unknown clients
  socket.on('disconnect', reason => {
    // logInfo(`Unknown client disconnected`, WEBSOCKET_CONTEXT, { socketId, reason });
    console.info(
      `[${WEBSOCKET_CONTEXT}] Unknown client ${socketId} disconnected. Reason: ${reason}`
    );
    ClientManager.removeUnknownSocket(socketId);
    // logInfo(`Total unknown clients remaining: ${ClientManager.getUnknownSockets().size}`, WEBSOCKET_CONTEXT);
    console.info(
      `[${WEBSOCKET_CONTEXT}] Total unknown clients remaining: ${ClientManager.getUnknownSockets().size}`
    );
    // Ensure handlers are cleaned up if they weren't removed during conversion
    removeUnknownClientHandlers(socket);
  });

  // Send initial notice
  socket.emit('connection_notice', {
    clientType: 'server',
    message:
      'Connected as unknown client type. Send { clientType: "touchdesigner" | "mobile" } in messages or use an identify event.',
    status: 'unknown',
  });
}

/**
 * Removes the generic handlers associated with unknown clients.
 * Called when a client is identified or disconnects.
 * @param {object} socket - The socket instance.
 */
function removeUnknownClientHandlers(socket) {
  if (socket._identifyHandler) {
    socket.off('identify', socket._identifyHandler);
    delete socket._identifyHandler;
    // logDebug('Removed identify handler', WEBSOCKET_CONTEXT, { socketId: socket.id });
    console.log(
      `[${WEBSOCKET_CONTEXT}] Removed identify handler for ${socket.id}`
    );
  }
  if (socket._onAnyHandler) {
    socket.offAny(socket._onAnyHandler);
    delete socket._onAnyHandler;
    // logDebug('Removed onAny handler', WEBSOCKET_CONTEXT, { socketId: socket.id });
    console.log(
      `[${WEBSOCKET_CONTEXT}] Removed onAny handler for ${socket.id}`
    );
  }
}

/**
 * Attempts to identify and convert an unknown client to a known type.
 * If successful, removes unknown handlers and sets up type-specific handlers.
 * @param {object} socket - The socket instance.
 * @param {string} clientType - The detected or identified client type.
 * @returns {boolean} True if the client was successfully converted, false otherwise.
 */
function handleClientTypeDetection(socket, clientType) {
  const socketId = socket.id;

  // Prevent re-entrancy
  if (socket._isConverting) {
    // logWarn(`Socket ${socketId} is already being converted. Ignoring subsequent detection call.`, WEBSOCKET_CONTEXT);
    console.warn(
      `[${WEBSOCKET_CONTEXT}] Socket ${socketId} is already being converted. Ignoring subsequent detection call.`
    );
    return socket._conversionResult || false;
  }
  socket._isConverting = true;
  let conversionSuccessful = false;

  try {
    if (clientType === 'touchdesigner') {
      // logInfo(`Identified client as TouchDesigner`, WEBSOCKET_CONTEXT, { socketId });
      console.info(
        `[${WEBSOCKET_CONTEXT}] Identified client ${socketId} as TouchDesigner`
      );

      // Transition client tracking
      ClientManager.removeUnknownSocket(socketId);
      ClientManager.manageTDSocketCollection(socketId); // Adds to TD set

      // Remove generic handlers
      removeUnknownClientHandlers(socket);

      // Setup specific TD handlers
      setupTouchDesignerHandlers(socket); // Let TD handler send confirmation
      conversionSuccessful = true;
    } else if (clientType === 'mobile') {
      // logInfo(`Identified client as Mobile`, WEBSOCKET_CONTEXT, { socketId });
      console.info(
        `[${WEBSOCKET_CONTEXT}] Identified client ${socketId} as Mobile`
      );

      // Transition client tracking
      ClientManager.removeUnknownSocket(socketId);

      // Remove generic handlers
      removeUnknownClientHandlers(socket);

      // Limitation: Mobile clients identified *after* handshake lack characterId/username
      // from the query. We need to handle this. Options:
      // 1. Disconnect and ask for reconnect with proper query.
      // 2. Assign a temporary ID and potentially ask for registration info.
      // 3. Assume it's a reconnect attempt (less likely for unknown handler path).

      // For now, let's assign a temporary ID and username and set up handlers.
      // This allows basic functionality but might not link to a DB session correctly.
      const tempCharacterId = `late-mobile-${socketId.substring(0, 5)}`;
      const tempUsername = `User-${socketId.substring(0, 3)}`;
      // logWarn(`Mobile client identified late. Assigning temporary ID/Username. Full functionality may be limited.`, WEBSOCKET_CONTEXT, { socketId, tempCharacterId });
      console.warn(
        `[${WEBSOCKET_CONTEXT}] Mobile client ${socketId} identified late. Assigning temporary ID: ${tempCharacterId}, Username: ${tempUsername}. Full functionality may be limited.`
      );

      // Add temporary player state to GameStateManager (or update if somehow exists)
      // Ensure this doesn't conflict with existing players
      if (GameStateManager.getPlayer(tempCharacterId)) {
        // logError(`Temporary mobile ID conflict`, WEBSOCKET_CONTEXT, { tempCharacterId, socketId });
        console.error(
          `[${WEBSOCKET_CONTEXT}] Temporary mobile ID conflict for ${tempCharacterId} on socket ${socketId}`
        );
        // Handle error - maybe disconnect?
        socket.emit('connection_error', {
          clientType: 'server',
          reason: 'Temporary ID conflict during late identification.',
        });
        socket.disconnect(true);
        // No conversionSuccessful = true;
      } else {
        const playerState = GameStateManager.addOrUpdatePlayer(
          tempCharacterId,
          tempUsername,
          socketId,
          null,
          0
        ); // Add as inactive

        if (!playerState) {
          // logError(`Failed to add player state for late-identified mobile client`, WEBSOCKET_CONTEXT, { socketId, tempCharacterId });
          console.error(
            `[${WEBSOCKET_CONTEXT}] Failed to add player state for late-identified mobile client ${socketId} with temp ID ${tempCharacterId}`
          );
          socket.emit('connection_error', {
            clientType: 'server',
            reason:
              'Failed to initialize player state after late identification.',
          });
          socket.disconnect(true);
          // No conversionSuccessful = true;
        } else {
          // Setup specific mobile handlers with the temporary ID
          setupMobileClientHandlers(socket, tempCharacterId);

          socket.emit('connection_notice', {
            clientType: 'server',
            message:
              'Client type identified as Mobile. Assigned temporary ID. Some features may require rejoining.',
            status: 'identified_late',
            identifiedClientType: 'mobile',
            characterId: tempCharacterId, // Inform client of its temporary ID
            active: playerState.active,
          });
          conversionSuccessful = true;
        }
      }
    } else {
      // Client type is specified but not recognized, or it's 'server'
      if (clientType && clientType !== 'server') {
        // logWarn(`Unrecognized clientType '${clientType}' received in message/identify`, WEBSOCKET_CONTEXT, { socketId });
        console.warn(
          `[${WEBSOCKET_CONTEXT}] Unrecognized clientType '${clientType}' received in message/identify from ${socketId}`
        );
        socket.emit('connection_notice', {
          clientType: 'server',
          message: `Your provided clientType '${clientType}' is not recognized. Please use 'touchdesigner' or 'mobile'.`,
          status: 'unrecognized_client_type_in_message',
        });
      } else {
        // No client type or 'server' - do nothing, wait for more info
        // logDebug(`Ignoring clientType '${clientType}' from unknown client`, WEBSOCKET_CONTEXT, { socketId });
        console.log(
          `[${WEBSOCKET_CONTEXT}] Ignoring clientType '${clientType || '<not provided>'}' from unknown client ${socketId}`
        );
      }
      conversionSuccessful = false; // No conversion happened
    }
  } catch (error) {
    // logError('Error during client type detection/conversion', WEBSOCKET_CONTEXT, error, { socketId, clientType });
    console.error(
      `[${WEBSOCKET_CONTEXT}] Error during client type detection/conversion for ${socketId} (Type: ${clientType}):`,
      error
    );
    conversionSuccessful = false;
  } finally {
    socket._conversionResult = conversionSuccessful; // Store result
    delete socket._isConverting; // Clear the flag
  }
  return conversionSuccessful;
}

module.exports = {
  initializeUnknownHandler,
  setupUnknownClientHandlers,
  // Potentially export handleClientTypeDetection if needed elsewhere, but maybe not
};
