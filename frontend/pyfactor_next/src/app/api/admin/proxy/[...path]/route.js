import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { standardSecurityHeaders } from '@/utils/responseHeaders';

const adminSecurityHeaders = {
  ...standardSecurityHeaders,
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
};

async function handleRequest(request, method) {
  try {
    console.log('[Admin Proxy] Request:', method, request.url);
    
    const cookieStore = cookies();
    const accessToken = cookieStore.get('admin_access_token')?.value;
    const csrfToken = request.headers.get('X-CSRF-Token');

    console.log('[Admin Proxy] Access token:', accessToken ? 'exists' : 'missing');

    if (!accessToken) {
      console.log('[Admin Proxy] No access token, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: adminSecurityHeaders }
      );
    }

    // Get the path from the URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').slice(4); // Remove /api/admin/proxy/
    const apiPath = '/' + pathSegments.join('/');

    console.log('[Admin Proxy] API path:', apiPath);
    console.log('[Admin Proxy] Query params:', url.search);

    // Prepare request body for non-GET requests
    let body;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        body = await request.json();
      } catch {
        body = null;
      }
    }

    // Forward the request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
    const fullUrl = `${backendUrl}/api/notifications${apiPath}${url.search}`;
    
    console.log('[Admin Proxy] Backend URL:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-CSRF-Token': csrfToken || '',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        'User-Agent': request.headers.get('user-agent') || 'unknown',
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    console.log('[Admin Proxy] Backend response status:', response.status);

    const data = await response.json().catch(() => null);

    console.log('[Admin Proxy] Backend response data:', data);

    return NextResponse.json(data || { error: 'Request failed' }, { 
      status: response.status,
      headers: adminSecurityHeaders 
    });

  } catch (error) {
    console.error('[Admin Proxy API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: adminSecurityHeaders }
    );
  }
}

export async function GET(request) {
  return handleRequest(request, 'GET');
}

export async function POST(request) {
  return handleRequest(request, 'POST');
}

export async function PATCH(request) {
  return handleRequest(request, 'PATCH');
}

export async function DELETE(request) {
  return handleRequest(request, 'DELETE');
}