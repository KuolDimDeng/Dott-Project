
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
export const startTransaction = (name: string, op: string = 'navigation') => {
  // Return a transaction-like object for compatibility
  return {
    setStatus: (status: string) => {},
    finish: () => {},
  };
};

export const measurePerformance = async <T>(
  name: string,
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> => {
  try {
    const result = await operation();
    return result;
  } catch (error) {
    throw error;
  }
};

// User identification (no-op)
export const identifyUser = (user: { id: string; email?: string; name?: string }) => {
  // No-op: Sentry removed
};

// Clear user on logout (no-op)
export const clearUser = () => {
  // No-op: Sentry removed
};

// Add custom context (no-op)
export const addContext = (key: string, context: Record<string, any>) => {
  // No-op: Sentry removed
};

// Track custom events (no-op)
export const trackEvent = (eventName: string, data?: Record<string, any>) => {
  // No-op: Sentry removed
};

// Capture feedback (no-op)
export const captureFeedback = (feedback: {
  name?: string;
  email?: string;
  message: string;
}) => {
  // No-op: Sentry removed
};