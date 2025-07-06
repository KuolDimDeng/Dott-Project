import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

let BACKEND_URL = process.env.BACKEND_API_URL || 'https://dott-api.onrender.com';

// Ensure BACKEND_URL always has a protocol
if (BACKEND_URL && !BACKEND_URL.startsWith('http://') && !BACKEND_URL.startsWith('https://')) {
  BACKEND_URL = `https://${BACKEND_URL}`;
}

/**
 * Proxy all backend API calls through Next.js
 * This ensures cookies work properly in production
 */
export async function GET(request, { params }) {
  return proxyRequest(request, params, 'GET');
}

export async function POST(request, { params }) {
  return proxyRequest(request, params, 'POST');
}

export async function PUT(request, { params }) {
  return proxyRequest(request, params, 'PUT');
}

export async function DELETE(request, { params }) {
  return proxyRequest(request, params, 'DELETE');
}

export async function PATCH(request, { params }) {
  return proxyRequest(request, params, 'PATCH');
}

async function proxyRequest(request, { params }, method) {
  try {
    const path = params.path.join('/');
    const url = new URL(request.url);
    const backendUrl = `${BACKEND_URL}/${path}${url.search}`;
    
    console.log(`[Backend Proxy] ${method} ${backendUrl}`);
    
    // Get cookies from the request
    const cookieStore = await cookies();
    // Check new session system first
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    // Build headers
    const headers = new Headers();
    
    // Copy relevant headers from the original request
    const headersToForward = [
      'content-type',
      'accept',
      'accept-language',
      'user-agent',
    ];
    
    for (const header of headersToForward) {
      const value = request.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    }
    
    // Add authorization header based on session type
    if (sidCookie || sessionTokenCookie) {
      // New session system - use session ID
      const sessionId = sidCookie?.value || sessionTokenCookie?.value;
      console.log('[Backend Proxy] Using new session system');
      headers.set('Authorization', `Session ${sessionId}`);
      headers.set('Cookie', `session_token=${sessionId}`);
    } else if (sessionCookie) {
      // Fallback to old session system
      try {
        const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        if (sessionData.accessToken) {
          console.log('[Backend Proxy] Using legacy session system');
          headers.set('Authorization', `Bearer ${sessionData.accessToken}`);
        }
      } catch (e) {
        console.error('[Backend Proxy] Error parsing session cookie:', e);
      }
    }
    
    // Handle request body
    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        body = await request.text();
      } else {
        body = await request.arrayBuffer();
      }
    }
    
    // Make the backend request
    const backendResponse = await fetch(backendUrl, {
      method,
      headers,
      body,
      // Don't follow redirects automatically
      redirect: 'manual',
    });
    
    // Create the response
    const responseHeaders = new Headers();
    
    // Copy response headers (except set-cookie)
    for (const [key, value] of backendResponse.headers.entries()) {
      if (key.toLowerCase() !== 'set-cookie') {
        responseHeaders.set(key, value);
      }
    }
    
    // Handle response body
    let responseBody;
    const responseContentType = backendResponse.headers.get('content-type');
    
    if (responseContentType?.includes('application/json')) {
      responseBody = await backendResponse.json();
    } else if (responseContentType?.includes('text')) {
      responseBody = await backendResponse.text();
    } else {
      responseBody = await backendResponse.arrayBuffer();
    }
    
    return new NextResponse(
      responseContentType?.includes('application/json') 
        ? JSON.stringify(responseBody)
        : responseBody,
      {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders,
      }
    );
    
  } catch (error) {
    console.error('[Backend Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Backend proxy error', message: error.message },
      { status: 500 }
    );
  }
}