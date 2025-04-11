// This is a universal logger implementation that works in both client and server environments
// without dependencies on external logging libraries

// Simple logger implementation with console fallbacks
const createLogger = (namespace) => {
  // Safe log function that handles errors and circular references
  const safeLog = (level, ...args) => {
    try {
      // Convert complex objects to safe strings (avoiding circular references)
      const safeArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return `[Complex object: ${Object.keys(arg).join(', ')}]`;
          }
        }
        return arg;
      });
      
      // Format: [namespace] message args...
      console[level](`[${namespace}]`, ...safeArgs);
    } catch (e) {
      // Last-resort fallback
      try {
        console.log(`[ERROR] Logger failed:`, e.message);
      } catch {
        // Nothing we can do at this point
      }
    }
  };

  // Create the logger object with all standard methods
  return {
    debug: (...args) => safeLog('log', ...args),
    info: (...args) => safeLog('info', ...args),
    warn: (...args) => safeLog('warn', ...args),
    error: (...args) => safeLog('error', ...args),
    log: (...args) => safeLog('log', ...args)
  };
};

// Create a default logger instance
const defaultLogger = createLogger('pyfactor');

// Export the logger object
export const logger = defaultLogger;

// Also export individual functions
export const { debug, info, warn, error, log } = defaultLogger;

// For CommonJS compatibility
export default {
  logger,
  debug,
  info,
  warn,
  error,
  log,
  createLogger
};
