import { logger } from '@/utils/logger';
import { apiService, fetchData } from './apiService';
import { inventoryCache } from '@/utils/enhancedCache';
import { checkAndFixTenantId } from '@/utils/fixTenantId';
import { axiosInstance } from '@/lib/axiosConfig';
import { userService } from './userService';

/**
 * Generates a product code based on product name
 * @param {string} productName - The name of the product
 * @returns {string} Generated product code
 */
export const generateProductCode = (productName) => {
  if (!productName) return 'PROD-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  
  // Extract first 4 characters from product name (or fewer if name is shorter)
  const prefix = productName.substring(0, 4).toUpperCase();
  
  // Generate a random 6-character string
  const randomId = Math.random().toString(36).substr(2, 6).toUpperCase();
  
  // Combine to create product code
  return `${prefix}-${randomId}`;
};

/**
 * InventoryService - Consolidated service for inventory-related operations
 * This service replaces the previous inventoryService and ultraOptimizedInventoryService
 * with a single, consistent interface for all inventory operations.
 */

// Cache TTL configuration
const CACHE_CONFIG = {
  LIST_TTL: 3 * 60 * 1000,       // 3 minutes for list endpoints
  DETAIL_TTL: 5 * 60 * 1000,     // 5 minutes for detail endpoints
  STATS_TTL: 5 * 60 * 1000,      // 5 minutes for stats
};

// Mock data for offline/demo mode
const MOCK_PRODUCTS = [
  {
    id: '1',
    name: 'Sample Product 1',
    product_code: 'SP001',
    description: 'This is a sample product for development',
    stock_quantity: 25,
    reorder_level: 5,
    price: 19.99,
    is_for_sale: true
  },
  {
    id: '2',
    name: 'Sample Product 2',
    product_code: 'SP002',
    description: 'Another sample product for testing',
    stock_quantity: 10,
    reorder_level: 3,
    price: 29.99,
    is_for_sale: true
  },
  {
    id: '3',
    name: 'Office Supplies',
    product_code: 'OS003',
    description: 'Various office supplies including pens, paper, and staplers',
    stock_quantity: 150,
    reorder_level: 30,
    price: 12.50,
    is_for_sale: true
  },
  {
    id: '4',
    name: 'Desk Chair',
    product_code: 'DC004',
    description: 'Ergonomic office chair with adjustable height',
    stock_quantity: 8,
    reorder_level: 2,
    price: 199.99,
    is_for_sale: true
  },
  {
    id: '5',
    name: 'Laptop Stand',
    product_code: 'LS005',
    description: 'Adjustable laptop stand for better ergonomics',
    stock_quantity: 15,
    reorder_level: 5,
    price: 49.99,
    is_for_sale: true
  }
];

/**
 * Get mock products for testing and fallback
 * @returns {Array} List of mock products
 */
export const getMockProducts = () => {
  return [...MOCK_PRODUCTS];
};

/**
 * Get products with optional filtering
 * @param {Object} options - Query options
 * @param {Object} fetchOptions - Fetch options
 * @returns {Promise<Object>} Paginated list of products
 */
