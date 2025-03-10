import { getTenantContext } from './tenantContext';
import { logger } from './logger';

/**
 * EnhancedTenantCache - Improved caching with tenant isolation and versioning
 * This cache implementation provides better tenant isolation, versioning,
 * and invalidation patterns for more reliable caching in a multi-tenant environment.
 */
export class EnhancedTenantCache {
  /**
   * Create a new cache instance
   * @param {string} namespace - Namespace for this cache
   * @param {Object} options - Cache options
   * @param {number} options.defaultTTL - Default TTL in milliseconds
   * @param {boolean} options.persistToStorage - Whether to persist cache to localStorage
   */
  constructor(namespace, options = {}) {
    this.namespace = namespace;
    this.cache = new Map();
    this.options = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      persistToStorage: true,
      ...options
    };
    
    // Initialize from localStorage if enabled
    if (this.options.persistToStorage && typeof window !== 'undefined') {
      this._loadFromStorage();
    }
  }
  
  /**
   * Generate a tenant-specific cache key
   * @param {string} key - Base key
   * @param {Object} params - Additional parameters to include in the key
   * @returns {string} Tenant-specific cache key
   */
  getKey(key, params = {}) {
    const { tenantId } = getTenantContext();
    const paramString = params ? JSON.stringify(params) : '';
    return `${this.namespace}:${tenantId || 'default'}:${key}${paramString ? `:${paramString}` : ''}`;
  }
  
  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {Object} params - Additional parameters for the key
   * @param {number} ttl - Time to live in milliseconds
   * @returns {boolean} Success
   */
  set(key, value, params = {}, ttl = this.options.defaultTTL) {
    try {
      const cacheKey = this.getKey(key, params);
      const now = Date.now();
      
      const entry = {
        value,
        version: now,
        expiresAt: now + ttl
      };
      
      this.cache.set(cacheKey, entry);
      
      // Persist to localStorage if enabled
      if (this.options.persistToStorage && typeof window !== 'undefined') {
        this._saveToStorage(cacheKey, entry);
      }
      
      logger.debug(`[EnhancedCache] Set: ${cacheKey}`, {
        ttl,
        expiresAt: new Date(entry.expiresAt).toISOString()
      });
      
      return true;
    } catch (error) {
      logger.error(`[EnhancedCache] Error setting ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @param {Object} params - Additional parameters for the key
   * @param {Object} options - Get options
   * @param {number} options.maxAge - Maximum age of the cached value
   * @param {boolean} options.allowExpired - Whether to return expired values
   * @returns {any|null} Cached value or null
   */
  get(key, params = {}, options = {}) {
    try {
      const cacheKey = this.getKey(key, params);
      const entry = this.cache.get(cacheKey);
      
      // Return null if not in cache
      if (!entry) {
        logger.debug(`[EnhancedCache] Miss: ${cacheKey} (not found)`);
        return null;
      }
      
      const now = Date.now();
      
      // Check if expired
      if (!options.allowExpired && entry.expiresAt < now) {
        logger.debug(`[EnhancedCache] Miss: ${cacheKey} (expired)`);
        this.cache.delete(cacheKey);
        
        // Remove from localStorage if enabled
        if (this.options.persistToStorage && typeof window !== 'undefined') {
          this._removeFromStorage(cacheKey);
        }
        
        return null;
      }
      
      // Check max age if provided
      if (options.maxAge && (now - entry.version > options.maxAge)) {
        logger.debug(`[EnhancedCache] Miss: ${cacheKey} (too old)`);
        return null;
      }
      
      logger.debug(`[EnhancedCache] Hit: ${cacheKey}`);
      return entry.value;
    } catch (error) {
      logger.error(`[EnhancedCache] Error getting ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   * @param {Object} params - Additional parameters for the key
   * @returns {boolean} Success
   */
  delete(key, params = {}) {
    try {
      const cacheKey = this.getKey(key, params);
      const result = this.cache.delete(cacheKey);
      
      // Remove from localStorage if enabled
      if (this.options.persistToStorage && typeof window !== 'undefined') {
        this._removeFromStorage(cacheKey);
      }
      
      logger.debug(`[EnhancedCache] Delete: ${cacheKey}`, { success: result });
      
      return result;
    } catch (error) {
      logger.error(`[EnhancedCache] Error deleting ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Invalidate cache entries by pattern
   * @param {string} pattern - Pattern to match against keys
   * @returns {number} Number of entries invalidated
   */
  invalidatePattern(pattern) {
    try {
      const { tenantId } = getTenantContext();
      const prefix = `${this.namespace}:${tenantId || 'default'}:${pattern}`;
      
      let count = 0;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
          
          // Remove from localStorage if enabled
          if (this.options.persistToStorage && typeof window !== 'undefined') {
            this._removeFromStorage(key);
          }
          
          count++;
        }
      }
      
      logger.debug(`[EnhancedCache] Invalidated ${count} entries matching pattern: ${pattern}`);
      
      return count;
    } catch (error) {
      logger.error(`[EnhancedCache] Error invalidating pattern ${pattern}:`, error);
      return 0;
    }
  }
  
  /**
   * Clear all cache entries for the current tenant
   * @returns {number} Number of entries cleared
   */
  clearTenant() {
    try {
      const { tenantId } = getTenantContext();
      const prefix = `${this.namespace}:${tenantId || 'default'}:`;
      
      let count = 0;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
          
          // Remove from localStorage if enabled
          if (this.options.persistToStorage && typeof window !== 'undefined') {
            this._removeFromStorage(key);
          }
          
          count++;
        }
      }
      
      logger.debug(`[EnhancedCache] Cleared ${count} entries for tenant: ${tenantId || 'default'}`);
      
      return count;
    } catch (error) {
      logger.error('[EnhancedCache] Error clearing tenant cache:', error);
      return 0;
    }
  }
  
  /**
   * Clear all cache entries
   * @returns {boolean} Success
   */
  clear() {
    try {
      this.cache.clear();
      
      // Clear localStorage if enabled
      if (this.options.persistToStorage && typeof window !== 'undefined') {
        this._clearStorage();
      }
      
      logger.debug('[EnhancedCache] Cleared all cache entries');
      
      return true;
    } catch (error) {
      logger.error('[EnhancedCache] Error clearing cache:', error);
      return false;
    }
  }
  
  /**
   * Save entry to localStorage
   * @private
   */
  _saveToStorage(key, entry) {
    try {
      localStorage.setItem(`cache:${key}`, JSON.stringify({
        value: entry.value,
        version: entry.version,
        expiresAt: entry.expiresAt
      }));
    } catch (error) {
      logger.warn(`[EnhancedCache] Failed to save to localStorage: ${error.message}`);
    }
  }
  
  /**
   * Remove entry from localStorage
   * @private
   */
  _removeFromStorage(key) {
    try {
      localStorage.removeItem(`cache:${key}`);
    } catch (error) {
      logger.warn(`[EnhancedCache] Failed to remove from localStorage: ${error.message}`);
    }
  }
  
  /**
   * Clear all entries from localStorage
   * @private
   */
  _clearStorage() {
    try {
      const prefix = `cache:${this.namespace}:`;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      logger.warn(`[EnhancedCache] Failed to clear localStorage: ${error.message}`);
    }
  }
  
  /**
   * Load entries from localStorage
   * @private
   */
  _loadFromStorage() {
    try {
      const prefix = `cache:${this.namespace}:`;
      const now = Date.now();
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          try {
            const rawData = localStorage.getItem(key);
            if (rawData) {
              const data = JSON.parse(rawData);
              
              // Skip expired entries
              if (data.expiresAt < now) {
                localStorage.removeItem(key);
                continue;
              }
              
              // Add to in-memory cache
              const cacheKey = key.substring(6); // Remove 'cache:' prefix
              this.cache.set(cacheKey, {
                value: data.value,
                version: data.version,
                expiresAt: data.expiresAt
              });
            }
          } catch (parseError) {
            // Remove invalid entries
            localStorage.removeItem(key);
          }
        }
      }
      
      logger.debug(`[EnhancedCache] Loaded ${this.cache.size} entries from localStorage`);
    } catch (error) {
      logger.warn(`[EnhancedCache] Failed to load from localStorage: ${error.message}`);
    }
  }
}

// Create cache instances for different domains
export const dataCache = new EnhancedTenantCache('data', {
  defaultTTL: 5 * 60 * 1000 // 5 minutes
});

export const inventoryCache = new EnhancedTenantCache('inventory', {
  defaultTTL: 3 * 60 * 1000 // 3 minutes
});

export const userCache = new EnhancedTenantCache('user', {
  defaultTTL: 10 * 60 * 1000 // 10 minutes
});

export const settingsCache = new EnhancedTenantCache('settings', {
  defaultTTL: 15 * 60 * 1000 // 15 minutes
});

/**
 * React hook for using the enhanced tenant cache
 * @param {string} namespace - Cache namespace
 * @param {Object} options - Cache options
 * @returns {Object} Cache methods
 */
export function useEnhancedCache(namespace = 'app', options = {}) {
  const cache = new EnhancedTenantCache(namespace, options);
  
  return {
    getKey: cache.getKey.bind(cache),
    get: cache.get.bind(cache),
    set: cache.set.bind(cache),
    delete: cache.delete.bind(cache),
    invalidatePattern: cache.invalidatePattern.bind(cache),
    clearTenant: cache.clearTenant.bind(cache),
    clear: cache.clear.bind(cache)
  };
}