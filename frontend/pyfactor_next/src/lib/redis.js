import { createClient } from 'redis';
import { logger } from '@/utils/logger';

/**
 * Redis Client Configuration
 * Handles connection to Redis for session bridge tokens and other caching needs
 */

let redisClient = null;
let isConnected = false;

/**
 * Get Redis connection configuration from environment
 */
function getRedisConfig() {
  // Check if Redis is configured
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;
  const redisPort = process.env.REDIS_PORT || 6379;
  const redisPassword = process.env.REDIS_PASSWORD;
  
  // Use Redis URL if provided (common in cloud environments)
  if (redisUrl) {
    return {
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        keepAlive: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('[Redis] Max reconnection attempts reached');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    };
  }
  
  // Fall back to host/port configuration
  if (redisHost) {
    const config = {
      socket: {
        host: redisHost,
        port: parseInt(redisPort),
        connectTimeout: 5000,
        keepAlive: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('[Redis] Max reconnection attempts reached');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    };
    
    if (redisPassword) {
      config.password = redisPassword;
    }
    
    return config;
  }
  
  // No Redis configuration found
  return null;
}

/**
 * Initialize Redis client
 */
export async function initRedis() {
  if (redisClient && isConnected) {
    return redisClient;
  }
  
  const config = getRedisConfig();
  
  if (!config) {
    logger.warn('[Redis] No Redis configuration found, using in-memory fallback');
    return null;
  }
  
  try {
    logger.info('[Redis] Initializing Redis client...');
    
    redisClient = createClient(config);
    
    // Set up event handlers
    redisClient.on('error', (err) => {
      logger.error('[Redis] Redis client error:', err);
      isConnected = false;
    });
    
    redisClient.on('connect', () => {
      logger.info('[Redis] Redis client connected');
      isConnected = true;
    });
    
    redisClient.on('ready', () => {
      logger.info('[Redis] Redis client ready');
    });
    
    redisClient.on('reconnecting', () => {
      logger.info('[Redis] Redis client reconnecting...');
    });
    
    // Connect to Redis
    await redisClient.connect();
    
    // Test the connection
    await redisClient.ping();
    logger.info('[Redis] Redis connection successful');
    
    return redisClient;
    
  } catch (error) {
    logger.error('[Redis] Failed to initialize Redis:', error);
    redisClient = null;
    isConnected = false;
    return null;
  }
}

/**
 * Get Redis client (with lazy initialization)
 */
export async function getRedis() {
  if (!redisClient || !isConnected) {
    return await initRedis();
  }
  return redisClient;
}

/**
 * Wrapper for Redis operations with fallback
 */
export class RedisWrapper {
  constructor() {
    this.fallbackCache = new Map();
    this.cleanupInterval = null;
  }
  
  async init() {
    this.client = await getRedis();
    
    // Start cleanup interval for fallback cache
    if (!this.client && !this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupFallbackCache();
      }, 60000); // Clean every minute
    }
    
    return this;
  }
  
  /**
   * Set a value with expiration
   */
  async setex(key, seconds, value) {
    if (this.client) {
      try {
        await this.client.setEx(key, seconds, value);
        return true;
      } catch (error) {
        logger.error('[Redis] setex error:', error);
      }
    }
    
    // Fallback to in-memory
    this.fallbackCache.set(key, {
      value,
      expiresAt: Date.now() + (seconds * 1000)
    });
    return true;
  }
  
  /**
   * Get a value
   */
  async get(key) {
    if (this.client) {
      try {
        return await this.client.get(key);
      } catch (error) {
        logger.error('[Redis] get error:', error);
      }
    }
    
    // Fallback to in-memory
    const cached = this.fallbackCache.get(key);
    if (cached) {
      if (Date.now() < cached.expiresAt) {
        return cached.value;
      }
      this.fallbackCache.delete(key);
    }
    return null;
  }
  
  /**
   * Delete a key
   */
  async del(key) {
    if (this.client) {
      try {
        await this.client.del(key);
        return true;
      } catch (error) {
        logger.error('[Redis] del error:', error);
      }
    }
    
    // Fallback to in-memory
    this.fallbackCache.delete(key);
    return true;
  }
  
  /**
   * Check if a key exists
   */
  async exists(key) {
    if (this.client) {
      try {
        const result = await this.client.exists(key);
        return result === 1;
      } catch (error) {
        logger.error('[Redis] exists error:', error);
      }
    }
    
    // Fallback to in-memory
    const cached = this.fallbackCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return true;
    }
    return false;
  }
  
  /**
   * Increment a counter
   */
  async incr(key) {
    if (this.client) {
      try {
        return await this.client.incr(key);
      } catch (error) {
        logger.error('[Redis] incr error:', error);
      }
    }
    
    // Fallback to in-memory
    const cached = this.fallbackCache.get(key);
    let value = 1;
    if (cached && Date.now() < cached.expiresAt) {
      value = parseInt(cached.value) + 1;
    }
    this.fallbackCache.set(key, {
      value: value.toString(),
      expiresAt: Date.now() + 300000 // 5 minutes default
    });
    return value;
  }
  
  /**
   * Set expiration on a key
   */
  async expire(key, seconds) {
    if (this.client) {
      try {
        return await this.client.expire(key, seconds);
      } catch (error) {
        logger.error('[Redis] expire error:', error);
      }
    }
    
    // Fallback to in-memory
    const cached = this.fallbackCache.get(key);
    if (cached) {
      cached.expiresAt = Date.now() + (seconds * 1000);
      return true;
    }
    return false;
  }
  
  /**
   * Clean up expired entries in fallback cache
   */
  cleanupFallbackCache() {
    const now = Date.now();
    for (const [key, data] of this.fallbackCache.entries()) {
      if (now > data.expiresAt) {
        this.fallbackCache.delete(key);
      }
    }
  }
  
  /**
   * Get cache type (for monitoring)
   */
  getCacheType() {
    return this.client ? 'redis' : 'memory';
  }
  
  /**
   * Close connections
   */
  async close() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}

// Export a singleton instance
let wrapperInstance = null;

export async function getRedisWrapper() {
  if (!wrapperInstance) {
    wrapperInstance = new RedisWrapper();
    await wrapperInstance.init();
  }
  return wrapperInstance;
}