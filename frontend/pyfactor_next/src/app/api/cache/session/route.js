/**
 * Redis Session Cache API
 * 
 * Provides caching layer for session data to reduce database load
 * Supports get, set, delete operations with TTL
 */

import { NextResponse } from 'next/server';

// Redis client configuration
let redisClient = null;

async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  // Check if Redis is available
  const redisUrl = process.env.REDIS_URL || process.env.REDISCLOUD_URL;
  
  if (!redisUrl) {
    console.warn('[SessionCache] Redis URL not configured, using memory fallback');
    return null;
  }

  try {
    // For Node.js environments, we'll use a simple Redis implementation
    // In production, this would use actual Redis client
    const Redis = await import('ioredis').catch(() => null);
    
    if (Redis) {
      redisClient = new Redis.default(redisUrl, {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });
      
      redisClient.on('error', (err) => {
        console.error('[SessionCache] Redis connection error:', err);
        redisClient = null;
      });
      
      redisClient.on('connect', () => {
        console.log('[SessionCache] Redis connected successfully');
      });
      
      return redisClient;
    } else {
      console.warn('[SessionCache] Redis package not available, using memory fallback');
      return null;
    }
  } catch (error) {
    console.error('[SessionCache] Failed to initialize Redis:', error);
    return null;
  }
}

// Memory fallback cache
const memoryCache = new Map();
const memoryCacheTTL = new Map();

function cleanupMemoryCache() {
  const now = Date.now();
  for (const [key, expiry] of memoryCacheTTL) {
    if (now > expiry) {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
  }
}

// Cleanup memory cache every 5 minutes
setInterval(cleanupMemoryCache, 5 * 60 * 1000);

async function getFromCache(key) {
  const redis = await getRedisClient();
  
  if (redis) {
    try {
      const result = await redis.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.warn('[SessionCache] Redis get failed:', error);
    }
  }
  
  // Fallback to memory cache
  cleanupMemoryCache();
  const cached = memoryCache.get(key);
  const expiry = memoryCacheTTL.get(key);
  
  if (cached && expiry && Date.now() < expiry) {
    return cached;
  }
  
  if (cached) {
    memoryCache.delete(key);
    memoryCacheTTL.delete(key);
  }
  
  return null;
}

async function setInCache(key, value, ttlSeconds = 300) {
  const redis = await getRedisClient();
  
  if (redis) {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('[SessionCache] Redis set failed:', error);
    }
  }
  
  // Fallback to memory cache
  memoryCache.set(key, value);
  memoryCacheTTL.set(key, Date.now() + (ttlSeconds * 1000));
  
  // Limit memory cache size
  if (memoryCache.size > 1000) {
    const firstKey = memoryCache.keys().next().value;
    memoryCache.delete(firstKey);
    memoryCacheTTL.delete(firstKey);
  }
  
  return true;
}

async function deleteFromCache(key) {
  const redis = await getRedisClient();
  
  if (redis) {
    try {
      await redis.del(key);
    } catch (error) {
      console.warn('[SessionCache] Redis delete failed:', error);
    }
  }
  
  // Also delete from memory cache
  memoryCache.delete(key);
  memoryCacheTTL.delete(key);
  
  return true;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, sessionId, sessionData, ttl = 300 } = body;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    const cacheKey = `session:${sessionId}`;
    
    switch (action) {
      case 'get':
        const cached = await getFromCache(cacheKey);
        return NextResponse.json({
          success: true,
          session: cached,
          cached: !!cached,
          timestamp: Date.now()
        });
        
      case 'set':
        if (!sessionData) {
          return NextResponse.json(
            { error: 'Session data is required for set operation' },
            { status: 400 }
          );
        }
        
        await setInCache(cacheKey, sessionData, ttl);
        return NextResponse.json({
          success: true,
          cached: true,
          ttl: ttl,
          timestamp: Date.now()
        });
        
      case 'delete':
        await deleteFromCache(cacheKey);
        return NextResponse.json({
          success: true,
          deleted: true,
          timestamp: Date.now()
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use get, set, or delete' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[SessionCache] API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const redis = await getRedisClient();
    
    const stats = {
      redisConnected: !!redis,
      memoryCacheSize: memoryCache.size,
      memoryCacheKeys: memoryCacheTTL.size,
      timestamp: Date.now()
    };
    
    if (redis) {
      try {
        const info = await redis.info('memory');
        stats.redisMemory = info;
      } catch (error) {
        stats.redisError = error.message;
      }
    }
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[SessionCache] Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get cache status', details: error.message },
      { status: 500 }
    );
  }
}