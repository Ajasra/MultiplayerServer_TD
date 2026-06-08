const { logInfo, logWarn, logDebug } = require('../db/logging.js');

const GAME_STATE_CONTEXT = 'GAME_STATE';

class Player {
  /**
   * @typedef {Object} PlayerState
   * @property {string} playerId - Unique ID (matches characterId, session _id)
   * @property {string} socketId - Current Socket.IO ID of the mobile controller
   * @property {string} username - Player\'s chosen display name
   * @property {string} imageUrl - Path to the player\'s character image
   * @property {number} active - Player status (0=waiting, 1=active, 2=finished)
   * @property {number} lastPing - Timestamp of the last message received from mobile client
   * @property {number | null} lastStatsUpdateTimestamp - Timestamp of the last stats update received from TouchDesigner
   * @property {object} controls - Current control state
   * @property {number} controls.x - Joystick X (-100 to 100)
   * @property {number} controls.y - Joystick Y (-100 to 100)
   * @property {object} controls.buttons - Button states (e.g., { action1: false })
   * @property {object} stats - Current game stats reported by TouchDesigner
   * @property {number} stats.score - Player score
   * @property {number} stats.lives - Player lives
   * @property {number} stats.time - Game time (e.g., remaining or elapsed)
   * @property {number} stats.tdState - State reported by TouchDesigner (0, 1, 2) - Can differ slightly from server \'active\' state
   * @property {boolean} frozen - True if the player is currently frozen
   * @property {number | null} previousActiveState - Stores the active state before freezing
   * @property {string | null} freezeReason - Reason for freezing
   * @property {number | null} freezeTime - Timestamp when player was frozen
   * @property {number | null} completionTime - Timestamp when player completed the game
   */

  /**
   * Creates a new Player instance.
   * @param {string} playerId
   * @param {string} username
   * @param {string} socketId
   * @param {string} imageUrl
   * @param {number} initialActiveState
   * @param {number} initialLives
   */
  constructor(
    playerId,
    username,
    socketId,
    imageUrl,
    initialActiveState,
    initialLives
  ) {
    this.playerId = playerId;
    this.socketId = socketId;
    this.username = username;
    this.imageUrl = imageUrl;
    this.active = initialActiveState;
    this.lastPing = Date.now();
    this.lastStatsUpdateTimestamp =
      initialActiveState === 1 ? Date.now() : null;
    this.controls = { x: 0, y: 0, buttons: {} };
    this.stats = { score: 0, lives: initialLives, time: 0, tdState: 0 };
    this.isAuto = false;
    this.frozen = false;
    this.previousActiveState = null;
    this.freezeReason = null;
    this.freezeTime = null;
    this.completionTime = null;

    logDebug('Player instance created', GAME_STATE_CONTEXT, {
      playerId,
      username,
    });
  }

  /**
   * Updates the last ping time for the player.
   */
  updatePing() {
    this.lastPing = Date.now();
    // logDebug('Updated player ping', GAME_STATE_CONTEXT, { playerId: this.playerId });
  }

  /**
   * Updates the control state for a player (joystick or buttons).
   * @param {{ x?: number, y?: number, button?: string, state?: boolean }} controlData
   */
  updateControls(controlData) {
    if (this.active !== 1) {
      // logDebug('Ignored controls update for inactive player', GAME_STATE_CONTEXT, { playerId: this.playerId, active: this.active });
      return;
    }

    this.updatePing();

    if (controlData.x !== undefined && controlData.y !== undefined) {
      this.controls.x = controlData.x;
      this.controls.y = controlData.y;
      // logDebug('Updated joystick state', GAME_STATE_CONTEXT, { playerId: this.playerId, x: controlData.x, y: controlData.y });
    } else if (
      controlData.button !== undefined &&
      controlData.state !== undefined
    ) {
      if (!this.controls.buttons) {
        this.controls.buttons = {};
      }
      this.controls.buttons[controlData.button] = controlData.state;
      // logDebug('Updated button state', GAME_STATE_CONTEXT, { playerId: this.playerId, button: controlData.button, state: controlData.state });
    }
  }

