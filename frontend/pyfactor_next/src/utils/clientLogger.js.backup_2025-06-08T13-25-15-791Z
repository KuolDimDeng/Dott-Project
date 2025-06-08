/**
 * Client-side logger utility
 * 
 * Provides consistent logging with prefixes for debug levels
 */
import { setCacheValue, getCacheValue } from './appCache';

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Default to INFO in production, DEBUG in development
const DEFAULT_LOG_LEVEL = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

// Get configured log level from AppCache or environment
const getLogLevel = () => {
  try {
    // Try to get from AppCache if available
    if (typeof window !== 'undefined') {
      const storedLevel = getCacheValue('logLevel');
      if (storedLevel && LOG_LEVELS[storedLevel] !== undefined) {
        return LOG_LEVELS[storedLevel];
      }
    }
  } catch (e) {
    // Ignore AppCache errors
  }
  
  // Fall back to default
  return DEFAULT_LOG_LEVEL;
};

// Utility to get a timestamp string
const getTimestamp = () => {
  return new Date().toISOString();
};

// Format log message with prefix
const formatMessage = (level, message) => {
  const timestamp = getTimestamp();
  return `[${timestamp}] [${level}] ${message}`;
};

// The main logger object with methods for each log level
export const logger = {
  debug: (message, ...args) => {
    if (getLogLevel() <= LOG_LEVELS.DEBUG) {
      console.debug(formatMessage('DEBUG', message), ...args);
    }
  },
  
  info: (message, ...args) => {
    if (getLogLevel() <= LOG_LEVELS.INFO) {
      console.info(formatMessage('INFO', message), ...args);
    }
  },
  
  warn: (message, ...args) => {
    if (getLogLevel() <= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message), ...args);
    }
  },
  
  error: (message, ...args) => {
    if (getLogLevel() <= LOG_LEVELS.ERROR) {
      console.error(formatMessage('ERROR', message), ...args);
    }
  },
  
  // Set the current log level
  setLogLevel: (level) => {
    try {
      if (typeof window !== 'undefined') {
        if (LOG_LEVELS[level] !== undefined) {
          setCacheValue('logLevel', level);
        }
      }
    } catch (e) {
      // Ignore AppCache errors
    }
  }
};

export default logger; 