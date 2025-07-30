import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  console.log('🎯 [Materials API] GET /api/inventory/materials - proxying to backend');
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    // Get search params from the request
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Forward the request to Django backend (no trailing slash)
    const response = await fetch(`${BACKEND_URL}/api/inventory/materials${queryString ? '?' + queryString : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        data,
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying materials request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const proxyRequestId = `proxy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log('🟠 [Materials API Proxy] === POST REQUEST START ===');
  console.log(`🟠 [${proxyRequestId}] Request ID:`, proxyRequestId);
  console.log(`🟠 [${proxyRequestId}] Timestamp:`, new Date().toISOString());
  console.log(`🟠 [${proxyRequestId}] URL: /api/inventory/materials`);
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    console.log(`🟠 [${proxyRequestId}] Session cookie present:`, !!sidCookie?.value);
    console.log(`🟠 [${proxyRequestId}] Session ID:`, sidCookie?.value?.substring(0, 8) + '...');
    
    if (!sidCookie?.value) {
      console.log(`🟠 [${proxyRequestId}] ❌ No session found - returning 401`);
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    console.log(`🟠 [${proxyRequestId}] POST body:`, body);
    console.log(`🟠 [${proxyRequestId}] Body keys:`, Object.keys(body));
    console.log(`🟠 [${proxyRequestId}] Body JSON:`, JSON.stringify(body, null, 2));
    
    // Remove trailing slash to avoid Django redirect
    const backendUrl = `${BACKEND_URL}/api/inventory/materials`;
    console.log(`🟠 [${proxyRequestId}] Backend URL:`, backendUrl);
    console.log(`🟠 [${proxyRequestId}] Sending to backend...`);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(body),
    });
    
    console.log(`🟠 [${proxyRequestId}] Backend response status:`, response.status);
    console.log(`🟠 [${proxyRequestId}] Backend response statusText:`, response.statusText);
    console.log(`🟠 [${proxyRequestId}] Backend response headers:`, Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log(`🟠 [${proxyRequestId}] Backend response data:`, data);
    console.log(`🟠 [${proxyRequestId}] Response data type:`, typeof data);
    console.log(`🟠 [${proxyRequestId}] Response data keys:`, data ? Object.keys(data) : 'null');
    console.log(`🟠 [${proxyRequestId}] Response JSON:`, JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.error(`🟠 [${proxyRequestId}] ❌ Backend error response:`, data);
      console.log(`🟠 [${proxyRequestId}] === POST REQUEST END (ERROR) ===`);
      return NextResponse.json(
        data,
        { status: response.status }
      );
    }

    console.log(`🟠 [${proxyRequestId}] ✅ Success - returning to client`);
    console.log(`🟠 [${proxyRequestId}] === POST REQUEST END ===`);
    return NextResponse.json(data);
  } catch (error) {
    console.error(`🟠 [${proxyRequestId}] ❌ Exception in proxy:`, error);
    console.error(`🟠 [${proxyRequestId}] Error type:`, error.constructor.name);
    console.error(`🟠 [${proxyRequestId}] Error message:`, error.message);
    console.error(`🟠 [${proxyRequestId}] Error stack:`, error.stack);
    console.log(`🟠 [${proxyRequestId}] === POST REQUEST END (EXCEPTION) ===`);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}