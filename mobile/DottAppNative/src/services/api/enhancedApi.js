/**
 * Enhanced API service that wraps the existing api.js with production-ready error handling
 * This maintains backward compatibility while adding resilience features
 */

import api from '../api'; // Your existing API
import apiClient from './apiClient'; // New production client
import Logger from '../logger/Logger';
import ErrorTracker from '../errorTracking/errorTracker';
import Toast from 'react-native-toast-message';

class EnhancedAPI {
  constructor() {
    this.isDev = __DEV__;
    this.useNewClient = false; // Feature flag to switch between old and new
    this.errorHandling = {
      show404Toast: true,
      show401Toast: true,
      showNetworkToast: true,
      autoRetry: true
    };
  }

  /**
   * Wrapper that adds error handling to existing API calls
   * Maintains backward compatibility while adding resilience
   */
  async makeRequest(requestFn, options = {}) {
    const {
      showErrorToast = true,
      fallbackData = null,
      retryOnFailure = this.errorHandling.autoRetry,
      cacheKey = null,
      cacheTTL = 300000
    } = options;

    try {
      // Use new client if enabled
      if (this.useNewClient && options.method) {
        return await apiClient.request({
          method: options.method,
          url: options.url,
          data: options.data,
          params: options.params,
          cacheTTL,
          skipCache: options.skipCache
        });
      }

      // Use existing API with enhanced error handling
      const response = await requestFn();

      // Track success
      if (this.isDev) {
        Logger.success('api', 'Request successful', {
          url: options.url || 'unknown'
        });
      }

      return response;

    } catch (error) {
      // Enhanced error handling
      return await this.handleError(error, {
        ...options,
        showErrorToast,
        fallbackData,
        retryOnFailure,
        originalRequest: requestFn
      });
    }
  }

  async handleError(error, options) {
    const { showErrorToast, fallbackData, retryOnFailure, originalRequest } = options;

    // Track the error
    await ErrorTracker.track(error, {
      endpoint: options.url,
      method: options.method
    });

    // Classify error
    const errorType = this.classifyError(error);

    if (this.isDev) {
      Logger.error('api', `API Error: ${errorType}`, {
        status: error.response?.status,
        message: error.message,
        endpoint: options.url
      });
    }

    // Handle based on error type
    switch (errorType) {
      case 'NOT_FOUND':
        return this.handle404(error, options);

      case 'UNAUTHORIZED':
        return this.handle401(error, options);

      case 'NETWORK_ERROR':
        return this.handleNetworkError(error, options);

      case 'SERVER_ERROR':
        return this.handleServerError(error, options);

      case 'VALIDATION_ERROR':
        return this.handleValidationError(error, options);

      default:
        if (showErrorToast) {
          this.showErrorToast('Something went wrong', error.message);
        }
        throw error;
    }
  }

  classifyError(error) {
    if (!error.response) {
      return 'NETWORK_ERROR';
    }

    const status = error.response.status;
    if (status === 404) return 'NOT_FOUND';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 422) return 'VALIDATION_ERROR';
    if (status === 429) return 'RATE_LIMITED';
    if (status >= 500) return 'SERVER_ERROR';

