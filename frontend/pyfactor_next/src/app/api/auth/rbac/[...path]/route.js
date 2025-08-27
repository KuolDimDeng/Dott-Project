import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/utils/backend-url';
import { cookies } from 'next/headers';

async function handleRBACRequest(request, method, params) {
  try {
    const backendUrl = getBackendUrl();
    const path = params.path ? params.path.join('/') : '';
    const url = new URL(request.url);
    
    // Construct the backend URL
    const apiUrl = `${backendUrl}/api/auth/rbac/${path}${url.search}`;
    
    console.log(`[RBAC Proxy] ${method} request to:`, apiUrl);
    
    // Get cookies to forward
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      'X-Forwarded-Host': request.headers.get('host') || '',
    };
    
    // Add session cookie if available
    if (sidCookie || sessionTokenCookie) {
      const cookieValue = sidCookie ? `sid=${sidCookie.value}` : `session_token=${sessionTokenCookie.value}`;
      headers['Cookie'] = cookieValue;
      headers['X-Session-ID'] = sidCookie?.value || sessionTokenCookie?.value;
    }
    
    // Prepare request options
    const options = {
      method,
      headers,
      credentials: 'include',
    };
    
    // Add body for non-GET requests
    if (method !== 'GET' && method !== 'HEAD') {
      const body = await request.text();
      if (body) {
        options.body = body;
      }
    }
    
    // Make the request to backend
    const response = await fetch(apiUrl, options);
    
    // Get response text
    const responseText = await response.text();
    
    // Parse response if it's JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    
    // Return the response
    return NextResponse.json(responseData, { 
      status: response.status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('[RBAC Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  return handleRBACRequest(request, 'GET', params);
}

export async function POST(request, { params }) {
  return handleRBACRequest(request, 'POST', params);
}

export async function PUT(request, { params }) {
  return handleRBACRequest(request, 'PUT', params);
}

export async function PATCH(request, { params }) {
  return handleRBACRequest(request, 'PATCH', params);
}

export async function DELETE(request, { params }) {
  return handleRBACRequest(request, 'DELETE', params);
}