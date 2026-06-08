const { Server } = require('socket.io');
const { getSessionById, updateSession } = require('../db/sessions.js');
const GameStateManager = require('../game/gameStateManager.js');
const config = require('../config/settings.js');
const {
  logInfo,
  logWarn,
  logError,
  logDebug,
} = require('../utils/simpleLogger.js');

// Import new modules
const ClientManager = require('./clientManager.js');
const {
  initializeTouchDesignerHandler,
  setupTouchDesignerHandlers,
} = require('./handlers/touchdesignerHandler.js');
const {
  initializeMobileHandler,
  setupMobileClientHandlers,
} = require('./handlers/mobileHandler.js');
const {
  initializeUnknownHandler,
  setupUnknownClientHandlers,
} = require('./handlers/unknownHandler.js');

let io;
const WEBSOCKET_CONTEXT = 'WEBSOCKET_SERVER';

// Define TD_INACTIVITY_TIMEOUT_MS_CONFIG for use in this file
// Use default from ClientManager if not in config. TD_INACTIVITY_TIMEOUT_MS is exported from clientManager.js
const TD_INACTIVITY_TIMEOUT_MS_CONFIG =
  config.TD_INACTIVITY_TIMEOUT_MS ||
  ClientManager.TD_INACTIVITY_TIMEOUT_MS ||
  30000;
// These are declared at the top level of the module, so they are accessible by functions within this module.
let tdClientCleanupInterval = null;
let statsEmitterInterval = null;
let controlBatchEmitterInterval = null;
let connectionStatsLoggerInterval = null;

// Constants for TD Stats Timeout check
const TD_STATS_TIMEOUT_MS = config.TD_PLAYER_STATS_TIMEOUT_MS || 30000; // 30 seconds by default
const TD_STATS_CHECK_INTERVAL_MS =
  config.TD_PLAYER_STATS_CHECK_INTERVAL_MS || 10000; // Check every 10 seconds by default

function initializeWebSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? '*' : '*'),
      methods: ['GET', 'POST'],
    },
  });

  // Initialize helper modules with io instance
  ClientManager.initializeClientManager(io);
  initializeTouchDesignerHandler(io);
  initializeMobileHandler(io);
  initializeUnknownHandler(io);

  // logInfo(`[${WEBSOCKET_CONTEXT}] WebSocket server initialized. Attaching connection listener...`);
  logInfo(
    `WebSocket server initialized. Attaching connection listener...`,
    WEBSOCKET_CONTEXT
  );

  io.on('connection', handleClientConnection);

  // Start the check for stale players based on TD stats updates
  GameStateManager.startStaleTDStatsCheck(
    TD_STATS_CHECK_INTERVAL_MS,
    TD_STATS_TIMEOUT_MS,
    io
  );

  // Centralize starting all intervals
  startAllIntervals();

  return io;
}

// New function to centralize interval management
function startAllIntervals() {
  // Start TD client cleanup interval (uses ClientManager)
  if (tdClientCleanupInterval) {
    // Clear previous interval if any (e.g., during hot reload)
    clearInterval(tdClientCleanupInterval);
    tdClientCleanupInterval = null;
  }
  tdClientCleanupInterval = setInterval(() => {
    try {
      ClientManager.cleanupStaleTDClients();
    } catch (error) {
      logError(
        'Error during TD client cleanup interval execution',
        WEBSOCKET_CONTEXT,
        error
      );
    }
  }, TD_INACTIVITY_TIMEOUT_MS_CONFIG);
  logInfo(
    `Started TouchDesigner client cleanup interval (${TD_INACTIVITY_TIMEOUT_MS_CONFIG}ms)`,
    WEBSOCKET_CONTEXT
  );

  // Start other emitters
  startStatsEmitter();
  startControlBatchEmitter();
  startConnectionStatsLogger();
}

