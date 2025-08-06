/**
 * API Authentication Helper
 * Standardized authentication for all API routes
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * Makes authenticated request to backend
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<Response>} Backend response
 */
export async function authenticatedFetch(endpoint, options = {}) {
  const cookieStore = cookies();
  const sessionId = cookieStore.get('sid');
  
  if (!sessionId?.value) {
    throw new Error('No session found');
  }

  const url = `${BACKEND_URL}/api/${endpoint.replace(/^\//, '')}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Session ${sessionId.value}`,
      ...options.headers,
    },
    cache: 'no-store', // Disable caching for API requests
  });

  return response;
}

/**
 * Standard API route wrapper with authentication
 * @param {Function} handler - Route handler function
 * @returns {Function} Wrapped handler
 */
export function createAuthenticatedRoute(handler) {
  return async (request, context) => {
    try {
      const cookieStore = cookies();
      const sessionId = cookieStore.get('sid');
      
      if (!sessionId?.value) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Validate session with backend
      const validationResponse = await fetch(
        `${BACKEND_URL}/api/auth/session-v2`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Session ${sessionId.value}`,
          },
          cache: 'no-store',
        }
      );

      if (!validationResponse.ok) {
        return NextResponse.json(
          { error: 'Invalid session' },
          { status: 401 }
        );
      }

      const session = await validationResponse.json();
      
      // Add session to request
      request.session = session;
      request.sessionId = sessionId.value;
      
      // Call the actual handler
      return await handler(request, context);
    } catch (error) {
      console.error('[API Auth] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Proxy request to backend with authentication
 * @param {string} endpoint - Backend endpoint
 * @param {Request} request - Original request
 * @returns {Promise<NextResponse>} Proxied response
 */
export async function proxyToBackend(endpoint, request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId?.value) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get request body if present
    let body = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        body = await request.json();
      } catch {
        // No JSON body
      }
    }

    // Forward to backend
    const backendResponse = await fetch(
      `${BACKEND_URL}/api/${endpoint.replace(/^\//, '')}`,
      {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Session ${sessionId.value}`,
        },
        ...(body && { body: JSON.stringify(body) }),
        cache: 'no-store',
      }
    );

    // Get response data
    const data = await backendResponse.json().catch(() => null);

    // Return with same status
    return NextResponse.json(
      data || { error: 'No response data' },
      { status: backendResponse.status }
    );
  } catch (error) {
    console.error('[API Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}