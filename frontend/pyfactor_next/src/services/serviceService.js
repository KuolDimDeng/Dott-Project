import { logger } from '@/utils/logger';

/**
 * ServiceService - Service management API client
 * Handles all service-related operations with the backend
 */

// Cache TTL configuration
const CACHE_CONFIG = {
  LIST_TTL: 3 * 60 * 1000,       // 3 minutes for list endpoints
  DETAIL_TTL: 5 * 60 * 1000,     // 5 minutes for detail endpoints
  STATS_TTL: 5 * 60 * 1000,      // 5 minutes for stats
};

// Mock data for offline/demo mode
const MOCK_SERVICES = [
  {
    id: '1',
    name: 'Consultation',
    service_code: 'CONS001',
    description: 'Professional consultation service',
    price: 99.99,
    is_for_sale: true,
    is_recurring: false
  },
  {
    id: '2',
    name: 'Monthly Support',
    service_code: 'SUPP002',
    description: 'Ongoing technical support',
    price: 49.99,
    is_for_sale: true,
    is_recurring: true
  },
  {
    id: '3',
    name: 'Training Session',
    service_code: 'TRAIN003',
    description: 'One-on-one training session',
    price: 149.99,
    is_for_sale: true,
    is_recurring: false
  }
];

// Add initialization of global app cache at the top of the file
// Initialize global app cache if it doesn't exist
if (typeof window !== 'undefined') {
  if (!appCache.getAll()) appCache.init();
  if (!appCache.get('offline')) appCache.set('offline', {});
}

/**
 * Get mock services for testing and fallback
 * @returns {Array} List of mock services
 */
export const getMockServices = () => {
  return [...MOCK_SERVICES];
};

/**
 * Get services with optional filtering
 * @param {Object} options - Query options
 * @param {Object} fetchOptions - Fetch options
 * @returns {Promise<Object>} Paginated list of services
 */
export const getServices = async (options = {}, fetchOptions = {}) => {
  const {
    page = 1,
    is_for_sale,
    is_recurring,
    search,
    view_mode = 'standard'
  } = options;
  
  // Build query parameters
  const params = { page };
  if (is_for_sale !== undefined) params.is_for_sale = is_for_sale;
  if (is_recurring !== undefined) params.is_recurring = is_recurring;
  if (search) params.search = search;
  
  // Determine endpoint based on view mode
  let endpoint;
  let cacheTTL = CACHE_CONFIG.LIST_TTL;
  
  switch (view_mode) {
    case 'ultra':
      endpoint = '/api/inventory/ultra/services/';
      break;
    case 'detailed':
      endpoint = '/api/inventory/services/';
      cacheTTL = CACHE_CONFIG.DETAIL_TTL; // Longer TTL for detailed data
      break;
    default:
      endpoint = '/api/inventory/services/'; // Default to standard endpoint
  }
  
  // Set up fetch options
  const defaultFetchOptions = {
    useCache: true,
    cacheTTL,
    fallbackData: { results: [], count: 0 },
    ...fetchOptions
  };
  
  try {
    // Fetch data using the centralized API service
    const response = await apiService.fetch(endpoint, {
      params,
      ...defaultFetchOptions
    });
    
    // Store for offline use if successful
    if (response && response.results && response.results.length > 0) {
      storeServicesOffline(response.results);
    }
    
    return response;
  } catch (error) {
    logger.error('Error fetching services:', error);
    
    // Try to get offline data
    const offlineServices = getOfflineServices();
    if (offlineServices.length > 0) {
      logger.info('Using offline service data');
      return {
        results: offlineServices,
        count: offlineServices.length
      };
    }
    
    // Fall back to mock data
    logger.info('Using mock service data');
    return {
      results: MOCK_SERVICES,
      count: MOCK_SERVICES.length
    };
  }
};

/**
 * Get service statistics
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Service statistics
 */