    return 'UNKNOWN';
  }

  handle404(error, options) {
    const { showErrorToast, fallbackData } = options;

    if (this.isDev) {
      Logger.warning('api', '404 - Resource not found', {
        endpoint: options.url,
        returning: fallbackData !== null ? 'fallback data' : 'null'
      });
    }

    if (showErrorToast && this.errorHandling.show404Toast) {
      this.showErrorToast('Not Found', 'The item you\'re looking for doesn\'t exist');
    }

    // Return fallback data instead of throwing
    if (fallbackData !== undefined) {
      return { data: fallbackData, notFound: true };
    }

    // For GET requests, return null instead of throwing
    if (options.method === 'GET' || options.method === 'get') {
      return { data: null, notFound: true };
    }

    throw error;
  }

  async handle401(error, options) {
    const { showErrorToast, retryOnFailure, originalRequest } = options;

    if (this.isDev) {
      Logger.warning('api', '401 - Unauthorized', {
        endpoint: options.url,
        willRetry: retryOnFailure
      });
    }

    // Try to refresh token once
    if (retryOnFailure && !options.isRetry) {
      try {
        // TODO: Implement your token refresh logic
        // await AuthService.refreshToken();

        // Retry the original request
        if (originalRequest) {
          const retryOptions = { ...options, isRetry: true };
          return await this.makeRequest(originalRequest, retryOptions);
        }
      } catch (refreshError) {
        if (this.isDev) {
          Logger.error('auth', 'Token refresh failed', refreshError);
        }
      }
    }

    if (showErrorToast && this.errorHandling.show401Toast) {
      this.showErrorToast('Session Expired', 'Please sign in again');
    }

    // The existing interceptor will handle clearing session
    throw error;
  }

  async handleNetworkError(error, options) {
    const { showErrorToast, fallbackData, retryOnFailure, originalRequest } = options;

    if (this.isDev) {
      Logger.network('offline', {
        endpoint: options.url,
        willRetry: retryOnFailure
      });
    }

    // Retry with exponential backoff
    if (retryOnFailure && !options.retryCount) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await this.sleep(Math.pow(2, attempt) * 1000); // 2s, 4s, 8s

          if (this.isDev) {
            Logger.info('retry', `Retry attempt ${attempt}/3`);
          }

          const retryOptions = { ...options, retryCount: attempt };
          return await this.makeRequest(originalRequest, retryOptions);
        } catch (retryError) {
          if (attempt === 3) {
            break; // Max retries reached
          }
        }
      }
    }

    if (showErrorToast && this.errorHandling.showNetworkToast) {
      this.showErrorToast('Connection Error', 'Please check your internet connection');
    }

    // Return fallback data if available
    if (fallbackData !== undefined) {
      return { data: fallbackData, offline: true };
    }

    throw error;
  }

  async handleServerError(error, options) {
    const { showErrorToast, fallbackData, retryOnFailure, originalRequest } = options;

    if (this.isDev) {
      Logger.error('server', 'Server error', {
        endpoint: options.url,
        status: error.response?.status
      });
    }

    // Retry once for server errors
    if (retryOnFailure && !options.isRetry) {
      await this.sleep(2000); // Wait 2 seconds

      try {
        const retryOptions = { ...options, isRetry: true };
        return await this.makeRequest(originalRequest, retryOptions);
      } catch (retryError) {
        // Fall through to error handling
      }
    }

    if (showErrorToast) {
      this.showErrorToast('Server Error', 'Something went wrong on our end. Please try again later.');
    }

    if (fallbackData !== undefined) {
      return { data: fallbackData, serverError: true };
    }

    throw error;
  }

  handleValidationError(error, options) {
    const { showErrorToast } = options;
    const validationErrors = error.response?.data?.errors || {};

    if (this.isDev) {
      Logger.warning('validation', 'Validation error', validationErrors);
    }

    if (showErrorToast) {
      const firstError = Object.values(validationErrors)[0];
      const message = Array.isArray(firstError) ? firstError[0] : firstError;
      this.showErrorToast('Validation Error', message || 'Please check your input');
    }

    throw error;
  }

  showErrorToast(title, message) {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 60
    });
  }

  showSuccessToast(title, message) {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 60
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods that wrap common API calls
  async get(url, options = {}) {
    return this.makeRequest(
      () => api.get(url, options),
      { ...options, method: 'GET', url }
    );
  }

  async post(url, data, options = {}) {
    return this.makeRequest(
      () => api.post(url, data, options),
      { ...options, method: 'POST', url, data }
    );
  }

  async put(url, data, options = {}) {
    return this.makeRequest(
      () => api.put(url, data, options),
      { ...options, method: 'PUT', url, data }
    );
  }

  async patch(url, data, options = {}) {
    return this.makeRequest(
      () => api.patch(url, data, options),
      { ...options, method: 'PATCH', url, data }
    );
  }

  async delete(url, options = {}) {
    return this.makeRequest(
      () => api.delete(url, options),
      { ...options, method: 'DELETE', url }
    );
  }

  // Enable/disable features
  setErrorHandling(config) {
    this.errorHandling = { ...this.errorHandling, ...config };
  }

  // Switch to new production client
  enableProductionClient() {
    this.useNewClient = true;
    if (this.isDev) {
      Logger.info('api', 'Switched to production API client');
    }
  }

  // Development helpers
  showStatistics() {
    if (!this.isDev) return;

    ErrorTracker.showSummary();
  }
}

// Create singleton instance
const enhancedAPI = new EnhancedAPI();

// Export for use in services
export default enhancedAPI;

// Also export the existing api for backward compatibility
export { api };