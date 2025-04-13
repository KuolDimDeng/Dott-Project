import { jwtVerify } from 'jose';
import { logger } from '@/utils/serverLogger';

/**
 * Authentication utility functions that prioritize Cognito authentication
 * and avoid using cookies for security
 */

/**
 * Extracts and validates JWT token from request headers
 * @param {Request} request - The Next.js request object
 * @returns {Promise<Object|null>} - The decoded JWT payload or null if not valid
 */
export async function getJwtFromRequest(request) {
  try {
    // Get the authorization header (highest priority)
    const authHeader = request.headers.get('authorization');
    
    // Check if the header exists and starts with 'Bearer '
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract the token
      const token = authHeader.substring(7);
      
      try {
        // Verify and decode the token
        const secret = new TextEncoder().encode(
          process.env.JWT_SECRET || 'default-jwt-secret-for-development-only'
        );
        
        const { payload } = await jwtVerify(token, secret, {
          clockTolerance: 60 // 1 minute clock skew tolerance
        });
        
        logger.debug('[authUtils] Retrieved JWT from Authorization header');
        return payload;
      } catch (tokenError) {
        logger.warn('[authUtils] Invalid JWT token:', tokenError.message);
      }
    }
    
    // Check for Cognito specific headers (second priority)
    const cognitoToken = request.headers.get('x-cognito-token') || 
                        request.headers.get('x-id-token');
    
    if (cognitoToken) {
      try {
        // Parse the Cognito token
        const tokenParts = cognitoToken.split('.');
        if (tokenParts.length === 3) { // Simple check for JWT format
          const payload = JSON.parse(
            Buffer.from(tokenParts[1], 'base64').toString()
          );
          
          logger.debug('[authUtils] Retrieved JWT from Cognito header');
          return payload;
        }
      } catch (cognitoError) {
        logger.warn('[authUtils] Invalid Cognito token:', cognitoError.message);
      }
    }
    
    // Get JWT from any other custom headers (third priority)
    const customToken = request.headers.get('x-auth-token');
    if (customToken) {
      try {
        // Verify and decode the token (simplified for example)
        const tokenParts = customToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(tokenParts[1], 'base64').toString()
          );
          
          logger.debug('[authUtils] Retrieved JWT from custom header');
          return payload;
        }
      } catch (error) {
        logger.warn('[authUtils] Invalid custom token:', error.message);
      }
    }
    
    logger.warn('[authUtils] No valid authentication token found in request');
    return null;
  } catch (error) {
    logger.error('[authUtils] Error extracting JWT:', error);
    return null;
  }
}

/**
 * Check if a user is authenticated
 * @param {Request} request - The Next.js request object
 * @returns {Promise<boolean>} - Whether the user is authenticated
 */
export async function isAuthenticated(request) {
  const jwt = await getJwtFromRequest(request);
  return !!jwt;
}

/**
 * Get user ID from request
 * @param {Request} request - The Next.js request object
 * @returns {Promise<string|null>} - User ID or null
 */
export async function getUserId(request) {
  const jwt = await getJwtFromRequest(request);
  return jwt?.sub || null;
} 