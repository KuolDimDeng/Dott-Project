

// Custom logger with Sentry integration
export const logger = {
  debug: (message: string, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(message, context);
    }
    Sentry.addBreadcrumb({
      message,
      level: 'debug',
      data: context,
    });
  },

  info: (message: string, context?: Record<string, any>) => {
    console.info(message, context);
    Sentry.addBreadcrumb({
      message,
      level: 'info',
      data: context,
    });
  },

  warn: (message: string, context?: Record<string, any>) => {
    console.warn(message, context);
    Sentry.addBreadcrumb({
      message,
      level: 'warning',
      data: context,
    });
  },

  error: (message: string, error?: Error | unknown, context?: Record<string, any>) => {
    console.error(message, error, context);
    
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: {
          message,
          ...context,
        },
      });
    } else {
      Sentry.captureMessage(message, 'error');
    }
  },
};

// Performance monitoring helpers
export const startTransaction = (name: string, op: string = 'navigation') => {
  return Sentry.startSpan({
    name,
    op,
  }, () => {
    // Return a transaction-like object for compatibility
    return {
      setStatus: (status: string) => {},
      finish: () => {},
    };
  });
};

export const measurePerformance = async <T>(
  name: string,
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> => {
  return Sentry.startSpan(
    {
      name,
      op: 'function',
    },
    async () => {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    }
  );
};

// User identification
export const identifyUser = (user: { id: string; email?: string; name?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
};

// Clear user on logout
export const clearUser = () => {
  Sentry.setUser(null);
};

// Add custom context
export const addContext = (key: string, context: Record<string, any>) => {
  Sentry.setContext(key, context);
};

// Track custom events
export const trackEvent = (eventName: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message: eventName,
    category: 'custom',
    level: 'info',
    data,
  });
};

// Capture feedback
export const captureFeedback = (feedback: {
  name?: string;
  email?: string;
  message: string;
}) => {
  Sentry.captureMessage(`User Feedback: ${feedback.message}`, {
    level: 'info',
    user: {
      email: feedback.email,
      username: feedback.name,
    },
  });
};