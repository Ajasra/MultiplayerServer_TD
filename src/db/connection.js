const { logInfo, logError } = require('../../src/utils/simpleLogger');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const fs = require('fs');
const path = require('path');

const DB_CONTEXT = 'DATABASE';

let db = null;
let isConnecting = false;
let connectionPromise = null;

function getDbPath() {
  const fallbackDev = './.sqlite-data/app.db';
  const dbPath = process.env.SQLITE_DB_PATH || fallbackDev;
  return dbPath;
}

function ensureDirExists(filePath) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    logError('Failed to ensure SQLite directory exists.', DB_CONTEXT, err);
    throw err;
  }
}

async function connectDB() {
  if (db) return db;
  if (isConnecting) return connectionPromise;

  isConnecting = true;
  const dbPath = getDbPath();
  ensureDirExists(dbPath);

  connectionPromise = (async () => {
    try {
      logInfo(`Opening SQLite database at ${dbPath}`, DB_CONTEXT);
      db = await open({ filename: dbPath, driver: sqlite3.Database });
      // Optional pragmas
      await db.exec('PRAGMA foreign_keys = ON;');
      logInfo('SQLite database connection established.', DB_CONTEXT);
      return db;
    } catch (err) {
      logError('Failed to open SQLite database.', DB_CONTEXT, err);
      throw err;
    } finally {
      isConnecting = false;
    }
  })();
  return connectionPromise;
}

async function getDB() {
  if (!db) {
    await connectDB();
  }
  return db;
}

async function closeDB() {
  if (db) {
    try {
      await db.close();
      logInfo('SQLite database connection closed.', DB_CONTEXT);
    } catch (err) {
      logError('Error closing SQLite database.', DB_CONTEXT, err);
    } finally {
      db = null;
      isConnecting = false;
      connectionPromise = null;
    }
  }
}

module.exports = { connectDB, getDB, closeDB };
