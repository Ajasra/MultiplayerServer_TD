import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import { io } from 'socket.io-client';

/**
 * Game Context - Single source of truth for mobile game client
 *
 * Integrated context that combines WebSocket management and game state
 * for simplified architecture and better maintainability.
 */

// Game states
export const GAME_STATES = {
  NAME_ENTRY: 'name_entry', // First visit - need username
  CONNECTING: 'connecting', // Connecting to server
  READY: 'ready', // Connected, waiting to start
  PLAYING: 'playing', // Game active
  FINISHED: 'finished', // Game completed
};

// Initial state - much simpler
const initialState = {
  // Core game state
  gameState: GAME_STATES.CONNECTING,
  characterId: null,
  username: '',
  isAuto: false,

  // Connection
  socket: null,
  isConnected: false,
  statusMessage: 'Loading...',

  // Game data
  stats: { score: 0, lives: '-', time: '-' },

  // Simple error handling
  error: null,
};

// Action types
const ACTIONS = {
  SET_CHARACTER_ID: 'SET_CHARACTER_ID',
  SET_USERNAME: 'SET_USERNAME',
  SET_GAME_STATE: 'SET_GAME_STATE',
  SET_CONNECTION: 'SET_CONNECTION',
  SET_STATUS: 'SET_STATUS',
  UPDATE_STATS: 'UPDATE_STATS',
  SET_ERROR: 'SET_ERROR',
  SET_IS_AUTO: 'SET_IS_AUTO',
  RESET_GAME: 'RESET_GAME',
};

// State reducer
function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_CHARACTER_ID:
      return {
        ...state,
        characterId: action.payload,
        error: null, // Clear any errors when character ID is set
      };

    case ACTIONS.SET_USERNAME:
      return { ...state, username: action.payload };

    case ACTIONS.SET_GAME_STATE:
      return { ...state, gameState: action.payload };

    case ACTIONS.SET_CONNECTION:
      return {
        ...state,
        socket: action.payload.socket,
        isConnected: action.payload.isConnected,
      };

    case ACTIONS.SET_STATUS:
      return { ...state, statusMessage: action.payload };

    case ACTIONS.UPDATE_STATS:
      return { ...state, stats: { ...state.stats, ...action.payload } };

    case ACTIONS.SET_IS_AUTO:
      return { ...state, isAuto: action.payload };

    case ACTIONS.RESET_GAME:
      return {
        ...initialState,
        characterId: state.characterId, // Keep character ID
      };

    default:
      return state;
  }
}

const GameContext = createContext();

