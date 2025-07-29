'use client';

import { logger } from '@/utils/logger';
import { fetchData, postData, putData, deleteData } from './apiService';
import { getTenantHeaders } from '@/utils/tenantUtils';

/**
 * MaterialsService - Service for managing materials and supplies
 * Materials are items used to create products or provide services
 */

// Cache configuration
const CACHE_CONFIG = {
  LIST_TTL: 3 * 60 * 1000,       // 3 minutes for list endpoints
  DETAIL_TTL: 5 * 60 * 1000,     // 5 minutes for detail endpoints
  STATS_TTL: 5 * 60 * 1000,      // 5 minutes for stats
};

/**
 * Get materials with optional filtering
 * @param {Object} options - Query options
 * @param {Object} fetchOptions - Fetch options
 * @returns {Promise<Object>} Paginated list of materials
 */
export const getMaterials = async (options = {}, fetchOptions = {}) => {
  try {
    const defaultFetchOptions = {
      useCache: true,
      cacheTTL: CACHE_CONFIG.LIST_TTL,
      handleErrors: true,
      timeout: 15000,
      notify: false,
    };

    const mergedOptions = { ...defaultFetchOptions, ...fetchOptions };
    logger.debug('Fetching materials with options:', { options, fetchOptions: mergedOptions });

    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Add filter parameters
    if (options.material_type) queryParams.append('material_type', options.material_type);
    if (options.is_active !== undefined) queryParams.append('is_active', options.is_active);
    if (options.is_billable !== undefined) queryParams.append('is_billable', options.is_billable);
    if (options.low_stock) queryParams.append('low_stock', 'true');
    if (options.search) queryParams.append('search', options.search);
    if (options.supplier) queryParams.append('supplier', options.supplier);
    if (options.ordering) queryParams.append('ordering', options.ordering);

    const url = queryParams.toString() ? `/inventory/materials/?${queryParams.toString()}` : '/inventory/materials/';
    
    const response = await fetchData(url, {
      ...mergedOptions,
      headers: {
        ...(mergedOptions.headers || {}),
        ...getTenantHeaders()
      }
    });

    if (response && (Array.isArray(response) || (response.results && Array.isArray(response.results)))) {
      logger.info(`Retrieved ${Array.isArray(response) ? response.length : response.results.length} materials`);
      return response;
    }

    logger.warn('Invalid response format from materials API:', response);
    throw new Error('Invalid response format from materials API');
  } catch (error) {
    logger.error('Error fetching materials:', error);
    throw error;
  }
};

/**
 * Get material statistics
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Material statistics
 */
export const getMaterialStats = async (options = {}) => {
  const defaultOptions = {
    useCache: true,
    cacheTTL: CACHE_CONFIG.STATS_TTL,
    fallbackData: {
      total_materials: 0,
      active_materials: 0,
      low_stock_count: 0,
      out_of_stock_count: 0,
      total_stock_value: 0,
      material_types: {}
    },
    ...options
  };
  
  try {
    const response = await fetchData('/inventory/materials/statistics/', {
      ...defaultOptions,
      headers: {
        ...(defaultOptions.headers || {}),
        ...getTenantHeaders()
      }
    });
    
    if (response && typeof response === 'object') {
      logger.info('Successfully retrieved material statistics');
      return response;
    }
    
    logger.warn('Invalid response format from stats API:', response);
    throw new Error('Invalid stats response format');
  } catch (error) {
    logger.error('Error fetching material stats:', error);
    return defaultOptions.fallbackData;
  }
};

/**
 * Get materials that are low on stock
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} List of low stock materials
 */
export const getLowStockMaterials = async (options = {}) => {
  try {
    const response = await fetchData('/inventory/materials/low_stock/', {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...getTenantHeaders()
      }
    });
    
    return response.results || response;
  } catch (error) {
    logger.error('Error fetching low stock materials:', error);
    throw error;
  }
};

/**
 * Get material by ID
 * @param {string} id - Material ID
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Material details
 */
