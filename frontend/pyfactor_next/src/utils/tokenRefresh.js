import { getRefreshedAccessToken, isTokenExpired } from './auth';
import { logger } from './logger';
import { NextResponse } from 'next/server';

/**
 * Middleware function to handle token refresh for API routes
 * @param {Request} request - The incoming request
 * @param {Function} handler - The handler function to call with the refreshed token
 * @returns {Promise<Response>} - The response from the handler or an error response
 */
export async function withTokenRefresh(request, handler) {
  try {
    // Get tokens from request headers
    let accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const idToken = request.headers.get('X-Id-Token');
    
    if (!accessToken) {
      logger.error('[TokenRefresh] No auth token in request headers');
      return NextResponse.json(
        { error: 'No valid session' },
        { status: 401 }
      );
    }

    // Check if token is expired and refresh if needed
    if (isTokenExpired(accessToken)) {
      logger.warn('[TokenRefresh] Token is expired, attempting to refresh');
      const refreshedToken = await getRefreshedAccessToken();
      
      if (!refreshedToken) {
        logger.error('[TokenRefresh] Failed to refresh token');
        return NextResponse.json(
          { error: 'Session expired and token refresh failed. Please log in again.' },
          { status: 401 }
        );
      }
      
      logger.info('[TokenRefresh] Successfully refreshed token');
      accessToken = refreshedToken;
    }

    // Create a new request with the refreshed token
    const newHeaders = new Headers(request.headers);
    newHeaders.set('Authorization', `Bearer ${accessToken}`);
    
    const newRequest = new Request(request.url, {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      cache: request.cache,
      credentials: request.credentials,
      integrity: request.integrity,
      keepalive: request.keepalive,
      mode: request.mode,
      redirect: request.redirect,
      referrer: request.referrer,
      referrerPolicy: request.referrerPolicy,
      signal: request.signal,
    });

    // Call the handler with the new request
    return handler(newRequest, accessToken, idToken);
  } catch (error) {
    logger.error('[TokenRefresh] Error in token refresh middleware:', error);
    return NextResponse.json(
      { error: 'Authentication error', details: error.message },
      { status: 500 }
    );
  }
}