import { appCache } from '@/utils/appCache';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { inventoryCache } from '@/utils/cacheUtils';
import { getTenantId } from '@/utils/tenantUtils';

/**
 * Ultra-optimized service for inventory-related API calls
 * This service uses the ultra-optimized endpoints for maximum performance
 * and implements advanced caching and offline strategies
 */
export const ultraOptimizedInventoryService = {
  // Cache configuration
  CACHE_CONFIG: {
    // Cache TTLs in milliseconds
    ULTRA_LIST_TTL: 1 * 60 * 1000,       // 1 minute for ultra-fast list
    LIST_WITH_DEPT_TTL: 3 * 60 * 1000,   // 3 minutes for list with department
    STATS_TTL: 5 * 60 * 1000,            // 5 minutes for stats
    DETAIL_TTL: 10 * 60 * 1000,          // 10 minutes for detail
    STALE_WHILE_REVALIDATE: true,        // Enable stale-while-revalidate pattern
    PREFETCH_ON_IDLE: true,              // Enable prefetching when browser is idle
  },

  /**
   * Get ultra-fast product list (minimal fields)
   * Uses the ultra-optimized endpoint that returns only essential data
   * @param {Object} options - Query options
   * @param {boolean} useCache - Whether to use cached data if available
   * @returns {Promise<Object>} Paginated list of products with minimal fields
   */
  async getUltraFastProducts(options = {}, useCache = true) {
    // Build query string from options
    const queryParams = new URLSearchParams();
    if (options.page) queryParams.append('page', options.page);
    if (options.is_for_sale !== undefined) queryParams.append('is_for_sale', options.is_for_sale);
    if (options.min_stock !== undefined) queryParams.append('min_stock', options.min_stock);
    if (options.search) queryParams.append('search', options.search);
    if (options.department) queryParams.append('department', options.department);
    
    const queryString = queryParams.toString();
    const cacheKey = `ultra_products_${queryString || 'default'}`;
    
    try {
      // Try to get from cache first if useCache is true
      if (useCache) {
        const cachedData = inventoryCache.get(cacheKey);
        if (cachedData) {
          logger.debug(`Using cached ultra-fast products data for query: ${queryString}`);
          
          // If stale-while-revalidate is enabled and we have cached data,
          // trigger a background refresh but immediately return cached data
          if (this.CACHE_CONFIG.STALE_WHILE_REVALIDATE) {
            this._refreshInBackground('ultra_list', cacheKey, options);
          }
          
          return cachedData;
        }
      }
      
      // If not in cache or useCache is false, fetch from API
      const url = `/api/inventory/ultra/products/${queryString ? `?${queryString}` : ''}`;
      const response = await axiosInstance.get(url, {
        timeout: 5000 // 5 second timeout for ultra-fast response
      });
      
      // Cache the response data with ultra list TTL
      if (response.data) {
        inventoryCache.set(cacheKey, response.data, this.CACHE_CONFIG.ULTRA_LIST_TTL);
      }
      
      return response.data;
    } catch (error) {
      logger.error(`Error fetching ultra-fast products: ${error}`);
      throw error;
    }
  },

  /**
   * Get product list with department information
   * Uses the optimized endpoint that includes department data
   * @param {Object} options - Query options
   * @param {boolean} useCache - Whether to use cached data if available
   * @returns {Promise<Object>} Paginated list of products with department info
   */
  async getProductsWithDepartment(options = {}, useCache = true) {
    // Build query string from options
    const queryParams = new URLSearchParams();
    if (options.page) queryParams.append('page', options.page);
    if (options.is_for_sale !== undefined) queryParams.append('is_for_sale', options.is_for_sale);
    if (options.min_stock !== undefined) queryParams.append('min_stock', options.min_stock);
    if (options.search) queryParams.append('search', options.search);
    if (options.department) queryParams.append('department', options.department);
    
    const queryString = queryParams.toString();
    const cacheKey = `products_with_dept_${queryString || 'default'}`;
    
    try {
      // Try to get from cache first if useCache is true
      if (useCache) {
        const cachedData = inventoryCache.get(cacheKey);
        if (cachedData) {
          logger.debug(`Using cached products with department data for query: ${queryString}`);
          
          // If stale-while-revalidate is enabled and we have cached data,
          // trigger a background refresh but immediately return cached data
          if (this.CACHE_CONFIG.STALE_WHILE_REVALIDATE) {
            this._refreshInBackground('list_with_dept', cacheKey, options);
          }
          
          return cachedData;
        }
      }
      
      // If not in cache or useCache is false, fetch from API
      const url = `/api/inventory/ultra/products/with-department/${queryString ? `?${queryString}` : ''}`;
      const response = await axiosInstance.get(url, {
        timeout: 8000 // 8 second timeout
      });
      
      // Cache the response data with list with department TTL
      if (response.data) {
        inventoryCache.set(cacheKey, response.data, this.CACHE_CONFIG.LIST_WITH_DEPT_TTL);
      }
      
      return response.data;
    } catch (error) {
      logger.error(`Error fetching products with department: ${error}`);
      throw error;
    }
  },

  /**
   * Get product statistics
   * Uses the stats endpoint for dashboard widgets
   * @param {boolean} useCache - Whether to use cached data if available
   * @returns {Promise<Object>} Product statistics
   */
  async getProductStats(useCache = true) {
    const cacheKey = 'product_stats';
    
    try {
      // Try to get from cache first if useCache is true
      if (useCache) {
        const cachedData = inventoryCache.get(cacheKey);
        if (cachedData) {
          logger.debug('Using cached product stats data');
          
          // If stale-while-revalidate is enabled and we have cached data,
          // trigger a background refresh but immediately return cached data
          if (this.CACHE_CONFIG.STALE_WHILE_REVALIDATE) {
            this._refreshInBackground('stats', cacheKey);
          }
          
          return cachedData;
        }
      }
      
      // If not in cache or useCache is false, fetch from API
      const response = await axiosInstance.get('/api/inventory/ultra/products/stats/', {
        timeout: 10000 // 10 second timeout for stats endpoint
      });
      
      // Cache the response data with stats TTL
      if (response.data) {
        inventoryCache.set(cacheKey, response.data, this.CACHE_CONFIG.STATS_TTL);
      }
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching product stats:', error);
      throw error;
    }
  },

  /**
   * Get product by code (e.g., for barcode scanning)
   * Uses the product by code endpoint for fast lookups
   * @param {string} productCode - The product code to look up
   * @param {boolean} useCache - Whether to use cached data if available
   * @returns {Promise<Object>} The product details
   */
  async getProductByCode(productCode, useCache = true) {
    const cacheKey = `product_code_${productCode}`;
    
    try {
      // Try to get from cache first if useCache is true
      if (useCache) {
        const cachedData = inventoryCache.get(cacheKey);
        if (cachedData) {
          logger.debug(`Using cached product data for code: ${productCode}`);
          
          // If stale-while-revalidate is enabled and we have cached data,
          // trigger a background refresh but immediately return cached data
          if (this.CACHE_CONFIG.STALE_WHILE_REVALIDATE) {
            this._refreshInBackground('product_code', cacheKey, { productCode });
          }
          
          return cachedData;
        }
      }
      
      // If not in cache or useCache is false, fetch from API
      const response = await axiosInstance.get(`/api/inventory/ultra/products/code/${productCode}/`, {
        timeout: 5000 // 5 second timeout for code lookup
      });
      
      // Cache the response data with detail TTL
      if (response.data) {
        inventoryCache.set(cacheKey, response.data, this.CACHE_CONFIG.DETAIL_TTL);
      }
      
      return response.data;
    } catch (error) {
      logger.error(`Error fetching product by code ${productCode}:`, error);
      throw error;
    }
  },

  /**
   * Prefetch and cache products
   * This can be called on app initialization to preload data
   * @returns {Promise<void>}
   */
  async prefetchEssentialData() {
    try {
      logger.debug('Prefetching essential inventory data');
      
      // Prefetch first page of ultra-fast products
      this.getUltraFastProducts({}, false).catch(err => {
        logger.warn('Failed to prefetch ultra-fast products:', err);
      });
      
      // Prefetch product stats
      this.getProductStats(false).catch(err => {
        logger.warn('Failed to prefetch product stats:', err);
      });
      
      // Schedule prefetching of additional data when browser is idle
      if (this.CACHE_CONFIG.PREFETCH_ON_IDLE && typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          logger.debug('Prefetching additional data during browser idle time');
          
          // Prefetch products with department during idle time
          this.getProductsWithDepartment({}, false).catch(err => {
            logger.warn('Failed to prefetch products with department:', err);
          });
        }, { timeout: 5000 });
      }
  } catch (error) {
      logger.error('Error prefetching essential data:', error);
    }
  },

  /**
   * Clear product cache
   * This should be called after any create, update, or delete operation
   */
  clearProductCache() {
    logger.debug('Clearing ultra product cache');
    
    // Get all cache keys for the current tenant
    const tenantId = getTenantId() || 'default';
    
    // Clear all product-related cache entries from memory cache
    inventoryCache.clearTenant();
    
    // Clear from app cache if available
    if (typeof window !== 'undefined' && appCache.getAll()) {
      delete appCache.getAll().offline[`ultra_products_${tenantId}`];
      logger.debug('Cleared ultra product cache from APP_CACHE');
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
      // Ensure app cache is initialized
      const cacheData = appCache.getAll() || {};
      if (!cacheData.offline) {
        cacheData.offline = {};
      }
      
      cacheData.offline[`ultra_products_${tenantId}`] = offlineData;
      appCache.set('offline.ultra_products_' + tenantId, offlineData);
      
      logger.debug(`Stored ${products.length} ultra products in APP_CACHE for offline use`);
    } catch (error) {
      logger.error('Error storing ultra products offline:', error);
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
      
      const offlineData = appCache.getAll().offline[`ultra_products_${tenantId}`];
      
      if (!offlineData) {
        return [];
      }
      
      // Check if data is stale (older than 24 hours)
      const isStale = Date.now() - offlineData.timestamp > 24 * 60 * 60 * 1000;
      if (isStale) {
        logger.warn('Ultra offline product data is stale (>24h old)');
      }
      
      return offlineData.products || [];
    } catch (error) {
      logger.error('Error retrieving ultra offline products:', error);
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
          case 'ultra_list':
            const ultraQueryParams = new URLSearchParams();
            if (options.page) ultraQueryParams.append('page', options.page);
            if (options.is_for_sale !== undefined) ultraQueryParams.append('is_for_sale', options.is_for_sale);
            if (options.min_stock !== undefined) ultraQueryParams.append('min_stock', options.min_stock);
            if (options.search) ultraQueryParams.append('search', options.search);
            if (options.department) ultraQueryParams.append('department', options.department);
            
            const ultraQueryString = ultraQueryParams.toString();
            const ultraUrl = `/api/inventory/ultra/products/${ultraQueryString ? `?${ultraQueryString}` : ''}`;
            
            response = await axiosInstance.get(ultraUrl, {
              timeout: 5000
            });
            if (response.data) {
              inventoryCache.set(cacheKey, response.data, this.CACHE_CONFIG.ULTRA_LIST_TTL);
              logger.debug('Background refresh of ultra-fast products completed');
            }
            break;
            
          case 'list_with_dept':
            const deptQueryParams = new URLSearchParams();
            if (options.page) deptQueryParams.append('page', options.page);
            if (options.is_for_sale !== undefined) deptQueryParams.append('is_for_sale', options.is_for_sale);
            if (options.min_stock !== undefined) deptQueryParams.append('min_stock', options.min_stock);
            if (options.search) deptQueryParams.append('search', options.search);
            if (options.department) deptQueryParams.append('department', options.department);
            
            const deptQueryString = deptQueryParams.toString();
            const deptUrl = `/api/inventory/ultra/products/with-department/${deptQueryString ? `?${deptQueryString}` : ''}`;
            
            response = await axiosInstance.get(deptUrl, {
              timeout: 8000
            });
            if (response.data) {
              inventoryCache.set(cacheKey, response.data, this.CACHE_CONFIG.LIST_WITH_DEPT_TTL);
              logger.debug('Background refresh of products with department completed');
            }
            break;
            
          case 'stats':
            response = await axiosInstance.get('/api/inventory/ultra/products/stats/', {
              timeout: 10000
            });
            if (response.data) {
              inventoryCache.set(cacheKey, response.data, this.CACHE_CONFIG.STATS_TTL);
              logger.debug('Background refresh of product stats completed');
            }
            break;
            
          case 'product_code':
            response = await axiosInstance.get(`/api/inventory/ultra/products/code/${options.productCode}/`, {
              timeout: 5000
            });
            if (response.data) {
              inventoryCache.set(cacheKey, response.data, this.CACHE_CONFIG.DETAIL_TTL);
              logger.debug(`Background refresh of product by code ${options.productCode} completed`);
            }
            break;
        }
      } catch (error) {
        logger.warn(`Background refresh failed for ${type} data:`, error);
      }
  }, 100);
  }
};