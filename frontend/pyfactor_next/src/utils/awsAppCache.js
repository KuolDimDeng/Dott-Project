/**
 * AWS App Cache Utility
 * 
 * This is a wrapper around our application cache utilities that provides
 * an interface compatible with AWS AppSync/Amplify style cache methods.
 */

import { 
  getCacheValue, 
  setCacheValue, 
  removeCacheValue, 
  clearCache 
} from './appCache';

/**
 * App Cache client that provides a consistent API for caching
 * similar to AWS AppSync cache implementation
 */
export const appCache = {
  /**
   * Get a value from cache
   * 
   * @param {string} key - Cache key to retrieve
   * @returns {Promise<any>} The cached value
   */
  get: async (key) => {
    return getCacheValue(key);
  },

  /**
   * Set a value in cache
   * 
   * @param {string} key - Cache key to set
   * @param {any} value - Value to store
   * @param {Object} options - Cache options
   * @param {number} options.expires - Expiration time in seconds
   * @returns {Promise<boolean>} True if successful
   */
  set: async (key, value, options = {}) => {
    const ttl = options.expires ? options.expires * 1000 : undefined;
    return setCacheValue(key, value, { ttl });
  },

  /**
   * Remove a value from cache
   * 
   * @param {string} key - Cache key to remove
   * @returns {Promise<boolean>} True if successful
   */
  remove: async (key) => {
    return removeCacheValue(key);
  },

  /**
   * Clear all cache values
   * 
   * @returns {Promise<boolean>} True if successful
   */
  clear: async () => {
    return clearCache();
  },

  /**
   * Get all keys that match a prefix
   * 
   * @param {string} prefix - Key prefix to match
   * @returns {Promise<string[]>} Array of matching keys
   */
  keys: async (prefix = '') => {
    if (typeof window === 'undefined') {
      return [];
    }
    
    return Object.keys(window.__APP_CACHE || {})
      .filter(key => key.startsWith(prefix));
  }
}; 