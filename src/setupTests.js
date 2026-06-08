// Jest setup file for React Testing Library
import '@testing-library/jest-dom';

// Mock WebSocket for testing (since our app uses WebSocket heavily)
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;

    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
    }, 10);
  }

  send(data) {
    // Mock send method for testing
    console.log('Mock WebSocket send:', data);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ type: 'close' });
    }
  }
};

// WebSocket constants
global.WebSocket.CONNECTING = 0;
global.WebSocket.OPEN = 1;
global.WebSocket.CLOSING = 2;
global.WebSocket.CLOSED = 3;

// Mock requestAnimationFrame for joystick testing
global.requestAnimationFrame = callback => {
  return setTimeout(callback, 16); // ~60fps
};

global.cancelAnimationFrame = id => {
  clearTimeout(id);
};

// Mock touch events for mobile joystick testing
Object.defineProperty(window, 'TouchEvent', {
  value: class MockTouchEvent extends Event {
    constructor(type, options = {}) {
      super(type, options);
      this.touches = options.touches || [];
      this.targetTouches = options.targetTouches || [];
      this.changedTouches = options.changedTouches || [];
    }
  },
});

// Mock ResizeObserver (used by Mantine)
global.ResizeObserver = class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver (may be used by components)
global.IntersectionObserver = class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Console warning suppression for known issues
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
        args[0].includes('Warning: componentWillReceiveProps') ||
        args[0].includes('Warning: componentWillMount'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test utilities
global.testUtils = {
  // Mock player data for testing
  mockPlayer: {
    id: 'test-player-1',
    name: 'TestPlayer',
    character: 'knight',
    score: 100,
    lives: 3,
    position: { x: 0, y: 0 },
  },

  // Mock game state for testing
  mockGameState: {
    gameId: 'test-game-1',
    status: 'waiting',
    players: [],
    settings: {
      maxPlayers: 4,
      gameMode: 'classic',
    },
  },

  // Helper to create mock WebSocket message
  createMockMessage: (type, data) => ({
    type,
    data,
    timestamp: Date.now(),
  }),

  // Helper to simulate touch events
  createTouchEvent: (type, touches = []) => new TouchEvent(type, { touches }),

  // Helper to wait for async operations
  waitFor: (callback, timeout = 1000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        try {
          callback();
          resolve();
        } catch (error) {
          if (Date.now() - startTime >= timeout) {
            reject(error);
          } else {
            setTimeout(check, 10);
          }
        }
      };
      check();
    });
  },
};
