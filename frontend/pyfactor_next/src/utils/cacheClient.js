import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

// In-memory cache storage
const memoryCache = new Map();

// Create the Amplify v6 API client
const client = generateClient();

/**
 * Cache entry with expiration
 */
class CacheEntry {
  constructor(value, options = {}) {
    this.value = value;
    this.createdAt = Date.now();
    this.ttl = options.ttl || 1000 * 60 * 5; // Default 5 minutes
  }

  isExpired() {
    return Date.now() > this.createdAt + this.ttl;
  }
}

/**
 * AppSync cache client for in-memory data caching
 * Avoids using localStorage or cookies in favor of in-memory caching
 */

/**
 * Store data in the in-memory cache
 * @param {string} key - Cache key
 * @param {any} data - Data to store
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in milliseconds
 * @returns {boolean} - Success status
 */
export const setCache = (key, data, options = {}) => {
  try {
    const ttl = options.ttl || 1000 * 60 * 30; // Default 30 minutes
    const expiry = Date.now() + ttl;
    
    memoryCache.set(key, {
      data,
      expiry,
    });
    
    logger.debug('[CacheClient] Data cached successfully', { key });
    return true;
  } catch (error) {
    logger.error('[CacheClient] Error caching data', { key, error });
    return false;
  }
};

/**
 * Retrieve data from the in-memory cache
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if not found/expired
 */
export const getCache = (key) => {
  try {
    const cached = memoryCache.get(key);
    
    if (!cached) {
      logger.debug('[CacheClient] Cache miss', { key });
      return null;
    }
    
    // Check if cache has expired
    if (Date.now() > cached.expiry) {
      logger.debug('[CacheClient] Cache expired', { key });
      memoryCache.delete(key);
      return null;
    }
    
    logger.debug('[CacheClient] Cache hit', { key });
    return cached.data;
  } catch (error) {
    logger.error('[CacheClient] Error retrieving cached data', { key, error });
    return null;
  }
};

/**
 * Clear specific cache entry
 * @param {string} key - Cache key to clear
 */
export const clearCache = (key) => {
  try {
    memoryCache.delete(key);
    logger.debug('[CacheClient] Cache cleared', { key });
  } catch (error) {
    logger.error('[CacheClient] Error clearing cache', { key, error });
  }
};

/**
 * Clear all cache entries
 */
export const clearAllCache = () => {
  try {
    memoryCache.clear();
    logger.debug('[CacheClient] All cache cleared');
  } catch (error) {
    logger.error('[CacheClient] Error clearing all cache', { error });
  }
};

/**
 * Fetch data with caching capability
 * @param {string} cacheKey - Key for caching
 * @param {any} data - Data to send
 * @param {Object} options - Fetch options
 * @param {boolean} options.bypassCache - If true, bypasses cache check
 * @param {number} options.ttl - Cache TTL in milliseconds
 * @param {string} options.apiName - GraphQL API name
 * @param {Object} options.query - GraphQL query
 * @param {Object} options.variables - GraphQL variables
 * @returns {Promise<any>} - Fetched or cached data
 */
export const fetchWithCache = async (cacheKey, data, options = {}) => {
  const {
    bypassCache = false,
    ttl,
    query,
    variables,
  } = options;
  
  // Generate a unique request ID for tracking
  const requestId = uuidv4().substring(0, 8);
  
  try {
    // If not bypassing cache, check for cached data
    if (!bypassCache) {
      const cachedData = getCache(cacheKey);
      if (cachedData) {
        logger.debug('[CacheClient] Returning cached data', { cacheKey, requestId });
        return cachedData;
      }
    }
    
    let response;
    
    // If query provided, use GraphQL operation
    if (query) {
      logger.debug('[CacheClient] Executing GraphQL operation', { 
        requestId, 
        operationName: query.definitions?.[0]?.name?.value || 'Unknown' 
      });
      
      response = await client.graphql({
        query: query,
        variables: variables || {},
        authMode: 'AMAZON_COGNITO_USER_POOLS'
      });
      
      // Extract data from the GraphQL response
      if (response.data) {
        const queryName = Object.keys(response.data)[0];
        response = response.data[queryName];
      }
    } else {
      // Use REST API call (this is simplified and would need customization)
      // This is a placeholder for REST API implementation
      logger.debug('[CacheClient] Using data provided directly', { requestId });
      response = data;
    }
    
    // Cache the response
    setCache(cacheKey, response, { ttl });
    
    return response;
  } catch (error) {
    logger.error('[CacheClient] Fetch error', { cacheKey, requestId, error });
    throw error;
  }
};

/**
 * Cache user data attributes
 * @param {string} userId - User ID 
 * @param {Object} attributes - User attributes to cache
 */
export const cacheUserAttributes = async (userId, attributes) => {
  if (!userId) {
    logger.error('[CacheClient] Cannot cache user attributes: No userId provided');
    return;
  }
  
  try {
    const cacheKey = `user_${userId}_attributes`;
    const existingCache = getCache(cacheKey) || {};
    
    // Merge with existing attributes
    const updatedAttributes = {
      ...existingCache,
      ...attributes,
      lastUpdated: new Date().toISOString()
    };
    
    setCache(cacheKey, updatedAttributes);
    
    logger.debug('[CacheClient] User attributes cached', { 
      userId, 
      attributeKeys: Object.keys(attributes) 
    });
  } catch (error) {
    logger.error('[CacheClient] Error caching user attributes', { userId, error });
  }
};

/**
 * Get cached user attributes
 * @param {string} userId - User ID
 * @returns {Object|null} - User attributes or null
 */
export const getCachedUserAttributes = (userId) => {
  if (!userId) return null;
  
  try {
    const cacheKey = `user_${userId}_attributes`;
    return getCache(cacheKey) || null;
  } catch (error) {
    logger.error('[CacheClient] Error getting cached user attributes', { userId, error });
    return null;
  }
};

/**
 * Clears user-related cache entries when logging out
 * @param {string} userId - User ID
 */
export const clearUserCache = (userId) => {
  try {
    if (userId) {
      clearCache(`user_${userId}_attributes`);
      clearCache(`user_${userId}_preferences`);
      clearCache(`user_${userId}_settings`);
      clearCache(`user_onboarding_status`);
    }
    
    // Clear any authentication-related cache
    clearCache('currentUser');
    clearCache('userSession');
    
    logger.debug('[CacheClient] User cache cleared', { userId });
  } catch (error) {
    logger.error('[CacheClient] Error clearing user cache', { userId, error });
  }
};

/**
 * Remove a specific entry from cache
 * @param {string} key - Cache key to remove
 * @returns {boolean} - Success status
 */
export const removeCache = (key) => {
  try {
    const deleted = memoryCache.delete(key);
    logger.debug('[CacheClient] Cache entry removed', { key, success: deleted });
    return deleted;
  } catch (error) {
    logger.error('[CacheClient] Error removing cache entry', { key, error });
    return false;
  }
};

// Periodically clean expired entries
const CLEANUP_INTERVAL = 1000 * 60 * 30; // 30 minutes
setInterval(() => {
  let expiredCount = 0;
  
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.isExpired()) {
      memoryCache.delete(key);
      expiredCount++;
    }
  }
  
  if (expiredCount > 0) {
    logger.debug('[cacheClient] Cleaned up expired entries', { expiredCount });
  }
}, CLEANUP_INTERVAL);

export default {
  getCache,
  setCache,
  removeCache,
  clearCache
}; 