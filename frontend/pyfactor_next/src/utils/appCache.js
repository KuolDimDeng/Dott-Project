/**
 * Application Cache Utility
 * 
 * Provides a unified caching mechanism that uses AWS AppCache and Cognito attributes
 * instead of cookies and localStorage for data persistence.
 */

import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';

// Initialize app cache if in browser environment
if (typeof window !== 'undefined') {
  window.__APP_CACHE = window.__APP_CACHE || {};
}

/**
 * Get a value from the application cache
 * 
 * @param {string} key - The cache key to retrieve
 * @returns {any} The cached value or null
 */
export function getCacheValue(key) {
  try {
    if (typeof window === 'undefined') {
      logger.debug('[AppCacheUtils] Server-side cache access for ' + key);
      return null;
    }
    
    // Initialize cache if it doesn't exist
    if (!window.__APP_CACHE) {
      window.__APP_CACHE = {};
    }
    
    // Check if the key exists in cache
    const cacheEntry = window.__APP_CACHE[key];
    if (!cacheEntry) {
      return null;
    }
    
    // Check if the entry is a structured entry with expiration
    if (cacheEntry.expiresAt && cacheEntry.value !== undefined) {
      // Check if the entry has expired
      if (Date.now() > cacheEntry.expiresAt) {
        delete window.__APP_CACHE[key];
        return null;
      }
      
      return cacheEntry.value;
    }
    
    // If it's just a simple value (old format), return it directly
    return cacheEntry;
  } catch (error) {
    console.error(`[AppCache] Error getting cache value for key ${key}:`, error);
    return null;
  }
}

/**
 * Set a value in the application cache
 * 
 * @param {string} key - The cache key
 * @param {*} value - The value to cache
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in milliseconds
 * @returns {boolean} True if successful
 */
export function setCacheValue(key, value, options = {}) {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    
    const now = Date.now();
    const ttl = options.ttl || 3600000; // Default 1 hour
    
    // Create cache entry with metadata
    window.__APP_CACHE[key] = {
      value,
      timestamp: now,
      expiresAt: now + ttl,
      ttl
    };
    
    return true;
  } catch (error) {
    console.error(`[AppCache] Error setting cache value for key ${key}:`, error);
    return false;
  }
}

/**
 * Remove a value from the application cache
 * 
 * @param {string} key - The cache key to remove
 * @returns {boolean} True if successful
 */
export function removeCacheValue(key) {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    
    delete window.__APP_CACHE[key];
    return true;
  } catch (error) {
    console.error(`[AppCache] Error removing cache value for key ${key}:`, error);
    return false;
  }
}

/**
 * Clear all values from the application cache
 * 
 * @returns {boolean} True if successful
 */
export function clearCache() {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    
    // Preserve certain key namespace objects but clear their contents
    const preserveKeys = ['language', 'auth', 'user'];
    
    Object.keys(window.__APP_CACHE).forEach(key => {
      if (preserveKeys.includes(key)) {
        // Reset to empty object while preserving reference
        Object.keys(window.__APP_CACHE[key]).forEach(subKey => {
          delete window.__APP_CACHE[key][subKey];
        });
      } else {
        delete window.__APP_CACHE[key];
      }
    });
    
    return true;
  } catch (error) {
    console.error('[AppCache] Error clearing cache:', error);
    return false;
  }
}

/**
 * Simple in-memory cache utility for AWS AppSync REST API
 */
class AppCache {
  constructor() {
    this.cache = new Map();
    this.timeouts = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  }

  /**
   * Set a value in the cache with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    // Ensure key is valid
    if (typeof key !== 'string' || !key) {
      console.warn('[AppCache] Invalid key provided to set():', key);
      return null;
    }

    // Safety check to prevent storing invalid values (undefined, null)
    // Always store valid JSON-serializable data
    try {
      // Clear any existing timeout for this key
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key));
      }

      // Store value in cache - ensure it can be serialized to prevent JSON parsing issues
      const serialized = JSON.stringify(value);
      const deserialized = JSON.parse(serialized);
      this.cache.set(key, deserialized);

      // Set expiration timeout
      const timeout = setTimeout(() => {
        this.cache.delete(key);
        this.timeouts.delete(key);
      }, ttl);

      this.timeouts.set(key, timeout);
      return deserialized;
    } catch (error) {
      console.error('[AppCache] Error caching value for key', key, ':', error);
      return null;
    }
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined
   */
  get(key) {
    // Ensure key is valid
    if (typeof key !== 'string' || !key) {
      console.warn('[AppCache] Invalid key provided to get():', key);
      return undefined;
    }

    try {
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }
      return undefined;
    } catch (error) {
      console.error('[AppCache] Error retrieving value for key', key, ':', error);
      return undefined;
    }
  }

  /**
   * Check if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return typeof key === 'string' && key && this.cache.has(key);
  }

  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   * @returns {boolean} True if value was deleted
   */
  delete(key) {
    if (typeof key !== 'string' || !key) {
      console.warn('[AppCache] Invalid key provided to delete():', key);
      return false;
    }

    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
      this.timeouts.delete(key);
    }
    return this.cache.delete(key);
  }

  /**
   * Clear all values from the cache
   */
  clear() {
    // Clear all timeouts
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    
    this.cache.clear();
    this.timeouts.clear();
  }

  /**
   * Get the size of the cache
   * @returns {number} Number of items in cache
   */
  size() {
    return this.cache.size;
  }
}

// Create a singleton instance
const appCache = new AppCache();

export default appCache; 