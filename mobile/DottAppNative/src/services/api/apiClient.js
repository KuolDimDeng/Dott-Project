import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import ENV from '../../config/environment';
import Logger from '../logger/Logger';
import ErrorTracker from '../errorTracking/errorTracker';
import CorrelationManager from '../correlation/correlationManager';
import CircuitBreakerManager from '../resilience/circuitBreaker';
import { RetryStrategySelector } from './retryStrategies';
import CacheManager from '../cache/cacheManager';
import SecureStorage from '../secureStorage';

class ProductionAPIClient {
  constructor() {
    this.baseURL = ENV.apiUrl;
    this.isDev = __DEV__;
    this.requestsInProgress = new Map();

    // Initialize axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 15000, // 15 seconds for mobile
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Setup interceptors
    this.setupInterceptors();

    // Initialize services
    this.cache = CacheManager;
    this.circuitBreaker = CircuitBreakerManager;
    this.correlationManager = CorrelationManager;
    this.errorTracker = ErrorTracker;

    // Configuration
    this.config = {
      enableCircuitBreaker: true,
      enableRetry: true,
      enableCache: true,
      enableCorrelation: true,
      enableLogging: this.isDev,
      maxConcurrentRequests: 10
    };
  }

  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add correlation ID
        const correlationId = this.correlationManager.createCorrelationId();
        config.headers['X-Correlation-ID'] = correlationId;
        config.metadata = { correlationId, startTime: Date.now() };

        // Add authentication
        const sessionId = await SecureStorage.getSecureItem('sessionId');
        if (sessionId) {
          config.headers['Authorization'] = `Session ${sessionId}`;
        }

        // Add device info headers
        config.headers['X-Platform'] = 'mobile';
        config.headers['X-App-Version'] = '1.0.0'; // Get from your app config

        // Track request
        this.correlationManager.trackRequest(correlationId, {
          endpoint: config.url,
          method: config.method.toUpperCase()
        });

        // Log in development
        if (this.isDev) {
          Logger.api(config.method, config.url, config.data);
        }

