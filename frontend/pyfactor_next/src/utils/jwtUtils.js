import { logger } from './logger';

/**
 * Safely decodes a JWT token without validation
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null if invalid
 */
export function decodeJwt(token) {
  try {
    if (!token) return null;
    
    // JWT is in format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Base64 decode the payload
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    
    return JSON.parse(decoded);
  } catch (error) {
    logger.error('[jwtUtils] Error decoding JWT token:', error);
    return null;
  }
}

/**
 * Checks if a JWT token is expired
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired or invalid
 */
export function isTokenExpired(token) {
  try {
    const decoded = decodeJwt(token);
    if (!decoded || !decoded.exp) return true;
    
    // exp is in seconds, Date.now() is in milliseconds
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    logger.error('[jwtUtils] Error checking token expiration:', error);
    return true;
  }
}

/**
 * Gets the remaining time until a token expires
 * @param {string} token - JWT token to check
 * @returns {number} Seconds remaining until expiration (0 if expired)
 */
export function getTokenTimeRemaining(token) {
  try {
    const decoded = decodeJwt(token);
    if (!decoded || !decoded.exp) return 0;
    
    const expiresAt = decoded.exp * 1000; // convert to milliseconds
    const now = Date.now();
    
    return Math.max(0, Math.floor((expiresAt - now) / 1000));
  } catch (error) {
    logger.error('[jwtUtils] Error getting token time remaining:', error);
    return 0;
  }
} 