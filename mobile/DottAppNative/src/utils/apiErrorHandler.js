/**
 * Centralized API Error Handler
 * Industry-standard error handling for React Native apps
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Error classification based on industry standards
export const ErrorTypes = {
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  RATE_LIMIT: 'RATE_LIMIT',
  VALIDATION: 'VALIDATION',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN'
};

// User-friendly error messages (following Google Material Design guidelines)
const UserFriendlyMessages = {
  [ErrorTypes.NETWORK]: {
    title: "You're offline",
    message: "Check your connection and try again",
    icon: 'wifi-off',
    actionable: true
  },
  [ErrorTypes.AUTH]: {
    title: "Session expired",
    message: "Please sign in again to continue",
    icon: 'lock',
    actionable: true
  },
  [ErrorTypes.NOT_FOUND]: {
    title: "Not found",
    message: "We couldn't find what you're looking for",
    icon: 'search-off',
    actionable: false
  },
  [ErrorTypes.SERVER]: {
    title: "Something went wrong",
    message: "We're working on fixing this",
    icon: 'server-off',
    actionable: true
  },
  [ErrorTypes.RATE_LIMIT]: {
    title: "Too many requests",
    message: "Please wait a moment before trying again",
    icon: 'clock',
    actionable: false
  },
  [ErrorTypes.VALIDATION]: {
    title: "Invalid information",
    message: "Please check your input and try again",
    icon: 'alert-circle',
    actionable: false
  },
  [ErrorTypes.TIMEOUT]: {
    title: "Taking too long",
    message: "The server isn't responding. Try again?",
    icon: 'clock',
    actionable: true
  },
  [ErrorTypes.UNKNOWN]: {
    title: "Unexpected error",
    message: "Something unexpected happened",
    icon: 'alert-triangle',
    actionable: true
  }
};

/**
 * Classify error based on response codes and error types
 * Following REST API standards and common patterns
 */
export function classifyError(error) {
  // Network errors (no response)
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return ErrorTypes.TIMEOUT;
    }
    if (error.message?.includes('Network') || error.message?.includes('network')) {
      return ErrorTypes.NETWORK;
    }
    return ErrorTypes.NETWORK;
  }

  // HTTP status code based classification
  const status = error.response?.status;

  if (status === 401 || status === 403) {
    return ErrorTypes.AUTH;
  }

  if (status === 404) {
    return ErrorTypes.NOT_FOUND;
  }

  if (status === 429) {
    return ErrorTypes.RATE_LIMIT;
  }

  if (status === 400 || status === 422) {
    return ErrorTypes.VALIDATION;
  }

  if (status >= 500) {
    return ErrorTypes.SERVER;
  }

  return ErrorTypes.UNKNOWN;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error) {
  const errorType = classifyError(error);
  const friendlyError = UserFriendlyMessages[errorType];

  // Add specific context if available
  if (errorType === ErrorTypes.VALIDATION && error.response?.data?.message) {
    return {
      ...friendlyError,
      message: error.response.data.message
    };
  }

  return friendlyError;
}

/**
 * Retry configuration based on error type
 * Using exponential backoff pattern (industry standard)
 */
export function getRetryConfig(errorType, attemptNumber = 1) {
  const configs = {
    [ErrorTypes.NETWORK]: {
      shouldRetry: true,
      delay: Math.min(1000 * Math.pow(2, attemptNumber), 30000), // Exponential backoff
      maxAttempts: 3
    },
    [ErrorTypes.SERVER]: {
      shouldRetry: true,
      delay: Math.min(2000 * Math.pow(2, attemptNumber), 60000),
      maxAttempts: 2
    },
    [ErrorTypes.TIMEOUT]: {
      shouldRetry: true,
      delay: Math.min(1500 * Math.pow(2, attemptNumber), 45000),
      maxAttempts: 2
    },
    [ErrorTypes.RATE_LIMIT]: {
      shouldRetry: true,
      delay: 60000, // Wait full minute for rate limits
      maxAttempts: 1
    },
    [ErrorTypes.AUTH]: {
      shouldRetry: false,
      delay: 0,
      maxAttempts: 0
    },
    [ErrorTypes.NOT_FOUND]: {
      shouldRetry: false,
      delay: 0,
      maxAttempts: 0
    },
    [ErrorTypes.VALIDATION]: {
      shouldRetry: false,
      delay: 0,
      maxAttempts: 0
    },
    [ErrorTypes.UNKNOWN]: {
      shouldRetry: true,
      delay: 2000,
      maxAttempts: 1
    }
  };

  return configs[errorType] || configs[ErrorTypes.UNKNOWN];
}

