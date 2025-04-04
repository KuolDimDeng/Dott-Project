// Server-side logger implementation
// This file should be imported in API routes instead of the client-side logger

/**
 * Simple server-side logger that works with both console and process.stdout
 */
const createServerLogger = (namespace) => {
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

// Create a default server logger instance
const defaultServerLogger = createServerLogger('API');

// Export the logger object
export const logger = defaultServerLogger;

// Also export individual functions
export const { debug, info, warn, error, log } = defaultServerLogger;

// For CommonJS compatibility
export default {
  logger,
  debug, 
  info,
  warn,
  error,
  log,
  createServerLogger
}; 