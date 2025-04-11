import { jwtDecode } from 'jwt-decode';
import { cookies } from 'next/headers';
import { logger } from '@/utils/serverLogger';

/**
 * Extract and decode JWT from a request
 * @param {Request} request - Next.js request object
 * @returns {Object|null} - Decoded JWT payload or null if not found/invalid
 */
export async function getJwtFromRequest(request) {
  try {
    // Try to get token from Authorization header
    let token = null;
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // If no token in header, try ID token header
    if (!token) {
      token = request.headers.get('X-Id-Token');
    }
    
    // If still no token, try cookies
    if (!token) {
      const cookieStore = cookies();
      
      // Try various cookie names for tokens
      token = cookieStore.get('idToken')?.value || 
              cookieStore.get('accessToken')?.value || 
              cookieStore.get('authToken')?.value;
      
      // Try Cognito-specific cookies as last resort
      if (!token) {
        const lastAuthUser = cookieStore.get('CognitoIdentityServiceProvider.1o5v84mrgn4gt87khtr179uc5b.LastAuthUser')?.value;
        if (lastAuthUser) {
          token = cookieStore.get(`CognitoIdentityServiceProvider.1o5v84mrgn4gt87khtr179uc5b.${lastAuthUser}.idToken`)?.value;
        }
      }
    }
    
    // If no token found, return null
    if (!token) {
      logger.warn('[authUtils] No JWT token found in request');
      return null;
    }
    
    // Decode the token
    const decoded = jwtDecode(token);
    
    // Basic validation
    if (!decoded || !decoded.sub) {
      logger.warn('[authUtils] Invalid JWT payload');
      return null;
    }
    
    // Check token expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      logger.warn(`[authUtils] JWT token expired`);
      return null;
    }
    
    return decoded;
  } catch (error) {
    logger.error('[authUtils] Error extracting JWT from request:', error);
    return null;
  }
} 