import { appCache } from '@/utils/appCache';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { inventoryCache } from '@/utils/cacheUtils';
import { getTenantId } from '@/utils/tenantUtils';

/**
 * Enhanced service for inventory-related API calls using optimized endpoints
 * This service implements advanced caching strategies and uses the new optimized backend endpoints
 */
export const optimizedInventoryService = {
  // Cache configuration
  CACHE_CONFIG: {
    // Cache TTLs in milliseconds
    SUMMARY_TTL: 2 * 60 * 1000,       // 2 minutes for summary data
    LIST_TTL: 5 * 60 * 1000,          // 5 minutes for list data
    DETAIL_TTL: 10 * 60 * 1000,       // 10 minutes for detail data
    STALE_WHILE_REVALIDATE: true,     // Enable stale-while-revalidate pattern
  },

  /**
   * Get product summary (lightweight list)
   * Uses the optimized summary endpoint that returns minimal data
   * @param {boolean} useCache - Whether to use cached data if available
   * @returns {Promise<Array>} List of product summaries
   */
  async getProductSummary(useCache = true) {
    const cacheKey = 'product_summary';
    
    try {
      // Try to get from cache first if useCache is true
      if (useCache) {
        const cachedData = inventoryCache.get(cacheKey);
        if (cachedData) {
          logger.debug('Using cached product summary data');
          
          // If stale-while-revalidate is enabled and we have cached data,
          // trigger a background refresh but immediately return cached data
          if (this.CACHE_CONFIG.STALE_WHILE_REVALIDATE) {
            this._refreshInBackground('summary', cacheKey);
          }
          
          return cachedData;
        }
      }
      
      // If not in cache or useCache is false, fetch from API
      const response = await axiosInstance.get('/api/inventory/optimized/products/summary/', {
        timeout: 10000 // 10 second timeout for summary endpoint
      });
      
      // Cache the response data with summary TTL
      if (response.data && response.data.results) {
        inventoryCache.set(cacheKey, response.data.results, this.CACHE_CONFIG.SUMMARY_TTL);
      }
      
      return response.data.results || [];
    } catch (error) {
      logger.error('Error fetching product summary:', error);
      throw error;
    }
  },

  /**
   * Get optimized product list
   * Uses the new optimized endpoint with pagination and lightweight serializer
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {boolean} options.is_for_sale - Filter by is_for_sale
   * @param {number} options.min_stock - Filter by minimum stock
   * @param {boolean} useCache - Whether to use cached data if available
   * @returns {Promise<Object>} Paginated list of products
   */
  async getOptimizedProducts(options = {}, useCache = true) {
    // Build query string from options
    const queryParams = new URLSearchParams();
    if (options.page) queryParams.append('page', options.page);
    if (options.is_for_sale !== undefined) queryParams.append('is_for_sale', options.is_for_sale);
    if (options.min_stock !== undefined) queryParams.append('min_stock', options.min_stock);
    
    const queryString = queryParams.toString();
    const cacheKey = `optimized_products_${queryString || 'default'}`;
    
    try {
      // Try to get from cache first if useCache is true
      if (useCache) {
        const cachedData = inventoryCache.get(cacheKey);
        if (cachedData) {
          logger.debug(`Using cached optimized products data for query: ${queryString}`);
          
          // If stale-while-revalidate is enabled and we have cached data,
          // trigger a background refresh but immediately return cached data
          if (this.CACHE_CONFIG.STALE_WHILE_REVALIDATE) {
            this._refreshInBackground('products', cacheKey, options);
          }
          
          return cachedData;
        }
      }
      
      // If not in cache or useCache is false, fetch from API
      const url = `/api/inventory/optimized/products/${queryString ? `?${queryString}` : ''}`;
      const response = await axiosInstance.get(url, {
        timeout: 15000 // 15 second timeout
      });
      
      // Cache the response data with list TTL
      if (response.data) {
        inventoryCache.set(cacheKey, response.data, this.CACHE_CONFIG.LIST_TTL);
      }
      
      return response.data;
    } catch (error) {
      logger.error(`Error fetching optimized products: ${error}`);
      throw error;
    }
  },

  /**
   * Get product details by ID using optimized endpoint
   * @param {string} productId - The product ID
   * @param {boolean} useCache - Whether to use cached data if available
   * @returns {Promise<Object>} The product details
   */
  async getProductById(productId, useCache = true) {
    const cacheKey = `product_detail_${productId}`;
    
    try {
      // Try to get from cache first if useCache is true
      if (useCache) {
        const cachedData = inventoryCache.get(cacheKey);
        if (cachedData) {
          logger.debug(`Using cached product detail data for ID: ${productId}`);
          
          // If stale-while-revalidate is enabled and we have cached data,
          // trigger a background refresh but immediately return cached data
          if (this.CACHE_CONFIG.STALE_WHILE_REVALIDATE) {
            this._refreshInBackground('detail', cacheKey, { productId });
          }
          
          return cachedData;
        }
      }
      
      // If not in cache or useCache is false, fetch from API
      const response = await axiosInstance.get(`/api/inventory/optimized/products/${productId}/`, {
        timeout: 10000 // 10 second timeout for detail endpoint
      });
      
      // Cache the response data with detail TTL
      if (response.data) {
        inventoryCache.set(cacheKey, response.data, this.CACHE_CONFIG.DETAIL_TTL);
      }
      
      return response.data;
    } catch (error) {
      logger.error(`Error fetching product detail for ID ${productId}:`, error);
      throw error;
    }
  },

  /**
   * Prefetch and cache products
   * This can be called on app initialization to preload data
   * @returns {Promise<void>}
   */
  async prefetchProducts() {
    try {
      logger.debug('Prefetching product data');
      
      // Prefetch summary data
      this.getProductSummary(false).catch(err => {
        logger.warn('Failed to prefetch product summary:', err);
      });
      
      // Prefetch first page of products
      this.getOptimizedProducts({}, false).catch(err => {
        logger.warn('Failed to prefetch product list:', err);
      });
    } catch (error) {
      logger.error('Error prefetching products:', error);
    }
  },

  /**
   * Clear product cache
   * This should be called after any create, update, or delete operation
   */
  clearProductCache() {
    logger.debug('Clearing product cache');
    
    // Get all cache keys for the current tenant
    const tenantId = getTenantId() || 'default';
    const prefix = `inventory:${tenantId}:`;
    
    // Clear all product-related cache entries from memory cache
    inventoryCache.clearTenant();
    
    // Clear from app cache if available
    if (typeof window !== "undefined" && appCache.getAll()) {
      if (appCache.get('offline.products')) {
        appCache.remove('offline.products');
      }
      logger.debug('Cleared product cache from APP_CACHE');
    }
  },

  /**
   * Store product data in app cache for offline access
   * @param {Array} products - List of products to store
   */
  storeProductsOffline(products) {
    try {
      if (!Array.isArray(products) || products.length === 0) {
        return;
      }
      
      const tenantId = getTenantId() || 'default';
      
      // Skip if window is not available
      if (typeof window === 'undefined') {
        return;
      }
      
      // Store with timestamp
      const offlineData = {
        timestamp: Date.now(),
        products: products
      };
      
      // Initialize app cache
      if (!appCache.getAll()) {
        appCache.init({});
      }
      if (!appCache.get('offline')) appCache.set('offline', {});
      appCache.getAll().offline[`products_${tenantId}`] = offlineData;
      
      logger.debug(`Stored ${products.length} products in APP_CACHE for offline use`);
    } catch (error) {
      logger.error('Error storing products offline:', error);
    }
  },

  /**
   * Get offline product data
   * @returns {Array} List of products from offline storage
   */
  getOfflineProducts() {
    try {
      // Skip if window is not available
      if (typeof window === 'undefined') {
        return [];
      }
      
      const tenantId = getTenantId() || 'default';
      
      // Check if app cache exists
      if (!appCache.getAll()) {
        return [];
      }
      
      const offlineData = appCache.getAll().offline[`products_${tenantId}`];
      
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
  },

  /**
   * Private method to refresh data in the background (stale-while-revalidate pattern)
   * @private
   */
  async _refreshInBackground(type, cacheKey, options = {}) {
    // Use setTimeout to make this non-blocking
    setTimeout(async () => {
      try {
        logger.debug(`Background refresh for ${type} data: ${cacheKey}`);
        
        let response;
        switch (type) {
          case 'summary':
            response = await axiosInstance.get('/api/inventory/optimized/products/summary/', {
              timeout: 10000
            });
            if (response.data && response.data.results) {
              inventoryCache.set(cacheKey, response.data.results, this.CACHE_CONFIG.SUMMARY_TTL);
              logger.debug('Background refresh of product summary completed');
            }
            break;
            
          case 'products':
            const queryParams = new URLSearchParams();
            if (options.page) queryParams.append('page', options.page);
            if (options.is_for_sale !== undefined) queryParams.append('is_for_sale', options.is_for_sale);
            if (options.min_stock !== undefined) queryParams.append('min_stock', options.min_stock);
            
            const queryString = queryParams.toString();
            const url = `/api/inventory/optimized/products/${queryString ? `?${queryString}` : ''}`;
            
            response = await axiosInstance.get(url, {
              timeout: 15000
            });
            if (response.data) {
              inventoryCache.set(cacheKey, response.data, this.CACHE_CONFIG.LIST_TTL);
              logger.debug('Background refresh of product list completed');
            }
            break;
            
          case 'detail':
            response = await axiosInstance.get(`/api/inventory/optimized/products/${options.productId}/`, {
              timeout: 10000
            });
            if (response.data) {
              inventoryCache.set(cacheKey, response.data, this.CACHE_CONFIG.DETAIL_TTL);
              logger.debug(`Background refresh of product detail for ID ${options.productId} completed`);
            }
            break;
        }
      } catch (error) {
        logger.warn(`Background refresh failed for ${type} data:`, error);
      }
    }, 100);
  }
};