export const getServiceStats = async (options = {}) => {
  const defaultOptions = {
    useCache: true,
    cacheTTL: CACHE_CONFIG.STATS_TTL,
    fallbackData: {
      total_services: 0,
      total_recurring: 0,
      avg_price: 0
    },
    ...options
  };
  
  try {
    return await apiService.fetch('/api/inventory/ultra/services/stats/', defaultOptions);
  } catch (error) {
    logger.error('Error fetching service stats:', error);
    
    // Generate stats from offline data if available
    const offlineServices = getOfflineServices();
    if (offlineServices.length > 0) {
      return generateStatsFromServices(offlineServices);
    }
    
    // Fall back to mock stats
    return generateStatsFromServices(MOCK_SERVICES);
  }
};

/**
 * Get service by ID
 * @param {string} id - Service ID
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Service details
 */
export const getServiceById = async (id, options = {}) => {
  if (!id) {
    logger.error('Service ID is required');
    return null;
  }
  
  const defaultOptions = {
    useCache: true,
    cacheTTL: CACHE_CONFIG.DETAIL_TTL,
    ...options
  };
  
  try {
    return await apiService.fetch(`/api/inventory/services/${id}/`, defaultOptions);
  } catch (error) {
    logger.error(`Error fetching service ${id}:`, error);
    
    // Try to find in offline data
    const offlineServices = getOfflineServices();
    const offlineService = offlineServices.find(s => s.id === id);
    
    if (offlineService) {
      return offlineService;
    }
    
    // Try to find in mock data
    const mockService = MOCK_SERVICES.find(s => s.id === id);
    
    return mockService || null;
  }
};

/**
 * Get service by code
 * @param {string} code - Service code
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Service details
 */
export const getServiceByCode = async (code, options = {}) => {
  if (!code) {
    logger.error('Service code is required');
    return null;
  }
  
  const defaultOptions = {
    useCache: true,
    cacheTTL: CACHE_CONFIG.DETAIL_TTL,
    ...options
  };
  
  try {
    return await apiService.fetch(`/api/inventory/ultra/services/code/${code}/`, defaultOptions);
  } catch (error) {
    logger.error(`Error fetching service by code ${code}:`, error);
    
    // Try to find in offline data
    const offlineServices = getOfflineServices();
    const offlineService = offlineServices.find(s => s.service_code === code);
    
    if (offlineService) {
      return offlineService;
    }
    
    // Try to find in mock data
    const mockService = MOCK_SERVICES.find(s => s.service_code === code);
    
    return mockService || null;
  }
};

/**
 * Create a new service
 * @param {Object} serviceData - Service data
 * @returns {Promise<Object>} Created service
 */
export const createService = async (serviceData) => {
  try {
    // Log the service data being sent
    logger.debug('Creating service with data:', serviceData);
    
    // Validate required fields before sending
    const requiredFields = ['name', 'price'];
    const missingFields = requiredFields.filter(field => !serviceData[field]);
    
    if (missingFields.length > 0) {
      const error = new Error(`Missing required fields: ${missingFields.join(', ')}`);
      error.validationErrors = missingFields.reduce((acc, field) => {
        acc[field] = ['This field is required'];
        return acc;
      }, {});
      throw error;
    }
    
    // Ensure price is a valid number
    if (serviceData.price && (isNaN(serviceData.price) || serviceData.price < 0)) {
      const error = new Error('Price must be a non-negative number');
      error.validationErrors = { price: ['Price must be a non-negative number'] };
      throw error;
    }
    
    const result = await apiService.post('/api/inventory/services/create/', serviceData, {
      invalidateCache: ['services', 'ultra/services', 'stats']
    });
    
    logger.info('Service created successfully');
    return result;
  } catch (error) {
    logger.error('Error creating service:', error);
    
    // Enhance error with more details if available
    if (error.original?.response?.data) {
      error.validationErrors = error.original.response.data;
      logger.error('Validation errors:', error.validationErrors);
    }
    
    throw error;
  }
};

/**
 * Update a service
 * @param {string} id - Service ID
 * @param {Object} serviceData - Updated service data
 * @returns {Promise<Object>} Updated service
 */
