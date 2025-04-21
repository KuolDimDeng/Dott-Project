/**
 * API client service for making HTTP requests to backend services
 * Provides a standardized interface for all API calls in the application
 */

import { apiRequest } from '@/utils/apiHelpers';
import { logger } from '@/utils/logger';

/**
 * Handle API errors in a consistent way
 * @param {Error} error - The error from axios or API call
 * @param {string} message - Error message context
 */
const handleError = (error, message) => {
  logger.error(`API Error: ${message}`, error);
  throw error;
};

/**
 * API client for making HTTP requests
 */
export const api = {
  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response data
   */
  get: async (endpoint, options = {}) => {
    try {
      return apiRequest('GET', endpoint, null, options);
    } catch (error) {
      handleError(error, `GET ${endpoint} failed`);
    }
  },

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response data
   */
  post: async (endpoint, data, options = {}) => {
    try {
      return apiRequest('POST', endpoint, data, options);
    } catch (error) {
      handleError(error, `POST ${endpoint} failed`);
    }
  },

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response data
   */
  put: async (endpoint, data, options = {}) => {
    try {
      return apiRequest('PUT', endpoint, data, options);
    } catch (error) {
      handleError(error, `PUT ${endpoint} failed`);
    }
  },

  /**
   * Make a PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response data
   */
  patch: async (endpoint, data, options = {}) => {
    try {
      return apiRequest('PATCH', endpoint, data, options);
    } catch (error) {
      handleError(error, `PATCH ${endpoint} failed`);
    }
  },

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response data
   */
  delete: async (endpoint, options = {}) => {
    try {
      return apiRequest('DELETE', endpoint, null, options);
    } catch (error) {
      handleError(error, `DELETE ${endpoint} failed`);
    }
  }
};

export default api; 