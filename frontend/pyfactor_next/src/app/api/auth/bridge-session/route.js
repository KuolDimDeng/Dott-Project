import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';
import crypto from 'crypto';

// In-memory cache for bridge tokens (in production, use Redis)
const bridgeCache = new Map();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of bridgeCache.entries()) {
    if (now > data.expiresAt) {
      bridgeCache.delete(token);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create a bridge token for immediate session availability
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { sessionToken, userId, tenantId, email } = body;
    
    if (!sessionToken || !userId) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 });
    }
    
    // Generate bridge token
    const bridgeToken = crypto.randomBytes(32).toString('hex');
    
    // Store in cache with 60 second TTL
    bridgeCache.set(bridgeToken, {
      sessionToken,
      userId,
      tenantId,
      email,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000 // 60 seconds
    });
    
    logger.info('[BridgeSession] Created bridge token for user:', email);
    
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
    
    // Get data from cache
    const bridgeData = bridgeCache.get(bridgeToken);
    
    if (!bridgeData) {
      logger.warn('[BridgeSession] Bridge token not found or expired');
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
    bridgeCache.delete(bridgeToken);
    
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