async function handleClientConnection(socket) {
  logInfo(
    `================== CONNECTION RECEIVED ==================`,
    WEBSOCKET_CONTEXT
  );
  logInfo(
    `Socket ID: ${socket.id}, Address: ${socket.handshake.address}, Time: ${new Date().toISOString()}`,
    WEBSOCKET_CONTEXT
  );
  logInfo(
    `=========================================================`,
    WEBSOCKET_CONTEXT
  );

  const socketId = socket.id;
  const query = socket.handshake.query || {};
  const { characterId, username, clientType } = query;

  logInfo(
    `Handshake Query - Socket: ${socketId}, Type: ${clientType || 'N/A'}, CharID: ${characterId || 'N/A'}, User: ${username || 'N/A'}`,
    WEBSOCKET_CONTEXT
  );

  try {
    dispatchClientType(socket, query);
  } catch (error) {
    logError(`CRITICAL ERROR in connection handler`, WEBSOCKET_CONTEXT, error, {
      socketId,
      characterId: characterId || 'unknown',
      username: username || 'unknown',
      clientType: clientType || 'unknown',
    });
    try {
      socket.emit('connection_error', {
        clientType: 'server',
        reason:
          'An internal server error occurred during connection. Please try again.',
      });
      socket.disconnect(true);
    } catch (emitError) {
      logError(
        `Error sending disconnect message after critical error`,
        WEBSOCKET_CONTEXT,
        emitError,
        { socketId }
      );
    }
  }
}

// New function to dispatch client types
async function dispatchClientType(socket, query) {
  const { characterId, username, clientType } = query;
  const socketId = socket.id;

  if (clientType === 'touchdesigner') {
    logInfo(`Handling TouchDesigner client via handshake`, WEBSOCKET_CONTEXT, {
      socketId,
    });
    ClientManager.manageTDSocketCollection(socketId);
    setupTouchDesignerHandlers(socket);
    return;
  }

  if (clientType === 'mobile') {
    logInfo(`Handling Mobile client via handshake`, WEBSOCKET_CONTEXT, {
      socketId,
    });
    await processMobileClientConnection(socket, characterId, username);
    return;
  }

  // Default to unknown if clientType is not provided or unrecognized
  if (!clientType) {
    logInfo(
      `UNKNOWN client type from handshake (clientType not provided)`,
      WEBSOCKET_CONTEXT,
      { socketId, query }
    );
  } else {
    logWarn(
      `UNRECOGNIZED clientType '${clientType}' in handshake. Treating as UNKNOWN.`,
      WEBSOCKET_CONTEXT,
      { socketId, clientTypeFromQuery: clientType }
    );
  }
  ClientManager.manageUnknownSocketCollection(socketId);
  logInfo(
    `Client connected as UNKNOWN. Total unknown clients: ${ClientManager.getUnknownSockets().size}`,
    WEBSOCKET_CONTEXT,
    { socketId }
  );
  setupUnknownClientHandlers(socket);
}

