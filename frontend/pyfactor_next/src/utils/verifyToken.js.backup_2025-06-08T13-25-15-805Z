import { jwtDecode } from 'jwt-decode';
import { logger } from './logger';

/**
 * Validates a JWT token
 * @param {string} token - The token to validate
 * @returns {boolean} Whether the token is valid
 */
export function validateToken(token) {
  try {
    if (!token) {
      logger.warn('[validateToken] No token provided');
      return false;
    }

    const decoded = jwtDecode(token);
    const currentTime = Math.floor(Date.now() / 1000);

    // Check if token has expired
    if (decoded.exp && decoded.exp < currentTime) {
      logger.warn('[validateToken] Token has expired');
      return false;
    }

    // Check if token is not yet valid
    if (decoded.nbf && decoded.nbf > currentTime) {
      logger.warn('[validateToken] Token not yet valid');
      return false;
    }

    // Get header separately since jwt-decode v4 doesn't support header option
    const [headerB64] = token.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64').toString());

    // Validate token type and algorithm
    if (header.typ !== 'JWT') {
      logger.warn('[validateToken] Invalid token type');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('[validateToken] Error validating token:', error);
    return false;
  }
}

/**
 * Parses a JWT token and returns its payload
 * @param {string} token - The token to parse
 * @returns {Object|null} The decoded token payload or null if invalid
 */
export function parseToken(token) {
  try {
    if (!token) {
      logger.warn('[parseToken] No token provided');
      return null;
    }

    const decoded = jwtDecode(token);
    return decoded;
  } catch (error) {
    logger.error('[parseToken] Error parsing token:', error);
    return null;
  }
}