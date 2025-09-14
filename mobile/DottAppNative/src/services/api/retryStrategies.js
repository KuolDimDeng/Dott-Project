import Logger from '../logger/Logger';

class RetryStrategy {
  constructor(config = {}) {
    this.maxRetries = config.maxRetries || 3;
    this.backoffType = config.backoff || 'exponential';
    this.baseDelay = config.baseDelay || 1000;
    this.maxDelay = config.maxDelay || 30000;
    this.jitter = config.jitter !== false;
    this.retryCondition = config.retryCondition || this.defaultRetryCondition;
    this.beforeRetry = config.beforeRetry || null;
    this.isDev = __DEV__;
  }

  defaultRetryCondition(error) {
    // Don't retry client errors except specific ones
    if (error.response) {
      const status = error.response.status;

      // Never retry these
      if ([400, 401, 403, 404, 422].includes(status)) {
        return false;
      }

      // Always retry these
      if ([408, 429, 500, 502, 503, 504].includes(status)) {
        return true;
      }
    }

    // Retry network errors
    if (!error.response && error.message?.includes('Network')) {
      return true;
    }

    return false;
  }

  calculateDelay(attempt, error) {
    let delay;

    // Check for Retry-After header (rate limiting)
    if (error.response?.headers?.['retry-after']) {
      const retryAfter = error.response.headers['retry-after'];
      delay = isNaN(retryAfter)
        ? new Date(retryAfter).getTime() - Date.now()
        : parseInt(retryAfter) * 1000;

      if (this.isDev) {
        Logger.info('retry', `Using Retry-After header: ${delay}ms`);
      }
    } else {
      // Calculate delay based on strategy
      switch (this.backoffType) {
        case 'linear':
          delay = this.baseDelay * attempt;
          break;

        case 'exponential':
          delay = Math.min(this.baseDelay * Math.pow(2, attempt - 1), this.maxDelay);
          break;

        case 'fibonacci':
          delay = this.fibonacciDelay(attempt);
          break;

        default:
          delay = this.baseDelay;
      }
    }

    // Add jitter to prevent thundering herd
    if (this.jitter) {
      const jitterAmount = delay * 0.2 * Math.random();
      delay = delay + jitterAmount;
    }

    return Math.min(delay, this.maxDelay);
  }

  fibonacciDelay(attempt) {
    const fibonacci = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
    const index = Math.min(attempt - 1, fibonacci.length - 1);
    return this.baseDelay * fibonacci[index];
  }

  async shouldRetry(error, attempt) {
    if (attempt > this.maxRetries) {
      return false;
    }

    return this.retryCondition(error);
  }

  async execute(fn, context = {}) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        if (this.isDev && attempt > 1) {
          Logger.info('retry', `Attempt ${attempt}/${this.maxRetries + 1}`, {
            endpoint: context.endpoint
          });
        }

        const result = await fn();

        if (attempt > 1 && this.isDev) {
          Logger.success('retry', `Succeeded on attempt ${attempt}`);
        }

        return result;
      } catch (error) {
        lastError = error;

        // Check if we should retry
        const shouldRetry = await this.shouldRetry(error, attempt);

        if (!shouldRetry || attempt > this.maxRetries) {
          if (this.isDev) {
            Logger.error('retry', `Failed after ${attempt} attempt(s)`, {
              reason: !shouldRetry ? 'Not retryable' : 'Max retries exceeded'
            });
          }
          throw error;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, error);

        if (this.isDev) {
          Logger.warning('retry', `Will retry in ${delay}ms`, {
            attempt: `${attempt}/${this.maxRetries}`,
            status: error.response?.status,
            reason: error.message
          });
        }

        // Execute beforeRetry hook if provided
        if (this.beforeRetry) {
          await this.beforeRetry(error, attempt);
        }

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Predefined strategies for common scenarios
const RETRY_STRATEGIES = {
  // Network errors - aggressive retry
  NETWORK_ERROR: new RetryStrategy({
    maxRetries: 3,
    backoff: 'exponential',
    baseDelay: 1000,
    maxDelay: 10000,
    jitter: true,
    retryCondition: (error) => !error.response
  }),

  // Rate limiting - respect server limits
  RATE_LIMIT: new RetryStrategy({
    maxRetries: 5,
    backoff: 'exponential',
    baseDelay: 60000,
    maxDelay: 300000,
    jitter: false,
    retryCondition: (error) => error.response?.status === 429
  }),

  // Server errors - careful retry
  SERVER_ERROR: new RetryStrategy({
    maxRetries: 2,
    backoff: 'exponential',
    baseDelay: 2000,
    maxDelay: 10000,
    jitter: true,
    retryCondition: (error) => error.response?.status >= 500
  }),

  // Timeout - quick retry
  TIMEOUT: new RetryStrategy({
    maxRetries: 2,
    backoff: 'linear',
    baseDelay: 500,
    maxDelay: 2000,
    jitter: false,
    retryCondition: (error) => error.code === 'ECONNABORTED' || error.response?.status === 408
  }),

  // Authentication - single retry after refresh
  AUTH_ERROR: new RetryStrategy({
    maxRetries: 1,
    backoff: 'linear',
    baseDelay: 100,
    maxDelay: 100,
    jitter: false,
    retryCondition: (error) => error.response?.status === 401,
    beforeRetry: async () => {
      // This will be implemented with auth refresh logic
      if (__DEV__) {
        Logger.info('retry', 'Attempting token refresh before retry');
      }
    }
  }),

  // No retry - for non-retryable errors
  NO_RETRY: new RetryStrategy({
    maxRetries: 0,
    retryCondition: () => false
  }),

  // Custom aggressive retry for critical operations
  CRITICAL: new RetryStrategy({
    maxRetries: 5,
    backoff: 'fibonacci',
    baseDelay: 1000,
    maxDelay: 60000,
    jitter: true,
    retryCondition: (error) => {
      // Retry everything except 4xx client errors (except 429)
      if (error.response) {
        const status = error.response.status;
        return status >= 500 || status === 429 || status === 408;
      }
      return true; // Retry network errors
    }
  })
};

// Strategy selector based on error type
class RetryStrategySelector {
  static getStrategy(error, endpoint = '') {
    // Check if endpoint needs special handling
    if (endpoint.includes('/payments/') || endpoint.includes('/transactions/')) {
      return RETRY_STRATEGIES.CRITICAL;
    }

    // Select based on error type
    if (!error.response) {
      return RETRY_STRATEGIES.NETWORK_ERROR;
    }

    const status = error.response.status;

    if (status === 401) {
      return RETRY_STRATEGIES.AUTH_ERROR;
    }

    if (status === 429) {
      return RETRY_STRATEGIES.RATE_LIMIT;
    }

    if (status === 408 || error.code === 'ECONNABORTED') {
      return RETRY_STRATEGIES.TIMEOUT;
    }

    if (status >= 500) {
      return RETRY_STRATEGIES.SERVER_ERROR;
    }

    if (status >= 400 && status < 500) {
      return RETRY_STRATEGIES.NO_RETRY;
    }

    // Default strategy
    return RETRY_STRATEGIES.NETWORK_ERROR;
  }

  static createCustomStrategy(config) {
    return new RetryStrategy(config);
  }
}

export {
  RetryStrategy,
  RETRY_STRATEGIES,
  RetryStrategySelector
};