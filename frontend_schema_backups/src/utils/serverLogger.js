// Server-side logger implementation
// This file should be imported in API routes instead of the client-side logger

/**
 * Server-side logger utility
 * 
 * This logger is specifically designed for server components and API routes
 * where the client-side logger with browser-specific APIs can't be used.
 */

/**
 * Format log prefix to include timestamp and context
 */
function formatPrefix(level, context = {}) {
  const timestamp = new Date().toISOString();
  const tenantId = context.tenantId || 'no-tenant';
  return `[${timestamp}] [SERVER:${level}] [${tenantId}]`;
}

/**
 * Server logger instance with standard logging methods
 */
export const serverLogger = {
  /**
   * Log at DEBUG level
   */
  debug: (message, data, context = {}) => {
    const prefix = formatPrefix('DEBUG', context);
    if (data !== undefined) {
      console.debug(`${prefix} ${message}`, data);
    } else {
      console.debug(`${prefix} ${message}`);
    }
  },
  
  /**
   * Log at INFO level
   */
  info: (message, data, context = {}) => {
    const prefix = formatPrefix('INFO', context);
    if (data !== undefined) {
      console.info(`${prefix} ${message}`, data);
    } else {
      console.info(`${prefix} ${message}`);
    }
  },
  
  /**
   * Log at WARN level
   */
  warn: (message, data, context = {}) => {
    const prefix = formatPrefix('WARN', context);
    if (data !== undefined) {
      console.warn(`${prefix} ${message}`, data);
    } else {
      console.warn(`${prefix} ${message}`);
    }
  },
  
  /**
   * Log at ERROR level
   */
  error: (message, data, context = {}) => {
    const prefix = formatPrefix('ERROR', context);
    if (data !== undefined) {
      console.error(`${prefix} ${message}`, data);
    } else {
      console.error(`${prefix} ${message}`);
    }
  }
};

/**
 * Create a contextualized server logger with pre-bound context
 */
export function createContextualServerLogger(context = {}) {
  return {
    debug: (message, data) => serverLogger.debug(message, data, context),
    info: (message, data) => serverLogger.info(message, data, context),
    warn: (message, data) => serverLogger.warn(message, data, context),
    error: (message, data) => serverLogger.error(message, data, context)
  };
}

/**
 * Legacy function for backward compatibility with existing imports
 * Creates a logger with a namespace
 */
export function createServerLogger(namespace = 'API') {
  return {
    debug: (message, ...args) => serverLogger.debug(`[${namespace}] ${message}`, args.length ? args[0] : undefined),
    info: (message, ...args) => serverLogger.info(`[${namespace}] ${message}`, args.length ? args[0] : undefined),
    warn: (message, ...args) => serverLogger.warn(`[${namespace}] ${message}`, args.length ? args[0] : undefined),
    error: (message, ...args) => serverLogger.error(`[${namespace}] ${message}`, args.length ? args[0] : undefined),
    log: (message, ...args) => serverLogger.info(`[${namespace}] ${message}`, args.length ? args[0] : undefined)
  };
}

// Create a default server logger instance for compatibility with existing imports
export const logger = createServerLogger('API');

// Export individual functions directly from serverLogger for convenience
export const debug = serverLogger.debug;
export const info = serverLogger.info;
export const warn = serverLogger.warn;
export const error = serverLogger.error;

// For CommonJS compatibility
export default {
  serverLogger,
  logger,
  debug, 
  info,
  warn,
  error,
  createContextualServerLogger,
  createServerLogger
}; 