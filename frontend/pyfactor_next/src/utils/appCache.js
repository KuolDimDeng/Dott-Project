/**
 * appCache.js - Client-side caching utility
 * 
 * A centralized utility for managing client-side caching across the application.
 * This replaces ad-hoc usage of appCache.getAll() throughout the codebase.
 */

// Initialize the cache safely
const initCache = () => {
  if (typeof window !== 'undefined') {
    if (!window.__appCache) {
      window.__appCache = {};
    }
    return window.__appCache;
  }
  return null;
};

// Get a value from the cache
export const get = (key) => {
  if (!key) {
    console.error('[appCache] Error getting cache value: Cache key is required');
    return null;
  }

  try {
    const cache = initCache();
    if (!cache) return null;
    
    // Handle nested keys (e.g., 'tenant.id')
    if (key.includes('.')) {
      const keys = key.split('.');
      let current = cache;
      
      for (const k of keys) {
        if (current === null || current === undefined) return null;
        current = current[k];
      }
      
      return current;
    }
    
    return cache[key];
  } catch (error) {
    console.error(`[appCache] Error getting cache value for key ${key}: ${error}`);
    return null;
  }
};

// Set a value in the cache
export const set = (key, value) => {
  if (!key) {
    console.error('[appCache] Error setting cache value: Cache key is required');
    return false;
  }

  try {
    const cache = initCache();
    if (!cache) return false;
    
    // Handle nested keys (e.g., 'tenant.id')
    if (key.includes('.')) {
      const keys = key.split('.');
      let current = cache;
      
      // Create nested objects if they don't exist
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k] || typeof current[k] !== 'object') {
          current[k] = {};
        }
        current = current[k];
      }
      
      // Set the value at the deepest level
      current[keys[keys.length - 1]] = value;
    } else {
      cache[key] = value;
    }
    
    return true;
  } catch (error) {
    console.error(`[appCache] Error setting cache value for key ${key}: ${error}`);
    return false;
  }
};

// Remove a value from the cache
export const remove = (key) => {
  if (!key) {
    console.error('[appCache] Error removing cache value: Cache key is required');
    return false;
  }

  try {
    const cache = initCache();
    if (!cache) return false;
    
    // Handle nested keys (e.g., 'tenant.id')
    if (key.includes('.')) {
      const keys = key.split('.');
      let current = cache;
      
      // Navigate to the parent object
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k]) return false; // Key path doesn't exist
        current = current[k];
      }
      
      // Delete the property
      delete current[keys[keys.length - 1]];
    } else {
      delete cache[key];
    }
    
    return true;
  } catch (error) {
    console.error(`[appCache] Error removing cache value for key ${key}: ${error}`);
    return false;
  }
};

// Clear the entire cache
export const clear = () => {
  try {
    if (typeof window !== 'undefined') {
      window.__appCache = {};
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[appCache] Error clearing cache: ${error}`);
    return false;
  }
};

// Get the entire cache (for debugging)
export const getAll = () => {
  try {
    return initCache() || {};
  } catch (error) {
    console.error(`[appCache] Error getting cache: ${error}`);
    return {};
  }
};

// Use a global variable to store the cache
if (typeof window !== 'undefined' && !window.__appCache) {
  window.__appCache = {};
}

// Legacy function aliases for backwards compatibility
export const getCacheValue = get;
export const setCacheValue = set;
export const removeCacheValue = remove;
export const clearCache = clear;
export const clearCacheKey = remove;

export const appCache = {
  get,
  set,
  remove,
  clear,
  getAll,
  init: clear // alias for clear function
};

export default {
  get,
  set,
  remove,
  clear,
  getAll,
  init: clear
};
