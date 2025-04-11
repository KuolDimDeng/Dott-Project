import { apiService } from '@/lib/apiService';
import { logger } from '@/utils/logger';
import { generateProductCode } from '@/utils/productUtils';

/**
 * Unified Inventory Service
 * A comprehensive service that combines the best features of all existing inventory services
 * This service handles all inventory-related operations with optimized performance
 */

// Cache configuration
const CACHE_CONFIG = {
  productsCache: new Map(),
  productStatsCache: null,
  categoriesCache: new Map(),
  suppliersCache: new Map(),
  locationsCache: new Map(),
  lastCacheTime: 0,
  cacheExpiry: 5 * 60 * 1000, // 5 minutes cache expiry
};

/**
 * Clear all caches
 */
const clearAllCaches = () => {
  CACHE_CONFIG.productsCache.clear();
  CACHE_CONFIG.productStatsCache = null;
  CACHE_CONFIG.categoriesCache.clear();
  CACHE_CONFIG.suppliersCache.clear();
  CACHE_CONFIG.locationsCache.clear();
  CACHE_CONFIG.lastCacheTime = 0;
  logger.debug('All inventory caches cleared');
};

/**
 * Clear product-related caches
 */
const clearProductCache = () => {
  CACHE_CONFIG.productsCache.clear();
  CACHE_CONFIG.productStatsCache = null;
  CACHE_CONFIG.lastCacheTime = 0;
  logger.debug('Product cache cleared');
};

/**
 * Get inventory headers for API calls
 * @returns {Object} Headers with tenant information
 */
const getInventoryHeaders = () => {
  // This would be implemented to get tenant-specific headers
  // For now, return an empty object
  return {};
};

/**
 * Generate mock products for testing/demo
 * @returns {Array} Array of mock products
 */
const getMockProducts = () => {
  const mockProducts = [];
  for (let i = 1; i <= 20; i++) {
    mockProducts.push({
      id: `mock-${i}`,
      name: `Mock Product ${i}`,
      description: `This is a mock product for testing purposes ${i}`,
      price: (Math.random() * 100).toFixed(2),
      product_code: `MOCK-${1000 + i}`,
      stock_quantity: Math.floor(Math.random() * 100),
      reorder_level: 10,
      category_id: i % 5 + 1,
      supplier_id: i % 3 + 1,
      location_id: i % 4 + 1,
      is_active: true,
      tax_rate: 8.5,
      cost_price: (Math.random() * 50).toFixed(2),
      last_ordered_date: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      updated_at: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
      image_url: i % 3 === 0 ? `https://picsum.photos/id/${i + 100}/200/200` : null,
    });
  }
  return mockProducts;
};

/**
 * Get product statistics
 * @returns {Promise<Object>} Product statistics
 */
