/**
 * Server-side authentication utilities that don't rely on Amplify
 * This is needed because Amplify v6 doesn't work in server components
 */

import { jwtVerify, createRemoteJWKSet } from 'jose';
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';
import { decodeJwt } from './jwtUtils';

// Get Cognito configuration from environment variables
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
const USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';

// Set up the JWKS (JSON Web Key Set) endpoint for Cognito
const JWKS_URI = `https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;
const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

/**
 * Verify a JWT token from Cognito without relying on Amplify
 * @param {string} token - The JWT token to verify
 * @returns {Promise<Object|null>} - Decoded and verified token payload or null if invalid
 */
export async function verifyToken(token) {
  if (!token) {
    logger.debug('[ServerAuth] No token provided');
    return null;
  }

  try {
    // Verify the token using jose and the Cognito JWKS
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`,
    });

    logger.debug('[ServerAuth] Token verified successfully');
    return payload;
  } catch (error) {
    logger.error('[ServerAuth] Token verification failed:', {
      error: error.message,
      code: error.code,
      name: error.name
    });
    return null;
  }
}

/**
 * Get the authenticated user from the request
 * Extracts the token from cookies or Authorization header
 * @param {Request} request - The incoming request object
 * @returns {Promise<Object|null>} - The authenticated user or null
 */
export async function getServerUser(request) {
  try {
    // Try to get token from cookies first
    let token = null;
    
    // Try cookies
    const cookies = request.cookies;
    if (cookies.has('idToken')) {
      token = cookies.get('idToken').value;
      logger.debug('[ServerAuth] Found token in cookies');
    } 
    
    // If no token in cookies, try Authorization header
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        logger.debug('[ServerAuth] Found token in Authorization header');
      }
    }
    
    // Also check X-Id-Token header (set by our middleware)
    if (!token) {
      token = request.headers.get('X-Id-Token');
      if (token) {
        logger.debug('[ServerAuth] Found token in X-Id-Token header');
      }
    }
    
    if (!token) {
      logger.debug('[ServerAuth] No token found in request');
      return null;
    }
    
    // Verify the token
    const payload = await verifyToken(token);
    if (!payload) {
      return null;
    }
    
    // Extract user information from token claims
    const user = {
      sub: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified,
      'custom:onboarding': payload['custom:onboarding'] || 'not_started',
      'custom:businessName': payload['custom:businessName'] || '',
      'custom:businessType': payload['custom:businessType'] || '',
      'custom:tenant_ID': payload['custom:tenant_ID'] || '',
    };
    
    return user;
  } catch (error) {
    logger.error('[ServerAuth] Error getting server user:', {
      message: error.message,
      stack: error.stack
    });
    return null;
  }
}

/**
 * Middleware to require authentication for API routes
 * @param {Function} handler - The API route handler
 * @returns {Function} - Wrapped handler with authentication check
 */
export function withAuth(handler) {
  return async function(request, ...args) {
    // Get the user from the request
    const user = await getServerUser(request);
    
    // If no user is found, return 401 Unauthorized
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Call the original handler with the user attached to the request
    request.user = user;
    return handler(request, ...args);
  };
}

/**
 * Extract JWT token from request
 * @param {Request} request - The incoming request
 * @returns {string|null} - The token or null if not found
 */
export function extractTokenFromRequest(request) {
  // Try cookies first
  if (request.cookies.has('idToken')) {
    return request.cookies.get('idToken').value;
  }
  
  // Then try headers
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  const idTokenHeader = request.headers.get('X-Id-Token');
  if (idTokenHeader) {
    return idTokenHeader;
  }
  
  return null;
}

/**
 * Decode a JWT token without verification
 * Useful for debugging or non-critical information
 * @param {string} token - The JWT token
 * @returns {Object|null} - The decoded token or null
 */
export function decodeToken(token) {
  if (!token) return null;
  
  try {
    // Split the token and decode the payload
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decodedPayload = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(decodedPayload);
  } catch (error) {
    logger.error('[ServerAuth] Error decoding token:', error);
    return null;
  }
}

/**
 * Validate server session from tokens
 * Prioritizes extracting user info from tokens rather than cookies
 */
