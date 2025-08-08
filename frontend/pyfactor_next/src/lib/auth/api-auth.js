/**
 * API Authentication Helper
 * Standardized authentication for all API routes
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * Ensures an endpoint has a trailing slash for Django compatibility
 * @param {string} endpoint - API endpoint
 * @returns {string} Endpoint with trailing slash
 */
export function ensureTrailingSlash(endpoint) {
  // Remove leading slash if present
  let cleanEndpoint = endpoint.replace(/^\//, '');
  
  // Add trailing slash if not present (but only if there's no query string)
  if (cleanEndpoint && !cleanEndpoint.endsWith('/')) {
    // Check if there's a query string
    const hasQueryString = cleanEndpoint.includes('?');
    if (hasQueryString) {
      // Add slash before query string
      const [path, query] = cleanEndpoint.split('?');
      cleanEndpoint = `${path}/?${query}`;
    } else {
      // Simple case - just add trailing slash
      cleanEndpoint = `${cleanEndpoint}/`;
    }
  }
  
  return cleanEndpoint;
}

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
    
    console.log(`[API Proxy] Proxying ${endpoint} with session:`, sessionId?.value?.substring(0, 8) + '...');
    
    if (!sessionId?.value) {
      console.error('[API Proxy] No session cookie found');
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

    // Ensure trailing slash for Django compatibility
    const endpointWithSlash = ensureTrailingSlash(endpoint);
    
    // Forward to backend
    const backendUrl = `${BACKEND_URL}/api/${endpointWithSlash}`;
    console.log(`[API Proxy] Calling backend: ${backendUrl}`);
    console.log(`[API Proxy] Session ID: ${sessionId.value.substring(0, 8)}...`);
    
    const backendResponse = await fetch(
      backendUrl,
      {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Session ${sessionId.value}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
        ...(body && { body: JSON.stringify(body) }),
        cache: 'no-store',
      }
    );

    // Get response data
    let data = null;
    const contentType = backendResponse.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await backendResponse.json();
      } catch (e) {
        console.error('[API Proxy] Failed to parse JSON response:', e);
        data = { error: 'Invalid JSON response from backend' };
      }
    } else {
      // If not JSON, try to get text
      const text = await backendResponse.text();
      console.log('[API Proxy] Non-JSON response:', text.substring(0, 200));
      data = { error: 'Backend returned non-JSON response', detail: text.substring(0, 500) };
    }

    // Log the response for debugging
    console.log(`[API Proxy] Response for ${endpoint}:`, {
      status: backendResponse.status,
      hasData: !!data,
      dataKeys: data ? Object.keys(data).slice(0, 5) : null
    });

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