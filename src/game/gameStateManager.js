
const { logInfo, logWarn, logError, logDebug } = require('../db/logging.js');
const ClientManager = require('../websocket/clientManager.js'); // Import ClientManager for TD socket access
const Player = require('./Player'); // Import the new Player class
const gameNotifier = require('../websocket/gameNotifier'); // Import the new game notifier

const GAME_STATE_CONTEXT = 'GAME_STATE';

// In-memory storage for player states
// Map<playerId, Player>
const players = new Map();

// Map<socketId, playerId> for quick lookup on disconnect or message receipt
const socketIdToPlayerIdMap = new Map();

// TODO: Load initial game settings (e.g., default lives) from config/env
const initialLives = 3;

// Constants for cleanup and collection management
const MAX_INACTIVE_TIME_MS = 5 * 60 * 1000; // 5 minutes inactivity before cleanup
const CLEANUP_INTERVAL_MS = 60 * 1000; // Run cleanup every minute

// Interval ID for the stale player cleanup task
let cleanupIntervalId = null;
// Interval ID for the TD stats timeout check task
let staleTDStatsCheckIntervalId = null;

/**
 * Adds a new player or updates an existing player's connection details.
 * Called when a mobile client successfully connects and validates.
 * @param {string} playerId
 * @param {string} username
 * @param {string} socketId
 * @param {string} imageUrl
 * @param {number} initialActiveState
 * @returns {Player | null} The new or updated player instance, or null on error.
 */
function addOrUpdatePlayer(
  playerId,
  username,
  socketId,
  imageUrl,
  initialActiveState = 0
) {
  logDebug(`Adding or updating player`, GAME_STATE_CONTEXT, {
    playerId,
    username,
    socketId,
    initialActiveState,
  });

  // Clean up any old socket association for this player first
  const existingPlayer = players.get(playerId);
  if (
    existingPlayer &&
    existingPlayer.socketId &&
    existingPlayer.socketId !== socketId
  ) {
    socketIdToPlayerIdMap.delete(existingPlayer.socketId);
    logDebug('Removed old socket mapping for player', GAME_STATE_CONTEXT, {
      playerId,
      oldSocketId: existingPlayer.socketId,
    });
  }
  // Clean up any old player association for this socket
  if (socketIdToPlayerIdMap.has(socketId)) {
    const oldPlayerId = socketIdToPlayerIdMap.get(socketId);
    if (oldPlayerId !== playerId) {
      logWarn(
        'Socket previously associated with different player',
        GAME_STATE_CONTEXT,
        { newPlayerId: playerId, oldPlayerId, socketId }
      );
      // Potentially remove old player association? Depends on desired logic.
    }
  }

  let player;
  if (existingPlayer) {
    // Update existing player with new connection details
    player = existingPlayer;
    player.socketId = socketId;
    player.username = username;
    player.imageUrl = imageUrl; // Update image URL if it changed
    player.updatePing();
    player.setActiveState(initialActiveState);
  } else {
    // Create a new player instance
    player = new Player(
      playerId,
      username,
      socketId,
      imageUrl,
      initialActiveState,
      initialLives
    );
  }

  players.set(playerId, player);
  socketIdToPlayerIdMap.set(socketId, playerId);

  logInfo(`Player added/updated in Game State`, GAME_STATE_CONTEXT, {
    playerId,
    username,
    socketId,
    active: player.active,
    totalPlayers: players.size,
  });
  return player;
}

/**
 * Retrieves the state object for a given player ID.
 * @param {string} playerId
 * @returns {Player | undefined}
 */
function getPlayer(playerId) {
  return players.get(playerId);
}

/**
 * Removes a player from the game state.
 * Called on final disconnect or explicit removal.
 * @param {string} playerId
 * @returns {boolean} True if the player was removed, false otherwise.
 */
function removePlayer(playerId) {
  const player = players.get(playerId);
  if (player) {
    socketIdToPlayerIdMap.delete(player.socketId);
    const deleted = players.delete(playerId);
    logInfo(`Player removed from Game State`, GAME_STATE_CONTEXT, {
      playerId,
      totalPlayers: players.size,
    });
    return deleted;
  }
  logWarn('Attempted to remove non-existent player', GAME_STATE_CONTEXT, {
    playerId,
  });
  return false;
}

/**
 * Retrieves the player ID associated with a given socket ID.
 * @param {string} socketId
 * @returns {string | undefined}
 */
