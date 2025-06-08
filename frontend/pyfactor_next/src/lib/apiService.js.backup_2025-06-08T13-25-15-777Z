'use client';

import axiosInstance from './axiosConfig';
import { logger } from '@/utils/logger';

/**
 * API service for making HTTP requests
 */
export const apiService = {
  /**
   * Get tenant information by ID
   * @param {string} tenantId - The tenant ID to fetch
   * @returns {Promise<Object>} - The tenant information
   */
  async getTenantInfo(tenantId) {
    try {
      if (!tenantId) {
        logger.warn('[apiService] No tenant ID provided to getTenantInfo');
        return null;
      }
      
      const response = await axiosInstance.get(`/api/tenants/${tenantId}`);
      return response.data;
    } catch (error) {
      // If the error is a 404, return null
      if (error.response && error.response.status === 404) {
        logger.warn(`[apiService] Tenant not found: ${tenantId}`);
        return null;
      }
      
      // For development, return mock data on API error
      logger.warn(`[apiService] Error fetching tenant info: ${error.message}. Using mock data.`);
      
      // Create a mock tenant for development purposes
      return {
        id: tenantId,
        name: `Business ${tenantId.substring(0, 8)}`,
        type: 'business',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  },
  
  /**
   * Get list of tenants for the current user
   * @returns {Promise<Array>} - List of tenants
   */
  async getUserTenants() {
    try {
      const response = await axiosInstance.get('/api/tenants');
      return response.data;
    } catch (error) {
      logger.warn(`[apiService] Error fetching user tenants: ${error.message}. Using mock data.`);
      
      // Return mock tenants for development
      return [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: '',
          type: 'business',
          status: 'active',
          isOwner: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
  }
};

export default apiService;