// logger.js

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    console.error(...args);
  },
  info: (...args) => {
    console.info(...args);
  }
};

export const UserMessage = {
  info: (...args) => {
    // This will be displayed in the user console
    console.info('USER_INFO:', ...args);
  },
  error: (...args) => {
    // This will be displayed in the user console
    console.error('USER_ERROR:', ...args);
  }
};