export const getProducts = async (options = {}, fetchOptions = {}) => {
  try {
    // Configure optimal fetch options
    const defaultFetchOptions = {
      useCache: true,
      cacheTTL: 300, // 5 minutes
      handleErrors: true,
      timeout: 15000, // 15 second timeout
      notify: false,
    };

    const mergedOptions = { ...defaultFetchOptions, ...fetchOptions };
    logger.debug('Fetching inventory products with options:', { options, fetchOptions: mergedOptions });

    // Try the ultra-optimized endpoint first for faster loading
    let response = await fetchData('/api/inventory/ultra/products/', {
      ...mergedOptions,
      customMessage: 'Unable to load products from ultra-fast API. Trying standard API...'
    });

    // If ultra endpoint returns proper data, use it
    if (response && Array.isArray(response) && response.length > 0) {
      logger.info(`Retrieved ${response.length} products from ultra-fast API`);
      storeProductsOffline(response);
      return response;
    }

    // If ultra endpoint failed or returned empty, try standard API endpoint
    logger.info('Ultra endpoint returned no data, trying standard endpoint');
    response = await fetchData('/api/inventory/products/', {
      ...mergedOptions,
      customMessage: 'Unable to load products from standard API. Trying offline data...'
    });

    // Verify response integrity
    if (response && Array.isArray(response)) {
      if (response.length === 0) {
        logger.warn('API returned empty products array');
      } else {
        logger.info(`Retrieved ${response.length} products from standard API`);
        storeProductsOffline(response);
        return response;
      }
    } else if (response && response.detail && response.detail.includes('Resolver404')) {
      // This is the specific error from Django URL resolver
      logger.error('API endpoint not found (Resolver404), likely a tenant schema issue');
      throw new Error('API endpoint not found. Products list might be unavailable in your tenant schema.');
    } else {
      logger.warn('Invalid response format from API:', response);
    }

    // Try to get offline data
    const offlineData = getOfflineProducts();
    if (offlineData && offlineData.length > 0) {
      logger.info(`Retrieved ${offlineData.length} products from offline storage`);
      return offlineData;
    }

    // If all else fails, return mock data
    logger.info('No data available, using mock data');
    return getMockProducts();
  } catch (error) {
    logger.error('Error fetching products:', error);
    
    // Try to get offline data first
    const offlineData = getOfflineProducts();
    if (offlineData && offlineData.length > 0) {
      logger.info(`Retrieved ${offlineData.length} products from offline storage after error`);
      return offlineData;
    }
    
    // If no offline data, use mock data as last resort
    logger.info('No offline data available after error, using mock data');
    return getMockProducts();
  }
};

/**
 * Get product statistics
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Product statistics
 */
export const getProductStats = async (options = {}) => {
  const defaultOptions = {
    useCache: true,
    cacheTTL: CACHE_CONFIG.STATS_TTL,
    fallbackData: {
      total_products: 0,
      low_stock_count: 0,
      total_value: 0,
      avg_price: 0
    },
    ...options
  };
  
  try {
    return await apiService.fetch('/api/inventory/ultra/products/stats/', defaultOptions);
  } catch (error) {
    logger.error('Error fetching product stats:', error);
    
    // Generate stats from offline data if available
    const offlineProducts = getOfflineProducts();
    if (offlineProducts.length > 0) {
      return generateStatsFromProducts(offlineProducts);
    }
    
    // Fall back to mock stats
    return generateStatsFromProducts(MOCK_PRODUCTS);
  }
};

/**
 * Get product by ID
 * @param {string} id - Product ID
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Product details
 */
export const getProductById = async (id, options = {}) => {
  if (!id) {
    logger.error('Product ID is required');
    return null;
  }
  
  const defaultOptions = {
    useCache: true,
    cacheTTL: CACHE_CONFIG.DETAIL_TTL,
    ...options
  };
  
  try {
    return await apiService.fetch(`/api/inventory/products/${id}/`, defaultOptions);
  } catch (error) {
    logger.error(`Error fetching product ${id}:`, error);
    
    // Try to find in offline data
    const offlineProducts = getOfflineProducts();
    const offlineProduct = offlineProducts.find(p => p.id === id);
    
    if (offlineProduct) {
      return offlineProduct;
    }
    
    // Try to find in mock data
    const mockProduct = MOCK_PRODUCTS.find(p => p.id === id);
    
    return mockProduct || null;
  }
};

/**
 * Get product by code (e.g., for barcode scanning)
 * @param {string} code - Product code
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Product details
 */
export const getProductByCode = async (code, options = {}) => {
  if (!code) {
    logger.error('Product code is required');
    return null;
  }
  
  const defaultOptions = {
    useCache: true,
    cacheTTL: CACHE_CONFIG.DETAIL_TTL,
    ...options
  };
  
  try {
    return await apiService.fetch(`/api/inventory/ultra/products/code/${code}/`, defaultOptions);
  } catch (error) {
    logger.error(`Error fetching product by code ${code}:`, error);
    
    // Try to find in offline data
    const offlineProducts = getOfflineProducts();
    const offlineProduct = offlineProducts.find(p => p.product_code === code);
    
    if (offlineProduct) {
      return offlineProduct;
    }
    
    // Try to find in mock data
    const mockProduct = MOCK_PRODUCTS.find(p => p.product_code === code);
    
    return mockProduct || null;
  }
};

