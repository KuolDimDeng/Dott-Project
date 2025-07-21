/**
 * Unified logger that works in both browser and server environments
 * This logger provides basic logging functionality with level filtering
 * Enhanced with Sentry integration for error tracking
 */
import * as Sentry from '@sentry/nextjs';

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
   * Format log message with structured data
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   * @returns {object} - Formatted log data
   */
  fmt(message, data = {}) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      message,
      ...data,
    };
  },
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
      const logData = logger.fmt(message, data);
      
      // Add breadcrumb to Sentry
      Sentry.addBreadcrumb({
        message: logData.message,
        level: 'info',
        data: logData,
        timestamp: logData.timestamp,
      });
      
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
      const logData = logger.fmt(message, data);
      
      // Add breadcrumb to Sentry
      Sentry.addBreadcrumb({
        message: logData.message,
        level: 'warning',
        data: logData,
        timestamp: logData.timestamp,
      });
      
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
      const logData = logger.fmt(message, {
        error: error ? {
          message: error?.message || String(error),
          stack: error?.stack || null,
          name: error?.name || 'UnknownError',
        } : null,
      });
      
      // Capture exception in Sentry
      if (error instanceof Error) {
        Sentry.captureException(error, {
          contexts: {
            log: logData,
          },
          tags: {
            logLevel: 'error',
          },
        });
      } else {
        // If no error object, capture message
        Sentry.captureMessage(message, 'error');
      }
      
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
  },
  
  /**
   * Log user actions (for Sentry tracking)
   * @param {string} action - The action performed
   * @param {any} data - Optional data associated with the action
   */
  userAction: (action, data) => {
    logger.info(`User Action: ${action}`, data);
  },
  
  /**
   * Log performance metrics
   * @param {string} operation - The operation name
   * @param {number} duration - Duration in milliseconds
   * @param {any} metadata - Optional metadata
   */
  performance: (operation, duration, metadata) => {
    logger.info(`Performance: ${operation}`, { duration, ...metadata });
  },
  
  /**
   * Log API calls
   * @param {string} method - HTTP method
   * @param {string} url - API endpoint
   * @param {number} status - HTTP status code
   * @param {number} duration - Duration in milliseconds
   * @param {any} data - Optional data
   */
  api: (method, url, status, duration, data) => {
    logger.info(`API: ${method} ${url}`, { status, duration, ...data });
  },
  
  /**
   * Log feature flag usage
   * @param {string} featureName - Name of the feature
   * @param {boolean} enabled - Whether the feature is enabled
   * @param {any} metadata - Optional metadata
   */
  featureFlag: (featureName, enabled, metadata) => {
    logger.info(`Feature Flag: ${featureName}`, { enabled, ...metadata });
  }
};

// For backward compatibility
export const serverLogger = logger;

export default logger;