const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const settings = require('../config/settings'); // Import settings

const SIMPLE_LOGGER_CONTEXT = 'SIMPLE_LOGGER';

const logDirectory = path.join(__dirname, '..', '..', 'logs');

// Configure the custom format for console and file logs
const logFormat = winston.format.printf(
  ({ level, message, context, timestamp, stack }) => {
    let output = `[${level.toUpperCase()}] [${context || SIMPLE_LOGGER_CONTEXT}] ${timestamp} - ${message}`;
    if (stack) {
      output += `\nStack: ${stack}`;
    }
    return output;
  }
);

const consoleLogLevel = settings.DEBUG_MODE ? settings.DEBUG_LOG_LEVEL : 'warn';
const fileLogLevel = settings.DEBUG_MODE ? settings.DEBUG_LOG_LEVEL : 'warn';

const logger = winston.createLogger({
  level: consoleLogLevel, // Default logging level for the logger instance
  // levels: winston.config.syslog.levels, // If you want to use syslog levels
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // This adds the stack trace to the info object
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      level: consoleLogLevel, // Console logs level
      format: winston.format.combine(
        winston.format.colorize(), // Colorize console output
        logFormat
      ),
    }),
    new DailyRotateFile({
      level: fileLogLevel, // General file logs level
      filename: 'application-%DATE%.log',
      dirname: logDirectory,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d', // Retain logs for 14 days
      format: winston.format.combine(logFormat),
    }),
    new DailyRotateFile({
      level: 'error', // Dedicated transport for errors only
      filename: 'error-%DATE%.log',
      dirname: logDirectory,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d', // Retain logs for 14 days
      format: winston.format.combine(logFormat),
    }),
  ],
});

function logInfo(message, context = SIMPLE_LOGGER_CONTEXT, details = null) {
  logger.info(message, { context, details });
}

function logWarn(message, context = SIMPLE_LOGGER_CONTEXT, details = null) {
  logger.warn(message, { context, details });
}

function logError(message, context = SIMPLE_LOGGER_CONTEXT, error = null) {
  logger.error(message, { context, error });
}

// Debug logging can be conditional if needed, similar to before
function logDebug(message, context = SIMPLE_LOGGER_CONTEXT, details = null) {
  if (settings.DEBUG_MODE) {
    // Use settings.DEBUG_MODE for conditional debug logging
    logger.debug(message, { context, details });
  }
}

module.exports = {
  logInfo,
  logWarn,
  logError,
  logDebug,
};
