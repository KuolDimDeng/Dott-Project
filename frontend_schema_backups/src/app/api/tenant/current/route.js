import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';
import { getServerUser } from '@/utils/getServerUser';

/**
 * GET endpoint to retrieve current tenant information
 * Handles token expiration gracefully with clear error responses
 */
export async function GET(request) {
  try {
    // First check cookies for tenant ID
    const cookieStore = cookies();
    const tenantIdFromCookie = cookieStore.get('tenantId')?.value;
    
    if (tenantIdFromCookie) {
      logger.debug('[/api/tenant/current] Found tenant ID in cookies', { 
        tenantId: tenantIdFromCookie?.slice(0, 8) + '...' 
      });
      
      return NextResponse.json({ 
        tenantId: tenantIdFromCookie,
        source: 'cookie' 
      });
    }
    
    // If no cookie, try to get from user session
    try {
      const user = await getServerUser();
      
      if (!user) {
        logger.warn('[/api/tenant/current] No user found in session');
        return NextResponse.json({ 
          message: 'No tenant ID found - user not authenticated',
          authenticated: false 
        }, { status: 401 });
      }
      
      // Extract tenant ID from user attributes
      const tenantId = user.attributes?.['custom:tenant_ID'] || 
                        user.attributes?.['custom:tenantId'] || 
                        user.attributes?.['tenant_id'];
      
      if (tenantId) {
        logger.debug('[/api/tenant/current] Found tenant ID in user attributes', { 
          tenantId: tenantId?.slice(0, 8) + '...'
        });
        
        // Set it in cookie for future use
        cookieStore.set('tenantId', tenantId, {
          maxAge: 60 * 60 * 24 * 7, // 1 week
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
        });
        
        return NextResponse.json({ 
          tenantId,
          source: 'user_attributes' 
        });
      } else {
        logger.warn('[/api/tenant/current] No tenant ID found in user attributes');
        return NextResponse.json({ 
          message: 'No tenant ID found for user',
          authenticated: true,
          hasTenant: false
        }, { status: 404 });
      }
    } catch (userError) {
      // Special handling for token expiration
      if (userError.name === 'TokenExpiredError' || 
          userError.message?.includes('expire') || 
          userError.code === 'ERR_JWT_EXPIRED') {
        
        logger.warn('[/api/tenant/current] JWT token expired:', { 
          error: userError.message 
        });
        
        return NextResponse.json({ 
          message: 'Authentication token expired',
          tokenExpired: true,
          redirectTo: '/auth/signin?session_expired=true'
        }, { status: 401 });
      }
      
      // Log but continue - we might still have the cookie
      logger.error('[/api/tenant/current] Error getting user:', { 
        error: userError.message,
        stack: process.env.NODE_ENV === 'development' ? userError.stack : undefined
      });
      
      // If we have no user and no cookie, we're out of options
      return NextResponse.json({ 
        message: 'Error retrieving tenant information',
        authenticated: false,
        error: userError.message
      }, { status: 500 });
    }
  } catch (error) {
    // Enhanced error logging
    logger.error('[/api/tenant/current] Error processing request:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      name: error.name
    });
    
    // Handle token expiration
    if (error.name === 'TokenExpiredError' || 
        error.message?.includes('expire') || 
        error.code === 'ERR_JWT_EXPIRED') {
      
      logger.warn('[/api/tenant/current] JWT token expired');
      
      return NextResponse.json({ 
        message: 'Authentication token expired',
        tokenExpired: true,
        redirectTo: '/auth/signin?session_expired=true'
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      message: 'Error retrieving tenant information', 
      error: error.message 
    }, { status: 500 });
  }
} 