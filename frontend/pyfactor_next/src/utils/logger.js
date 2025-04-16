/**
 * Unified logger that works in both browser and server environments
 * This logger provides basic logging functionality with level filtering
 */

// Log levels with numerical values for comparison
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Default minimum log level (can be overridden)
let minLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Determine if we're in production or development
const isDev = process.env.NODE_ENV !== 'production';

// Determine environment at runtime
const getIsServer = () => typeof window === 'undefined';

/**
 * Logger utility for consistent logging across the application
 */
export const logger = {
  /**
   * Set the minimum log level
   * @param {string} level - Minimum log level (debug, info, warn, error)
   */
  setLevel(level) {
    if (LOG_LEVELS[level] !== undefined) {
      minLevel = level;
    }
  },

  /**
   * Get the current minimum log level
   * @returns {string} - Current minimum log level
   */
  getLevel() {
    return minLevel;
  },

  /**
   * Log debug messages (only in development)
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  debug: (message, data) => {
    if (isDev && LOG_LEVELS[minLevel] <= LOG_LEVELS.debug) {
      if (getIsServer()) {
        if (data !== undefined) {
          console.debug(`[SERVER DEBUG] ${message}`, data);
        } else {
          console.debug(`[SERVER DEBUG] ${message}`);
        }
      } else {
        if (data !== undefined) {
          console.debug(message, data);
        } else {
          console.debug(message);
        }
      }
    }
  },
  
  /**
   * Log info messages
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  info: (message, data) => {
    if (LOG_LEVELS[minLevel] <= LOG_LEVELS.info) {
      if (getIsServer()) {
        if (data !== undefined) {
          console.info(`[SERVER INFO] ${message}`, data);
        } else {
          console.info(`[SERVER INFO] ${message}`);
        }
      } else {
        if (data !== undefined) {
          console.info(message, data);
        } else {
          console.info(message);
        }
      }
    }
  },
  
  /**
   * Log warning messages
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  warn: (message, data) => {
    if (LOG_LEVELS[minLevel] <= LOG_LEVELS.warn) {
      if (getIsServer()) {
        if (data !== undefined) {
          console.warn(`[SERVER WARN] ${message}`, data);
        } else {
          console.warn(`[SERVER WARN] ${message}`);
        }
      } else {
        if (data !== undefined) {
          console.warn(message, data);
        } else {
          console.warn(message);
        }
      }
    }
  },
  
  /**
   * Log error messages
   * @param {string} message - The message to log
   * @param {any} error - Optional error object to log
   */
  error: (message, error) => {
    if (LOG_LEVELS[minLevel] <= LOG_LEVELS.error) {
      if (getIsServer()) {
        if (error !== undefined) {
          console.error(`[SERVER ERROR] ${message}`, error);
        } else {
          console.error(`[SERVER ERROR] ${message}`);
        }
      } else {
        if (error !== undefined) {
          console.error(message, error);
        } else {
          console.error(message);
        }
      }
    }
  }
};

// For backward compatibility
export const serverLogger = logger;

export default logger;