// New function to process mobile client connections
async function processMobileClientConnection(socket, characterId, username) {
  const socketId = socket.id;

  if (!characterId) {
    logWarn(
      `MOBILE CLIENT VALIDATION FAILURE - MISSING CHARACTER ID`,
      WEBSOCKET_CONTEXT,
      { socketId, characterId }
    );
    socket.emit('connection_error', {
      clientType: 'server',
      reason: 'Mobile clients require characterId parameter in handshake.',
    });
    socket.disconnect(true);
    return;
  }

  logInfo(
    `Checking session in DB for mobile client ${socketId} (CharID: ${characterId})...`,
    WEBSOCKET_CONTEXT
  );
  const session = await getSessionById(characterId);
  if (!session) {
    logWarn(
      `Session ID ${characterId} not found for mobile client`,
      WEBSOCKET_CONTEXT,
      { socketId }
    );
    socket.emit('connection_error', {
      clientType: 'server',
      reason: 'Session ID not found. Please ensure you have a valid join link.',
    });
    socket.disconnect(true);
    return;
  }
  logInfo(
    `Session found for mobile client ${socketId} (CharID: ${characterId}), Active: ${session.active}`,
    WEBSOCKET_CONTEXT
  );

  if (session.active === 2) {
    logWarn(
      `Attempt to join finished session with ID ${characterId}`,
      WEBSOCKET_CONTEXT,
      { socketId }
    );
    socket.emit('game_completed', {
      clientType: 'server',
      message: 'This session has already been completed.',
      stats: session.stats || {},
    });
    return;
  }

  const existingPlayerState = GameStateManager.getPlayer(characterId);
  if (existingPlayerState && existingPlayerState.socketId) {
    const existingSocket = io.sockets.sockets.get(existingPlayerState.socketId);
    if (existingSocket && existingSocket.connected) {
      // Check if this is the same socket ID trying to reconnect (shouldn't happen)
      if (existingPlayerState.socketId === socketId) {
        logInfo(
          `Same socket attempting reconnection, allowing it`,
          WEBSOCKET_CONTEXT,
          { socketId, characterId }
        );
      } else {
        // Force disconnect the old socket to allow the new connection (handles page refresh)
        logInfo(
          `Forcing disconnect of existing socket to allow reconnection`,
          WEBSOCKET_CONTEXT,
          {
            socketId,
            characterId,
            existingSocketId: existingPlayerState.socketId,
          }
        );
        existingSocket.disconnect(true);
        // GameStateManager will clean up the socket mapping when we update the player below
      }
    } else {
      logInfo(
        `Found stale player state (socket disconnected), allowing reconnection`,
        WEBSOCKET_CONTEXT,
        { characterId, staleSocketId: existingPlayerState.socketId }
      );
    }
  }

  // Use username from database session (auto-generated during character creation)
  const sessionUsername = session.username || 'NONAME';

  const dbActiveState = session.active === 1 ? 1 : 0;
  logInfo(
    `Initiating ASYNC session update in DB for ${characterId} (${socketId}) - User: ${sessionUsername}, Active: ${dbActiveState}`,
    WEBSOCKET_CONTEXT
  );
  updateSession(characterId, {
    $set: { last_ping: new Date(), active: dbActiveState },
  }).catch(dbError => {
    logError(
      '[ASYNC DB Update] Error updating session in DB for mobile client',
      WEBSOCKET_CONTEXT,
      dbError,
      { characterId, socketId }
    );
  });

  const playerState = GameStateManager.addOrUpdatePlayer(
    characterId,
    sessionUsername,
    socketId,
    session.imageUrl,
    dbActiveState
  );
  if (!playerState) {
    logError(
      `Game State Update FAIL: addOrUpdatePlayer returned null for mobile client`,
      WEBSOCKET_CONTEXT,
      { characterId, socketId }
    );
    socket.emit('connection_error', {
      clientType: 'server',
      reason: 'Failed to initialize player state.',
    });
    socket.disconnect(true);
    return;
  }

  // Set isAuto from DB session userdata
  playerState.isAuto = !!session.userdata?.isAuto;

  logInfo(
    `Game State Update OK for mobile client ${socketId} (CharID: ${characterId}), Active: ${playerState.active}, User: ${playerState.username}, Auto: ${playerState.isAuto}`,
    WEBSOCKET_CONTEXT
  );

  socket.emit('connection_success', {
    clientType: 'server',
    message: 'Successfully connected and identified as mobile client.',
    active: playerState.active,
    characterId: playerState.playerId,
    username: playerState.username,
    imageUrl: playerState.imageUrl,
    isAuto: playerState.isAuto,
  });

  const playerJoinedPayload = {
    type: 'player_joined',
    clientType: 'server',
    id: characterId,
    username: playerState.username,
    character: playerState.imageUrl,
    active: playerState.active,
    state: playerState.active,
    auto: playerState.isAuto ? 1 : 0,
  };
  const tdSockets = ClientManager.getTouchDesignerSockets();
  tdSockets.forEach(tdSocketId => {
    io.to(tdSocketId).emit('server_message', playerJoinedPayload);
  });
  if (tdSockets.size > 0) {
    logInfo(
      `Sent player_joined for ${characterId} (Auto: ${playerState.isAuto}) to ${tdSockets.size} TouchDesigner clients`,
      WEBSOCKET_CONTEXT
    );
  }

  setupMobileClientHandlers(socket, characterId);
}