export const getMaterialById = async (id, options = {}) => {
  if (!id) {
    logger.error('Material ID is required');
    return null;
  }
  
  const defaultOptions = {
    useCache: true,
    cacheTTL: CACHE_CONFIG.DETAIL_TTL,
    ...options
  };
  
  try {
    const response = await fetchData(`/inventory/materials/${id}/`, {
      ...defaultOptions,
      headers: {
        ...(defaultOptions.headers || {}),
        ...getTenantHeaders()
      }
    });
    
    if (response && typeof response === 'object') {
      logger.info(`Successfully retrieved material ${id}`);
      return response;
    }
    
    logger.warn(`Invalid response format for material ${id}:`, response);
    throw new Error('Invalid material response format');
  } catch (error) {
    logger.error(`Error fetching material ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new material
 * @param {Object} materialData - Material data
 * @returns {Promise<Object>} Created material
 */
export const createMaterial = async (materialData) => {
  try {
    logger.info('Creating material:', materialData);
    
    const response = await postData('/inventory/materials/', materialData, {
      headers: getTenantHeaders()
    });
    
    logger.info('Material created successfully:', response);
    return response;
  } catch (error) {
    logger.error('Error creating material:', error);
    throw error;
  }
};

/**
 * Update an existing material
 * @param {string} id - Material ID
 * @param {Object} materialData - Updated material data
 * @returns {Promise<Object>} Updated material
 */
export const updateMaterial = async (id, materialData) => {
  if (!id) {
    logger.error('Material ID is required for update');
    throw new Error('Material ID is required for update');
  }
  
  try {
    logger.info(`Updating material ${id}:`, materialData);
    
    const response = await putData(`/inventory/materials/${id}/`, materialData, {
      headers: getTenantHeaders()
    });
    
    return response;
  } catch (error) {
    logger.error(`Error updating material ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a material
 * @param {string} id - Material ID
 * @returns {Promise<void>}
 */
export const deleteMaterial = async (id) => {
  if (!id) {
    logger.error('Material ID is required for deletion');
    throw new Error('Material ID is required for deletion');
  }
  
  try {
    logger.info(`Deleting material ${id}`);
    
    await deleteData(`/inventory/materials/${id}/`, {
      headers: getTenantHeaders()
    });
    
    return true;
  } catch (error) {
    logger.error(`Error deleting material ${id}:`, error);
    throw error;
  }
};

/**
 * Update material stock
 * @param {string} id - Material ID
 * @param {Object} stockData - Stock update data
 * @returns {Promise<Object>} Updated material
 */
export const updateMaterialStock = async (id, stockData) => {
  try {
    logger.info(`Updating stock for material ${id}:`, stockData);
    
    const response = await postData(`/inventory/materials/${id}/update_stock/`, stockData, {
      headers: getTenantHeaders()
    });
    
    return response;
  } catch (error) {
    logger.error(`Error updating stock for material ${id}:`, error);
    throw error;
  }
};

/**
 * Use material for a job
 * @param {string} id - Material ID
 * @param {Object} usageData - Usage data including quantity and job_id
 * @returns {Promise<Object>} Response with updated material
 */
export const useMaterial = async (id, usageData) => {
  try {
    logger.info(`Using material ${id}:`, usageData);
    
    const response = await postData(`/inventory/materials/${id}/use_material/`, usageData, {
      headers: getTenantHeaders()
    });
    
    return response;
  } catch (error) {
    logger.error(`Error using material ${id}:`, error);
    throw error;
  }
};

/**
 * Get material transactions
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of transactions
 */
export const getMaterialTransactions = async (options = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (options.material) queryParams.append('material', options.material);
    if (options.transaction_type) queryParams.append('transaction_type', options.transaction_type);
    if (options.start_date) queryParams.append('start_date', options.start_date);
    if (options.end_date) queryParams.append('end_date', options.end_date);
    if (options.job) queryParams.append('job', options.job);
    
    const url = queryParams.toString() 
      ? `/inventory/material-transactions/?${queryParams.toString()}` 
      : '/inventory/material-transactions/';
    
    const response = await fetchData(url, {
      headers: getTenantHeaders()
    });
    
    return response.results || response;
  } catch (error) {
    logger.error('Error fetching material transactions:', error);
    throw error;
  }
};

/**
 * Export materials to CSV
 * @returns {Promise<Blob>} CSV file blob
 */
export const exportMaterialsToCSV = async () => {
  try {
    const response = await fetchData('/inventory/materials/export/', {
      responseType: 'blob',
      headers: getTenantHeaders()
    });
    
    return response;
  } catch (error) {
    logger.error('Error exporting materials:', error);
    throw error;
  }
};

// Export default object with all methods
export const materialsService = {
  getMaterials,
  getMaterialStats,
  getLowStockMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  updateMaterialStock,
  useMaterial,
  getMaterialTransactions,
  exportMaterialsToCSV
};

export default materialsService;