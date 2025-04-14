/**
 * App Cache utility functions
 * This module provides a wrapper for AWS App Cache to store and retrieve data
 * It uses AWS Amplify cache methods or falls back to memory cache if not available
 */

import { logger } from './logger';

// In-memory fallback cache for when AWS App Cache is not available
const memoryCache = new Map();

/**
 * Store a value in AWS App Cache
 * @param {string} key - The key to store the value under
 * @param {any} value - The value to store
 * @param {number} [ttl=86400] - Time to live in seconds (default 24 hours)
 * @returns {Promise<void>}
 */
export const setInAppCache = async (key, value, ttl = 86400) => {
  try {
    // Try to use AWS Amplify Cache if available
    if (typeof window !== 'undefined' && window.AWS && window.AWS.Cache) {
      await window.AWS.Cache.setItem(key, value, { ttl });
      logger.debug(`[AppCache] Stored value for key: ${key}`);
    } else {
      // Fall back to memory cache
      memoryCache.set(key, {
        value,
        expires: Date.now() + (ttl * 1000)
      });
      logger.debug(`[AppCache] Stored value in memory cache for key: ${key}`);
    }
  } catch (error) {
    logger.error(`[AppCache] Error storing value for key ${key}:`, error);
    // Fall back to memory cache on error
    memoryCache.set(key, {
      value,
      expires: Date.now() + (ttl * 1000)
    });
  }
};

/**
 * Retrieve a value from AWS App Cache
 * @param {string} key - The key to retrieve
 * @returns {Promise<any>} The stored value, or null if not found
 */
export const getFromAppCache = async (key) => {
  try {
    // Try to use AWS Amplify Cache if available
    if (typeof window !== 'undefined' && window.AWS && window.AWS.Cache) {
      const result = await window.AWS.Cache.getItem(key);
      return result;
    } else {
      // Fall back to memory cache
      const cached = memoryCache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.value;
      }
      return null;
    }
  } catch (error) {
    logger.error(`[AppCache] Error retrieving value for key ${key}:`, error);
    
    // Try memory cache as fallback
    const cached = memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    return null;
  }
};

/**
 * Remove a value from AWS App Cache
 * @param {string} key - The key to remove
 * @returns {Promise<void>}
 */
export const removeFromAppCache = async (key) => {
  try {
    // Try to use AWS Amplify Cache if available
    if (typeof window !== 'undefined' && window.AWS && window.AWS.Cache) {
      await window.AWS.Cache.removeItem(key);
      logger.debug(`[AppCache] Removed key: ${key}`);
    }
    
    // Also clean from memory cache
    memoryCache.delete(key);
  } catch (error) {
    logger.error(`[AppCache] Error removing key ${key}:`, error);
    // Still try to remove from memory cache
    memoryCache.delete(key);
  }
};

/**
 * List all keys in AWS App Cache
 * @returns {Promise<string[]>} Array of keys
 */
export const listAppCacheKeys = async () => {
  try {
    // Try to use AWS Amplify Cache if available
    if (typeof window !== 'undefined' && window.AWS && window.AWS.Cache) {
      const keys = await window.AWS.Cache.getAllKeys();
      return keys || [];
    } else {
      // Return memory cache keys
      return Array.from(memoryCache.keys());
    }
  } catch (error) {
    logger.error('[AppCache] Error listing keys:', error);
    // Return memory cache keys as fallback
    return Array.from(memoryCache.keys());
  }
};

/**
 * Clear all items from AWS App Cache
 * @returns {Promise<void>}
 */
export const clearAppCache = async () => {
  try {
    // Try to use AWS Amplify Cache if available
    if (typeof window !== 'undefined' && window.AWS && window.AWS.Cache) {
      await window.AWS.Cache.clear();
      logger.debug('[AppCache] Cleared all cache items');
    }
    
    // Also clear memory cache
    memoryCache.clear();
  } catch (error) {
    logger.error('[AppCache] Error clearing cache:', error);
    // Still try to clear memory cache
    memoryCache.clear();
  }
}; 