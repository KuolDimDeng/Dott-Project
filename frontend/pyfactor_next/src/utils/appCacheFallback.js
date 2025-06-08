/**
 * Fallback appCache implementation
 * This ensures appCache is always available even if the main module fails to load
 */

// Create a minimal appCache implementation
const createFallbackCache = () => {
  const cache = {};
  
  return {
    get: (key) => {
      console.warn('[appCacheFallback] Using fallback cache for get:', key);
      return cache[key] || null;
    },
    
    set: (key, value) => {
      console.warn('[appCacheFallback] Using fallback cache for set:', key);
      cache[key] = value;
    },
    
    remove: (key) => {
      console.warn('[appCacheFallback] Using fallback cache for remove:', key);
      delete cache[key];
    },
    
    clear: () => {
      console.warn('[appCacheFallback] Using fallback cache for clear');
      Object.keys(cache).forEach(key => delete cache[key]);
    },
    
    getAll: () => {
      console.warn('[appCacheFallback] Using fallback cache for getAll');
      return cache;
    },
    
    init: () => {
      console.warn('[appCacheFallback] Using fallback cache for init');
      return cache;
    }
  };
};

// Ensure global appCache exists
if (typeof window !== 'undefined' && !window.appCache) {
  console.warn('[appCacheFallback] Installing fallback appCache');
  window.appCache = createFallbackCache();
}

export const appCacheFallback = window.appCache || createFallbackCache();