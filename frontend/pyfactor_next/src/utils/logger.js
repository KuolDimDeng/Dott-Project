'use client';

// This is a simplified version of logger.js that doesn't depend on the debug module
// It will replace the original logger.js temporarily

// Enhanced safe logger implementation
const safeLog = (level, prefix, ...args) => {
  try {
    // Convert complex objects to safe strings (avoiding circular references)
    const safeArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
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

// Export individual methods
export const logger = {
  debug,
  info,
  warn,
  error
};

// Export individual methods for direct access
export { debug, info, warn, error };

// Do not export default logger to avoid confusion
