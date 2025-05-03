/**
 * Users API Client
 * 
 * Provides functions for interacting with the users API endpoints
 */

import axios from 'axios';
import { logger } from '@/utils/logger';

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
  }
};

export default usersApi; 