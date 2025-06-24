import { api } from './api';
import { handleApiError } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';
import { getTenantId } from '@/utils/tenantUtils';

/**
 * Service for managing locations/warehouses in the inventory system.
 * Provides methods for CRUD operations on locations.
 */
export const locationService = {
  /**
   * Get all locations for the current tenant.
   * @returns {Promise<Array>} - List of locations
   */
  getLocations: async () => {
    try {
      // Get the tenant ID for this request
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error('[locationService] No tenant ID available for location list request');
        return null;
      }

      const response = await api.get(`/inventory/locations/`, {
        headers: {
          'X-Tenant-ID': tenantId
        }
      });
      
      // Handle both response formats (response.data or direct response)
      return response.data || response;
    } catch (error) {
      handleApiError(error, 'Error fetching locations');
      throw error;
    }
  },

  /**
   * Get location by ID.
   * @param {string|number} id - The ID of the location to fetch
   * @returns {Promise<Object>} - The location data
   */
  getLocation: async (id) => {
    try {
      // Get the tenant ID for this request
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error(`[locationService] No tenant ID available for location ${id} fetch`);
        return null;
      }

      const response = await api.get(`/inventory/locations/${id}/`, {
        headers: {
          'X-Tenant-ID': tenantId
        }
      });
      
      // Handle both response formats (response.data or direct response)
      return response.data || response;
    } catch (error) {
      handleApiError(error, `Error fetching location ${id}`);
      throw error;
    }
  },

  /**
   * Create a new location.
   * @param {Object} location - The location data to create
   * @returns {Promise<Object>} - The created location
   */
  createLocation: async (location) => {
    try {
      // Get the tenant ID for this request
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error('[locationService] No tenant ID available for location creation');
        return null;
      }

      const response = await api.post('/inventory/locations/', location, {
        headers: {
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });
      
      // Handle both response formats (response.data or direct response)
      return response.data || response;
    } catch (error) {
      handleApiError(error, 'Error creating location');
      throw error;
    }
  },

  /**
   * Update an existing location.
   * @param {string|number} id - The ID of the location to update
   * @param {Object} location - The updated location data
   * @returns {Promise<Object>} - The updated location
   */
  updateLocation: async (id, location) => {
    try {
      // Get the tenant ID for this request
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error(`[locationService] No tenant ID available for location ${id} update`);
        return null;
      }

      const response = await api.put(`/inventory/locations/${id}/`, location, {
        headers: {
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });
      
      // Handle both response formats (response.data or direct response)
      return response.data || response;
    } catch (error) {
      handleApiError(error, `Error updating location ${id}`);
      throw error;
    }
  },

  /**
   * Delete a location.
   * @param {string|number} id - The ID of the location to delete
   * @returns {Promise<void>}
   */
  deleteLocation: async (id) => {
    try {
      // Get the tenant ID for this request
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error(`[locationService] No tenant ID available for location ${id} deletion`);
        return null;
      }

      await api.delete(`/inventory/locations/${id}/`, {
        headers: {
          'X-Tenant-ID': tenantId
        }
      });
    } catch (error) {
      handleApiError(error, `Error deleting location ${id}`);
      throw error;
    }
  }
};