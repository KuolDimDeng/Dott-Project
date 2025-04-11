'use client';

/**
 * Logger utility for consistent application logging
 * Includes tenant context in logs for easier debugging
 */

import { getTenantId } from './tenantUtils';

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// Current log level - can be overridden with environment variables
let currentLogLevel = process.env.NODE_ENV === 'production' 
  ? LOG_LEVELS.INFO 
  : LOG_LEVELS.DEBUG;

// Allow log level to be set via localStorage for debugging
if (typeof window !== 'undefined') {
  try {
    const storedLogLevel = localStorage.getItem('logLevel');
    if (storedLogLevel && LOG_LEVELS[storedLogLevel] !== undefined) {
      currentLogLevel = LOG_LEVELS[storedLogLevel];
    }
  } catch (error) {
    console.error('Error reading log level from localStorage', error);
  }
}

// Message throttling mechanism to avoid excessive logs
const messageCache = new Map();
const MESSAGE_THROTTLE_INTERVAL = 5000; // 5 seconds

// Service Management specific throttling
const SERVICE_MANAGEMENT_THROTTLE_INTERVAL = 2000; // 2 seconds
const RENDERING_THROTTLE_INTERVAL = 1000; // 1 second for rendering logs

// Patterns for messages that should be heavily throttled
const THROTTLE_PATTERNS = [
  '[TenantUtils]',
  '[apiService] Added tenant headers',
  'Normalized subscription type',
  '[useSession]',
  'Session fetched successfully',
  '[Dashboard]',
  '[ServiceManagement] Rendering',
  '[ServiceManagement] Component mounted',
  '[ApiRequest] GET',
  'Fetching services',
  'with schema: tenant_',
  'with activeTab',
  'GET /api/'
];

/**
 * Should the message be logged based on throttling rules
 * @param {string} message - Message to check
 * @returns {boolean} - Whether to log the message
 */
function shouldLogMessage(message) {
  // Check if this message matches any throttle pattern
  let needsThrottling = false;
  let throttleInterval = MESSAGE_THROTTLE_INTERVAL;
  
  for (const pattern of THROTTLE_PATTERNS) {
    if (message.includes(pattern)) {
      needsThrottling = true;
      
      // Apply different throttle intervals based on pattern
      if (pattern.startsWith('[ServiceManagement] Rendering')) {
        throttleInterval = RENDERING_THROTTLE_INTERVAL;
      } else if (pattern.startsWith('[ServiceManagement]')) {
        throttleInterval = SERVICE_MANAGEMENT_THROTTLE_INTERVAL;
      } else if (pattern.startsWith('[ApiRequest]')) {
        throttleInterval = RENDERING_THROTTLE_INTERVAL;
      }
      
      break;
    }
  }
  
  // If it doesn't need throttling, log it
  if (!needsThrottling) {
    return true;
  }
  
  const now = Date.now();
  const lastLogTime = messageCache.get(message);
  
  // If this exact message hasn't been logged recently, allow it
  if (!lastLogTime || (now - lastLogTime) > throttleInterval) {
    messageCache.set(message, now);
    
    // Cleanup old messages from cache to prevent memory leaks
    if (messageCache.size > 100) {
      const oldMessages = [];
      messageCache.forEach((time, msg) => {
        if ((now - time) > throttleInterval) {
          oldMessages.push(msg);
        }
      });
      oldMessages.forEach(msg => messageCache.delete(msg));
    }
    
    return true;
  }
  
  return false;
}

/**
 * Format log messages with additional context
 */
function formatMessage(message) {
  try {
    const timestamp = new Date().toISOString();
    const tenantId = typeof window !== 'undefined' ? getTenantId() : 'server';
    return `[${timestamp}] [${tenantId || 'no-tenant'}] ${message}`;
  } catch (error) {
    return message; // Fallback to original message if formatting fails
  }
}

/**
 * Logger instance with methods for different log levels
 */
export const logger = {
  /**
   * Set the current log level
   * @param {string} level - One of DEBUG, INFO, WARN, ERROR, NONE
   */
  setLogLevel: (level) => {
    if (LOG_LEVELS[level] !== undefined) {
      currentLogLevel = LOG_LEVELS[level];
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('logLevel', level);
        } catch (error) {
          console.error('Error saving log level to localStorage', error);
        }
      }
      
      console.info(`Log level set to ${level}`);
    }
  },
  
  /**
   * Log at DEBUG level
   */
  debug: (message, data) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const formattedMessage = formatMessage(message);
      
      // Apply throttling for debug messages
      if (shouldLogMessage(formattedMessage)) {
        if (data !== undefined) {
          console.debug(formattedMessage, data);
        } else {
          console.debug(formattedMessage);
        }
      }
    }
  },
  
  /**
   * Log at INFO level
   */
  info: (message, data) => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const formattedMessage = formatMessage(message);
      
      // Apply some throttling for info messages too
      if (shouldLogMessage(formattedMessage)) {
        if (data !== undefined) {
          console.info(formattedMessage, data);
        } else {
          console.info(formattedMessage);
        }
      }
    }
  },
  
  /**
   * Log at WARN level
   */
  warn: (message, data) => {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      const formattedMessage = formatMessage(message);
      // Apply throttling for warnings that match patterns
      if (shouldLogMessage(formattedMessage)) {
        if (data !== undefined) {
          console.warn(formattedMessage, data);
        } else {
          console.warn(formattedMessage);
        }
      }
    }
  },
  
  /**
   * Log at ERROR level
   */
  error: (message, data) => {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      const formattedMessage = formatMessage(message);
      // Apply throttling for errors that match patterns
      if (shouldLogMessage(formattedMessage)) {
        if (data !== undefined) {
          console.error(formattedMessage, data);
        } else {
          console.error(formattedMessage);
        }
      }
    }
  }
};

/**
 * Create a server-side logger
 * Used for API routes
 */
export function createServerLogger(context = {}) {
  return {
    debug: (message, data) => {
      console.debug(`[SERVER] [${context.tenantId || 'no-tenant'}] ${message}`, data || '');
    },
    info: (message, data) => {
      console.info(`[SERVER] [${context.tenantId || 'no-tenant'}] ${message}`, data || '');
    },
    warn: (message, data) => {
      console.warn(`[SERVER] [${context.tenantId || 'no-tenant'}] ${message}`, data || '');
    },
    error: (message, data) => {
      console.error(`[SERVER] [${context.tenantId || 'no-tenant'}] ${message}`, data || '');
    }
  };
}
