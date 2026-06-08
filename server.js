console.log("--- SERVER.JS STARTING ---"); 

const express = require('express');
const http = require('http');
const { connectDB, closeDB } = require('./src/db/connection');
const { initializeDatabase } = require('./src/db/initDb'); // Import initializeDatabase
const path = require('path'); // Require path module
const { 
  initializeWebSocketServer, 
  startStatsEmitter,
  startControlBatchEmitter,
  startConnectionStatsLogger,
  gracefulShutdown: gracefullyShutdownWebSockets
} = require('./src/websocket/server.js'); // Import WebSocket initializers

// Import routes
const characterRoutes = require('./src/routes/character');
const leaderboardRoutes = require('./src/routes/leaderboard');
const reactRoutes = require('./src/routes/react.js'); // Import React routes

const app = express();
 
// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from public directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// Basic route for testing the server
app.get('/', (req, res) => {
  res.send('Hello from Game Server YEAH!!!!');
});

// Mount routers
app.use('/api/character', characterRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/', reactRoutes); // Mount React routes to handle /player/:characterId

// == Universal Error Handling ==

// Catch 404s and forward to the error handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error); // Pass the error to the next middleware (our universal handler)
});

// Universal error handler middleware
app.use((err, req, res, next) => {
  // Determine status code
  const statusCode = err.status || err.statusCode || 500;

  // Log the error (optional: use our structured logger)
  // We might already log errors closer to where they happen, 
  // but logging here catches everything passed to next(err).
  console.error(`[${statusCode}] ${err.message} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  if (statusCode >= 500) { // Log stack trace for server errors
      console.error(err.stack);
      // Optionally log to DB as well for server errors
      // logError('Unhandled API Error', 'API:GLOBAL', err, null, { url: req.originalUrl, method: req.method, ip: req.ip });
  }

  // Send standardized JSON response
  res.status(statusCode).json({
    error: true,
    error_code: statusCode,
    error_text: statusCode >= 500 ? 'Internal Server Error' : err.message // Avoid leaking sensitive details on 500 errors
  });
});

// Start the server and connect to DB
async function startServer() {
  try {
    await connectDB(true); // Pass true for initial connection attempt with retries
    await initializeDatabase(); // Initialize DB (ensure indexes)

    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      // Initialize WebSocket Server AFTER HTTP server is listening
      initializeWebSocketServer(server); 
      
      // Start the WebSocket service emitters
      startStatsEmitter(); // Stats to mobile clients
      startControlBatchEmitter(); // Control batches to TouchDesigner
      startConnectionStatsLogger(); // Log connection statistics periodically
      
      console.log(`WebSocket services initialized and started`);
    });

  } catch (err) {
      // connectDB(true) will log specific DB connection errors and exit if all retries fail.
      // This catch block will handle other potential errors during startup.
      console.error("Failed to start the server due to an unexpected error:", err);
      // Ensure DB connection is closed if an error occurs after it was opened but before server fully starts.
      await closeDB().catch(closeErr => console.error("Error closing DB during failed server start:", closeErr));
      process.exit(1);
  }
}

startServer(); // Call the async function to start the server

// Graceful shutdown logic
async function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  // 1. Stop new requests from being accepted by the HTTP server
  console.log('Closing HTTP server...');
  server.close(async (httpErr) => { // Renamed err to httpErr to avoid conflict
    if (httpErr) {
      console.error('Error during HTTP server close:', httpErr);
    }
    console.log('HTTP server closed.');

    // 2. Shutdown WebSocket server
    console.log('Shutting down WebSocket server...');
    await gracefullyShutdownWebSockets(); // Call the WebSocket specific shutdown
    console.log('WebSocket server shutdown complete.');

    // 3. Close the database connection
    console.log('Closing database connection...');
    await closeDB();
    console.log('Database connection closed.');

    console.log('Graceful shutdown complete. Exiting.');
    process.exit(0); // Exit after cleanup
  });

  // If the server hasn't finished shutting down in 30 seconds, force exit
  setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 30000); // 30 seconds timeout
}

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down gracefully...', error);
  gracefulShutdown('uncaughtException').catch(err => {
    console.error('Error during graceful shutdown for uncaughtException:', err);
    process.exit(1);
  });
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION! Shutting down gracefully...', reason);
  gracefulShutdown('unhandledRejection').catch(err => {
    console.error('Error during graceful shutdown for unhandledRejection:', err);
    process.exit(1);
  });
});

console.log("--- SERVER.JS END OF INITIAL EXECUTION ---");
