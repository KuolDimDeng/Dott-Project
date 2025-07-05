// src/app/api/proxy/[...path]/route.js
// Proxy API requests to the backend server with proper HTTPS handling

import { NextResponse } from 'next/server';
import https from 'https';

// Configure global agent for self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // Allow self-signed certificates
});

/**
 * Ensure the path ends with a trailing slash to avoid 301 redirects
 * @param {string} path - API path
 * @returns {string} - Path with trailing slash if needed
 */
function ensureTrailingSlash(path) {
  // Some Django endpoints actually expect no trailing slash
  // Let's not modify the path at all and handle redirects instead
  return path;
}

/**
 * API route handler to proxy requests to the backend server
 */
export async function GET(request, { params }) {
  // Get the path from params
  const path = params.path || [];
  const apiPath = path.join('/');
  
  // Ensure path ends with trailing slash to prevent 301 redirects
  const normalizedPath = ensureTrailingSlash(apiPath);

  // Extract query parameters
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  
  // Construct the backend URL
  const backendUrl = `https://127.0.0.1:8000/api/${normalizedPath}${queryString ? `?${queryString}` : ''}`;
  
  console.log(`[Proxy] Forwarding GET to: ${backendUrl}`);
  
  try {
    // Extract authorization header if present
    const authHeader = request.headers.get('authorization');
    
    // Forward the request to the backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      // Use custom agent for HTTPS
      agent: httpsAgent
    });
    
    // Handle redirects manually
    if (response.status === 301 || response.status === 302) {
      const redirectUrl = response.headers.get('location');
      console.log(`[Proxy] Following redirect to: ${redirectUrl}`);
      
      const redirectResponse = await fetch(redirectUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
        },
        agent: httpsAgent
      });
      
      const redirectData = await redirectResponse.json();
      return NextResponse.json(redirectData, {
        status: redirectResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // For demo purposes, if we get a 401/403, return a more helpful message
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({
        error: 'Authentication required',
        message: 'You need to be logged in to access this endpoint',
        originalError: await response.text()
      }, { status: response.status });
    }
    
    // Convert the response to JSON
    const data = await response.json();
    
    // Return the data
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error(`[Proxy] Error forwarding request to ${backendUrl}:`, error);
    
    // Return a helpful error response
    return NextResponse.json(
      { 
        error: 'Failed to connect to backend server',
        details: error.message,
        hint: 'Make sure the backend server is running and accessible',
        serverUrl: backendUrl
      }, 
      { status: 500 }
    );
  }
}

/**
 * Handle POST requests
 */
export async function POST(request, { params }) {
  // Get the path from params
  const path = params.path || [];
  const apiPath = path.join('/');
  
  // Ensure path ends with trailing slash
  const normalizedPath = ensureTrailingSlash(apiPath);
  
  // Extract query parameters
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  
  // Construct the backend URL
  const backendUrl = `https://127.0.0.1:8000/api/${normalizedPath}${queryString ? `?${queryString}` : ''}`;
  
  console.log(`[Proxy] Forwarding POST to: ${backendUrl}`);
  
  try {
    // Extract authorization header if present
    const authHeader = request.headers.get('authorization');
    
    // Get the request body
    const body = await request.json();
    
    // Forward the request to the backend
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify(body),
      // Use custom agent for HTTPS
      agent: httpsAgent
    });
    
    // Handle redirects manually
    if (response.status === 301 || response.status === 302) {
      const redirectUrl = response.headers.get('location');
      console.log(`[Proxy] Following redirect to: ${redirectUrl}`);
      
      const redirectResponse = await fetch(redirectUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
        },
        body: JSON.stringify(body),
        agent: httpsAgent
      });
      
      const redirectData = await redirectResponse.json();
      return NextResponse.json(redirectData, {
        status: redirectResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Convert the response to JSON
    const data = await response.json();
    
    // Return the data
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error(`[Proxy] Error forwarding request to ${backendUrl}:`, error);
    
    // Return a helpful error response
    return NextResponse.json(
      { 
        error: 'Failed to connect to backend server',
        details: error.message,
        hint: 'Make sure the backend server is running and accessible',
        serverUrl: backendUrl
      }, 
      { status: 500 }
    );
  }
}

// Also handle PUT and DELETE methods similarly
export async function PUT(request, { params }) {
  // Get the path from params
  const path = params.path || [];
  const apiPath = path.join('/');
  
  // Ensure path ends with trailing slash
  const normalizedPath = ensureTrailingSlash(apiPath);
  
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const backendUrl = `https://127.0.0.1:8000/api/${normalizedPath}${queryString ? `?${queryString}` : ''}`;
  
  try {
    // Extract authorization header if present
    const authHeader = request.headers.get('authorization');
    
    const body = await request.json();
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify(body),
      agent: httpsAgent
    });
    
    // Handle redirects
    if (response.status === 301 || response.status === 302) {
      const redirectUrl = response.headers.get('location');
      const redirectResponse = await fetch(redirectUrl, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
        },
        body: JSON.stringify(body),
        agent: httpsAgent
      });
      
      const redirectData = await redirectResponse.json();
      return NextResponse.json(redirectData, { status: redirectResponse.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const path = params.path || [];
  const apiPath = path.join('/');
  
  // Ensure path ends with trailing slash
  const normalizedPath = ensureTrailingSlash(apiPath);
  
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const backendUrl = `https://127.0.0.1:8000/api/${normalizedPath}${queryString ? `?${queryString}` : ''}`;
  
  try {
    // Extract authorization header if present
    const authHeader = request.headers.get('authorization');
    
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      agent: httpsAgent
    });
    
    // Handle redirects
    if (response.status === 301 || response.status === 302) {
      const redirectUrl = response.headers.get('location');
      const redirectResponse = await fetch(redirectUrl, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
        },
        agent: httpsAgent
      });
      
      if (redirectResponse.status === 204) {
        return new NextResponse(null, { status: 204 });
      }
      
      const redirectData = await redirectResponse.json();
      return NextResponse.json(redirectData, { status: redirectResponse.status });
    }
    
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 