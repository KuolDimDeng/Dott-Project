import { apiService } from './apiService';
import { logger } from '@/utils/logger';
import { inventoryCache } from '@/utils/enhancedCache';
import { checkAndFixTenantId } from '@/utils/fixTenantId';

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
  const {
    page = 1,
    is_for_sale,
    min_stock,
    search,
    department,
    view_mode = 'standard'
  } = options;
  
  // Build query parameters
  const params = { page };
  if (is_for_sale !== undefined) params.is_for_sale = is_for_sale;
  if (min_stock !== undefined) params.min_stock = min_stock;
  if (search) params.search = search;
  if (department) params.department = department;
  
  // Determine endpoint based on view mode
  let endpoint;
  let cacheTTL = CACHE_CONFIG.LIST_TTL;
  
  switch (view_mode) {
    case 'ultra':
      endpoint = '/api/inventory/ultra/products/';
      break;
    case 'detailed':
      endpoint = '/api/inventory/products/';  // Ensure trailing slash is present
      cacheTTL = CACHE_CONFIG.DETAIL_TTL; // Longer TTL for detailed data
      break;
    case 'with_department':
      endpoint = '/api/inventory/ultra/products/with-department/';
      break;
    default:
      endpoint = '/api/inventory/products/'; // Default to standard endpoint
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
      storeProductsOffline(response.results);
    }
    
    return response;
  } catch (error) {
    logger.error('Error fetching products:', error);
    
    // Try to get offline data
    const offlineProducts = getOfflineProducts();
    if (offlineProducts.length > 0) {
      logger.info('Using offline product data');
      return {
        results: offlineProducts,
        count: offlineProducts.length
      };
    }
    
    // Fall back to mock data
    logger.info('Using mock product data');
    return {
      results: MOCK_PRODUCTS,
      count: MOCK_PRODUCTS.length
    };
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
    logger.debug('[InventoryService] Creating product with data:', {
      productName: productData.name,
      productCode: productData.product_code
    });
    
    // Force the correct tenant ID to be used 
    const correctTenantId = 'b7fee399-ffca-4151-b636-94ccb65b3cd0';
    
    // Log current tenant context before changing
    const beforeContext = await apiService.verifyTenantContext();
    logger.info('[InventoryService] Tenant context before creating product:', beforeContext);
    
    // Set the tenant ID in all storage mechanisms to ensure consistency
    try {
      await apiService.setTenantId(correctTenantId);
      logger.info(`[InventoryService] Forced tenant ID to ${correctTenantId}`);
      
      // Verify tenant context was properly set
      const afterContext = await apiService.verifyTenantContext();
      logger.info('[InventoryService] Tenant context after setting ID:', afterContext);
    } catch (error) {
      logger.error('[InventoryService] Error setting tenant ID:', error);
    }
    
    // Generate schema name consistently
    const schemaName = `tenant_${correctTenantId.replace(/-/g, '_')}`;
    logger.info(`[InventoryService] Using schema name: ${schemaName}`);
    
    // Add explicit tenant headers to the request
    const headers = {
      'X-Tenant-ID': correctTenantId,
      'X-Schema-Name': schemaName,
      'X-Business-ID': correctTenantId  // Include business ID as well
    };
    
    logger.info('[InventoryService] Sending request with headers:', headers);
    
    const result = await apiService.post('/api/inventory/products/create/', productData, {
      invalidateCache: ['products', 'ultra/products', 'stats'],
      headers: headers
    });
    
    logger.info('[InventoryService] Product created successfully');
    return result;
  } catch (error) {
    logger.error('[InventoryService] Error creating product:', {
      error: error.message || error,
      status: error.response?.status,
      details: error.details,
      requestDetails: error.requestDetails
    });
    throw error;
  }
};

/**
 * Update a product
 * @param {string} id - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (id, productData) => {
  try {
    // Force the correct tenant ID to be used 
    const correctTenantId = 'b7fee399-ffca-4151-b636-94ccb65b3cd0';
    
    // Set the tenant ID in all storage mechanisms to ensure consistency
    try {
      await apiService.setTenantId(correctTenantId);
      logger.debug(`[InventoryService] Forced tenant ID to ${correctTenantId} for update`);
    } catch (error) {
      logger.error('[InventoryService] Error setting tenant ID for update:', error);
    }
    
    // Add explicit tenant headers to the request
    const result = await apiService.put(`/api/inventory/products/${id}/`, productData, {
      invalidateCache: ['products', 'ultra/products', 'stats'],
      headers: {
        'X-Tenant-ID': correctTenantId,
        'X-Schema-Name': `tenant_${correctTenantId.replace(/-/g, '_')}`
      }
    });
    
    logger.info(`Product ${id} updated successfully`);
    return result;
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
  try {
    await apiService.delete(`/api/inventory/products/${id}/`, {
      invalidateCache: ['products', 'ultra/products', 'stats']
    });
    
    logger.info(`Product ${id} deleted successfully`);
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
 * Store products in localStorage for offline access
 * @param {Array} products - Products to store
 */
export const storeProductsOffline = (products) => {
  if (!Array.isArray(products) || products.length === 0) {
    return;
  }
  
  try {
    const offlineData = {
      timestamp: Date.now(),
      products: products
    };
    
    localStorage.setItem('offline_products', JSON.stringify(offlineData));
    logger.debug(`Stored ${products.length} products for offline use`);
  } catch (error) {
    logger.error('Error storing products offline:', error);
  }
};

/**
 * Get products from offline storage
 * @returns {Array} Products from offline storage
 */
export const getOfflineProducts = () => {
  try {
    const offlineDataStr = localStorage.getItem('offline_products');
    if (!offlineDataStr) {
      return [];
    }
    
    const offlineData = JSON.parse(offlineDataStr);
    
    // Check if data is stale (older than 24 hours)
    const isStale = Date.now() - offlineData.timestamp > 24 * 60 * 60 * 1000;
    if (isStale) {
      logger.warn('Offline product data is stale (>24h old)');
    }
    
    return offlineData.products || [];
  } catch (error) {
    logger.error('Error retrieving offline products:', error);
    return [];
  }
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
  getMockProducts
};

export default inventoryService;