// --- Emitters and Loggers ---

const STATS_EMIT_INTERVAL_MS = config.SERVER_STATS_EMIT_MS || 100;
// statsEmitterInterval is already declared at the top level

function startStatsEmitter() {
  if (statsEmitterInterval) {
    // logWarn("Stats emitter already started. Skipping.", WEBSOCKET_CONTEXT);
    logWarn('Stats emitter already started. Skipping.', WEBSOCKET_CONTEXT);
    return;
  }
  statsEmitterInterval = setInterval(() => {
    if (!io) return;
    const activePlayers = GameStateManager.getAllPlayers(1);
    if (activePlayers.length === 0) return;

    activePlayers.forEach(player => {
      if (player.socketId && player.clientType !== 'touchdesigner') {
        const statsPayload = {
          type: 'stats',
          clientType: 'server',
          id: player.playerId,
          score: player.stats.score,
          lives: player.stats.lives,
          time: player.stats.time,
        };
        io.to(player.socketId).emit('stats', statsPayload);
      }
    });
  }, STATS_EMIT_INTERVAL_MS);
  // logInfo(`Stats emitter started for mobile clients`, WEBSOCKET_CONTEXT, { interval: STATS_EMIT_INTERVAL_MS });
  logInfo(
    `Stats emitter started for mobile clients (Interval: ${STATS_EMIT_INTERVAL_MS}ms)`,
    WEBSOCKET_CONTEXT
  );
}

const CONTROL_BATCH_EMIT_INTERVAL_MS = config.SERVER_TD_CONTROL_BATCH_MS || 100;
// controlBatchEmitterInterval is already declared at the top level

function startControlBatchEmitter() {
  if (controlBatchEmitterInterval) {
    // logWarn("Control batch emitter already started. Skipping.", WEBSOCKET_CONTEXT);
    logWarn(
      'Control batch emitter already started. Skipping.',
      WEBSOCKET_CONTEXT
    );
    return;
  }
  controlBatchEmitterInterval = setInterval(() => {
    if (!io) return;
    const tdSockets = ClientManager.getTouchDesignerSockets();
    if (tdSockets.size === 0) return;

    const controlBatch = GameStateManager.getControlBatchForTouchDesigner();

    let sendBatch = true;
    if (controlBatch.length === 0) {
      if (Date.now() % 1000 >= CONTROL_BATCH_EMIT_INTERVAL_MS) {
        sendBatch = false;
      }
      if (sendBatch && Date.now() % 5000 < CONTROL_BATCH_EMIT_INTERVAL_MS) {
        // logDebug('Sending occasional empty control batch to TD for heartbeat', WEBSOCKET_CONTEXT, { batchInterval: CONTROL_BATCH_EMIT_INTERVAL_MS });
        // logDebug('Sending occasional empty control batch to TD for heartbeat', WEBSOCKET_CONTEXT, { batchInterval: CONTROL_BATCH_EMIT_INTERVAL_MS });
      }
    }

    if (!sendBatch) return;

    const enhancedControlBatch = controlBatch.map(player => {
      const fullPlayerData = GameStateManager.getPlayer(player.id);
      return {
        ...player,
        state:
          fullPlayerData?.stats?.tdState !== undefined
            ? fullPlayerData.stats.tdState
            : fullPlayerData?.active || 0,
      };
    });

    const controlPayload = {
      type: 'control',
      clientType: 'server',
      players: enhancedControlBatch,
    };

    tdSockets.forEach(tdSocketId => {
      io.to(tdSocketId).emit('server_message', controlPayload);
    });

    if (
      enhancedControlBatch.length > 0 &&
      Date.now() % 1000 < CONTROL_BATCH_EMIT_INTERVAL_MS
    ) {
      //  logDebug(`Sent control batch to ${tdSockets.size} TD clients`, WEBSOCKET_CONTEXT, {
      //     playerCount: enhancedControlBatch.length
      // });
      logDebug(
        `Sent control batch to ${tdSockets.size} TD clients`,
        WEBSOCKET_CONTEXT,
        {
          playerCount: enhancedControlBatch.length,
        }
      );
    }
  }, CONTROL_BATCH_EMIT_INTERVAL_MS);

  // logInfo(`Control batch emitter started for TouchDesigner clients`, WEBSOCKET_CONTEXT, { interval: CONTROL_BATCH_EMIT_INTERVAL_MS });
  logInfo(
    `Control batch emitter started for TouchDesigner clients (Interval: ${CONTROL_BATCH_EMIT_INTERVAL_MS}ms)`,
    WEBSOCKET_CONTEXT
  );
}

