"use client";

import { logger } from './logger';

// Simple in-memory cache for data
class DataCache {
  constructor() {
    this.cache = new Map();
    this.expirations = new Map();
  }
  
  /**
   * Set a cache value with optional expiration
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMs - Time to live in milliseconds
   */
  set(key, value, ttlMs = 60000) {
    if (!key) return;
    
    this.cache.set(key, value);
    
    // Set expiration if ttl is provided
    if (ttlMs > 0) {
      const expiration = Date.now() + ttlMs;
      this.expirations.set(key, expiration);
      
      // Set up automatic cleanup after expiration
      setTimeout(() => {
        if (this.expirations.get(key) <= Date.now()) {
          this.cache.delete(key);
          this.expirations.delete(key);
        }
      }, ttlMs);
    }
  }
  
  /**
   * Get a cached value if it exists and hasn't expired
   * @param {string} key - Cache key
   * @returns {any} The cached value or undefined
   */
  get(key) {
    if (!key) return undefined;
    
    // Check if key exists and hasn't expired
    if (this.cache.has(key)) {
      const expiration = this.expirations.get(key);
      
      // Check expiration if one was set
      if (expiration && expiration <= Date.now()) {
        // Expired
        this.cache.delete(key);
        this.expirations.delete(key);
        return undefined;
      }
      
      return this.cache.get(key);
    }
    
    return undefined;
  }
  
  /**
   * Check if a key exists in the cache and isn't expired
   * @param {string} key - Cache key
   * @returns {boolean} True if the key exists and isn't expired
   */
  has(key) {
    if (!key || !this.cache.has(key)) return false;
    
    const expiration = this.expirations.get(key);
    if (expiration && expiration <= Date.now()) {
      // Expired
      this.cache.delete(key);
      this.expirations.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete a specific key from the cache
   * @param {string} key - Cache key
   */
  delete(key) {
    if (!key) return;
    
    this.cache.delete(key);
    this.expirations.delete(key);
  }
  
  /**
   * Clear all cached items
   */
  clear() {
    this.cache.clear();
    this.expirations.clear();
  }
  
  /**
   * Invalidate cache entries that match a pattern
   * @param {string|RegExp} pattern - String or regex pattern to match against keys
   */
  invalidatePattern(pattern) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        logger.debug(`[DataCache] Invalidating cached key matching pattern: ${key}`);
        this.delete(key);
      }
    }
  }
}

// Create singleton instances for different parts of the application
const dataCache = new DataCache();
const inventoryCache = new DataCache();

// Export the cache instances
export { dataCache, inventoryCache };