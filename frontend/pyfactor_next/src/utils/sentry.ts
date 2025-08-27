
// Stub implementations after Sentry removal

// Custom logger without Sentry
export const logger = {
  debug: (message: string, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(message, context);
    }
  },

  info: (message: string, context?: Record<string, any>) => {
    console.info(message, context);
  },

  warn: (message: string, context?: Record<string, any>) => {
    console.warn(message, context);
  },

  error: (message: string, error?: Error | unknown, context?: Record<string, any>) => {
    console.error(message, error, context);
  },
};

// Performance monitoring helpers (no-op)
export const startTransaction = (_name: string, _op?: string) => {
  // Return a transaction-like object for compatibility
  return {
    setStatus: (_status: string) => {},
    finish: () => {},
  };
};

export const measurePerformance = async <T>(
  _name: string,
  operation: () => Promise<T>,
  _context?: Record<string, any>
): Promise<T> => {
  try {
    const result = await operation();
    return result;
  } catch (error) {
    throw error;
  }
};

// User identification (no-op)
export const identifyUser = (_user: { id: string; email?: string; name?: string }) => {
  // No-op: Sentry removed
};

// Clear user on logout (no-op)
export const clearUser = () => {
  // No-op: Sentry removed
};

// Add custom context (no-op)
export const addContext = (_key: string, _context: Record<string, any>) => {
  // No-op: Sentry removed
};

// Track custom events (no-op)
export const trackEvent = (_eventName: string, _data?: Record<string, any>) => {
  // No-op: Sentry removed
};

// Capture feedback (no-op)
export const captureFeedback = (_feedback: {
  name?: string;
  email?: string;
  message: string;
}) => {
  // No-op: Sentry removed
};