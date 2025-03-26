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
      const cookieStore = cookies();
      
      if (!accessToken) {
        accessToken = cookieStore.get('accessToken')?.value;
      }
      
      if (!idToken) {
        idToken = cookieStore.get('idToken')?.value;
      }
      
      if (!tenantId) {
        tenantId = cookieStore.get('tenantId')?.value;
        
        // If still not found, try to get from tenantUtils as a fallback
        if (!tenantId) {
          try {
            tenantId = getTenantId();
          } catch (e) {
            logger.debug('[ApiUtils] Error getting tenant ID from utils:', e);
          }
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