const CONNECTION_STATS_LOGGER_INTERVAL_MS =
  config.CONNECTION_STATS_LOGGER_INTERVAL_MS || 10000;
// connectionStatsLoggerInterval is already declared at the top level

function startConnectionStatsLogger() {
  if (connectionStatsLoggerInterval) {
    // logWarn("Connection stats logger already started. Skipping.", WEBSOCKET_CONTEXT);
    logWarn(
      'Connection stats logger already started. Skipping.',
      WEBSOCKET_CONTEXT
    );
    return;
  }
  connectionStatsLoggerInterval = setInterval(() => {
    if (!io || !io.engine) {
      // logWarn("IO or IO Engine not available for connection stats.", WEBSOCKET_CONTEXT);
      logWarn(
        'IO or IO Engine not available for connection stats.',
        WEBSOCKET_CONTEXT
      );
      return;
    }

    const totalConnections = io.engine.clientsCount;
    const totalPlayersGSM = GameStateManager.getAllPlayers().length;
    const totalTDClients = ClientManager.getTouchDesignerSockets().size;
    const totalUnknownClients = ClientManager.getUnknownSockets().size;
    const inferredMobileClients = Math.max(
      0,
      totalConnections - totalTDClients - totalUnknownClients
    );

    // logInfo(`[CONNECTION STATS] Total Sockets: ${totalConnections}, TD: ${totalTDClients}, Mobile (inferred): ${inferredMobileClients}, Unknown: ${totalUnknownClients}, PlayersInGSM: ${totalPlayersGSM}`, WEBSOCKET_CONTEXT);
    logInfo(
      `[CONNECTION STATS] Total Sockets: ${totalConnections}, TD: ${totalTDClients}, Mobile (inferred): ${inferredMobileClients}, Unknown: ${totalUnknownClients}, PlayersInGSM: ${totalPlayersGSM}`,
      WEBSOCKET_CONTEXT
    );
  }, CONNECTION_STATS_LOGGER_INTERVAL_MS);

  // logInfo(`Connection statistics logger started`, WEBSOCKET_CONTEXT, { interval: CONNECTION_STATS_LOGGER_INTERVAL_MS });
  logInfo(
    `Connection statistics logger started (Interval: ${CONNECTION_STATS_LOGGER_INTERVAL_MS}ms)`,
    WEBSOCKET_CONTEXT
  );
}

function getIoInstance() {
  if (!io) {
    // logError("Socket.IO instance requested before initialization.", WEBSOCKET_CONTEXT);
    logError(
      'Socket.IO instance requested before initialization.',
      WEBSOCKET_CONTEXT
    );
    throw new Error(
      'Socket.IO has not been initialized. Call initializeWebSocketServer first.'
    );
  }
  return io;
}

