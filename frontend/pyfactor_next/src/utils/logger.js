const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args) => {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args);
    }
  },
  info: (...args) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args) => {
    // Always log errors, even in production
    console.error('[ERROR]', ...args);
  },
  log: (...args) => {
    if (isDevelopment) {
      console.log('[LOG]', ...args);
    }
  },
  group: (label) => {
    if (isDevelopment) {
      console.group(label);
    }
  },
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },
  table: (data) => {
    if (isDevelopment) {
      console.table(data);
    }
  },
  time: (label) => {
    if (isDevelopment) {
      console.time(label);
    }
  },
  timeEnd: (label) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },
};
