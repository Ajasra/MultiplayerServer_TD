// Configuration Settings

const settings = {
  // --- WebSocket Communication Frequencies ---

  // How often the server sends stats updates to mobile clients (milliseconds)
  // Spec: 3Hz = 333ms
  SERVER_STATS_EMIT_MS: 333,

  // How often the server sends batched control updates to TouchDesigner (milliseconds)
  // Spec: 30Hz = ~33ms (Will be used later)
  SERVER_TD_CONTROL_BATCH_MS: 100,

  // How often the client throttles joystick updates (milliseconds)
  // Currently set to 10Hz = ~100ms in join.js
  CLIENT_JOYSTICK_THROTTLE_MS: 33,

  // How often the client sends heartbeat updates to the server (milliseconds)
  // Spec: 1s = 1000ms
  CLIENT_HEARTBEAT_INTERVAL_MS: 2000,

  // --- Connection Management ---

  // Heartbeat interval (milliseconds) - Not yet implemented
  // Spec: 3s = 3000ms
  HEARTBEAT_INTERVAL_MS: 3000,

  // How many missed heartbeats before considering disconnect/freeze - Not yet implemented
  // Spec: 2 missed
  MISSED_HEARTBEAT_THRESHOLD: 2,

  // Player reconnection grace period (milliseconds) - Not yet implemented
  // Spec: 60s = 60000ms
  RECONNECTION_GRACE_PERIOD_MS: 60000,

  TD_PLAYER_STATS_TIMEOUT_MS: 30000,
  TD_PLAYER_STATS_CHECK_INTERVAL_MS: 10000,
  TD_INACTIVITY_TIMEOUT_MS: 30000,

  // --- Database Persistence ---

  // How often to save non-critical session stats to DB (milliseconds) - Not yet implemented
  // Spec: Every 5s = 5000ms
  DB_STATS_PERSIST_INTERVAL_MS: 5000,

  // --- Game Settings ---
  INITIAL_PLAYER_LIVES: 3,
  MAX_USERNAME_LENGTH: 16,

  // --- Debug Settings ---
  DEBUG_MODE: false, // Temporarily disabled to reduce logging recursion
  DEBUG_LOG_LEVEL: 'debug',

  // --- Leaderboard Settings ---
  LEADERBOARD_LIMIT: 10,
  LEADERBOARD_PERIOD: 'daily',
  GAME_TYPE: 'standard',
};

// Make settings immutable
module.exports = Object.freeze(settings);
