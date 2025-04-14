/**
 * Application Cache Utility
 * 
 * Provides a unified caching mechanism that uses AWS AppCache and Cognito attributes
 * instead of cookies and localStorage for data persistence.
 */

// Initialize app cache if in browser environment
if (typeof window !== 'undefined') {
  window.__APP_CACHE = window.__APP_CACHE || {};
}

/**
 * Get a value from the application cache
 * 
 * @param {string} key - The cache key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} The cached value or default
 */
export function getCacheValue(key, defaultValue = null) {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  
  // Use app cache
  const cacheEntry = window.__APP_CACHE[key];
  
  if (cacheEntry) {
    // Check for expiration if timestamp exists
    if (cacheEntry.timestamp) {
      const now = Date.now();
      const expiresAt = cacheEntry.expiresAt || (cacheEntry.timestamp + (cacheEntry.ttl || 3600000));
      
      if (now > expiresAt) {
        // Expired entry
        delete window.__APP_CACHE[key];
        return defaultValue;
      }
    }
    
    return cacheEntry.value !== undefined ? cacheEntry.value : cacheEntry;
  }
  
  return defaultValue;
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