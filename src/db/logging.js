const {
  logInfo: simpleLogInfo,
  logWarn: simpleLogWarn,
  logError: simpleLogError,
} = require('../../src/utils/simpleLogger');
const settings = require('../config/settings');
const { getDB } = require('./connection');

const LOGS_COLLECTION = 'logs';
let loggingAttemptInProgress = false;

async function logEvent(
  level,
  message,
  context,
  details = {},
  sessionId,
  clientIp
) {
  if (loggingAttemptInProgress) {
    simpleLogError(
      `[FALLBACK LOG DUE TO RECURSION RISK] Level: ${level}, Context: ${context}, Message: ${message}`
    );
    if (details) {
      if (details.errorMessage)
        simpleLogError(`[FALLBACK LOG] Error Message: ${details.errorMessage}`);
      if (details.errorStack)
        simpleLogError(`[FALLBACK LOG] Stack: ${details.errorStack}`);
    }
    return null;
  }

  try {
    loggingAttemptInProgress = true;

    if (!settings.DEBUG_MODE && level !== 'WARN' && level !== 'ERROR') {
      simpleLogInfo(
        `DB logging skipped for level '${level}' as DEBUG_MODE is false. Original log: ${level} - ${context} - ${message}`
      );
      return null;
    }

    let db;
    try {
      db = await getDB();
      if (!db) {
        simpleLogWarn(
          `WARN: SQLite getDB() returned null/undefined. Skipping DB logging. Original log: ${level} - ${context} - ${message}`,
          details
        );
        return null;
      }
    } catch (getDbError) {
      simpleLogError(
        `CRITICAL: Error obtaining DB for logging. Original log: ${level} - ${context} - ${message}.`,
        getDbError
      );
      simpleLogError(`[FALLBACK LOG] ${level} - ${context} - ${message}`);
      return null;
    }

    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      context,
      details: details || {},
    };
    if (sessionId) logEntry.sessionId = sessionId;
    if (clientIp) logEntry.clientIp = clientIp;

    const stmt = `INSERT INTO ${LOGS_COLLECTION}
      (timestamp, level, message, context, details, sessionId, clientIp)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      logEntry.timestamp,
      logEntry.level,
      logEntry.message,
      logEntry.context,
      JSON.stringify(logEntry.details),
      logEntry.sessionId || null,
      logEntry.clientIp || null,
    ];
    const res = await db.run(stmt, params);
    return res?.lastID ? { id: res.lastID, ...logEntry } : null;
  } catch (err) {
    simpleLogError(
      `CRITICAL: Failed to write log to SQLite. Original log: ${level} - ${context} - ${message}. DB Insert Error:`,
      err
    );
    if (details && details.errorMessage)
      simpleLogError(`Original Event Error Message: ${details.errorMessage}`);
    if (details && details.errorStack)
      simpleLogError(`Original Event Error Stack: ${details.errorStack}`);
    return null;
  } finally {
    loggingAttemptInProgress = false;
  }
}

async function logInfo(message, context, details, sessionId, clientIp) {
  return logEvent('INFO', message, context, details, sessionId, clientIp);
}

async function logWarn(message, context, details, sessionId, clientIp) {
  return logEvent('WARN', message, context, details, sessionId, clientIp);
}

async function logError(message, context, error, sessionId, clientIp) {
  const detailsObject = {};
  if (error instanceof Error) {
    detailsObject.errorMessage = error.message;
    detailsObject.errorStack = error.stack;
  } else if (error) {
    detailsObject.errorDetails = error;
  }
  return logEvent(
    'ERROR',
    message,
    context,
    detailsObject,
    sessionId,
    clientIp
  );
}

async function logDebug(message, context, details, sessionId, clientIp) {
  if (settings.DEBUG_MODE) {
    return logEvent('DEBUG', message, context, details, sessionId, clientIp);
  }
  return Promise.resolve(null);
}

module.exports = {
  logEvent,
  logInfo,
  logWarn,
  logError,
  logDebug,
};