function getPlayerIdBySocketId(socketId) {
  return socketIdToPlayerIdMap.get(socketId);
}

/**
 * Updates the last ping time for a player.
 * @param {string} playerId
 */
function updatePlayerPing(playerId) {
  const player = players.get(playerId);
  if (player) {
    player.updatePing();
  } else {
    logWarn(
      'Attempted to update ping for non-existent player',
      GAME_STATE_CONTEXT,
      { playerId }
    );
  }
}

/**
 * Updates the control state for a player (joystick or buttons).
 * @param {string} playerId
 * @param {{ x?: number, y?: number, button?: string, state?: boolean }} controlData
 */
function updatePlayerControls(playerId, controlData) {
  const player = players.get(playerId);
  if (!player) {
    logWarn(
      'Attempted to update controls for non-existent player',
      GAME_STATE_CONTEXT,
      { playerId }
    );
    return;
  }
  player.updateControls(controlData);
}

/**
 * Updates the active state for a player.
 * @param {string} playerId
 * @param {number} newState (0, 1, or 2)
 */
function updatePlayerActiveState(playerId, newState) {
  const player = players.get(playerId);
  if (player) {
    player.setActiveState(newState);
  } else {
    logWarn(
      'Attempted to update state for non-existent player',
      GAME_STATE_CONTEXT,
      { playerId }
    );
  }
}

/**
 * Retrieves all players, optionally filtered by active state.
 * @param {number | null} [activeState=null] - Filter by state (0, 1, 2) or null for all.
 * @returns {Player[]}
 */
function getAllPlayers(activeState = null) {
  const allPlayers = Array.from(players.values());
  if (activeState === null || activeState === undefined) {
    return allPlayers;
  }
  return allPlayers.filter(p => p.active === activeState);
}

/**
 * Completes a player's game session when TouchDesigner reports state=2.
 * This function:
 * 1. Updates the player's state to finished (2)
 * 2. Returns the player's final stats for UI display
 * 3. Will trigger game completion workflows
 *
 * @param {string} playerId - The player's ID
 * @param {Object} finalStats - Final stats from TouchDesigner
 * @returns {Object|null} The player's data or null if player not found
 */
function completeGame(playerId, finalStats) {
  const player = players.get(playerId);
  if (!player) {
    logWarn(
      'Attempted to complete game for non-existent player',
      GAME_STATE_CONTEXT,
      { playerId }
    );
    return null;
  }

  // Update stats with final values
  if (finalStats) {
    player.stats.score = finalStats.score || player.stats.score;
    player.stats.lives = finalStats.lives || player.stats.lives;
    player.stats.time = finalStats.time || player.stats.time;
  }

  // Set state to completed
  player.setActiveState(2); // Use the Player class method
  player.stats.tdState = 2; // Directly update tdState for consistency with TD
  player.completionTime = Date.now();

  logInfo('Player game completed', GAME_STATE_CONTEXT, {
    playerId,
    username: player.username,
    finalScore: player.stats.score,
    finalTime: player.stats.time,
    finalLives: player.stats.lives,
  });

  // Return the player's data for UI/leaderboard
  return {
    playerId: player.playerId,
    username: player.username,
    imageUrl: player.imageUrl,
    stats: {
      score: player.stats.score,
      time: player.stats.time,
      lives: player.stats.lives,
    },
  };
}

/**
 * Updates player stats based on a batch received from TouchDesigner.
 * Also marks players as completed if their tdState becomes 2.
 * @param {Array<object>} statsBatch - Array of { id, score, lives, time, state } from TD.
 * @returns {Array<{playerId: string, stats: object}>} Array of players who were marked as completed.
 */
function updatePlayerStatsFromTD(statsBatch) {
  const completedPlayers = [];

  statsBatch.forEach(playerStats => {
    const playerId = playerStats.id;
    const player = players.get(playerId);

    if (player) {
      const wasCompleted = player.updateStatsFromTD(playerStats); // Delegate to Player class
      if (wasCompleted) {
        completedPlayers.push({
          playerId: playerId,
          stats: { ...player.stats },
        });
      }
    } else {
      // Use simple logger directly to avoid recursion in database logging
      // This happens when TouchDesigner sends stats for players that aren't in our game state
      const { logWarn: simpleLogWarn } = require('../utils/simpleLogger');
      simpleLogWarn(
        `[GAME_STATE] Received stats for unknown player ID from TD: ${playerStats.id}`
      );

      // Notify TouchDesigner to remove this player from its state
      const gameNotifier = require('../websocket/gameNotifier');
      gameNotifier.notifyPlayerRemoved(playerStats.id);
    }
  });

  return completedPlayers;
}

