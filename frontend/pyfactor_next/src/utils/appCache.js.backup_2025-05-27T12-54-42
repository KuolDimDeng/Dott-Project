/**
 * AWS App Cache Utility
 * 
 * This utility provides functions for storing and retrieving data from AWS App Cache.
 * It is used for storing authentication tokens and other sensitive data.
 */

import { logger } from './logger';

// Initialize AWS App Cache if available
let appCache = null;
try {
  if (typeof window !== 'undefined' && window.AWSCache) {
    appCache = window.AWSCache;
    logger.debug('[appCache] AWS App Cache initialized successfully');
  }
} catch (error) {
  logger.warn('[appCache] Failed to initialize AWS App Cache:', error);
}

/**
 * Set a value in the AWS App Cache
 * @param {string} key - The key to store the value under
 * @param {any} value - The value to store
 * @param {number} [ttl] - Time to live in seconds (optional)
 * @returns {Promise<void>}
 */
export async function setCacheValue(key, value, ttl) {
  try {
    if (!key) {
      throw new Error('Cache key is required');
    }

    if (appCache) {
      // Use AWS App Cache if available
      await appCache.set(key, value, ttl);
      logger.debug(`[appCache] Set value for key: ${key}`);
    } else {
      // Fallback to sessionStorage in development
      if (typeof window !== 'undefined') {
        const item = {
          value,
          timestamp: Date.now(),
          ttl: ttl ? ttl * 1000 : null // Convert seconds to milliseconds
        };
        window.sessionStorage.setItem(key, JSON.stringify(item));
        logger.debug(`[appCache] Set value in sessionStorage for key: ${key}`);
      }
    }
  } catch (error) {
    logger.error(`[appCache] Error setting cache value for key ${key}:`, error);
    throw error;
  }
}

/**
 * Get a value from the AWS App Cache
 * @param {string} key - The key to retrieve
 * @returns {Promise<any>} The cached value or null if not found/expired
 */
export async function getCacheValue(key) {
  try {
    if (!key) {
      throw new Error('Cache key is required');
    }

    if (appCache) {
      // Use AWS App Cache if available
      const value = await appCache.get(key);
      logger.debug(`[appCache] Retrieved value for key: ${key}`);
      return value;
    } else {
      // Fallback to sessionStorage in development
      if (typeof window !== 'undefined') {
        const item = window.sessionStorage.getItem(key);
        if (!item) return null;

        try {
          // Try to parse as JSON first (for structured cache entries)
          const parsed = JSON.parse(item);
          
          // If it's a structured cache entry with metadata
          if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
            const { value, timestamp, ttl } = parsed;
            
            // Check if item has expired
            if (ttl && Date.now() - timestamp > ttl) {
              window.sessionStorage.removeItem(key);
              logger.debug(`[appCache] Removed expired value for key: ${key}`);
              return null;
            }

            logger.debug(`[appCache] Retrieved structured value from sessionStorage for key: ${key}`);
            return value;
          } else {
            // If it's a simple JSON value, return the parsed result
            logger.debug(`[appCache] Retrieved JSON value from sessionStorage for key: ${key}`);
            return parsed;
          }
        } catch (parseError) {
          // If JSON parsing fails, it's likely a plain string (like a token)
          // Return the raw string value
          logger.debug(`[appCache] Retrieved raw string value from sessionStorage for key: ${key}`);
          return item;
        }
      }
    }
    return null;
  } catch (error) {
    logger.error(`[appCache] Error getting cache value for key ${key}:`, error);
    return null;
  }
}

/**
 * Remove a value from the AWS App Cache
 * @param {string} key - The key to remove
 * @returns {Promise<void>}
 */
export async function removeCacheValue(key) {
  try {
    if (!key) {
      throw new Error('Cache key is required');
    }

    if (appCache) {
      // Use AWS App Cache if available
      await appCache.remove(key);
      logger.debug(`[appCache] Removed value for key: ${key}`);
    } else {
      // Fallback to sessionStorage in development
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
        logger.debug(`[appCache] Removed value from sessionStorage for key: ${key}`);
      }
    }
  } catch (error) {
    logger.error(`[appCache] Error removing cache value for key ${key}:`, error);
    throw error;
  }
}

/**
 * Clear all values from the AWS App Cache
 * @returns {Promise<void>}
 */
export async function clearCache() {
  try {
    if (appCache) {
      // Use AWS App Cache if available
      await appCache.clear();
      logger.debug('[appCache] Cleared all values from AWS App Cache');
    } else {
      // Fallback to sessionStorage in development
      if (typeof window !== 'undefined') {
        window.sessionStorage.clear();
        logger.debug('[appCache] Cleared all values from sessionStorage');
      }
    }
  } catch (error) {
    logger.error('[appCache] Error clearing cache:', error);
    throw error;
  }
}

// Export aliases for backward compatibility
export const setAppCacheItem = setCacheValue;
export const getAppCacheItem = getCacheValue;
export const removeAppCacheItem = removeCacheValue;
export const clearAppCache = clearCache;

export default {
  setCacheValue,
  getCacheValue,
  removeCacheValue,
  clearCache,
  setAppCacheItem,
  getAppCacheItem,
  removeAppCacheItem,
  clearAppCache
};
