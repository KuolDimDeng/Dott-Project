import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';
import crypto from 'crypto';
import { getRedisWrapper } from '@/lib/redis';

// Initialize Redis wrapper
let redis = null;

// Fallback in-memory cache if Redis is not available
const bridgeCache = new Map();

// Security: Track failed attempts to prevent brute force
const failedAttempts = new Map();

// Security: Rate limiting for bridge token creation
const rateLimitMap = new Map();

// Clean up expired tokens and rate limits every 5 minutes
setInterval(() => {
  const now = Date.now();
  
  // Clean expired bridge tokens
  for (const [token, data] of bridgeCache.entries()) {
    if (now > data.expiresAt) {
      bridgeCache.delete(token);
    }
  }
  
  // Reset rate limits
  rateLimitMap.clear();
  
  // Clean old failed attempts
  if (failedAttempts.size > 1000) {
    failedAttempts.clear();
  }
}, 5 * 60 * 1000);

/**
 * Create a bridge token for immediate session availability
 */
export async function POST(request) {
  try {
    // Security: Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `create_${clientIp}`;
    const attempts = rateLimitMap.get(rateLimitKey) || 0;
    
    if (attempts > 10) {
      return NextResponse.json({
        error: 'Rate limit exceeded'
      }, { status: 429 });
    }
    
    rateLimitMap.set(rateLimitKey, attempts + 1);
    
    const body = await request.json();
    const { sessionToken, userId, tenantId, email } = body;
    
    if (!sessionToken || !userId) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 });
    }
    
    // Generate bridge token
    const bridgeToken = crypto.randomBytes(32).toString('hex');
    
    // Get Redis instance
    if (!redis) {
      redis = await getRedisWrapper();
    }
    
    // Prepare data for storage
    const bridgeData = {
      sessionToken,
      userId,
      tenantId,
      email,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000 // 60 seconds
    };
    
    // Store in Redis with 60 second TTL
    const stored = await redis.setex(
      `bridge:${bridgeToken}`, 
      60, 
      JSON.stringify(bridgeData)
    );
    
    if (!stored) {
      // Fallback to in-memory if Redis fails
      bridgeCache.set(bridgeToken, bridgeData);
      logger.warn('[BridgeSession] Using in-memory cache fallback');
    }
    
    logger.info('[BridgeSession] Created bridge token for user:', email);
    logger.info('[BridgeSession] Cache type:', redis.getCacheType());
    
    return NextResponse.json({
      success: true,
      bridgeToken,
      expiresIn: 60
    });
    
  } catch (error) {
    logger.error('[BridgeSession] Error creating bridge:', error);
    return NextResponse.json({
      error: 'Failed to create bridge session'
    }, { status: 500 });
  }
}

/**
 * Retrieve and establish session using bridge token
 */
export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bridgeToken = searchParams.get('token');
    
    if (!bridgeToken) {
      return NextResponse.json({
        error: 'Missing bridge token'
      }, { status: 400 });
    }
    
    // Security: Track failed attempts
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const attemptKey = `${clientIp}_${bridgeToken.substring(0, 8)}`;
    const failedCount = failedAttempts.get(attemptKey) || 0;
    
    if (failedCount > 3) {
      logger.warn('[BridgeSession] Too many failed attempts for token');
      return NextResponse.json({
        error: 'Too many failed attempts'
      }, { status: 429 });
    }
    
    // Get Redis instance
    if (!redis) {
      redis = await getRedisWrapper();
    }
    
    // Get data from Redis
    let bridgeData = null;
    const redisData = await redis.get(`bridge:${bridgeToken}`);
    
    if (redisData) {
      try {
        bridgeData = JSON.parse(redisData);
      } catch (e) {
        logger.error('[BridgeSession] Failed to parse Redis data:', e);
      }
    }
    
    // Fallback to in-memory cache if Redis lookup fails
    if (!bridgeData) {
      bridgeData = bridgeCache.get(bridgeToken);
    }
    
    if (!bridgeData) {
      logger.warn('[BridgeSession] Bridge token not found or expired');
      failedAttempts.set(attemptKey, failedCount + 1);
      
      // Security: Clean up after 5 minutes
      setTimeout(() => failedAttempts.delete(attemptKey), 5 * 60 * 1000);
      
      return NextResponse.json({
        error: 'Invalid or expired bridge token'
      }, { status: 401 });
    }
    
    // Verify it hasn't expired
    if (Date.now() > bridgeData.expiresAt) {
      bridgeCache.delete(bridgeToken);
      return NextResponse.json({
        error: 'Bridge token expired'
      }, { status: 401 });
    }
    
    logger.info('[BridgeSession] Valid bridge token found for:', bridgeData.email);
    
    // Delete the token (one-time use)
    await redis.del(`bridge:${bridgeToken}`);
    bridgeCache.delete(bridgeToken); // Also delete from fallback cache
    
    // Return the session data
    return NextResponse.json({
      success: true,
      sessionToken: bridgeData.sessionToken,
      userId: bridgeData.userId,
      tenantId: bridgeData.tenantId,
      email: bridgeData.email
    });
    
  } catch (error) {
    logger.error('[BridgeSession] Error retrieving bridge:', error);
    return NextResponse.json({
      error: 'Failed to retrieve bridge session'
    }, { status: 500 });
  }
}