  /**
   * Updates the active state for a player.
   * @param {number} newState (0, 1, or 2)
   */
  setActiveState(newState) {
    if ([0, 1, 2].includes(newState)) {
      // const previousState = this.active;
      this.active = newState;
      this.updatePing(); // Update ping on state change

      // Update or clear the TD stats timestamp based on the new state
      if (newState === 1) {
        this.lastStatsUpdateTimestamp = Date.now(); // Set timestamp when becoming active
      } else if (newState === 0 || newState === 2) {
        this.lastStatsUpdateTimestamp = null; // Clear timestamp when becoming inactive/finished
      }

      // logInfo('Updated player active state', GAME_STATE_CONTEXT, { playerId: this.playerId, previousState, newState });
    } else {
      logWarn('Invalid active state provided', GAME_STATE_CONTEXT, {
        playerId: this.playerId,
        invalidState: newState,
      });
    }
  }

  /**
   * Updates player stats based on received data from TouchDesigner.
   * @param {object} stats - { score, lives, time, state } from TD.
   * @returns {boolean} True if state changed to completed, false otherwise.
   */
  updateStatsFromTD(stats) {
    this.lastStatsUpdateTimestamp = Date.now();

    // Only update stats if the player is currently active or finished (avoid overwriting initial state)
    if (this.active === 1 || this.active === 2) {
      this.stats.score =
        stats.score !== undefined ? stats.score : this.stats.score;
      this.stats.lives =
        stats.lives !== undefined ? stats.lives : this.stats.lives;
      this.stats.time = stats.time !== undefined ? stats.time : this.stats.time;
      this.stats.tdState =
        stats.state !== undefined ? stats.state : this.stats.tdState;

      // logDebug('Updated player stats from TD', GAME_STATE_CONTEXT, { playerId: this.playerId, newStats: this.stats });

      // If TD reports state 2 (finished), mark the player as completed in our state
      if (this.stats.tdState === 2 && this.active !== 2) {
        logInfo(
          'Player marked as completed by TD stats update',
          GAME_STATE_CONTEXT,
          { playerId: this.playerId }
        );
        this.active = 2; // Update server state to finished
        this.lastStatsUpdateTimestamp = null; // Clear timestamp on completion
        this.completionTime = Date.now();
        return true; // Indicate completion
      }
    }
    return false;
  }

  /**
   * Marks a player as frozen (paused) in the game.
   * @param {string} reason - The reason for freezing (e.g., "connection_timeout", "admin_pause")
   */
  freeze(reason = 'connection_timeout') {
    if (!this.frozen) {
      this.previousActiveState = this.active;
      this.frozen = true;
      this.freezeReason = reason;
      this.freezeTime = Date.now();

      logInfo('Player frozen', GAME_STATE_CONTEXT, {
        playerId: this.playerId,
        reason,
        previousState: this.previousActiveState,
      });
    } else {
      logDebug('Player already frozen', GAME_STATE_CONTEXT, {
        playerId: this.playerId,
        reason: this.freezeReason,
      });
    }
  }

  /**
   * Unfreezes a previously frozen player, restoring their previous active state.
   */
  unfreeze() {
    if (this.frozen) {
      if (this.previousActiveState !== undefined) {
        this.active = this.previousActiveState;
      }

      this.frozen = false;
      this.freezeReason = null;
      this.updatePing(); // Update ping time on unfreeze

      logInfo('Player unfrozen', GAME_STATE_CONTEXT, {
        playerId: this.playerId,
        restoredState: this.active,
      });
    } else {
      logDebug('Player was not frozen', GAME_STATE_CONTEXT, {
        playerId: this.playerId,
      });
    }
  }

  /**
   * Checks if a player is currently frozen.
   * @returns {boolean} True if player is frozen, false otherwise.
   */
  isFrozen() {
    return !!this.frozen;
  }

  /**
   * Checks if the player's TD stats are stale.
   * @param {number} staleTimeoutMs - Timeout in milliseconds.
   * @returns {boolean} True if stale, false otherwise.
   */
  isStale(staleTimeoutMs) {
    return (
      this.active === 1 &&
      this.lastStatsUpdateTimestamp &&
      Date.now() - this.lastStatsUpdateTimestamp > staleTimeoutMs
    );
  }
}

module.exports = Player;