const getProductStats = async () => {
  try {
    // Return from cache if available and not expired
    if (CACHE_CONFIG.productStatsCache && 
        Date.now() - CACHE_CONFIG.lastCacheTime < CACHE_CONFIG.cacheExpiry) {
      logger.debug('Returning product stats from cache');
      return CACHE_CONFIG.productStatsCache;
    }

    logger.debug('Fetching product statistics');
    
    // Try to get from API
    try {
      const response = await apiService.get('/api/inventory/stats/', {
        headers: getInventoryHeaders()
      });
      
      // Cache the response
      CACHE_CONFIG.productStatsCache = response;
      CACHE_CONFIG.lastCacheTime = Date.now();
      
      return response;
    } catch (apiError) {
      logger.error('Error fetching product stats from API:', apiError);
      
      // Return mock data if API fails
      const mockProducts = getMockProducts();
      const mockStats = {
        total_products: mockProducts.length,
        low_stock_count: mockProducts.filter(p => 
          p.stock_quantity < p.reorder_level).length,
        total_value: mockProducts.reduce((sum, p) => 
          sum + parseFloat(p.price) * p.stock_quantity, 0).toFixed(2),
        new_products_count: mockProducts.filter(p => 
          new Date(p.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
      };
      
      // Cache the mock stats
      CACHE_CONFIG.productStatsCache = mockStats;
      CACHE_CONFIG.lastCacheTime = Date.now();
      
      return mockStats;
    }
  } catch (error) {
    logger.error('Error in getProductStats:', error);
    throw error;
  }
};

/**
 * Get all product categories
 * @returns {Promise<Array>} Product categories
 */
const getCategories = async () => {
  try {
    // Return from cache if available and not expired
    if (CACHE_CONFIG.categoriesCache.size > 0 && 
        Date.now() - CACHE_CONFIG.lastCacheTime < CACHE_CONFIG.cacheExpiry) {
      logger.debug('Returning categories from cache');
      return Array.from(CACHE_CONFIG.categoriesCache.values());
    }

    logger.debug('Fetching product categories');
    
    try {
      const response = await apiService.get('/api/inventory/categories/', {
        headers: getInventoryHeaders()
      });
      
      // Cache the response
      response.forEach(category => 
        CACHE_CONFIG.categoriesCache.set(category.id, category));
      CACHE_CONFIG.lastCacheTime = Date.now();
      
      return response;
    } catch (apiError) {
      logger.error('Error fetching categories from API:', apiError);
      
      // Return mock data if API fails
      const mockCategories = [
        { id: 1, name: 'Electronics', description: 'Electronic devices and accessories' },
        { id: 2, name: 'Furniture', description: 'Home and office furniture' },
        { id: 3, name: 'Clothing', description: 'Apparel and fashion items' },
        { id: 4, name: 'Food', description: 'Groceries and food items' },
        { id: 5, name: 'Other', description: 'Other miscellaneous items' }
      ];
      
      // Cache the mock categories
      mockCategories.forEach(category => 
        CACHE_CONFIG.categoriesCache.set(category.id, category));
      CACHE_CONFIG.lastCacheTime = Date.now();
      
      return mockCategories;
    }
  } catch (error) {
    logger.error('Error in getCategories:', error);
    throw error;
  }
};

/**
 * Get all products with optional filtering
 * @param {Object} params - Query parameters for filtering
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} List of products
 */
const getProducts = async (params = {}, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category_id = '',
      supplier_id = '',
      location_id = '',
      sort_by = 'name',
      sort_order = 'asc',
      view_mode = 'standard',
      include_inactive = false,
    } = params;

    const cacheKey = JSON.stringify({
      page, limit, search, category_id, supplier_id, location_id, 
      sort_by, sort_order, view_mode, include_inactive
    });

    // Return from cache if available and not expired
    if (CACHE_CONFIG.productsCache.has(cacheKey) && 
        Date.now() - CACHE_CONFIG.lastCacheTime < CACHE_CONFIG.cacheExpiry) {
      logger.debug('Returning products from cache for key:', cacheKey);
      return CACHE_CONFIG.productsCache.get(cacheKey);
    }

    logger.debug('Fetching products with params:', { params, options });
    
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });

      const response = await apiService.get(
        `/api/inventory/products/?${queryParams.toString()}`,
        { headers: getInventoryHeaders() }
      );
      
      // Cache the response
      CACHE_CONFIG.productsCache.set(cacheKey, response);
      CACHE_CONFIG.lastCacheTime = Date.now();
      
      return response;
    } catch (apiError) {
      logger.error('Error fetching products from API:', apiError);
      logger.info('Returning mock products as fallback');
      
      // Return mock data if API fails
      const mockProducts = getMockProducts();
      
      // Apply filtering based on params
      let filteredProducts = [...mockProducts];
      
      if (search) {
        const searchLower = search.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase().includes(searchLower) || 
          p.description.toLowerCase().includes(searchLower) ||
          p.product_code.toLowerCase().includes(searchLower)
        );
      }
      
      if (category_id) {
        filteredProducts = filteredProducts.filter(p => 
          p.category_id === parseInt(category_id));
      }
      
      if (supplier_id) {
        filteredProducts = filteredProducts.filter(p => 
          p.supplier_id === parseInt(supplier_id));
      }
      
      if (location_id) {
        filteredProducts = filteredProducts.filter(p => 
          p.location_id === parseInt(location_id));
      }
      
      if (!include_inactive) {
        filteredProducts = filteredProducts.filter(p => p.is_active);
      }
      
      // Apply sorting
      filteredProducts.sort((a, b) => {
        const aValue = a[sort_by];
        const bValue = b[sort_by];
        
        if (sort_order === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
      
      const result = {
        data: paginatedProducts,
        pagination: {
          total: filteredProducts.length,
          page: page,
          limit: limit,
          total_pages: Math.ceil(filteredProducts.length / limit)
        }
      };
      
      // Cache the result
      CACHE_CONFIG.productsCache.set(cacheKey, result);
      CACHE_CONFIG.lastCacheTime = Date.now();
      
      return result;
    }
  } catch (error) {
    logger.error('Error in getProducts:', error);
    throw error;
  }
};

/**
 * Create a new product
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
const createProduct = async (productData) => {
  try {
    console.log('DEBUG: unifiedInventoryService.createProduct - Starting product creation:', productData);
    logger.info('Creating product:', productData);
    
    // Ensure product_code is generated if not provided
    if (!productData.product_code) {
      productData.product_code = generateProductCode(productData.name);
      console.log('DEBUG: Generated product code:', productData.product_code);
    }

    // Prepare form data if there's an image file
    let requestData = productData;
    let headers = { ...getInventoryHeaders() };
    
    console.log('DEBUG: Using tenant headers:', headers);
    
    if (productData.image_file) {
      const formData = new FormData();
      Object.entries(productData).forEach(([key, value]) => {
        if (key === 'image_file') {
          formData.append('image', value);
        } else if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });
      requestData = formData;
      console.log('DEBUG: Using FormData for image upload');
      // Don't set Content-Type header; fetch will set it with boundary for FormData
    } else {
      headers['Content-Type'] = 'application/json';
      console.log('DEBUG: Using JSON content type');
    }
    
    // Make the product creation request
    console.log('DEBUG: Making API request to create product to /api/inventory/products/');
    const response = await apiService.post('/api/inventory/products/', requestData, {
      invalidateCache: ['/api/inventory/products/', '/api/inventory/ultra/products/'],
      headers
    });
    
    // Clear the cache after creating a product
    console.log('DEBUG: Product API response received:', response);
    clearProductCache();
    console.log('DEBUG: Product cache cleared');
    
    logger.info('Product created successfully:', response);
    return response;
  } catch (error) {
    console.error('DEBUG: Error creating product:', error);
    logger.error('Error creating product:', error);
    throw error;
  }
};

/**
 * Update a product
 * @param {string} id - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<Object>} Updated product
 */
