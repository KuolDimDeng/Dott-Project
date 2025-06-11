/**
 * Profile Cache Utility
 * Implements a robust caching system for user profile data
 * with TTL, invalidation, and localStorage persistence
 */

class ProfileCache {
  constructor() {
    this.CACHE_KEY = 'dott_profile_cache';
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    this.memory = null;
    this.subscribers = new Set();
    
    // Load from localStorage on init
    this.loadFromStorage();
  }

  /**
   * Get cached profile data
   * @returns {Object|null} Cached profile or null if expired/missing
   */
  get() {
    // Check memory first
    if (this.memory && this.isValid(this.memory)) {
      return this.memory.data;
    }

    // Check localStorage
    const stored = this.loadFromStorage();
    if (stored && this.isValid(stored)) {
      this.memory = stored;
      return stored.data;
    }

    return null;
  }

  /**
   * Set profile data in cache
   * @param {Object} data - Profile data to cache
   */
  set(data) {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      version: '1.0'
    };

    this.memory = cacheEntry;
    this.saveToStorage(cacheEntry);
    this.notifySubscribers(data);
  }

  /**
   * Clear the cache
   */
  clear() {
    this.memory = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.CACHE_KEY);
    }
    this.notifySubscribers(null);
  }

  /**
   * Check if cache entry is still valid
   * @param {Object} entry - Cache entry to validate
   * @returns {boolean}
   */
  isValid(entry) {
    if (!entry || !entry.timestamp) return false;
    return Date.now() - entry.timestamp < this.CACHE_TTL;
  }

  /**
   * Subscribe to cache updates
   * @param {Function} callback - Function to call on cache updates
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Notify all subscribers of cache changes
   * @param {Object} data - New cache data
   */
  notifySubscribers(data) {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[ProfileCache] Subscriber error:', error);
      }
    });
  }

  /**
   * Load cache from localStorage
   * @returns {Object|null}
   */
  loadFromStorage() {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(this.CACHE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[ProfileCache] Error loading from storage:', error);
      // Clear corrupted cache
      localStorage.removeItem(this.CACHE_KEY);
    }

    return null;
  }

  /**
   * Save cache to localStorage
   * @param {Object} entry - Cache entry to save
   */
  saveToStorage(entry) {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(entry));
    } catch (error) {
      console.error('[ProfileCache] Error saving to storage:', error);
      // If quota exceeded, clear old data
      if (error.name === 'QuotaExceededError') {
        this.clearOldData();
      }
    }
  }

  /**
   * Clear old cached data to free up space
   */
  clearOldData() {
    if (typeof window === 'undefined') return;

    // Clear other old cache keys
    const oldKeys = [
      'dott_session', // Old session key
      'appSession',   // Legacy session
      'user_profile', // Old profile cache
    ];

    oldKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`[ProfileCache] Error removing ${key}:`, error);
      }
    });
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const entry = this.memory || this.loadFromStorage();
    return {
      hasData: !!entry,
      isValid: entry ? this.isValid(entry) : false,
      age: entry ? Date.now() - entry.timestamp : null,
      ttlRemaining: entry && this.isValid(entry) 
        ? this.CACHE_TTL - (Date.now() - entry.timestamp) 
        : 0
    };
  }
}

// Export singleton instance
export const profileCache = new ProfileCache();

// Export hook for React components
export function useProfileCache() {
  const [cachedData, setCachedData] = useState(() => profileCache.get());

  useEffect(() => {
    // Subscribe to cache updates
    const unsubscribe = profileCache.subscribe(setCachedData);
    
    // Check for cached data on mount
    const cached = profileCache.get();
    if (cached) {
      setCachedData(cached);
    }

    return unsubscribe;
  }, []);

  return {
    data: cachedData,
    setCache: (data) => profileCache.set(data),
    clearCache: () => profileCache.clear(),
    stats: profileCache.getStats()
  };
}

// Add missing import for React hooks
import { useState, useEffect } from 'react';