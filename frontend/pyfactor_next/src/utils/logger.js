'use client';

// This is a simplified version of logger.js that doesn't depend on the debug module
// It will replace the original logger.js temporarily

// Configuration for log filtering
const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Current log level - only logs of this level and higher will be shown
// In production, default to INFO level; in development, default to DEBUG
const CURRENT_LOG_LEVEL = (process.env.NODE_ENV === 'production') ? LOG_LEVEL.INFO : LOG_LEVEL.DEBUG;

// Deduplication of logs
const recentLogs = new Map();
const DEDUP_TIMEOUT = 2000; // 2 seconds timeout for deduplicating identical logs

// Enhanced safe logger implementation
const safeLog = (level, prefix, ...args) => {
  try {
    // Check if we should show this log based on current level
    const numericLevel = level === 'debug' ? LOG_LEVEL.DEBUG :
                         level === 'info' ? LOG_LEVEL.INFO :
                         level === 'warn' ? LOG_LEVEL.WARN :
                         LOG_LEVEL.ERROR;
                         
    if (numericLevel < CURRENT_LOG_LEVEL) {
      return; // Skip logs below the current level
    }
    
    // Generate a key for deduplication
    const logKey = `${level}-${prefix}-${JSON.stringify(args)}`;
    
    // Check if this exact log was recently shown
    const now = Date.now();
    const lastLogTime = recentLogs.get(logKey);
    
    if (lastLogTime && (now - lastLogTime < DEDUP_TIMEOUT)) {
      // Skip this log as it's a duplicate within our timeout window
      return;
    }
    
    // Update the deduplication map
    recentLogs.set(logKey, now);
    
    // Clean up old entries in the map
    for (const [key, timestamp] of recentLogs.entries()) {
      if (now - timestamp > DEDUP_TIMEOUT) {
        recentLogs.delete(key);
      }
    }
    
    // Ensure we have valid arguments
    if (!args || args.length === 0) {
      console[level](`[pyfactor] [${prefix}]:`, "(no data)");
      return;
    }
    
    // Convert complex objects to safe strings (avoiding circular references)
    const safeArgs = args.map(arg => {
      if (arg === undefined) {
        return "(undefined)";
      }
      if (arg === null) {
        return "(null)";
      }
      if (arg instanceof Error) {
        return {
          message: arg.message || "No message",
          code: arg.code,
          name: arg.name || "Error",
          stack: arg.stack
        };
      }
      else if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.parse(JSON.stringify(arg));
        } catch (e) {
          return `[Circular or complex object: ${Object.keys(arg).join(', ')}]`;
        }
      }
      return arg;
    });
    
    console[level](`[pyfactor] [${prefix}]:`, ...safeArgs);
  } catch (e) {
    // Last-resort fallback
    try {
      console.log(`[pyfactor] [ERROR] Logger failed:`, e.message);
    } catch {
      // Nothing we can do at this point
    }
  }
};

// Client-side debug method
const debug = (message, ...args) => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    safeLog('debug', message, ...args);
  } else if (process.env.NODE_ENV !== 'production') {
    // Server-side debug handling
    console.debug(`[pyfactor] [${message}]:`, ...args);
  }
};

// Client-side info method
const info = (message, ...args) => {
  if (typeof window !== 'undefined') {
    safeLog('info', message, ...args);
  } else {
    // Server-side info handling
    console.info(`[pyfactor] [${message}]:`, ...args);
  }
};

// Client-side warn method
const warn = (message, ...args) => {
  if (typeof window !== 'undefined') {
    safeLog('warn', message, ...args);
  } else {
    // Server-side warn handling
    console.warn(`[pyfactor] [${message}]:`, ...args);
  }
};

// Client-side error method
const error = (message, ...args) => {
  if (typeof window !== 'undefined') {
    safeLog('error', message, ...args);
  } else {
    // Server-side error handling
    console.error(`[pyfactor] [${message}]:`, ...args);
  }
};

/**
 * Create a namespaced logger instance
 * This function was missing and caused errors
 * @param {string} namespace - The namespace for this logger
 * @returns {Object} Logger object with debug, info, warn, error methods
 */
export const createLogger = (namespace) => {
  const prefix = `[${namespace}]`;
  
  return {
    debug: (...args) => debug(prefix, ...args),
    info: (...args) => info(prefix, ...args),
    warn: (...args) => warn(prefix, ...args),
    error: (...args) => error(prefix, ...args),
    log: (...args) => debug(prefix, ...args)
  };
};

// Export individual methods
export const logger = {
  debug,
  info,
  warn,
  error,
  log: debug,
  createLogger // Export the createLogger function
};

// Export individual methods for direct access
export { debug, info, warn, error };

// Do not export default logger to avoid confusion
