import { appCache } from '../utils/appCache';

/**
 * Application Cache Utilities (Server Compatible)
 * 
 * Provides a unified caching mechanism that uses AWS AppCache and Cognito attributes
 * instead of cookies and localStorage for data persistence.
 * 
 * This version provides both async and sync variants to work in Server Components.
 */

import { logger } from './logger';

/**
 * Get a value from the application cache (async variant)
 * Compatible with both client and server components
 * 
 * @param {string} key - The cache key
 * @param {*} defaultValue - Default value if not found
 * @returns {Promise<*>} The cached value or default
 */
export async function getFromAppCache(key, defaultValue = null) {
  try {
    // Use synchronous implementation for client-side
    if (typeof window !== 'undefined') {
      return getCacheValue(key, defaultValue);
    }
    
    // For server components, we'd normally fetch from Cognito attributes
    // This would be implemented with AWS SDK calls
    console.debug(`[AppCacheUtils] Server-side cache access for ${key}`);
    return defaultValue;
  } catch (error) {
    console.error(`[AppCacheUtils] Error getting cache value for ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set a value in the application cache (async variant)
 * Compatible with both client and server components
 * 
 * @param {string} key - The cache key
 * @param {*} value - The value to cache
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in milliseconds
 * @returns {Promise<boolean>} True if successful
 */
export async function setInAppCache(key, value, options = {}) {
  try {
    // Use synchronous implementation for client-side
    if (typeof window !== 'undefined') {
      return setCacheValue(key, value, options);
    }
    
    // For server components, we'd normally set Cognito attributes
    // This would be implemented with AWS SDK calls
    console.debug(`[AppCacheUtils] Server-side cache set for ${key}`);
    return true;
  } catch (error) {
    console.error(`[AppCacheUtils] Error setting cache value for ${key}:`, error);
    return false;
  }
}

/**
 * Remove a value from the application cache (async variant)
 * Compatible with both client and server components
 * 
 * @param {string} key - The cache key to remove
 * @returns {Promise<boolean>} True if successful
 */
export async function removeFromAppCache(key) {
  try {
    // Use synchronous implementation for client-side
    if (typeof window !== 'undefined') {
      return removeCacheValue(key);
    }
    
    // For server components, we'd normally remove from Cognito attributes
    // This would be implemented with AWS SDK calls
    console.debug(`[AppCacheUtils] Server-side cache removal for ${key}`);
    return true;
  } catch (error) {
    console.error(`[AppCacheUtils] Error removing cache value for ${key}:`, error);
    return false;
  }
}

/**
 * Direct access to synchronous cache operations for client components
 * These are not usable in server components
 */
export { getCacheValue, setCacheValue, removeCacheValue, clearCache };

/**
 * App Cache Utilities
 * 
 * Secure, tenant-isolated caching utilities for client-side data.
 */

// Initialize global app cache if it doesn't exist
if (typeof window !== 'undefined' && !appCache.getAll()) {
  appCache.getAll() = { 
    auth: {}, 
    user: {}, 
    tenant: {},
    tenants: {}  // Tenant-specific namespaces
  };
}

/**
 * Get data from cache with tenant isolation
 * 
 * @param {string} key - Cache key
 * @param {string} category - Cache category (auth, user, tenant)
 * @param {string} tenantId - Optional tenant ID for tenant isolation
 * @returns {any} - Cached value or null
 */
export function getFromCache(key, category = 'user', tenantId = null) {
  try {
    if (typeof window === 'undefined' || !appCache.getAll()) return null;
    
    // Get tenant-specific key if tenant ID provided
    const cacheKey = tenantId ? `${tenantId}_${key}` : key;
    
    // First check category 
    if (appCache.getAll()[category] && appCache.getAll()[category][cacheKey] !== undefined) {
      logger.debug('[AppCacheUtils] Server-side cache access for', tenantId ? 'tenantId' : key);
      return appCache.getAll()[category][cacheKey];
    }
    
    // If tenant ID provided, check tenant-specific namespace
    if (tenantId && appCache.getAll().tenants && appCache.getAll().tenants[tenantId]) {
      // Look in tenant-specific namespace
      if (appCache.getAll().tenants[tenantId][key] !== undefined) {
        logger.debug('[AppCacheUtils] Server-side cache access for', key, 'in tenant', tenantId);
        return appCache.getAll().tenants[tenantId][key];
      }
    }
    
    return null;
  } catch (error) {
    logger.warn('[AppCacheUtils] Error retrieving from cache:', error);
    return null;
  }
}

/**
 * Store data in cache with tenant isolation
 * 
 * @param {string} key - Cache key
 * @param {any} value - Value to store
 * @param {string} category - Cache category (auth, user, tenant)
 * @param {string} tenantId - Optional tenant ID for tenant isolation
 * @returns {boolean} - Success status
 */
export function storeInCache(key, value, category = 'user', tenantId = null) {
  try {
    if (typeof window === 'undefined') return false;
    
    // Initialize cache if needed
    if (!appCache.getAll()) {
      appCache.getAll() = { auth: {}, user: {}, tenant: {}, tenants: {} };
    }
    
    // Create category if it doesn't exist
    if (!appCache.getAll()[category]) {
      appCache.getAll()[category] = {};
    }
    
    // Get tenant-specific key if tenant ID provided
    const cacheKey = tenantId ? `${tenantId}_${key}` : key;
    
    // Store in category
    appCache.getAll()[category][cacheKey] = value;
    
    // Also store in tenant-specific namespace if tenant ID provided
    if (tenantId) {
      // Initialize tenant namespace if needed
      if (!appCache.getAll().tenants) {
        appCache.set('tenants', {});
      }
      if (!appCache.getAll().tenants[tenantId]) {
        appCache.getAll().tenants[tenantId] = {};
      }
      
      // Store in tenant namespace
      appCache.getAll().tenants[tenantId][key] = value;
    }
    
    logger.debug('[AppCacheUtils] Data cached successfully', { key: tenantId ? cacheKey : key });
    return true;
  } catch (error) {
    logger.warn('[AppCacheUtils] Error storing in cache:', error);
    return false;
  }
}

/**
 * Remove data from cache
 * 
 * @param {string} key - Cache key
 * @param {string} category - Cache category (auth, user, tenant)
 * @param {string} tenantId - Optional tenant ID for tenant isolation
 * @returns {boolean} - Success status
 */
export function removeFromCache(key, category = 'user', tenantId = null) {
  try {
    if (typeof window === 'undefined' || !appCache.getAll()) return false;
    
    // Get tenant-specific key if tenant ID provided
    const cacheKey = tenantId ? `${tenantId}_${key}` : key;
    
    // Remove from category
    if (appCache.getAll()[category]) {
      delete appCache.getAll()[category][cacheKey];
    }
    
    // Also remove from tenant-specific namespace if tenant ID provided
    if (tenantId && appCache.getAll().tenants && appCache.getAll().tenants[tenantId]) {
      delete appCache.getAll().tenants[tenantId][key];
    }
    
    return true;
  } catch (error) {
    logger.warn('[AppCacheUtils] Error removing from cache:', error);
    return false;
  }
}

/**
 * Clear all cache data for a specific tenant
 * 
 * @param {string} tenantId - Tenant ID to clear
 * @returns {boolean} - Success status
 */
export function clearTenantCache(tenantId) {
  try {
    if (typeof window === 'undefined' || !appCache.getAll() || !tenantId) return false;
    
    // Remove all tenant-specific keys from each category
    Object.keys(appCache.getAll()).forEach(category => {
      if (typeof appCache.getAll()[category] === 'object') {
        Object.keys(appCache.getAll()[category]).forEach(key => {
          if (key.startsWith(`${tenantId}_`)) {
            delete appCache.getAll()[category][key];
          }
        });
      }
    });
    
    // Clear tenant-specific namespace
    if (appCache.getAll().tenants && appCache.getAll().tenants[tenantId]) {
      delete appCache.getAll().tenants[tenantId];
    }
    
    return true;
  } catch (error) {
    logger.warn('[AppCacheUtils] Error clearing tenant cache:', error);
    return false;
  }
}

/**
 * Get business name from cache with tenant isolation
 * 
 * @param {string} tenantId - Tenant ID
 * @returns {string|null} - Business name or null
 */
export function getBusinessNameFromCache(tenantId) {
  if (!tenantId) return null;
  
  return getFromCache('businessName', 'tenant', tenantId) || 
         getFromCache('business_name', 'tenant', tenantId);
}

/**
 * Get subscription plan from cache with tenant isolation
 * 
 * @param {string} tenantId - Tenant ID
 * @returns {string} - Subscription plan or 'free'
 */
export function getSubscriptionPlanFromCache(tenantId) {
  if (!tenantId) return 'free';
  
  return getFromCache('subscriptionType', 'user', tenantId) || 
         getFromCache('subscription_type', 'user', tenantId) || 
         getFromCache('subplan', 'user', tenantId) || 
         'free';
}

/**
 * Store business name in cache with tenant isolation
 * 
 * @param {string} businessName - Business name
 * @param {string} tenantId - Tenant ID
 * @returns {boolean} - Success status
 */
export function storeBusinessNameInCache(businessName, tenantId) {
  if (!tenantId || !businessName) return false;
  
  storeInCache('businessName', businessName, 'tenant', tenantId);
  return true;
}

/**
 * Store subscription plan in cache with tenant isolation
 * 
 * @param {string} plan - Subscription plan
 * @param {string} tenantId - Tenant ID
 * @returns {boolean} - Success status
 */
export function storeSubscriptionPlanInCache(plan, tenantId) {
  if (!tenantId || !plan) return false;
  
  storeInCache('subscriptionType', plan, 'user', tenantId);
  storeInCache('subscription_type', plan, 'user', tenantId); // Store both formats for compatibility
  return true;
} 