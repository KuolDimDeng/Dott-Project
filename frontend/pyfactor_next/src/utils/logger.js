// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/utils/logger.js

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },
  log: (...args) => {
    if (isDevelopment) {
      console.log('[LOG]', ...args);
    }
  },
  warn: (...args) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },
  info: (...args) => {
    console.info('[INFO]', ...args);
  },
};

export const UserMessage = {
  info: (...args) => {
    // This will be displayed in the user console
    console.info('USER_INFO:', ...args);
  },
  error: (...args) => {
    // This will be displayed in the user console
    console.error('USER_ERROR:', ...args);
  },
};

export default logger;