export const updateService = async (id, serviceData) => {
  try {
    const result = await apiService.put(`/api/inventory/services/${id}/`, serviceData, {
      invalidateCache: ['services', 'ultra/services', 'stats']
    });
    
    logger.info(`Service ${id} updated successfully`);
    return result;
  } catch (error) {
    logger.error(`Error updating service ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a service
 * @param {string} id - Service ID
 * @returns {Promise<void>}
 */
export const deleteService = async (id) => {
  try {
    await apiService.delete(`/api/inventory/services/${id}/`, {
      invalidateCache: ['services', 'ultra/services', 'stats']
    });
    
    logger.info(`Service ${id} deleted successfully`);
  } catch (error) {
    logger.error(`Error deleting service ${id}:`, error);
    throw error;
  }
};

/**
 * Prefetch essential service data
 * This can be called during app initialization
 */
export const prefetchEssentialData = async () => {
  logger.debug('Prefetching essential service data');
  
  try {
    // Fetch first page of services
    getServices({ page: 1, view_mode: 'ultra' }).catch(err => {
      logger.warn('Failed to prefetch services:', err);
    });
    
    // Fetch service stats
    getServiceStats().catch(err => {
      logger.warn('Failed to prefetch service stats:', err);
    });
  } catch (error) {
    logger.error('Error prefetching essential service data:', error);
  }
};

/**
 * Store services in app cache for offline access
 * @param {Array} services - Services to store
 */
export const storeServicesOffline = (services) => {
  if (!Array.isArray(services) || services.length === 0) {
    return;
  }
  
  try {
    const offlineData = {
      timestamp: Date.now(),
      services: services
    };
    
    // Store in app cache
    if (typeof window !== 'undefined') {
      if (!appCache.getAll()) appCache.init();
      if (!appCache.getAll().offline) appCache.set('offline', {});
      appCache.set('offline.services', offlineData);
      
      logger.debug(`Stored ${services.length} services in app cache for offline use`);
    } else {
      logger.warn('Unable to store services for offline use: window not defined');
    }
  } catch (error) {
    logger.error('Error storing services offline:', error);
  }
};

/**
 * Get services from offline storage
 * @returns {Array} Services from offline storage
 */
export const getOfflineServices = () => {
  try {
    // Get from app cache
    if (typeof window !== 'undefined' && appCache.getAll()) {
      const offlineData = appCache.get('offline.services');
      
      // Check if data is stale (older than 24 hours)
      const isStale = Date.now() - offlineData.timestamp > 24 * 60 * 60 * 1000;
      if (isStale) {
        logger.warn('Offline service data is stale (>24h old)');
      }
      
      return offlineData.services || [];
    } else {
      logger.debug('No services found in app cache for offline use');
      return [];
    }
  } catch (error) {
    logger.error('Error retrieving offline services:', error);
    return [];
  }
};

/**
 * Clear service cache
 */
export const clearServiceCache = () => {
  logger.debug('Clearing service cache');
  
  // Clear service-related cache entries
  const keys = inventoryCache.getKeys();
  keys.forEach(key => {
    if (key.includes('service') || key.includes('ultra/service')) {
      inventoryCache.delete(key);
    }
  });
};

/**
 * Generate statistics from a list of services
 * @param {Array} services - List of services
 * @returns {Object} Service statistics
 */
export const generateStatsFromServices = (services) => {
  if (!Array.isArray(services) || services.length === 0) {
    return {
      total_services: 0,
      total_recurring: 0,
      avg_price: 0
    };
  }
  
  const total_services = services.length;
  
  const total_recurring = services.filter(
    s => s.is_recurring
  ).length;
  
  const avg_price = services.reduce(
    (sum, s) => sum + (s.price || 0),
    0
  ) / total_services;
  
  return {
    total_services,
    total_recurring,
    avg_price
  };
};

// Export a default object with all methods
export const serviceService = {
  getServices,
  getServiceStats,
  getServiceById,
  getServiceByCode,
  createService,
  updateService,
  deleteService,
  prefetchEssentialData,
  clearServiceCache,
  storeServicesOffline,
  getOfflineServices,
  getMockServices
};

export default serviceService;