/**
 * Create a new product
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
export const createProduct = async (productData) => {
  try {
    logger.info('Creating product:', productData);
    
    // Ensure product_code is generated if not provided
    if (!productData.product_code) {
      productData.product_code = generateProductCode(productData.name);
    }
    
    const response = await apiService.post('/api/inventory/products/', productData, {
      invalidateCache: ['/api/inventory/products/', '/api/inventory/ultra/products/']
    });
    
    return response;
  } catch (error) {
    logger.error('Error creating product:', error);
    throw error;
  }
};

/**
 * Update an existing product
 * @param {string} id - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (id, productData) => {
  if (!id) {
    logger.error('Product ID is required for update');
    throw new Error('Product ID is required for update');
  }
  
  try {
    logger.info(`Updating product ${id}:`, productData);
    
    const response = await apiService.put(`/api/inventory/products/${id}/`, productData, {
      invalidateCache: [
        '/api/inventory/products/',
        '/api/inventory/ultra/products/',
        `/api/inventory/products/${id}/`
      ]
    });
    
    return response;
  } catch (error) {
    logger.error(`Error updating product ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a product
 * @param {string} id - Product ID
 * @returns {Promise<void>}
 */
export const deleteProduct = async (id) => {
  if (!id) {
    logger.error('Product ID is required for deletion');
    throw new Error('Product ID is required for deletion');
  }
  
  try {
    logger.info(`Deleting product ${id}`);
    
    await apiService.delete(`/api/inventory/products/${id}/`, {
      invalidateCache: [
        '/api/inventory/products/',
        '/api/inventory/ultra/products/',
        `/api/inventory/products/${id}/`
      ]
    });
    
    return true;
  } catch (error) {
    logger.error(`Error deleting product ${id}:`, error);
    throw error;
  }
};

/**
 * Prefetch essential inventory data
 * This can be called during app initialization
 */
export const prefetchEssentialData = async () => {
  logger.debug('Prefetching essential inventory data');
  
  try {
    // Fetch first page of products
    getProducts({ page: 1, view_mode: 'ultra' }).catch(err => {
      logger.warn('Failed to prefetch products:', err);
    });
    
    // Fetch product stats
    getProductStats().catch(err => {
      logger.warn('Failed to prefetch product stats:', err);
    });
    
    // Schedule additional prefetching when browser is idle
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        logger.debug('Prefetching additional inventory data during browser idle time');
        
        // Prefetch products with department during idle time
        getProducts({ page: 1, view_mode: 'with_department' }).catch(err => {
          logger.warn('Failed to prefetch products with department:', err);
        });
      }, { timeout: 5000 });
    }
  } catch (error) {
    logger.error('Error prefetching essential inventory data:', error);
  }
};

/**
 * Store products for offline use
 * @param {Array} products - List of products to store
 */
export const storeProductsOffline = (products) => {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return;
  }
  
  try {
    const offlineProducts = JSON.stringify(products);
    localStorage.setItem('offline_products', offlineProducts);
    logger.debug(`Stored ${products.length} products for offline use`);
  } catch (error) {
    logger.error('Failed to store products for offline use:', error);
  }
};

/**
 * Get products stored for offline use
 * @returns {Array} List of products stored offline
 */
export const getOfflineProducts = () => {
  try {
    const offlineProducts = localStorage.getItem('offline_products');
    if (offlineProducts) {
      return JSON.parse(offlineProducts);
    }
  } catch (error) {
    logger.error('Failed to get offline products:', error);
  }
  
  return [];
};

/**
 * Clear inventory cache
 */
export const clearInventoryCache = () => {
  logger.debug('Clearing inventory cache');
  inventoryCache.clearTenant();
};

/**
 * Generate statistics from a list of products
 * @param {Array} products - List of products
 * @returns {Object} Product statistics
 */
