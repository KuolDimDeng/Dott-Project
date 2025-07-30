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
 * Get materials with optional filtering - DEBUG VERSION
 * @param {Object} options - Query options
 * @param {Object} fetchOptions - Fetch options
 * @returns {Promise<Object>} Paginated list of materials
 */
export const getMaterials = async (options = {}, fetchOptions = {}) => {
  console.log('🔍 [DEBUG] === getMaterials START ===');
  console.log('🔍 [DEBUG] Input options:', JSON.stringify(options, null, 2));
  console.log('🔍 [DEBUG] Input fetchOptions:', JSON.stringify(fetchOptions, null, 2));
  
  try {
    const defaultFetchOptions = {
      useCache: true,
      cacheTTL: CACHE_CONFIG.LIST_TTL,
      handleErrors: true,
      timeout: 15000,
      notify: false,
    };

    const mergedOptions = { ...defaultFetchOptions, ...fetchOptions };
    console.log('🔍 [DEBUG] Merged options:', JSON.stringify(mergedOptions, null, 2));
    
    // Debug session/auth status
    console.log('🔍 [DEBUG] Checking session status...');
    if (typeof window !== 'undefined') {
      const cookies = document.cookie;
      console.log('🔍 [DEBUG] Browser cookies:', cookies);
      const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('sid='));
      console.log('🔍 [DEBUG] Session cookie:', sessionCookie ? 'Present' : 'Missing');
    }
    
    // Debug tenant headers
    const tenantHeaders = getTenantHeaders();
    console.log('🔍 [DEBUG] Tenant headers:', JSON.stringify(tenantHeaders, null, 2));

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

    const url = queryParams.toString() ? `/inventory/materials?${queryParams.toString()}` : '/inventory/materials';
    console.log('🔍 [DEBUG] Final URL:', url);
    console.log('🔍 [DEBUG] Query params:', queryParams.toString());
    
    // CRITICAL: Use rethrow option to see actual API errors
    const debugFetchOptions = {
      ...mergedOptions,
      // Force errors to be thrown instead of returning null
      rethrow: true,
      // Enable detailed error logging
      showErrorNotification: true,
      headers: {
        ...(mergedOptions.headers || {}),
        ...getTenantHeaders()
      }
    };
    
    console.log('🔍 [DEBUG] About to call fetchData with options:', JSON.stringify(debugFetchOptions, null, 2));
    console.log('🔍 [DEBUG] Making API request to:', url);
    
    const response = await fetchData(url, debugFetchOptions);
    
    console.log('🔍 [DEBUG] Raw API response received:', {
      type: typeof response,
      isNull: response === null,
      isUndefined: response === undefined,
      isArray: Array.isArray(response),
      hasResults: response && response.results !== undefined,
      keys: response ? Object.keys(response) : 'N/A'
    });
    
    if (response) {
      console.log('🔍 [DEBUG] Response details:', JSON.stringify(response, null, 2));
    } else {
      console.log('🔍 [DEBUG] Response is null/undefined - this indicates API failure');
      // This should not happen with rethrow: true, but let's check anyway
      throw new Error('API returned null response - check network/backend logs');
    }

    // Validate response format
    const isValidArray = Array.isArray(response);
    const isValidPaginated = response && response.results && Array.isArray(response.results);
    
    console.log('🔍 [DEBUG] Response validation:', {
      isValidArray,
      isValidPaginated,
      responseKeys: response ? Object.keys(response) : 'none'
    });

    if (isValidArray || isValidPaginated) {
      const count = isValidArray ? response.length : response.results.length;
      console.log('🔍 [DEBUG] Successfully validated response with', count, 'materials');
      logger.info(`Retrieved ${count} materials`);
      return response;
    }

    // If we reach here, the response format is invalid
    console.log('🔍 [DEBUG] Invalid response format detected');
    console.log('🔍 [DEBUG] Expected: Array or {results: Array}');
    console.log('🔍 [DEBUG] Received:', response);
    
    logger.warn('Invalid response format from materials API:', response);
    throw new Error(`Invalid response format from materials API. Expected Array or {results: Array}, got: ${typeof response}`);
    
  } catch (error) {
    console.log('🔍 [DEBUG] === ERROR CAUGHT ===');
    console.log('🔍 [DEBUG] Error type:', error.constructor.name);
    console.log('🔍 [DEBUG] Error message:', error.message);
    console.log('🔍 [DEBUG] Error stack:', error.stack);
    
    // Log network-specific error details
    if (error.code) {
      console.log('🔍 [DEBUG] Error code:', error.code);
    }
    if (error.response) {
      console.log('🔍 [DEBUG] HTTP Response status:', error.response.status);
      console.log('🔍 [DEBUG] HTTP Response statusText:', error.response.statusText);
      console.log('🔍 [DEBUG] HTTP Response headers:', error.response.headers);
      console.log('🔍 [DEBUG] HTTP Response data:', error.response.data);
    } else if (error.request) {
      console.log('🔍 [DEBUG] No response received. Request details:', error.request);
    }
    
    // Check for specific error conditions
    if (error.message?.includes('timeout')) {
      console.log('🔍 [DEBUG] TIMEOUT ERROR - Backend is slow or unreachable');
    } else if (error.response?.status === 401) {
      console.log('🔍 [DEBUG] AUTHENTICATION ERROR - Session expired or invalid');
    } else if (error.response?.status === 403) {
      console.log('🔍 [DEBUG] AUTHORIZATION ERROR - User lacks permissions');
    } else if (error.response?.status === 404) {
      console.log('🔍 [DEBUG] NOT FOUND ERROR - Endpoint does not exist');
    } else if (error.response?.status >= 500) {
      console.log('🔍 [DEBUG] SERVER ERROR - Backend is having issues');
    } else if (!error.response && !error.request) {
      console.log('🔍 [DEBUG] CLIENT ERROR - Request setup failed');
    }
    
    logger.error('Error fetching materials:', error);
    console.log('🔍 [DEBUG] === getMaterials END (ERROR) ===');
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
    const response = await fetchData('/inventory/materials/statistics', {
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
    const response = await fetchData('/inventory/materials/low_stock', {
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
    const response = await fetchData(`/inventory/materials/${id}`, {
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
    
    const response = await postData('/inventory/materials', materialData, {
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
    
    const response = await putData(`/inventory/materials/${id}`, materialData, {
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
    
    await deleteData(`/inventory/materials/${id}`, {
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
    
    const response = await postData(`/inventory/materials/${id}/update_stock`, stockData, {
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
    
    const response = await postData(`/inventory/materials/${id}/use_material`, usageData, {
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
      ? `/inventory/material-transactions?${queryParams.toString()}` 
      : '/inventory/material-transactions';
    
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
    const response = await fetchData('/inventory/materials/export', {
      responseType: 'blob',
      headers: getTenantHeaders()
    });
    
    return response;
  } catch (error) {
    logger.error('Error exporting materials:', error);
    throw error;
  }
};

/**
 * DEBUG HELPER: Test API connectivity and session status
 * Call this from browser console: materialsService.debugApiStatus()
 */
export const debugApiStatus = async () => {
  console.log('🔧 [API DEBUG] === API Status Check ===');
  
  try {
    // Check if we're in browser
    if (typeof window === 'undefined') {
      console.log('🔧 [API DEBUG] Running in server environment');
      return;
    }
    
    // Check session cookie
    const cookies = document.cookie;
    const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('sid='));
    console.log('🔧 [API DEBUG] Session cookie:', sessionCookie ? '✅ Present' : '❌ Missing');
    
    // Check tenant headers
    const tenantHeaders = getTenantHeaders();
    console.log('🔧 [API DEBUG] Tenant headers:', tenantHeaders);
    
    // Test a simple API call to session endpoint
    try {
      const response = await fetchData('/api/auth/session-v2', { 
        rethrow: true,
        timeout: 10000 
      });
      console.log('🔧 [API DEBUG] Session API test:', response ? '✅ Success' : '❌ Failed');
      if (response) {
        console.log('🔧 [API DEBUG] User info:', response.user?.email || 'No user');
      }
    } catch (sessionError) {
      console.log('🔧 [API DEBUG] Session API test: ❌ Failed');
      console.log('🔧 [API DEBUG] Session error:', sessionError.message);
    }
    
    // Test materials API endpoint specifically
    try {
      console.log('🔧 [API DEBUG] Testing materials API...');
      const materialsResponse = await fetchData('/inventory/materials', { 
        rethrow: true,
        timeout: 15000,
        headers: getTenantHeaders()
      });
      console.log('🔧 [API DEBUG] Materials API test:', materialsResponse ? '✅ Success' : '❌ Failed');
      if (materialsResponse) {
        const count = Array.isArray(materialsResponse) ? materialsResponse.length : 
                     materialsResponse.results ? materialsResponse.results.length : 'unknown';
        console.log('🔧 [API DEBUG] Materials count:', count);
      }
    } catch (materialsError) {
      console.log('🔧 [API DEBUG] Materials API test: ❌ Failed');
      console.log('🔧 [API DEBUG] Materials error details:');
      console.log('  - Message:', materialsError.message);
      console.log('  - Status:', materialsError.response?.status);
      console.log('  - Status Text:', materialsError.response?.statusText);
      console.log('  - Response Data:', materialsError.response?.data);
    }
    
  } catch (error) {
    console.log('🔧 [API DEBUG] Debug check failed:', error);
  }
  
  console.log('🔧 [API DEBUG] === End API Status Check ===');
};

// Export default object with all methods including debug helper
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
  exportMaterialsToCSV,
  debugApiStatus
};

export default materialsService;