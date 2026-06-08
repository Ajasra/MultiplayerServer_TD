module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx}'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'json'],
  
  // Transform files with Babel
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module name mapping for imports
  moduleNameMapper: {
    // Handle CSS imports (ignore them in tests)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    
    // Handle static file imports
    '\\.(jpg|jpeg|png|gif|svg|woff|woff2|eot|ttf|otf)$': '<rootDir>/src/__mocks__/fileMock.js',
    
    // Handle absolute imports (matching webpack aliases)
    '^@/(.*)$': '<rootDir>/src/client/$1',
    '^@components/(.*)$': '<rootDir>/src/client/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/client/hooks/$1',
    '^@contexts/(.*)$': '<rootDir>/src/client/contexts/$1',
    '^@utils/(.*)$': '<rootDir>/src/client/utils/$1'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/client/**/*.{js,jsx}',
    '!src/client/**/*.stories.{js,jsx}',
    '!src/client/index.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Test timeout (important for async tests and WebSocket testing)
  testTimeout: 10000,
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/public/',
    '<rootDir>/TDclient/',
    '<rootDir>/uploads/',
    '<rootDir>/logs/'
  ],
  
  // Watch plugins for better development experience
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Global test variables
  globals: {
    'process.env.NODE_ENV': 'test'
  }
}; 