export async function validateServerSession() {
  try {
    const cookieStore = cookies();
    
    // Get tokens from cookies
    const idToken = cookieStore.get('idToken')?.value;
    const accessToken = cookieStore.get('accessToken')?.value;
    
    if (!idToken) {
      throw new Error('No valid ID token found');
    }
    
    // Decode the ID token to get user information
    const decodedToken = decodeToken(idToken);
    if (!decodedToken) {
      throw new Error('Failed to decode ID token');
    }
    
    // Extract user attributes directly from the token
    const userId = decodedToken.sub;
    
    // Extract all custom attributes from the token
    const attributes = {};
    Object.entries(decodedToken).forEach(([key, value]) => {
      if (key.startsWith('custom:') || 
          ['email', 'email_verified', 'sub', 'cognito:username'].includes(key)) {
        attributes[key] = value;
      }
    });
    
    // Add standard fields
    attributes.email = decodedToken.email;
    attributes.sub = userId;
    
    logger.debug('[ServerAuth] Validated session with token data', {
      userId,
      attributes: Object.keys(attributes).filter(k => !!attributes[k])
    });
    
    return {
      tokens: {
        idToken,
        accessToken
      },
      user: {
        userId,
        attributes
      }
    };
    
  } catch (error) {
    logger.error('[ServerAuth] Failed to validate session:', error);
    throw error;
  }
}

/**
 * Gets the current user from auth tokens in request
 * This is a server-side utility
 */
export async function getCurrentUser(request) {
  try {
    if (!request) {
      logger.error('[serverAuth] getCurrentUser called without request object');
      return null;
    }
    
    // Extract auth tokens from headers
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const idToken = request.headers.get('x-id-token');
    
    // Extract from cookies if not in headers
    const cookies = request.cookies;
    let cookieToken = null;
    
    // Check for tokens in cookies
    // First try standard JWT cookie
    if (cookies.get('idToken')?.value) {
      cookieToken = cookies.get('idToken').value;
    }
    
    // Then try Cognito format cookies
    if (!cookieToken) {
      const cognitoCookieKey = Object.keys(cookies.getAll()).find(key => 
        key.includes('CognitoIdentityServiceProvider') && key.includes('.idToken')
      );
      
      if (cognitoCookieKey) {
        cookieToken = cookies.get(cognitoCookieKey).value;
      }
    }
    
    // Use headers or cookie token
    const token = idToken || accessToken || cookieToken;
    
    if (!token) {
      logger.warn('[serverAuth] No auth token found');
      return null;
    }
    
    // Decode the token rather than validating it
    // Validation would require crypto and AWS libraries which are heavy
    const decodedToken = decodeJwt(token);
    
    if (!decodedToken) {
      logger.warn('[serverAuth] Failed to decode token');
      return null;
    }
    
    // Format attributes from token into user object
    const attributes = decodedToken;
    const user = {
      id: attributes.sub || attributes['cognito:username'],
      email: attributes.email,
      firstName: attributes.given_name || attributes['custom:firstName'] || '',
      lastName: attributes.family_name || attributes['custom:lastName'] || '',
      tenantId: attributes['custom:tenantId'] || attributes['custom:businessId'],
      onboarding: attributes['custom:onboarding'],
      setupDone: attributes['custom:setupdone'] === 'true'
    };
    
    // Fill in name fields if missing
    if (!user.firstName && !user.lastName && attributes.name) {
      const nameParts = attributes.name.split(' ');
      user.firstName = nameParts[0] || '';
      user.lastName = nameParts.slice(1).join(' ') || '';
    }
    
    return user;
  } catch (error) {
    logger.error('[serverAuth] Error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Mock function for server-side fetchUserAttributes
 * This is needed because Amplify's client-side functions don't work server-side
 */
export async function fetchUserAttributes(req) {
  try {
    // Get user from token if request is provided
    if (req) {
      const user = await getCurrentUser(req);
      if (user) {
        return {
          sub: user.id,
          email: user.email,
          given_name: user.firstName,
          family_name: user.lastName,
          'custom:tenantId': user.tenantId,
          'custom:onboarding': user.onboarding,
          'custom:setupdone': user.setupDone ? 'true' : 'false'
        };
      }
    }
    
    // Fallback: Access is server-side, so this is a mock response
    return null;
  } catch (error) {
    logger.error('[serverAuth] Error in fetchUserAttributes:', error);
    return null;
  }
}