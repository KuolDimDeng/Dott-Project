import { getTenantId } from './tenantUtils';
import { logger } from './logger';

/**
 * Cache manager with tenant-aware keys
 * This utility ensures that cached data is properly isolated between tenants
 */
export class TenantAwareCache {
  constructor(namespace = 'app') {
    this.namespace = namespace;
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  /**
   * Generate a tenant-specific cache key
   * @param {string} key - The base cache key
   * @returns {string} The tenant-specific cache key
   */
  getTenantKey(key) {
    const tenantId = getTenantId() || 'default';
    return `${this.namespace}:${tenantId}:${key}`;
  }

  /**
   * Set a value in the cache with tenant isolation
   * @param {string} key - The cache key
   * @param {any} value - The value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    try {
      const tenantKey = this.getTenantKey(key);
      const expiresAt = Date.now() + ttl;
      
      this.cache.set(tenantKey, {
        value,
        expiresAt
      });
      
      logger.debug(`[Cache] Set: ${tenantKey}`, {
        ttl,
        expiresAt: new Date(expiresAt).toISOString()
      });
      
      return true;
    } catch (error) {
      logger.error(`[Cache] Error setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Get a value from the cache with tenant isolation
   * @param {string} key - The cache key
   * @returns {any|null} The cached value or null if not found or expired
   */
  get(key) {
    try {
      const tenantKey = this.getTenantKey(key);
      const cached = this.cache.get(tenantKey);
      
      // Return null if not in cache
      if (!cached) {
        logger.debug(`[Cache] Miss: ${tenantKey} (not found)`);
        return null;
      }
      
      // Check if expired
      if (cached.expiresAt < Date.now()) {
        logger.debug(`[Cache] Miss: ${tenantKey} (expired)`);
        this.cache.delete(tenantKey);
        return null;
      }
      
      logger.debug(`[Cache] Hit: ${tenantKey}`);
      return cached.value;
    } catch (error) {
      logger.error(`[Cache] Error getting ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value from the cache
   * @param {string} key - The cache key
   * @returns {boolean} True if deleted, false otherwise
   */
  delete(key) {
    try {
      const tenantKey = this.getTenantKey(key);
      const result = this.cache.delete(tenantKey);
      
      logger.debug(`[Cache] Delete: ${tenantKey}`, {
        success: result
      });
      
      return result;
    } catch (error) {
      logger.error(`[Cache] Error deleting ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all cached values for the current tenant
   * @returns {boolean} True if cleared, false otherwise
   */
  clearTenant() {
    try {
      const tenantId = getTenantId() || 'default';
      const prefix = `${this.namespace}:${tenantId}:`;
      
      let count = 0;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
          count++;
        }
      }
      
      logger.debug(`[Cache] Cleared tenant cache`, {
        tenantId,
        itemsCleared: count
      });
      
      return true;
    } catch (error) {
      logger.error('[Cache] Error clearing tenant cache:', error);
      return false;
    }
  }

  /**
   * Clear all cached values
   * @returns {boolean} True if cleared, false otherwise
   */
  clear() {
    try {
      this.cache.clear();
      logger.debug('[Cache] Cleared all cache');
      return true;
    } catch (error) {
      logger.error('[Cache] Error clearing cache:', error);
      return false;
    }
  }
}

// Create cache instances for different domains
export const inventoryCache = new TenantAwareCache('inventory');
export const userCache = new TenantAwareCache('user');
export const settingsCache = new TenantAwareCache('settings');

/**
 * Hook to use the tenant-aware cache in React components
 * @param {string} namespace - The cache namespace
 * @returns {Object} Cache methods
 */
export function useTenantCache(namespace = 'app') {
  const cache = new TenantAwareCache(namespace);
  
  return {
    get: cache.get.bind(cache),
    set: cache.set.bind(cache),
    delete: cache.delete.bind(cache),
    clearTenant: cache.clearTenant.bind(cache),
    clear: cache.clear.bind(cache)
  };
}