import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { logger } from '@/utils/logger';
import { getCurrentUser, fetchAuthSession, validateToken } from '@/config/amplifyServer';

// No need to configure Amplify here as it's already configured in amplifyUnified.js

/**
 * Handle session token storage
 * @param {Request} request - The request object
 * @returns {Response} The response object
 */
export async function POST(request) {
  try {
    // Verify token from request
    const { token } = await request.json();
    if (!token) {
      return new Response('No token provided', { status: 400 });
    }

    // Validate token
    const validation = validateToken(token);
    if (!validation.valid) {
      logger.error('[Session] Token validation failed:', validation.reason);
      return new Response(validation.reason, { status: 401 });
    }
    
    const decoded = validation.decoded;

    // Set session cookies with secure options
    const response = NextResponse.json({ success: true });
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    };

    response.cookies.set('idToken', token, cookieOptions);
    response.cookies.set('accessToken', token, cookieOptions);

    logger.debug('[Session] Session tokens set successfully');
    return response;
  } catch (error) {
    logger.error('[Session] Failed to set session token:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

/**
 * Handle session refresh
 * @returns {Response} The response object
 */
export async function GET(request) {
  try {
    // Get tokens from request headers
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const idToken = request.headers.get('X-Id-Token');

    if (!accessToken || !idToken) {
      logger.error('[Session] No auth tokens in request headers');
      return new Response('No valid session', { status: 401 });
    }

    // Validate token, but be more lenient in development
    const validation = validateToken(idToken);
    if (!validation.valid && process.env.NODE_ENV === 'production') {
      return new Response(validation.reason, { status: 401 });
    }
    
    // If we're in development and the token is invalid, log a warning but continue
    if (!validation.valid && process.env.NODE_ENV !== 'production') {
      logger.warn('[Session] Token validation failed in development mode, continuing anyway:', validation.reason);
      // Try to decode the token anyway
      try {
        var decoded = jwtDecode(idToken);
      } catch (decodeError) {
        logger.error('[Session] Failed to decode token even in lenient mode:', decodeError);
        return new Response('Invalid token format', { status: 401 });
      }
    } else {
      var decoded = validation.decoded;
    }
    
    // Try to get current user from token
    let user;
    try {
      // Get current authenticated user from token
      const currentUser = await getCurrentUser(idToken);
      // Get session info
      const session = await fetchAuthSession(idToken);
      
      user = {
        username: currentUser.username,
        userId: currentUser.userId,
        email: decoded.email,
        attributes: {
          email: decoded.email,
          email_verified: decoded.email_verified,
          // Extract any custom attributes
          ...Object.keys(decoded)
            .filter(key => key.startsWith('custom:'))
            .reduce((obj, key) => {
              obj[key] = decoded[key];
              return obj;
            }, {})
        }
      };
    } catch (userError) {
      logger.error('[Session] Failed to get current user:', userError);
      // Fallback to token data if getCurrentUser fails
      user = {
        username: decoded['cognito:username'] || decoded.sub,
        email: decoded.email,
        attributes: {
          email: decoded.email,
          email_verified: decoded.email_verified,
          // Extract any custom attributes
          ...Object.keys(decoded)
            .filter(key => key.startsWith('custom:'))
            .reduce((obj, key) => {
              obj[key] = decoded[key];
              return obj;
            }, {})
        }
      };
    }

    // Set refreshed session cookies
    const response = NextResponse.json({ success: true, user });
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    };

    response.cookies.set('idToken', idToken, cookieOptions);
    response.cookies.set('accessToken', accessToken, cookieOptions);

    logger.debug('[Session] Session tokens refreshed successfully');
    return response;
  } catch (error) {
    logger.error('[Session] Failed to refresh session:', error);
    return new Response('Failed to refresh session', { status: 401 });
  }
}

/**
 * Handle session deletion
 * @returns {Response} The response object
 */
export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true });
    response.cookies.delete('idToken');
    response.cookies.delete('accessToken');
    logger.debug('[Session] Session tokens deleted successfully');
    return response;
  } catch (error) {
    logger.error('[Session] Failed to delete session:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