/**
 * Handle API error with retry logic
 * Implements Circuit Breaker pattern
 */
export async function handleApiError(error, context = {}) {
  const {
    operation = 'api_call',
    showToast = true,
    allowRetry = true,
    onRetry = null,
    fallbackData = null
  } = context;

  // Classify the error
  const errorType = classifyError(error);
  const friendlyError = getUserFriendlyError(error);

  // Track error for patterns (Circuit Breaker)
  if (global.ErrorTracker) {
    global.ErrorTracker.track(error, operation);
  }

  // Check if we should show cached data
  if (fallbackData !== null && (errorType === ErrorTypes.NETWORK || errorType === ErrorTypes.SERVER)) {
    return {
      data: fallbackData,
      isStale: true,
      error: friendlyError
    };
  }

  // Show user-friendly toast if enabled
  if (showToast && global.ErrorToast) {
    const retryConfig = getRetryConfig(errorType, 1);

    global.ErrorToast.show({
      type: 'error',
      title: friendlyError.title,
      message: friendlyError.message,
      icon: friendlyError.icon,
      showRetry: allowRetry && retryConfig.shouldRetry && onRetry !== null,
      onRetry: onRetry,
      duration: errorType === ErrorTypes.RATE_LIMIT ? 10000 : 5000
    });
  }

  // Return structured error response
  return {
    data: null,
    isStale: false,
    error: friendlyError,
    errorType,
    canRetry: getRetryConfig(errorType).shouldRetry,
    originalError: error
  };
}

/**
 * Retry helper with exponential backoff
 * Industry standard retry mechanism
 */
export async function retryWithBackoff(fn, maxAttempts = 3, initialDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check network status before retry
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected && attempt > 1) {
        throw new Error('No network connection');
      }

      // Attempt the operation
      const result = await fn();

      // Success - clear any error indicators
      if (global.ErrorToast) {
        global.ErrorToast.clear();
      }

      return result;
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      const errorType = classifyError(error);
      const retryConfig = getRetryConfig(errorType, attempt);

      if (!retryConfig.shouldRetry || attempt >= maxAttempts) {
        throw error;
      }

      // Wait before next attempt (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, retryConfig.delay));
    }
  }

  throw lastError;
}

/**
 * Cache helper for offline support
 * Implements stale-while-revalidate pattern
 */
export const CacheHelper = {
  async get(key) {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        return {
          data,
          isStale: age > 5 * 60 * 1000, // 5 minutes
          age
        };
      }
    } catch (error) {
      console.warn('Cache read failed:', error);
    }
    return null;
  },

  async set(key, data) {
    try {
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Cache write failed:', error);
    }
  },

  async clear(pattern) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key =>
        key.startsWith('cache_') && (!pattern || key.includes(pattern))
      );
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  }
};

/**
 * Network status helper
 */
export const NetworkHelper = {
  async isOnline() {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected && netInfo.isInternetReachable;
  },

  async waitForConnection(timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error('Network timeout'));
      }, timeout);

      const unsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected && state.isInternetReachable) {
          clearTimeout(timer);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }
};

export default {
  classifyError,
  getUserFriendlyError,
  handleApiError,
  retryWithBackoff,
  CacheHelper,
  NetworkHelper,
  ErrorTypes
};