export const generateStatsFromProducts = (products) => {
  if (!Array.isArray(products) || products.length === 0) {
    return {
      total_products: 0,
      low_stock_count: 0,
      total_value: 0,
      avg_price: 0
    };
  }
  
  const total_products = products.length;
  
  const low_stock_count = products.filter(
    p => p.stock_quantity < p.reorder_level
  ).length;
  
  const total_value = products.reduce(
    (sum, p) => sum + (p.price || 0) * (p.stock_quantity || 0),
    0
  );
  
  const avg_price = products.reduce(
    (sum, p) => sum + (p.price || 0),
    0
  ) / total_products;
  
  return {
    total_products,
    low_stock_count,
    total_value,
    avg_price
  };
};

/**
 * Generate and print a barcode for a product
 * @param {string} productId - ID of the product
 * @returns {Promise<Blob>} Barcode image as a Blob
 */
export const printProductBarcode = async (productId) => {
  try {
    logger.debug(`[InventoryService] Printing barcode for product ID: ${productId}`);
    
    // Get user and tenant context from userService
    const user = await userService.getCurrentUser({
      forceFresh: false,
      withTenant: true
    });
    
    logger.debug('[InventoryService] User context for barcode generation:', {
      userId: user?.sub,
      email: user?.email,
      hasTenant: !!user?.tenant
    });
    
    let correctTenantId = null;
    
    // Get tenant ID from user data if available
    if (user?.tenant?.id) {
      correctTenantId = user.tenant.id;
      logger.debug(`[InventoryService] Using tenant ID from user data for barcode: ${correctTenantId}`);
    } else {
      // Fall back to previous tenant detection methods
      const beforeContext = await apiService.verifyTenantContext();
      logger.info('[InventoryService] Fallback tenant context for barcode:', beforeContext);
      
      correctTenantId = beforeContext?.fromContext?.tenantId || 
                      beforeContext?.fromCookie || 
                      beforeContext?.fromLocalStorage;
    
      if (!correctTenantId) {
        // Try to get tenant from API
        try {
          const tenantResponse = await apiService.getCurrentTenant();
          
          if (tenantResponse && tenantResponse.id) {
            correctTenantId = tenantResponse.id;
            logger.info(`[InventoryService] Found tenant ID from API for barcode: ${correctTenantId}`);
          }
        } catch (tenantError) {
          logger.error('[InventoryService] Error getting tenant for barcode:', tenantError);
        }
      }
    }
    
    // Set the tenant ID in all storage mechanisms to ensure consistency
    if (correctTenantId) {
      try {
        await apiService.setTenantId(correctTenantId);
        logger.info(`[InventoryService] Set tenant ID to ${correctTenantId} for barcode printing`);
      } catch (error) {
        logger.error('[InventoryService] Error setting tenant ID for barcode:', error);
      }
    } else {
      logger.error('[InventoryService] No tenant ID available for barcode printing, operation may fail');
    }
    
    // Generate schema name consistently if we have a tenant ID
    const schemaName = correctTenantId ? 
      `tenant_${correctTenantId.replace(/-/g, '_')}` : 
      null;
    
    // Get auth tokens
    const tokens = await apiService.getAuthTokens();
    if (!tokens || !tokens.accessToken) {
      throw new Error('Authentication required to print barcode');
    }
    
    // Add explicit tenant headers to the request
    const headers = {
      'Authorization': `Bearer ${tokens.accessToken}`
    };
    
    if (correctTenantId) {
      headers['X-Tenant-ID'] = correctTenantId;
      
      if (schemaName) {
        headers['X-Schema-Name'] = schemaName;
      }
      
      headers['X-Business-ID'] = correctTenantId;
    }
    
    const response = await axiosInstance.get(`/api/inventory/products/${productId}/print-barcode/`, {
      responseType: 'blob',
      headers: headers
    });
    
    logger.info('[InventoryService] Barcode generated successfully');
    return response.data;
  } catch (error) {
    logger.error('[InventoryService] Error printing barcode:', {
      error: error.message || error,
      productId
    });
    throw error;
  }
};

// Export a default object with all methods
export const inventoryService = {
  getProducts,
  getProductStats,
  getProductById,
  getProductByCode,
  createProduct,
  updateProduct,
  deleteProduct,
  prefetchEssentialData,
  clearInventoryCache,
  storeProductsOffline,
  getOfflineProducts,
  getMockProducts,
  printProductBarcode
};

export default inventoryService;