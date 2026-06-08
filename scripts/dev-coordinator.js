#!/usr/bin/env node

/**
 * Development Coordinator Script
 * 
 * This script helps coordinate the Express server and React dev server
 * during development, ensuring they work well together.
 */

const { spawn } = require('child_process');
const path = require('path');

// Configuration
const config = {
  expressPort: process.env.PORT || 3031,
  reactPort: 3032,
  host: process.env.HOST || '0.0.0.0', // Important for Docker
  colors: {
    express: '\x1b[32m', // Green
    react: '\x1b[36m',   // Cyan
    error: '\x1b[31m',   // Red
    info: '\x1b[33m',    // Yellow
    reset: '\x1b[0m'     // Reset
  }
};

// Utility functions
const log = (source, message, color = config.colors.reset) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] [${source}]${config.colors.reset} ${message}`);
};

const logExpress = (message) => log('EXPRESS', message, config.colors.express);
const logReact = (message) => log('REACT', message, config.colors.react);
const logError = (message) => log('ERROR', message, config.colors.error);
const logInfo = (message) => log('INFO', message, config.colors.info);

// Process management
let expressProcess = null;
let reactProcess = null;

// Graceful shutdown
const cleanup = () => {
  logInfo('Shutting down development servers...');
  
  if (expressProcess) {
    expressProcess.kill();
    expressProcess = null;
  }
  
  if (reactProcess) {
    reactProcess.kill();
    reactProcess = null;
  }
  
  process.exit(0);
};

// Signal handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// Start Express server
const startExpressServer = () => {
  logExpress('Starting Express server...');
  
  expressProcess = spawn('npx', ['nodemon', 'server.js'], {
    stdio: 'pipe',
    cwd: process.cwd(),
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: config.expressPort
    }
  });

  expressProcess.on('error', (err) => {
    logError(`Failed to start Express server: ${err.message}`);
  });

  expressProcess.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      logExpress(message);
    }
  });

  expressProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message && !message.includes('DeprecationWarning')) {
      logError(`Express: ${message}`);
    }
  });

  expressProcess.on('exit', (code) => {
    if (code !== 0) {
      logError(`Express server exited with code ${code}`);
    }
  });
};

// Start React dev server
const startReactDevServer = () => {
  logReact('Starting React dev server...');
  
  reactProcess = spawn('npm', ['run', 'client:dev'], {
    stdio: 'pipe',
    cwd: process.cwd(),
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: config.reactPort,
      HOST: config.host,
      BROWSER: 'none' // Don't auto-open browser
    }
  });

  reactProcess.on('error', (err) => {
    logError(`Failed to start React dev server: ${err.message}`);
  });

  reactProcess.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      logReact(message);
    }
  });

  reactProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message && !message.includes('DeprecationWarning')) {
      // These are actually info messages from webpack-dev-server, not errors
      if (message.includes('[webpack-dev-server]') || message.includes('<i>')) {
        logReact(message.replace('<i> ', ''));
      } else {
        logError(`React: ${message}`);
      }
    }
  });

  reactProcess.on('exit', (code) => {
    if (code !== 0) {
      logError(`React dev server exited with code ${code}`);
    }
  });
};

// Main execution
const main = () => {
  logInfo('Starting Game Server development environment...');
  logInfo(`Express server will run on: http://${config.host}:${config.expressPort}`);
  logInfo(`React dev server will run on: http://${config.host}:${config.reactPort}`);
  logInfo('Press Ctrl+C to stop all servers');
  
  // Start both servers
  startExpressServer();
  
  // Delay React server start to let Express start first
  setTimeout(() => {
    startReactDevServer();
  }, 2000);
  
  // Health check
  setTimeout(() => {
    logInfo('✅ Development environment is ready!');
    logInfo('🎮 Game client: Navigate to the Express server for WebSocket connection');
    logInfo('⚛️  React dev: Hot reloading enabled for client-side changes');
  }, 5000);
};

// Run the coordinator
main(); 