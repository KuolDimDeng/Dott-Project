/**
 * Server-side logger with configurable logging levels
 * This utility helps standardize logging across server components
 * while allowing for different verbosity based on environment
 */

// Environment-aware logging levels
const LOG_LEVELS = {
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4
};

// Default to INFO in production, DEBUG in development
const DEFAULT_LOG_LEVEL = process.env.NODE_ENV === 'production' 
  ? LOG_LEVELS.INFO 
  : LOG_LEVELS.DEBUG;

// Get current log level from environment or use default
const CURRENT_LOG_LEVEL = (() => {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  if (envLevel && LOG_LEVELS[envLevel]) {
    return LOG_LEVELS[envLevel];
  }
  return DEFAULT_LOG_LEVEL;
})();

/**
 * Create a server-side logger with context
 * 
 * @param {Object} context - Context information to include with logs
 * @returns {Object} Logger object with debug, info, warn, error methods
 */
export function createServerLogger(context = {}) {
  const timestamp = () => {
    return new Date().toISOString();
  };
  
  // Extract tenant ID for consistent logging
  const tenant = context.tenantId || 'no-tenant';
  const moduleName = context.module || '';
  const component = context.component || '';
  
  // Keep track of recently logged messages to prevent duplication
  const recentLogs = new Map();
  
  // Clear old log entries periodically
  setInterval(() => {
    const now = Date.now();
    recentLogs.forEach((timestamp, key) => {
      if (now - timestamp > 1000) { // Clear after 1 second
        recentLogs.delete(key);
      }
    });
  }, 60000); // Check and clear every minute
  
  // Create log function that prevents duplication
  const log = (level, message, data) => {
    // Skip logging if level is below current log level
    if (LOG_LEVELS[level] < CURRENT_LOG_LEVEL) {
      return;
    }
    
    // Create a key based on message and level to prevent repeated identical logs
    const logKey = `${level}:${message}:${JSON.stringify(data || '')}`;
    
    // Check if this exact message was logged recently
    const lastLogTime = recentLogs.get(logKey);
    if (lastLogTime && (Date.now() - lastLogTime < 1000)) {
      // Skip logging if the same message was logged less than 1 second ago
      return;
    }
    
    // Record this log
    recentLogs.set(logKey, Date.now());
    
    // Format prefix consistently
    const prefix = `[${timestamp()}] [SERVER:${level}] [${tenant}] ${moduleName ? `[${moduleName}]` : ''} ${component ? `[${component}]` : ''}`;
    
    // Perform actual logging
    switch(level) {
      case 'DEBUG':
        console.debug(`${prefix} ${message}`, data || '');
        break;
      case 'INFO':
        console.info(`${prefix} ${message}`, data || '');
        break;
      case 'WARN':
        console.warn(`${prefix} ${message}`, data || '');
        break;
      case 'ERROR':
        console.error(`${prefix} ${message}`, data || '');
        break;
    }
  };
  
  return {
    debug: (message, data) => log('DEBUG', message, data),
    info: (message, data) => log('INFO', message, data),
    warn: (message, data) => log('WARN', message, data),
    error: (message, data) => log('ERROR', message, data)
  };
} 