        return config;
      },
      (error) => {
        if (this.isDev) {
          Logger.error('api-request', 'Request setup failed', error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const { correlationId, startTime } = response.config.metadata || {};
        const duration = Date.now() - startTime;

        // Complete correlation tracking
        this.correlationManager.completeRequest(correlationId, true, duration);

        // Log in development
        if (this.isDev) {
          Logger.api(
            response.config.method,
            response.config.url,
            null,
            { status: response.status, data: response.data }
          );
        }

        return response;
      },
      async (error) => {
        const { correlationId, startTime } = error.config?.metadata || {};
        const duration = Date.now() - startTime;

        // Complete correlation tracking
        if (correlationId) {
          this.correlationManager.completeRequest(correlationId, false, duration);
        }

        // Track error
        await this.errorTracker.track(error, {
          correlationId,
          endpoint: error.config?.url,
          method: error.config?.method
        });

        // Log in development
        if (this.isDev) {
          Logger.api(
            error.config?.method,
            error.config?.url,
            null,
            null,
            error
          );
        }

        return Promise.reject(error);
      }
    );
  }

  async request(config) {
    const endpoint = this.getEndpointKey(config);

    try {
      // Check network connectivity first
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        return this.handleOffline(config);
      }

      // Execute with circuit breaker
      if (this.config.enableCircuitBreaker) {
        return await this.circuitBreaker.execute(
          endpoint,
          () => this.executeRequest(config),
          () => this.handleCircuitOpen(config)
        );
      } else {
        return await this.executeRequest(config);
      }
    } catch (error) {
      return await this.handleError(error, config);
    }
  }

  async executeRequest(config) {
    const cacheKey = this.getCacheKey(config);

    // Check cache for GET requests
    if (config.method === 'GET' && this.config.enableCache) {
      const cached = await this.cache.get(cacheKey);
      if (cached && !config.skipCache) {
        if (this.isDev) {
          Logger.info('cache', 'Cache hit', {
            endpoint: config.url,
            age: `${cached.age}ms`
          });
        }
        return { data: cached.data, cached: true };
      }
    }

    // Execute with retry strategy
    const strategy = RetryStrategySelector.getStrategy(null, config.url);

    try {
      const response = await strategy.execute(
        () => this.client.request(config),
        { endpoint: config.url }
      );

      // Cache successful GET responses
      if (config.method === 'GET' && this.config.enableCache && response.data) {
        await this.cache.set(cacheKey, response.data, {
          ttl: config.cacheTTL || 300000 // 5 minutes default
        });
      }

      return response;
    } catch (error) {
      // Try to get appropriate retry strategy based on error
      const errorStrategy = RetryStrategySelector.getStrategy(error, config.url);

      if (errorStrategy !== strategy) {
        // Different strategy needed, try again
        return await errorStrategy.execute(
          () => this.client.request(config),
          { endpoint: config.url }
        );
      }

      throw error;
    }
  }

  async handleError(error, config) {
    const errorType = this.errorTracker.classifyError(error);

    if (this.isDev) {
      Logger.error('api-client', `Request failed: ${errorType}`, {
        endpoint: config.url,
        status: error.response?.status,
        message: error.message
      });
    }

    // Handle specific error types
    switch (errorType) {
      case 'UNAUTHORIZED':
        return await this.handleUnauthorized(error, config);

      case 'NOT_FOUND':
        return this.handleNotFound(error, config);

      case 'NETWORK_ERROR':
        return await this.handleNetworkError(error, config);

      case 'SERVER_ERROR':
        return await this.handleServerError(error, config);

      default:
        throw error;
    }
  }

  async handleUnauthorized(error, config) {
    // Try to refresh token once
    if (!config.retryAfterAuth) {
      if (this.isDev) {
        Logger.auth('Attempting token refresh');
      }

      try {
        // Implement your token refresh logic here
        // await AuthService.refreshToken();

        // Retry the request
        return await this.request({ ...config, retryAfterAuth: true });
      } catch (refreshError) {
        if (this.isDev) {
          Logger.error('auth', 'Token refresh failed', refreshError);
        }
        throw error;
      }
    }

    throw error;
  }

  handleNotFound(error, config) {
    if (this.isDev) {
      Logger.warning('api', 'Resource not found', {
        endpoint: config.url
      });
    }

    // Return null for GET requests, throw for others
    if (config.method === 'GET') {
      return { data: null, notFound: true };
    }

    throw error;
  }

  async handleNetworkError(error, config) {
    if (this.isDev) {
      Logger.network('offline', { endpoint: config.url });
    }

    // Try to get from cache
    if (config.method === 'GET' && this.config.enableCache) {
      const cacheKey = this.getCacheKey(config);
      const cached = await this.cache.get(cacheKey, { allowStale: true });

      if (cached) {
        if (this.isDev) {
          Logger.info('cache', 'Using stale cache due to network error');
        }
        return { data: cached.data, stale: true, offline: true };
      }
    }

    // Queue for later if configured
    if (config.queueIfOffline) {
      // Implement offline queue logic here
      return { queued: true, offline: true };
    }

    throw error;
  }

  async handleServerError(error, config) {
    if (this.isDev) {
      Logger.error('server', 'Server error', {
        endpoint: config.url,
        status: error.response?.status
      });
    }

    // Try cache for GET requests
    if (config.method === 'GET' && this.config.enableCache) {
      const cacheKey = this.getCacheKey(config);
      const cached = await this.cache.get(cacheKey, { allowStale: true });

      if (cached) {
        if (this.isDev) {
          Logger.info('cache', 'Using cache due to server error');
        }
        return { data: cached.data, stale: true, serverError: true };
      }
    }

    throw error;
  }

  async handleOffline(config) {
    if (this.isDev) {
      Logger.network('offline', 'No network connection');
    }

    // Check cache for GET requests
    if (config.method === 'GET' && this.config.enableCache) {
      const cacheKey = this.getCacheKey(config);
      const cached = await this.cache.get(cacheKey, { allowStale: true });

      if (cached) {
        return { data: cached.data, offline: true, cached: true };
      }
    }

    // Queue for later if configured
    if (config.queueIfOffline) {
      // Implement offline queue
      return { queued: true, offline: true };
    }

    throw new Error('No network connection');
  }

  async handleCircuitOpen(config) {
    if (this.isDev) {
      Logger.warning('circuit', 'Circuit breaker open', {
        endpoint: config.url
      });
    }

    // Try cache
    if (config.method === 'GET' && this.config.enableCache) {
      const cacheKey = this.getCacheKey(config);
      const cached = await this.cache.get(cacheKey, { allowStale: true });

      if (cached) {
        return { data: cached.data, circuitOpen: true, cached: true };
      }
    }

    throw new Error('Service temporarily unavailable');
  }

  // Helper methods
  getEndpointKey(config) {
    const url = new URL(config.url, this.baseURL);
    return `${config.method}:${url.pathname}`;
  }

  getCacheKey(config) {
    const url = new URL(config.url, this.baseURL);
    const params = config.params ? JSON.stringify(config.params) : '';
    return `${config.method}:${url.pathname}:${params}`;
  }

  // Public API methods
  async get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  }

  async post(url, data, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  }

  async put(url, data, config = {}) {
    return this.request({ ...config, method: 'PUT', url, data });
  }

  async patch(url, data, config = {}) {
    return this.request({ ...config, method: 'PATCH', url, data });
  }

  async delete(url, config = {}) {
    return this.request({ ...config, method: 'DELETE', url });
  }

  // Development helpers
  showStatistics() {
    if (!this.isDev) return;

    Logger.group('📊 API Client Statistics', () => {
      // Correlation stats
      const correlationStats = this.correlationManager.getStatistics();
      Logger.info('correlation', 'Request Statistics', correlationStats);

      // Circuit breaker stats
      this.circuitBreaker.showStatus();

      // Error stats
      this.errorTracker.showSummary();

      // Active requests
      this.correlationManager.showActiveRequests();
    });
  }

  // Configuration methods
  updateConfig(config) {
    this.config = { ...this.config, ...config };

    if (this.isDev) {
      Logger.info('config', 'API client configuration updated', this.config);
    }
  }

  resetCircuitBreakers() {
    this.circuitBreaker.resetAll();
  }
}

// Create and export singleton instance
const apiClient = new ProductionAPIClient();

// Export for use in other services
export default apiClient;

// Also export the class for testing or multiple instances
export { ProductionAPIClient };