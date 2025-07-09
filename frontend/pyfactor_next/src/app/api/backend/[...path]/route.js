import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

let BACKEND_URL = process.env.BACKEND_API_URL || 'https://dott-api-y26w.onrender.com';

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
    
    // Handle response body with proper error handling
    let responseBody;
    const responseContentType = backendResponse.headers.get('content-type');
    
    try {
      if (responseContentType?.includes('application/json')) {
        responseBody = await backendResponse.json();
      } else if (responseContentType?.includes('text')) {
        responseBody = await backendResponse.text();
        
        // If we're expecting JSON but got text, this might be an error
        if (path.includes('api/') && responseBody.includes('<!DOCTYPE html>')) {
          console.log('[Backend Proxy] Backend returned HTML for API request:', {
            path,
            status: backendResponse.status,
            contentType: responseContentType,
            bodyPreview: responseBody.substring(0, 200)
          });
          
          // Return structured error instead of HTML
          return NextResponse.json({
            error: 'Backend service returned HTML instead of API data',
            details: `API endpoint ${path} returned HTML page`,
            status: backendResponse.status
          }, { status: 502 });
        }
      } else {
        responseBody = await backendResponse.arrayBuffer();
      }
    } catch (error) {
      console.error('[Backend Proxy] Error processing response body:', error);
      
      // Try to get raw response for debugging
      try {
        const rawText = await backendResponse.text();
        console.log('[Backend Proxy] Raw response:', rawText.substring(0, 500));
        
        return NextResponse.json({
          error: 'Backend response parsing failed',
          details: error.message,
          status: backendResponse.status
        }, { status: 502 });
      } catch (textError) {
        return NextResponse.json({
          error: 'Backend response completely invalid',
          details: 'Unable to parse response in any format',
          status: backendResponse.status
        }, { status: 502 });
      }
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