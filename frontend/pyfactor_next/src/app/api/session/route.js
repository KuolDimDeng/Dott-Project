import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { verifyToken, decodeToken } from '@/utils/serverAuth';

// Using our server-side auth utilities that don't rely on Amplify

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

    // Verify token using our server-side utility
    const payload = await verifyToken(token);
    if (!payload) {
      logger.error('[Session] Token verification failed');
      return new Response('Invalid token', { status: 401 });
    }
    
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

    // Verify token with our server-side utility
    const payload = await verifyToken(idToken);
    
    // In development, be more lenient with token validation
    let decodedToken;
    if (!payload && process.env.NODE_ENV !== 'production') {
      logger.warn('[Session] Token verification failed in development mode, falling back to decoding');
      decodedToken = decodeToken(idToken);
      if (!decodedToken) {
        logger.error('[Session] Failed to decode token even in lenient mode');
        return new Response('Invalid token format', { status: 401 });
      }
    } else if (!payload) {
      logger.error('[Session] Token verification failed in production mode');
      return new Response('Invalid or expired token', { status: 401 });
    } else {
      decodedToken = payload;
    }
    
    // Construct user object from token data
    const user = {
      username: decodedToken['cognito:username'] || decodedToken.sub,
      userId: decodedToken.sub,
      email: decodedToken.email,
      attributes: {
        email: decodedToken.email,
        email_verified: decodedToken.email_verified === 'true' || decodedToken.email_verified === true,
        // Extract any custom attributes
        ...Object.keys(decodedToken)
          .filter(key => key.startsWith('custom:'))
          .reduce((obj, key) => {
            obj[key] = decodedToken[key];
            return obj;
          }, {})
      }
    };

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
