import { api } from './api';
import { handleApiError } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';
import { getTenantId } from '@/utils/tenantUtils';

/**
 * Service for managing suppliers in the inventory system.
 * Provides methods for CRUD operations on suppliers.
 */
export const supplierService = {
  /**
   * Get all suppliers for the current tenant.
   * @returns {Promise<Array>} - List of suppliers
   */
  getSuppliers: async () => {
    try {
      // Get the tenant ID for this request
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error('[supplierService] No tenant ID available for supplier list request');
        return null;
      }

      const response = await api.get(`/inventory/suppliers/`, {
        headers: {
          'X-Tenant-ID': tenantId
        }
      });
      
      // Handle both response formats (response.data or direct response)
      return response.data || response;
    } catch (error) {
      handleApiError(error, 'Error fetching suppliers');
      throw error;
    }
  },

  /**
   * Get supplier by ID.
   * @param {string|number} id - The ID of the supplier to fetch
   * @returns {Promise<Object>} - The supplier data
   */
  getSupplier: async (id) => {
    try {
      // Get the tenant ID for this request
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error(`[supplierService] No tenant ID available for supplier ${id} fetch`);
        return null;
      }

      const response = await api.get(`/inventory/suppliers/${id}/`, {
        headers: {
          'X-Tenant-ID': tenantId
        }
      });
      
      // Handle both response formats (response.data or direct response)
      return response.data || response;
    } catch (error) {
      handleApiError(error, `Error fetching supplier ${id}`);
      throw error;
    }
  },

  /**
   * Create a new supplier.
   * @param {Object} supplier - The supplier data to create
   * @returns {Promise<Object>} - The created supplier
   */
  createSupplier: async (supplier) => {
    try {
      // Get the tenant ID for this request
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error('[supplierService] No tenant ID available for supplier creation');
        return null;
      }

      const response = await api.post('/inventory/suppliers/', supplier, {
        headers: {
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });
      
      // Handle both response formats (response.data or direct response)
      return response.data || response;
    } catch (error) {
      handleApiError(error, 'Error creating supplier');
      throw error;
    }
  },

  /**
   * Update an existing supplier.
   * @param {string|number} id - The ID of the supplier to update
   * @param {Object} supplier - The updated supplier data
   * @returns {Promise<Object>} - The updated supplier
   */
  updateSupplier: async (id, supplier) => {
    try {
      // Get the tenant ID for this request
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error(`[supplierService] No tenant ID available for supplier ${id} update`);
        return null;
      }

      const response = await api.put(`/inventory/suppliers/${id}/`, supplier, {
        headers: {
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });
      
      // Handle both response formats (response.data or direct response)
      return response.data || response;
    } catch (error) {
      handleApiError(error, `Error updating supplier ${id}`);
      throw error;
    }
  },

  /**
   * Delete a supplier.
   * @param {string|number} id - The ID of the supplier to delete
   * @returns {Promise<void>}
   */
  deleteSupplier: async (id) => {
    try {
      // Get the tenant ID for this request
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error(`[supplierService] No tenant ID available for supplier ${id} deletion`);
        return null;
      }

      await api.delete(`/inventory/suppliers/${id}/`, {
        headers: {
          'X-Tenant-ID': tenantId
        }
      });
    } catch (error) {
      handleApiError(error, `Error deleting supplier ${id}`);
      throw error;
    }
  }
}; 