/**
 * simpleCache.js
 * 
 * Simple synchronous cache utility for immediate access to cached values
 */

// Simple in-memory cache for immediate access
let memoryCache = {};

/**
 * Set a value in memory cache (synchronous)
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 */
export function setMemoryCache(key, value) {
  memoryCache[key] = value;
  console.log(`📝 Set memory cache: ${key} = ${value}`);
}

/**
 * Get a value from memory cache (synchronous)
 * @param {string} key - Cache key
 * @returns {any} Cached value or null
 */
export function getMemoryCache(key) {
  const value = memoryCache[key] || null;
  console.log(`📖 Get memory cache: ${key} = ${value}`);
  return value;
}

/**
 * Clear memory cache
 */
export function clearMemoryCache() {
  memoryCache = {};
  console.log('🗑️ Cleared memory cache');
}

/**
 * Get all cached values
 */
export function getAllMemoryCache() {
  return { ...memoryCache };
}
