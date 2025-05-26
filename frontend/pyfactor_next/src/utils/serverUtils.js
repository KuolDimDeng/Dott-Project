// This file is server-side only - do not import in client components
import { cookies, headers } from 'next/headers';
import { logger } from './serverLogger';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

/**
 * Parse JWT token without verification
 * @param {string} token - JWT token
 * @returns {Object|null} Parsed token payload or null if invalid
 */
function parseJwt(token) {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    logger.error('[ServerUtils] Error parsing JWT:', e);
    return null;
  }
}

/**
 * Validate server-side session by checking tokens from various sources
 * @param {Object} providedTokens - Optional tokens to use instead of extracting from request
 * @returns {Object} Session object with verification status and tokens
 */
export async function validateServerSession(providedTokens) {
  try {
    let accessToken, idToken;
    let tenantId;
    
    if (providedTokens?.accessToken && providedTokens?.idToken) {
      // Use provided tokens if available
      accessToken = providedTokens.accessToken;
      idToken = providedTokens.idToken;
      logger.debug('[ServerUtils] Using provided tokens');
    } else {
      // Try to get tokens from Authorization header
      const headersList = await headers();
      const authorization = headersList.get('Authorization');
      
      // Extract token from Authorization header
      if (authorization && authorization.startsWith('Bearer ')) {
        idToken = authorization.substring(7);
        accessToken = idToken; // Use same token as both for simplicity
        logger.debug('[ServerUtils] Using token from Authorization header');
      }
      
      // If not found in headers, fall back to cookies
      if (!idToken) {
        // Get cookies using Next.js cookies API
        const cookieStore = await cookies();
        idToken = cookieStore.get('idToken')?.value;
        accessToken = cookieStore.get('accessToken')?.value;
        
        // If tokens found in cookies, use them
        if (idToken) {
          logger.debug('[ServerUtils] Using tokens from cookies');
        }
      }
    }

    // Return early if no tokens were found
    if (!idToken) {
      logger.warn('[ServerUtils] No valid session tokens found');
      return { verified: false };
    }

    // Decode ID token to extract user information (without verification)
    const idTokenDecoded = parseJwt(idToken);
    if (!idTokenDecoded) {
      logger.warn('[ServerUtils] Failed to decode ID token');
      return { 
        verified: false,
        error: 'Invalid token format' 
      };
    }
    
    // Extract user information from decoded token
    const userId = idTokenDecoded.sub;
    const email = idTokenDecoded.email;
    const attributes = {};
    
    // Extract custom attributes
    Object.keys(idTokenDecoded).forEach(key => {
      if (key.startsWith('custom:')) {
        attributes[key] = idTokenDecoded[key];
      }
    });
    
    // Extract tenant ID from token claims
    tenantId = idTokenDecoded['custom:tenant_ID'] ||
              idTokenDecoded['custom:tenantId'] ||
              idTokenDecoded['custom:businessid'] ||
              idTokenDecoded['custom:tenant_id'] ||
              null;
    
    // Skip token verification in development mode if configured
    if (process.env.SKIP_TOKEN_VERIFICATION === 'true' && process.env.NODE_ENV === 'development') {
      logger.warn('[ServerUtils] Skipping token verification in development mode');
      return {
        verified: true,
        username: idTokenDecoded.username || idTokenDecoded.sub,
        sub: idTokenDecoded.sub,
        userId: userId,
        email: email,
        tokens: {
          accessToken: accessToken || idToken,
          idToken
        },
        user: {
          userId: userId,
          email: email,
          attributes: attributes || {}
        },
        tenantId
      };
    }
    
    // Verify tokens in production
    try {
      // Create JWT verifier
      const verifier = CognitoJwtVerifier.create({
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
        tokenUse: 'id', // Verify as ID token
        clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
      });
      
      // Verify the token
      await verifier.verify(idToken);
      logger.debug('[ServerUtils] Token verified successfully');
      
      // Return verified session
      return {
        verified: true,
        username: idTokenDecoded.username || idTokenDecoded.sub,
        sub: idTokenDecoded.sub,
        userId: userId,
        email: email,
        tokens: {
          accessToken: accessToken || idToken,
          idToken
        },
        user: {
          userId: userId,
          email: email,
          attributes: attributes || {}
        },
        tenantId
      };
    } catch (verifyError) {
      logger.error('[ServerUtils] Token verification failed:', verifyError);
      
      // Return partial session with verification failure flag
      return { 
        verified: false, 
        error: verifyError.message,
        tokens: { 
          accessToken: accessToken || idToken,
          idToken 
        },
        user: {
          userId: userId,
          email: email,
          attributes: attributes || {}
        },
        tenantId
      };
    }
  } catch (error) {
    logger.error('[ServerUtils] Session validation failed:', error);
    return { 
      verified: false, 
      error: error.message 
    };
  }
}

export async function getServerUserFromToken(token) {
  try {
    if (!token) {
      logger.error('[ServerUtils] No token provided for user extraction');
      return null;
    }
    
    // Parse the token - this is simplified and NOT proper verification
    // For real security, use the verifier from validateServerSession
    function parseJwt(token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
        return JSON.parse(jsonPayload);
      } catch (e) {
        logger.error('[ServerUtils] Error parsing JWT:', e);
        return null;
      }
    }
    
    const decodedToken = parseJwt(token);
    if (!decodedToken) {
      return null;
    }
    
    const username = decodedToken.username || decodedToken['cognito:username'] || decodedToken.sub;
    const email = decodedToken.email || null;
    const sub = decodedToken.sub;
    
    // Extract custom attributes if they exist
    const customAttributes = {};
    Object.keys(decodedToken).forEach(key => {
      if (key.startsWith('custom:')) {
        const customKey = key.replace('custom:', '');
        customAttributes[customKey] = decodedToken[key];
      }
    });
    
    return {
      username,
      email,
      sub,
      ...customAttributes,
      _raw: decodedToken
    };
  } catch (error) {
    logger.error('[ServerUtils] Error getting user from token:', error);
    return null;
  }
}