import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { getCurrentUser } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { logger } from '@/utils/logger';
import { getAmplifyConfig } from '@/config/amplify';

// Configure Amplify for server-side operations
Amplify.configure(getAmplifyConfig());

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

    // Verify token format and expiration
    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;
      if (!decoded.exp || decoded.exp < now) {
        return new Response('Token expired', { status: 401 });
      }
    } catch (error) {
      logger.error('[Session] Token validation failed:', error);
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

    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return new Response('User not found', { status: 401 });
    }

    // Set refreshed session cookies
    const response = NextResponse.json({ success: true, user: currentUser });
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
