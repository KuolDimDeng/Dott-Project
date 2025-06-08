// This file is server-side only - do not import in client components
import { cookies, headers } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * Simple JWT decoder without verification (for extracting user info)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null if invalid
 */
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

/**
 * Validate server-side session using Auth0 v4.x cookie-based authentication
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
      // Check for Auth0 session cookie first
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('appSession');
      
      if (sessionCookie) {
        try {
          const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
          
          // Check if session is expired
          if (sessionData.accessTokenExpiresAt && Date.now() > sessionData.accessTokenExpiresAt) {
            logger.debug('[ServerUtils] Auth0 session expired');
            return { verified: false, error: 'Session expired' };
          }
          
          if (sessionData.user && sessionData.accessToken && sessionData.idToken) {
            logger.debug('[ServerUtils] Using Auth0 session cookie');
            accessToken = sessionData.accessToken;
            idToken = sessionData.idToken;
            
            // Extract user data from session
            const sessionUser = sessionData.user;
            return {
              verified: true,
              tokens: {
                accessToken,
                idToken
              },
              user: {
                userId: sessionUser.sub,
                email: sessionUser.email,
                attributes: {
                  sub: sessionUser.sub,
                  email: sessionUser.email,
                  email_verified: sessionUser.email_verified,
                  name: sessionUser.name,
                  picture: sessionUser.picture,
                  // Add custom attributes if they exist in the session
                  ...Object.keys(sessionUser)
                    .filter(key => key.startsWith('custom:'))
                    .reduce((acc, key) => {
                      acc[key] = sessionUser[key];
                      return acc;
                    }, {})
                }
              },
              tenantId: sessionUser['custom:tenant_ID'] || sessionUser['custom:tenantId'] || sessionUser['custom:businessid'] || null
            };
          }
        } catch (parseError) {
          logger.error('[ServerUtils] Error parsing Auth0 session cookie:', parseError);
        }
      }
      
      // Fallback: check for individual Auth0 token cookies
      const accessTokenCookie = cookieStore.get('auth0_access_token');
      const idTokenCookie = cookieStore.get('auth0_id_token');
      
      if (accessTokenCookie && accessTokenCookie.value) {
        accessToken = accessTokenCookie.value;
        idToken = idTokenCookie ? idTokenCookie.value : accessToken;
        logger.debug('[ServerUtils] Using Auth0 token cookies');
      }
      
      // Last resort: try Authorization header
      if (!accessToken) {
        const headersList = await headers();
        const authorization = headersList.get('Authorization');
        
        if (authorization && authorization.startsWith('Bearer ')) {
          accessToken = authorization.substring(7);
          idToken = accessToken; // Use same token as both for simplicity
          logger.debug('[ServerUtils] Using token from Authorization header');
        }
      }
    }

    // Return early if no tokens were found
    if (!idToken) {
      logger.warn('[ServerUtils] No valid Auth0 session tokens found');
      return { verified: false, error: 'No authentication tokens found' };
    }

    // Decode ID token to extract user information (without verification for Auth0 tokens)
    const idTokenDecoded = parseJwt(idToken);
    if (!idTokenDecoded) {
      logger.warn('[ServerUtils] Failed to decode Auth0 ID token');
      return { 
        verified: false,
        error: 'Invalid token format' 
      };
    }
    
    // Extract user information from decoded token
    const userId = idTokenDecoded.sub;
    const email = idTokenDecoded.email;
    const attributes = {
      sub: userId,
      email: email,
      email_verified: idTokenDecoded.email_verified,
      name: idTokenDecoded.name,
      picture: idTokenDecoded.picture
    };
    
    // Extract any custom attributes if they exist (for compatibility)
    Object.keys(idTokenDecoded).forEach(key => {
      if (key.startsWith('custom:')) {
        attributes[key] = idTokenDecoded[key];
      }
    });
    
    // Extract tenant ID from token claims (for compatibility)
    tenantId = idTokenDecoded['custom:tenant_ID'] ||
              idTokenDecoded['custom:tenantId'] ||
              idTokenDecoded['custom:businessid'] ||
              idTokenDecoded['custom:tenant_id'] ||
              null;
    
    logger.debug('[ServerUtils] Auth0 session validated successfully', {
      userId,
      email,
      hasTenantId: !!tenantId
    });

    // Return verified session for Auth0 tokens
    return {
      verified: true,
      username: email || userId,
      sub: userId,
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
    
  } catch (error) {
    logger.error('[ServerUtils] Auth0 session validation failed:', error);
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
    
    // Parse the Auth0 token
    const decodedToken = parseJwt(token);
    if (!decodedToken) {
      return null;
    }
    
    const username = decodedToken.email || decodedToken.sub;
    const email = decodedToken.email || null;
    const sub = decodedToken.sub;
    
    // Extract custom attributes if they exist (for compatibility)
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
    logger.error('[ServerUtils] Error getting user from Auth0 token:', error);
    return null;
  }
}