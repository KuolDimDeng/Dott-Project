// This is a simplified version of logger.js that doesn't depend on the debug module
// It will replace the original logger.js temporarily

// Simple logger implementation that doesn't rely on debug
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

// Create a simple logger function
function createLogger(namespace) {
  const logger = {};
  
  // Create methods for each log level
  Object.values(LOG_LEVELS).forEach(level => {
    logger[level] = function(...args) {
      // Only log in development or if specifically enabled
      if (typeof window !== 'undefined' && 
          (process.env.NODE_ENV === 'development' || window.__DEBUG_ENABLED__)) {
        console[level](`[${namespace}] [${level.toUpperCase()}]:`, ...args);
      }
    };
  });
  
  return logger;
}

// Create a default logger instance
const logger = createLogger('pyfactor');

// Export the logger and utilities
module.exports = {
  logger,
  createLogger,
  LOG_LEVELS,
};

// For ESM imports
module.exports.default = module.exports;
