/**
 * Users API Client
 * 
 * Provides functions for interacting with the users API endpoints
 */

import axios from 'axios';
import { logger } from '@/utils/logger';
// Auth0 authentication is handled via useSession hook

/**
 * Create an axios instance for users API
 */
const usersApiClient = axios.create({
  baseURL: '/api/users',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add authentication token
usersApiClient.interceptors.request.use(
  async (config) => {
    try {
      // Try to get the auth session
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();
      
      if (idToken) {
        // Add the Authorization header with the token
        config.headers.Authorization = `Bearer ${idToken}`;
      }
      
      // Add dashboard route header for internal routing
      config.headers['X-Dashboard-Route'] = 'true';
      
      return config;
    } catch (error) {
      // If we can't get the token, proceed without it
      logger.warn('[UsersApi] Failed to get auth token:', error.message);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle errors
 */
usersApiClient.interceptors.response.use(
  response => response,
  error => {
    logger.error('[UsersApi] API error:', error.response?.status, error.message);
    return Promise.reject(new Error(`API error: ${error.response?.status || 'Network Error'} ${error.message}`));
  }
);

/**
 * Users API
 */
export const usersApi = {
  /**
   * Get users by tenant ID
   * 
   * @param {string} tenantId - The tenant ID to filter users by
   * @returns {Promise<Array>} - Array of user objects
   */
  async getUsersByTenantId(tenantId) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    
    try {
      logger.info(`[UsersApi] Fetching users for tenant ID: ${tenantId}`);
      const response = await usersApiClient.get(`/tenant?tenantId=${encodeURIComponent(tenantId)}`);
      return response.data.users || [];
    } catch (error) {
      logger.error(`[UsersApi] Error fetching users for tenant ID ${tenantId}:`, error);
      throw error;
    }
  },

  /**
   * Get current user profile
   * 
   * @returns {Promise<Object>} - User profile object
   */
  async getCurrentUser() {
    try {
      logger.info('[UsersApi] Fetching current user profile');
      const response = await usersApiClient.get('/profile');
      return response.data || null;
    } catch (error) {
      // If 401/403 don't log as error since it's expected when not authenticated
      if (error.response?.status === 401 || error.response?.status === 403) {
        logger.info('[UsersApi] User not authenticated for profile request');
      } else {
        logger.error('[UsersApi] Error fetching current user profile:', error);
      }
      return null;
    }
  }
};

export default usersApi; 