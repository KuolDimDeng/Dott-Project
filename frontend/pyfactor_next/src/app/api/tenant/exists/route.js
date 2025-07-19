import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validate as uuidValidate } from 'uuid';

/**
 * Handles tenant existence check requests
 * This implementation now handles JWT expiration gracefully with improved error recovery
 */
export async function POST(request) {
  try {
    const { tenantId } = await request.json();
    logger.debug('[/api/tenant/exists] Checking if tenant exists:', { tenantId: tenantId?.slice(0, 8) + '...' });
    
    if (!tenantId) {
      logger.error('[/api/tenant/exists] No tenantId provided in request');
      return NextResponse.json(
        { message: 'Missing tenantId in request' },
        { status: 400 }
      );
    }
    
    // Validate UUID format
    const isValidUUID = tenantId && uuidValidate(tenantId);
    
    if (!isValidUUID) {
      logger.error('[/api/tenant/exists] Invalid UUID format:', { tenantId });
      return NextResponse.json(
        { message: 'Invalid tenantId format', exists: false },
        { status: 400 }
      );
    }

    logger.debug('[/api/tenant/exists] Valid UUID format, setting tenant cookie');
    
    // Create response
    const response = NextResponse.json({ exists: true, tenantId });
    
    // Set the cookie for tenant ID to maintain session consistency
    response.cookies.set('tenantId', tenantId, {
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    
    return response;
  } catch (error) {
    // Enhanced error logging
    logger.error('[/api/tenant/exists] Error processing request:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      name: error.name,
      code: error.code
    });
    
    // Special handling for token errors
    if (error.name === 'TokenExpiredError' || 
        error.message?.includes('expire') || 
        error.code === 'ERR_JWT_EXPIRED') {
      logger.warn('[/api/tenant/exists] JWT token expired');
      
      return NextResponse.json(
        { 
          message: 'Authentication token expired',
          tokenExpired: true,
          redirectTo: '/auth/signin?session_expired=true'
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { message: 'Error checking tenant existence', error: error.message },
      { status: 500 }
    );
  }
} 