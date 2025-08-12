/**
 * Server-side auth utilities for API routes
 */

import { logger } from '@/utils/logger';

/**
 * Validates tenant access for API routes
 * @param {Request} request - The Next.js request object
 * @returns {Promise<Object>} Result with success status and tenant info
 */
export const validateTenantAccess = async (request) => {
  try {
    // Get session cookie
    const cookies = request.cookies;
    const sessionId = cookies.get('sid');
    
    if (!sessionId) {
      return {
        success: false,
        error: 'No session found'
      };
    }
    
    // Forward the session validation to Django backend
    const response = await fetch(`${process.env.BACKEND_API_URL || 'https://api.dottapps.com'}/api/auth/profile/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
    
    const userData = await response.json();
    
    return {
      success: true,
      tenantId: userData.tenant_id || userData.tenantId,
      userId: userData.user?.id || userData.userId,
      userData
    };
  } catch (error) {
    logger.error('[Auth] Error validating tenant access:', error);
    return {
      success: false,
      error: 'Authentication required'
    };
  }
};