/**
 * Gets a batch of player controls for sending to TouchDesigner.
 * Only includes active players (state = 1).
 * @returns {Array<Object>} Array of player control objects.
 */
function getControlBatchForTouchDesigner() {
  const activePlayers = getAllPlayers(1); // Only get active players
  if (activePlayers.length === 0) {
    return [];
  }

  return activePlayers.map(player => ({
    id: player.playerId,
    x: player.controls.x,
    y: player.controls.y,
    buttons: player.controls.buttons || {},
    auto: player.isAuto ? 1 : 0,
  }));
}

/**
 * Marks a player as frozen (paused) in the game.
 * This is used when a player loses connection or needs to be temporarily suspended.
 * @param {string} playerId - The ID of the player to freeze
 * @param {string} reason - The reason for freezing (e.g., "connection_timeout", "admin_pause")
 * @returns {Player|null} The updated player instance or null if player not found
 */
function freezePlayer(playerId, reason = 'connection_timeout') {
  const player = players.get(playerId);
  if (!player) {
    logWarn('Attempted to freeze non-existent player', GAME_STATE_CONTEXT, {
      playerId,
    });
    return null;
  }
  player.freeze(reason);
  return player;
}

/**
 * Unfreezes a previously frozen player, restoring their previous active state.
 * @param {string} playerId - The ID of the player to unfreeze
 * @returns {Player|null} The updated player instance or null if player not found
 */
function unfreezePlayer(playerId) {
  const player = players.get(playerId);
  if (!player) {
    logWarn('Attempted to unfreeze non-existent player', GAME_STATE_CONTEXT, {
      playerId,
    });
    return null;
  }
  player.unfreeze();
  return player;
}

/**
 * Checks if a player is currently frozen.
 * @param {string} playerId - The ID of the player to check
 * @returns {boolean} True if player is frozen, false otherwise or if player not found
 */
function isPlayerFrozen(playerId) {
  const player = players.get(playerId);
  return player ? player.isFrozen() : false;
}

/**
 * Cleans up stale player entries that haven't sent messages in the configured time.
 * @returns {number} Number of players removed
 */
function cleanupStalePlayers() {
  const now = Date.now();
  const staleThreshold = now - MAX_INACTIVE_TIME_MS;
  let removedCount = 0;

  // Find all players that haven't pinged in the threshold time
  const stalePlayers = [];
  players.forEach((player, playerId) => {
    // Skip currently frozen players
    if (player.isFrozen()) return; // Use Player method

    // Check last ping time against threshold
    if (player.lastPing < staleThreshold) {
      stalePlayers.push(playerId);
    }
  });

  // Remove the stale players
  stalePlayers.forEach(playerId => {
    const player = players.get(playerId);
    if (player) {
      logInfo('Removing stale player during cleanup', GAME_STATE_CONTEXT, {
        playerId,
        username: player.username,
        lastPing: new Date(player.lastPing).toISOString(),
        staleFor: Math.round((now - player.lastPing) / 1000) + 's',
      });

      // Clean up socket mapping
      if (player.socketId) {
        socketIdToPlayerIdMap.delete(player.socketId);
      }

      // Remove from players map
      players.delete(playerId);
      removedCount++;
    }
  });

  if (removedCount > 0) {
    logInfo(
      `Cleanup removed ${removedCount} stale players`,
      GAME_STATE_CONTEXT,
      {
        remainingPlayers: players.size,
      }
    );
  }

  return removedCount;
}

/**
 * Starts the periodic cleanup process for stale players.
 * @returns {NodeJS.Timeout} The interval timer
 */
function startPeriodicCleanup() {
  const interval = setInterval(() => {
    try {
      cleanupStalePlayers();
    } catch (error) {
      logError('Error during player cleanup', GAME_STATE_CONTEXT, error);
    }
  }, CLEANUP_INTERVAL_MS);

  // logInfo(`Started periodic player cleanup (every ${CLEANUP_INTERVAL_MS/1000}s)`, GAME_STATE_CONTEXT);
  return interval;
}