export function GameProvider({ children, characterId }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const socketRef = useRef(null);
  const isConnectingRef = useRef(false); // Prevent multiple simultaneous connections

  // Initialize character ID
  useEffect(() => {
    if (characterId) {
      dispatch({ type: ACTIONS.SET_CHARACTER_ID, payload: characterId });
    }
  }, [characterId]);

  // Simple WebSocket connection function
  const connect = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('[GameContext] Connection already in progress, skipping...');
      return false;
    }

    // Check if already connected
    if (state.isConnected && socketRef.current) {
      console.log('[GameContext] Already connected, skipping...');
      return true;
    }

    isConnectingRef.current = true;

    // Clear any existing errors first
    dispatch({ type: ACTIONS.SET_ERROR, payload: null });

    if (!state.characterId) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Character ID required' });
      isConnectingRef.current = false;
      return false;
    }

    console.log(
      '[GameContext] Starting connection for characterId:',
      state.characterId
    );
    dispatch({ type: ACTIONS.SET_GAME_STATE, payload: GAME_STATES.CONNECTING });
    dispatch({ type: ACTIONS.SET_STATUS, payload: 'Connecting...' });

    try {
      const socket = io({
        query: {
          characterId: state.characterId,
          username: state.username || '', // Username will be set from server
          clientType: 'mobile',
        },
      });

      socketRef.current = socket;

      // Setup socket event handlers
      socket.on('connect', () => {
        dispatch({
          type: ACTIONS.SET_CONNECTION,
          payload: { socket, isConnected: true },
        });
        dispatch({
          type: ACTIONS.SET_STATUS,
          payload: 'Connected! Authenticating...',
        });
      });

      socket.on('connection_success', data => {
        console.log('[GameContext] Connection successful:', data);
        isConnectingRef.current = false;
        dispatch({ type: ACTIONS.SET_GAME_STATE, payload: GAME_STATES.READY });
        dispatch({ type: ACTIONS.SET_STATUS, payload: 'Ready to play!' });
        if (data && data.isAuto !== undefined) {
          dispatch({ type: ACTIONS.SET_IS_AUTO, payload: !!data.isAuto });
        }
      });

      socket.on('game_started', data => {
        dispatch({
          type: ACTIONS.SET_GAME_STATE,
          payload: GAME_STATES.PLAYING,
        });
        dispatch({ type: ACTIONS.SET_STATUS, payload: 'Game active!' });
        if (data && data.isAuto !== undefined) {
          dispatch({ type: ACTIONS.SET_IS_AUTO, payload: !!data.isAuto });
        }
      });

      socket.on('control_mode_updated', data => {
        if (data && data.isAuto !== undefined) {
          dispatch({ type: ACTIONS.SET_IS_AUTO, payload: !!data.isAuto });
        }
      });

      socket.on('stats', statsData => {
        dispatch({ type: ACTIONS.UPDATE_STATS, payload: statsData });
      });

      socket.on('game_completed', () => {
        dispatch({
          type: ACTIONS.SET_GAME_STATE,
          payload: GAME_STATES.FINISHED,
        });
        dispatch({ type: ACTIONS.SET_STATUS, payload: 'Game completed!' });
      });

      socket.on('disconnect', () => {
        console.log('[GameContext] Socket disconnected');
        isConnectingRef.current = false;
        dispatch({
          type: ACTIONS.SET_CONNECTION,
          payload: { socket: null, isConnected: false },
        });
        dispatch({ type: ACTIONS.SET_STATUS, payload: 'Disconnected' });
        dispatch({
          type: ACTIONS.SET_GAME_STATE,
          payload: GAME_STATES.CONNECTING,
        });
      });

      socket.on('connect_error', error => {
        console.log('[GameContext] Connection error:', error);
        isConnectingRef.current = false;
        dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
        dispatch({
          type: ACTIONS.SET_GAME_STATE,
          payload: GAME_STATES.CONNECTING,
        });
      });

      return true;
    } catch (error) {
      console.log('[GameContext] Connection failed:', error);
      isConnectingRef.current = false;
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Connection failed' });
      dispatch({
        type: ACTIONS.SET_GAME_STATE,
        payload: GAME_STATES.CONNECTING,
      });
      return false;
    }
  }, [state.characterId, state.username, state.isConnected]);

  // Simple game actions
  const setUsername = useCallback(username => {
    dispatch({ type: ACTIONS.SET_USERNAME, payload: username });
    dispatch({ type: ACTIONS.SET_ERROR, payload: null }); // Clear errors on username change
  }, []);

  // Save username to server and then connect
  const saveUsernameAndConnect = useCallback(async (username) => {
    if (!state.characterId) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Character ID required' });
      return false;
    }

    if (!username || !username.trim()) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Please enter a name' });
      return false;
    }

    if (username.trim().length > 16) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Name must be 16 characters or less' });
      return false;
    }

    dispatch({ type: ACTIONS.SET_ERROR, payload: null });
    dispatch({ type: ACTIONS.SET_STATUS, payload: 'Saving name...' });

    try {
      const response = await fetch(`/api/character/${state.characterId}/username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error_text || 'Failed to save username');
      }

      dispatch({ type: ACTIONS.SET_USERNAME, payload: username.trim() });
      return true; // Signal that username was saved successfully
    } catch (error) {
      console.log('[GameContext] Failed to save username:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message || 'Failed to save name' });
      return false;
    }
  }, [state.characterId]);

  const startGame = useCallback(
    (options = {}) => {
      if (socketRef.current && state.isConnected) {
        socketRef.current.emit('start_game', {
          clientType: 'mobile',
          ...options,
        });
      }
    },
    [state.isConnected]
  );

  const switchToManual = useCallback(() => {
    if (socketRef.current && state.isConnected) {
      socketRef.current.emit('switch_to_manual', { clientType: 'mobile' });
    }
  }, [state.isConnected]);

  const switchToAuto = useCallback(() => {
    if (socketRef.current && state.isConnected) {
      socketRef.current.emit('switch_to_auto', { clientType: 'mobile' });
    }
  }, [state.isConnected]);

  const sendJoystick = useCallback(
    (x, y) => {
      if (
        socketRef.current &&
        state.isConnected &&
        state.gameState === GAME_STATES.PLAYING
      ) {
        socketRef.current.emit('joystick', { x, y, clientType: 'mobile' });
      }
    },
    [state.isConnected, state.gameState]
  );

  const sendButton = useCallback(
    (button, pressed) => {
      if (
        socketRef.current &&
        state.isConnected &&
        state.gameState === GAME_STATES.PLAYING
      ) {
        socketRef.current.emit('button', {
          button,
          state: pressed,
          clientType: 'mobile',
        });
      }
    },
    [state.isConnected, state.gameState]
  );

  const resetGame = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    dispatch({ type: ACTIONS.RESET_GAME });
  }, []);

  // Helper function to set game to finished state directly (for returning users)
  const setFinishedState = useCallback((stats = null) => {
    // Clear any existing errors
    dispatch({ type: ACTIONS.SET_ERROR, payload: null });

    if (stats) {
      dispatch({ type: ACTIONS.UPDATE_STATS, payload: stats });
    }
    dispatch({ type: ACTIONS.SET_GAME_STATE, payload: GAME_STATES.FINISHED });
    dispatch({ type: ACTIONS.SET_STATUS, payload: 'Game completed!' });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const value = {
    // State
    ...state,

    // Actions
    setUsername,
    connect,
    saveUsernameAndConnect,
    startGame,
    switchToManual,
    switchToAuto,
    sendJoystick,
    sendButton,
    resetGame,
    setFinishedState,

    // Helpers
    canConnect:
      state.username.trim().length > 0 && state.username.trim().length <= 16,
    canStartGame: state.gameState === GAME_STATES.READY && state.isConnected,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

GameProvider.propTypes = {
  children: PropTypes.node.isRequired,
  characterId: PropTypes.string,
};

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export default GameContext;