const updateProduct = async (id, productData) => {
  if (!id) {
    logger.error('Product ID is required for update');
    throw new Error('Product ID is required for update');
  }
  
  try {
    logger.info(`Updating product ${id}:`, productData);
    
    // Prepare form data if there's an image file
    let requestData = productData;
    let headers = { ...getInventoryHeaders() };
    
    if (productData.image_file) {
      const formData = new FormData();
      Object.entries(productData).forEach(([key, value]) => {
        if (key === 'image_file') {
          formData.append('image', value);
        } else if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });
      requestData = formData;
      // Don't set Content-Type header; fetch will set it with boundary for FormData
    } else {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await apiService.put(`/api/inventory/products/${id}/`, requestData, {
      invalidateCache: [
        '/api/inventory/products/',
        '/api/inventory/ultra/products/',
        `/api/inventory/products/${id}/`
      ],
      headers
    });
    
    // Clear the cache after updating a product
    clearProductCache();
    
    return response;
  } catch (error) {
    logger.error(`Error updating product ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a product
 * @param {string} id - Product ID
 * @returns {Promise<boolean>} Success status
 */
const deleteProduct = async (id) => {
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
      ],
      headers: getInventoryHeaders()
    });
    
    // Clear the cache after deleting a product
    clearProductCache();
    
    return true;
  } catch (error) {
    logger.error(`Error deleting product ${id}:`, error);
    throw error;
  }
};

/**
 * Delete multiple products at once
 * @param {Array<string>} ids - Array of product IDs to delete
 * @returns {Promise<Object>} Result with success count and failed IDs
 */
const bulkDeleteProducts = async (ids) => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    logger.error('Valid array of product IDs is required for bulk deletion');
    throw new Error('Valid array of product IDs is required for bulk deletion');
  }
  
  try {
    logger.info(`Bulk deleting ${ids.length} products`);
    
    const response = await apiService.post('/api/inventory/products/bulk-delete/', { ids }, {
      invalidateCache: ['/api/inventory/products/', '/api/inventory/ultra/products/'],
      headers: getInventoryHeaders()
    });
    
    // Clear the cache after bulk deleting products
    clearProductCache();
    
    return response;
  } catch (error) {
    logger.error('Error bulk deleting products:', error);
    
    // If the API fails, try to delete products one by one
    const results = {
      success_count: 0,
      failed_ids: []
    };
    
    for (const id of ids) {
      try {
        await deleteProduct(id);
        results.success_count++;
      } catch (deleteError) {
        logger.error(`Error deleting product ${id}:`, deleteError);
        results.failed_ids.push(id);
      }
    }
    
    return results;
  }
};

/**
 * Import products from CSV/Excel file
 * @param {File} file - CSV/Excel file
 * @returns {Promise<Object>} Import results
 */
const importProducts = async (file) => {
  try {
    logger.info('Importing products from file:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiService.post('/api/inventory/products/import/', formData, {
      invalidateCache: ['/api/inventory/products/', '/api/inventory/ultra/products/'],
      headers: getInventoryHeaders()
    });
    
    // Clear the cache after importing products
    clearProductCache();
    
    return response;
  } catch (error) {
    logger.error('Error importing products:', error);
    throw error;
  }
};

/**
 * Export products to CSV/Excel
 * @param {string} format - Export format (csv or excel)
 * @param {Object} filters - Filters to apply before export
 * @returns {Promise<Blob>} File blob
 */
const exportProducts = async (format = 'csv', filters = {}) => {
  try {
    logger.info(`Exporting products as ${format}`, { filters });
    
    const queryParams = new URLSearchParams();
    queryParams.append('format', format);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const response = await apiService.get(
      `/api/inventory/products/export/?${queryParams.toString()}`,
      { 
        responseType: 'blob',
        headers: getInventoryHeaders()
      }
    );
    
    return response;
  } catch (error) {
    logger.error(`Error exporting products as ${format}:`, error);
    throw error;
  }
};

export const unifiedInventoryService = {
  getProducts,
  getProductStats,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
  importProducts,
  exportProducts,
  clearProductCache,
  clearAllCaches,
  getMockProducts
};

export default unifiedInventoryService; 