// Start cleanup on module load
cleanupIntervalId = startPeriodicCleanup();

/**
 * Gets the current number of players in the game state.
 * @returns {number} The current player count
 */
function getPlayerCount() {
  return players.size;
}

/**
 * Periodically checks for players who haven't received stats updates from TouchDesigner
 * within the specified timeout and marks them as inactive.
 * @param {number} staleTimeoutMs - Timeout in milliseconds.
 */
function checkStaleTDStats(staleTimeoutMs) {
  let timedOutCount = 0;

  players.forEach((player, playerId) => {
    // Only check players who are currently marked as active (1)
    if (player.isStale(staleTimeoutMs)) {
      // Use Player method
      // Player is stale!
      logWarn(
        `Player timed out waiting for TD stats. Marking inactive.`,
        GAME_STATE_CONTEXT,
        {
          playerId,
          lastUpdate: player.lastStatsUpdateTimestamp
            ? new Date(player.lastStatsUpdateTimestamp).toISOString()
            : 'N/A',
          timeout: `${staleTimeoutMs / 1000}s`,
        }
      );

      // Update state
      player.setActiveState(0); // Use Player method
      timedOutCount++;

      // Notify TouchDesigner clients using the gameNotifier
      gameNotifier.notifyPlayerTimedOut(playerId, 0, 'td_stats_timeout');

      // Consider notifying the mobile client too?
      // if (player.socketId) {
      //    gameNotifier.notifyMobileClientOfTDTimeout(playerId, 'Connection lost with game server. Please check status.', 'lost_td_sync');
      // }
    }
  });

  if (timedOutCount > 0) {
    logInfo(
      `Marked ${timedOutCount} players as inactive due to TD stats timeout.`,
      GAME_STATE_CONTEXT
    );
  }
}

/**
 * Starts the periodic check for players inactive based on TD stats updates.
 * @param {number} intervalMs - How often to run the check.
 * @param {number} timeoutMs - The inactivity timeout duration.
 * @param {object} ioInstance - The Socket.IO server instance.
 */
function startStaleTDStatsCheck(intervalMs, timeoutMs, ioInstance) {
  if (staleTDStatsCheckIntervalId) {
    logWarn(
      'Stale TD Stats check interval already running. Stopping previous before starting new.',
      GAME_STATE_CONTEXT
    );
    clearInterval(staleTDStatsCheckIntervalId);
  }
  if (!ioInstance) {
    logError(
      'Cannot start Stale TD Stats check: ioInstance is required.',
      GAME_STATE_CONTEXT
    );
    return;
  }
  gameNotifier.initialize(ioInstance); // Initialize the game notifier
  // logInfo('Starting periodic check for stale TD stats', GAME_STATE_CONTEXT, { interval: `${intervalMs}ms`, timeout: `${timeoutMs}ms` });
  staleTDStatsCheckIntervalId = setInterval(() => {
    try {
      checkStaleTDStats(timeoutMs);
    } catch (error) {
      logError(
        'Error during periodic stale TD stats check',
        GAME_STATE_CONTEXT,
        error
      );
    }
  }, intervalMs);
}

/**
 * Stops the periodic check for players inactive based on TD stats updates.
 */
function stopStaleTDStatsCheck() {
  if (staleTDStatsCheckIntervalId) {
    logInfo('Stopping periodic check for stale TD stats.', GAME_STATE_CONTEXT);
    clearInterval(staleTDStatsCheckIntervalId);
    staleTDStatsCheckIntervalId = null;
  }
}

/**
 * Stops the periodic cleanup process for stale players.
 */
function stopPeriodicCleanup() {
  if (cleanupIntervalId) {
    logInfo('Stopping periodic player cleanup.', GAME_STATE_CONTEXT);
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

module.exports = {
  addOrUpdatePlayer,
  getPlayer,
  removePlayer,
  getPlayerIdBySocketId,
  updatePlayerPing,
  updatePlayerControls,
  updatePlayerActiveState,
  getAllPlayers,
  updatePlayerStatsFromTD,
  getControlBatchForTouchDesigner,
  freezePlayer,
  unfreezePlayer,
  isPlayerFrozen,
  cleanupStalePlayers,
  getPlayerCount,
  completeGame,
  startStaleTDStatsCheck,
  stopStaleTDStatsCheck,
  stopPeriodicCleanup,
};
