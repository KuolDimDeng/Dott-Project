/**
 * Utility functions for API routes
 */
import { logger } from './logger';
import { getTenantId } from './tenantUtils';
import { cookies } from 'next/headers';

/**
 * Extract authentication tokens and tenant ID from request
 * 
 * @param {Request} request - The incoming request object
 * @returns {Object} Object containing accessToken, idToken, and tenantId
 */
export async function getTokens(request) {
  logger.debug('[ApiUtils] Extracting tokens from request');
  
  try {
    // Initialize default return values
    let accessToken = null;
    let idToken = null;
    let tenantId = null;
    
    // Try to get tokens from authorization headers first
    const authHeader = request.headers.get('authorization');
    const idTokenHeader = request.headers.get('x-id-token');
    const tenantIdHeader = request.headers.get('x-tenant-id');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.split(' ')[1];
    }
    
    if (idTokenHeader) {
      idToken = idTokenHeader;
    }
    
    if (tenantIdHeader) {
      tenantId = tenantIdHeader;
    }
    
    // If not in headers, try to get from cookies
    if (!accessToken || !idToken || !tenantId) {
      try {
        const cookieStore = cookies();
        
        if (!accessToken) {
          // Try multiple potential cookie names
          accessToken = cookieStore.get('accessToken')?.value || 
                        cookieStore.get('access_token')?.value || 
                        cookieStore.get('CognitoIdentityServiceProvider.*_accessToken')?.value;
        }
        
        if (!idToken) {
          // Try multiple potential cookie names
          idToken = cookieStore.get('idToken')?.value || 
                   cookieStore.get('id_token')?.value || 
                   cookieStore.get('CognitoIdentityServiceProvider.*_idToken')?.value;
        }
        
        if (!tenantId) {
          tenantId = cookieStore.get('tenantId')?.value || 
                    cookieStore.get('businessId')?.value;
        }
        
        // Log all cookies for debugging (only in dev)
        if (process.env.NODE_ENV === 'development') {
          const allCookies = cookieStore.getAll();
          logger.debug(`[ApiUtils] Found ${allCookies.length} cookies in request`);
          allCookies.forEach(cookie => {
            if (!cookie.name.toLowerCase().includes('token')) {
              logger.debug(`[ApiUtils] Cookie: ${cookie.name}`);
            } else {
              logger.debug(`[ApiUtils] Auth Cookie present: ${cookie.name}`);
            }
          });
        }
        
        // If still not found, parse raw cookie header (fallback)
        if ((!accessToken || !idToken) && request.headers.has('cookie')) {
          const cookieHeader = request.headers.get('cookie');
          const cookiePairs = cookieHeader.split(';');
          
          cookiePairs.forEach(pair => {
            const [name, value] = pair.trim().split('=');
            if (name && value) {
              if (name.includes('accessToken') && !accessToken) {
                accessToken = value;
              } else if (name.includes('idToken') && !idToken) {
                idToken = value;
              } else if (name.includes('tenantId') && !tenantId) {
                tenantId = value;
              }
            }
          });
        }
      } catch (cookieError) {
        logger.error('[ApiUtils] Error accessing cookies:', cookieError);
      }
      
      // If still not found and if we're on the server, use tenantId fallback
      if (!tenantId) {
        try {
          // Hardcoded fallback tenant ID for server-side requests
          tenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
          logger.debug('[ApiUtils] Using fallback tenant ID on server-side');
        } catch (e) {
          logger.debug('[ApiUtils] Error getting tenant ID from utils:', e);
        }
      }
    }
    
    logger.debug('[ApiUtils] Tokens extracted:', {
      hasAccessToken: !!accessToken,
      hasIdToken: !!idToken,
      hasTenantId: !!tenantId
    });
    
    return { accessToken, idToken, tenantId };
  } catch (error) {
    logger.error('[ApiUtils] Error extracting tokens:', error);
    return { accessToken: null, idToken: null, tenantId: null };
  }
} 