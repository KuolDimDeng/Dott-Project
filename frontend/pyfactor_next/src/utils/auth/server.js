/**
 * Server-side authentication utilities
 * 
 * These functions are meant to be used in API routes and server components
 */

import { logger } from '@/utils/logger';

/**
 * Extract JWT token from Authorization header
 * 
 * @param {Request} request - The incoming request
 * @returns {string|null} - The token or null if not found
 */
export function extractToken(request) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split(' ')[1];
}

/**
 * Verify and decode a JWT token
 * 
 * @param {string} token - The JWT token to verify
 * @returns {object|null} - The decoded token payload or null if invalid
 */
export async function verifyToken(token) {
  if (!token) return null;
  
  try {
    // This is a simple decode for development/testing
    // In production, you would verify against your Cognito JWKs or similar
    const decoded = decodeToken(token);
    
    if (!decoded || !decoded.sub) {
      logger.warn('[Auth:Server] Invalid token structure');
      return null;
    }
    
    return decoded;
  } catch (error) {
    logger.error('[Auth:Server] Token verification failed:', error);
    return null;
  }
}

/**
 * Simple JWT decoder without signature verification
 * Note: This is only suitable for development environments
 * 
 * @param {string} token - The JWT token to decode
 * @returns {object|null} - The decoded payload or null
 */
function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Handle both Node.js (Buffer) and browser (atob) environments
    let jsonPayload;
    if (typeof window === 'undefined') {
      // Node.js environment (server-side)
      const buff = Buffer.from(base64, 'base64');
      jsonPayload = buff.toString('utf-8');
    } else {
      // Browser environment (client-side)
      jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    }
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    logger.error('[Auth:Server] Error decoding token:', error);
    return null;
  }
}

/**
 * Get and validate user session from the request
 * 
 * @param {Request} request - The incoming request
 * @returns {object|null} - The session object or null if not authenticated
 */
export async function getSession(request) {
  try {
    const token = extractToken(request);
    
    if (!token) {
      logger.debug('[Auth:Server] No token found in request');
      return null;
    }
    
    const decodedToken = await verifyToken(token);
    
    if (!decodedToken) {
      logger.warn('[Auth:Server] Invalid or expired token');
      return null;
    }
    
    // Extract custom attributes into an attributes object
    const attributes = {};
    Object.keys(decodedToken).forEach(key => {
      if (key.startsWith('custom:')) {
        attributes[key] = decodedToken[key];
      } else {
        // Copy standard claims directly
        attributes[key] = decodedToken[key];
      }
    });
    
    // Create the session object
    const session = {
      idToken: token,
      accessToken: token, // In this simplified implementation, we use the same token
      user: {
        ...decodedToken,
        attributes
      },
      isAuthenticated: true
    };
    
    return session;
  } catch (error) {
    logger.error('[Auth:Server] Error getting session:', error);
    return null;
  }
} 