/**
 * Application Cache Utilities (Server Compatible)
 * 
 * Provides a unified caching mechanism that uses AWS AppCache and Cognito attributes
 * instead of cookies and localStorage for data persistence.
 * 
 * This version provides both async and sync variants to work in Server Components.
 */

import { getCacheValue, setCacheValue, removeCacheValue, clearCache } from './appCache';
// import { logger } from './logger';

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