// Graceful shutdown
// ... existing code ...
function gracefulShutdown() {
  // logInfo('Attempting to shut down WebSocket server gracefully...', WEBSOCKET_CONTEXT);
  logInfo(
    'Attempting to shut down WebSocket server gracefully...',
    WEBSOCKET_CONTEXT
  );

  if (statsEmitterInterval) {
    clearInterval(statsEmitterInterval);
    statsEmitterInterval = null;
  }
  if (controlBatchEmitterInterval) {
    clearInterval(controlBatchEmitterInterval);
    controlBatchEmitterInterval = null;
  }
  if (connectionStatsLoggerInterval) {
    clearInterval(connectionStatsLoggerInterval);
    connectionStatsLoggerInterval = null;
  }
  if (tdClientCleanupInterval) {
    clearInterval(tdClientCleanupInterval);
    tdClientCleanupInterval = null;
  }

  // Stop the stale TD stats check
  GameStateManager.stopStaleTDStatsCheck();
  // Stop the periodic player cleanup
  GameStateManager.stopPeriodicCleanup();

  if (io) {
    // logInfo('Sending server_shutdown message to all connected clients.', WEBSOCKET_CONTEXT);
    logInfo(
      'Sending server_shutdown message to all connected clients.',
      WEBSOCKET_CONTEXT
    );
    io.emit('server_message', {
      type: 'server_shutdown',
      clientType: 'server',
      message: 'Server is shutting down. Please try reconnecting in a moment.',
    });

    setTimeout(() => {
      io.close(() => {
        // logInfo('Socket.IO server has been closed.', WEBSOCKET_CONTEXT);
        logInfo('Socket.IO server has been closed.', WEBSOCKET_CONTEXT);
      });
    }, 1000);
  } else {
    // logInfo('Socket.IO server instance not found, no clients to notify or close.', WEBSOCKET_CONTEXT);
    logInfo(
      'Socket.IO server instance not found, no clients to notify or close.',
      WEBSOCKET_CONTEXT
    );
  }

  // logInfo('WebSocket server graceful shutdown process initiated.', WEBSOCKET_CONTEXT);
  logInfo(
    'WebSocket server graceful shutdown process initiated.',
    WEBSOCKET_CONTEXT
  );
}

// Register shutdown handlers - ensuring they are registered only once.
if (!process.env.WEBSOCKET_SHUTDOWN_HANDLERS_REGISTERED) {
  process.on('SIGINT', () => {
    // logInfo('SIGINT received. Initiating graceful shutdown.', WEBSOCKET_CONTEXT);
    logInfo(
      'SIGINT received. Initiating graceful shutdown.',
      WEBSOCKET_CONTEXT
    );
    gracefulShutdown();
    setTimeout(() => process.exit(0), 3000);
  });
  process.on('SIGTERM', () => {
    // logInfo('SIGTERM received. Initiating graceful shutdown.', WEBSOCKET_CONTEXT);
    logInfo(
      'SIGTERM received. Initiating graceful shutdown.',
      WEBSOCKET_CONTEXT
    );
    gracefulShutdown();
    setTimeout(() => process.exit(0), 3000);
  });
  process.env.WEBSOCKET_SHUTDOWN_HANDLERS_REGISTERED = 'true';
  // logInfo('SIGINT and SIGTERM shutdown handlers registered for WebSocket server.', WEBSOCKET_CONTEXT);
  logInfo(
    'SIGINT and SIGTERM shutdown handlers registered for WebSocket server.',
    WEBSOCKET_CONTEXT
  );
}

module.exports = {
  initializeWebSocketServer,
  getIoInstance,
  startStatsEmitter,
  startControlBatchEmitter,
  startConnectionStatsLogger,
  gracefulShutdown,
};
