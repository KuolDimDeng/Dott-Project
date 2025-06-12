/**
 * Network Retry Utilities
 * Implements exponential backoff and retry logic for network requests
 */

import { logger } from '@/utils/logger';

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504], // Timeout, Rate Limit, Server Errors
  retryableErrors: ['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET'],
  shouldRetry: null, // Custom function to determine if should retry
  onRetry: null, // Callback function called before each retry
  signal: null // AbortSignal for cancellation
};

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(attemptNumber, config) {
  const delay = Math.min(
    config.initialDelay * Math.pow(config.backoffMultiplier, attemptNumber - 1),
    config.maxDelay
  );
  
  // Add jitter to prevent thundering herd
  const jitter = delay * 0.1 * Math.random();
  return Math.floor(delay + jitter);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error, config) {
  // Check if custom shouldRetry function is provided
  if (config.shouldRetry && typeof config.shouldRetry === 'function') {
    return config.shouldRetry(error);
  }
  
  // Check for axios/fetch response errors
  if (error.response) {
    return config.retryableStatuses.includes(error.response.status);
  }
  
  // Check for network errors
  if (error.code) {
    return config.retryableErrors.includes(error.code);
  }
  
  // Check for specific error messages
  if (error.message) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('aborted') ||
      message.includes('failed to fetch')
    );
  }
  
  // Don't retry by default
  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main retry function
 */
export async function withRetry(fn, options = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  let lastError;
  
  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      // Check if operation was cancelled
      if (config.signal?.aborted) {
        throw new Error('Operation cancelled');
      }
      
      // Log attempt
      if (attempt > 1) {
        logger.debug(`[Retry] Attempt ${attempt} of ${config.maxRetries + 1}`);
      }
      
      // Execute the function
      const result = await fn();
      
      // Success - return result
      return result;
      
    } catch (error) {
      lastError = error;
      
      // Check if this is the last attempt
      if (attempt === config.maxRetries + 1) {
        logger.error('[Retry] Max retries exceeded', {
          attempts: attempt,
          error: error.message
        });
        throw error;
      }
      
      // Check if error is retryable
      if (!isRetryableError(error, config)) {
        logger.debug('[Retry] Non-retryable error encountered', {
          error: error.message,
          code: error.code,
          status: error.response?.status
        });
        throw error;
      }
      
      // Calculate delay
      const delay = calculateBackoffDelay(attempt, config);
      
      logger.info(`[Retry] Retrying after ${delay}ms`, {
        attempt,
        maxRetries: config.maxRetries,
        error: error.message,
        status: error.response?.status
      });
      
      // Call onRetry callback if provided
      if (config.onRetry && typeof config.onRetry === 'function') {
        try {
          await config.onRetry(error, attempt, delay);
        } catch (callbackError) {
          logger.error('[Retry] onRetry callback failed', callbackError);
        }
      }
      
      // Wait before next attempt
      await sleep(delay);
    }
  }
  
  // This should never be reached, but just in case
  throw lastError;
}

/**
 * Create a retry wrapper for axios instance
 */
export function createAxiosRetryInterceptor(axiosInstance, options = {}) {
  axiosInstance.interceptors.response.use(
    response => response,
    async error => {
      const config = error.config;
      
      // Initialize retry count
      if (!config._retryCount) {
        config._retryCount = 0;
      }
      
      // Check if we should retry
      const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options };
      if (
        config._retryCount >= retryConfig.maxRetries ||
        !isRetryableError(error, retryConfig)
      ) {
        return Promise.reject(error);
      }
      
      // Increment retry count
      config._retryCount++;
      
      // Calculate delay
      const delay = calculateBackoffDelay(config._retryCount, retryConfig);
      
      logger.info(`[Axios Retry] Retrying request after ${delay}ms`, {
        url: config.url,
        method: config.method,
        attempt: config._retryCount,
        maxRetries: retryConfig.maxRetries
      });
      
      // Wait and retry
      await sleep(delay);
      return axiosInstance(config);
    }
  );
}

/**
 * Retry wrapper for fetch requests
 */
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  return withRetry(
    async () => {
      const response = await fetch(url, options);
      
      // Check if response is ok
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.response = { status: response.status };
        throw error;
      }
      
      return response;
    },
    retryOptions
  );
}

/**
 * Create a retryable version of any async function
 */
export function makeRetryable(fn, defaultOptions = {}) {
  return async (...args) => {
    // Extract retry options if last argument is an object with _retryOptions
    let retryOptions = defaultOptions;
    const lastArg = args[args.length - 1];
    if (lastArg && typeof lastArg === 'object' && lastArg._retryOptions) {
      retryOptions = { ...defaultOptions, ...lastArg._retryOptions };
      args = args.slice(0, -1);
    }
    
    return withRetry(() => fn(...args), retryOptions);
  };
}

/**
 * Circuit breaker implementation for preventing cascading failures
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttemptTime = null;
  }
  
  async execute(fn) {
    // Check circuit state
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN');
      }
      // Try half-open
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
  }
  
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      logger.warn('[Circuit Breaker] Circuit opened due to excessive failures', {
        failures: this.failures,
        threshold: this.failureThreshold
      });
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }
}

// Export convenience functions
export const retryUtils = {
  withRetry,
  fetchWithRetry,
  makeRetryable,
  createAxiosRetryInterceptor,
  CircuitBreaker,
  DEFAULT_RETRY_CONFIG
};

export default retryUtils;