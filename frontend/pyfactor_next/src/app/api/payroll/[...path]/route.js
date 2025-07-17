import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

async function handleRequest(request, { params }) {
  console.log('[Payroll API Proxy] === START ===');
  console.log('[Payroll API Proxy] Method:', request.method);
  console.log('[Payroll API Proxy] URL:', request.url);
  console.log('[Payroll API Proxy] Params:', params);
  
  const path = params.path ? params.path.join('/') : '';
  console.log('[Payroll API Proxy] Path segments:', path);
  
  const cookieStore = await cookies();
  const sid = cookieStore.get('sid');
  console.log('[Payroll API Proxy] Session ID exists:', !!sid);

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Add session token to Authorization header if available
  if (sid?.value) {
    headers['Authorization'] = `Session ${sid.value}`;
    headers['X-Session-ID'] = sid.value; // Keep for backward compatibility
  }

  try {
    // Handle request body for POST/PUT/PATCH
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        body = await request.json();
        console.log('[Payroll API Proxy] Request body:', body);
      } catch (e) {
        console.log('[Payroll API Proxy] No JSON body or parse error:', e.message);
      }
    }

    // Construct the backend URL
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    const backendPath = `/api/payroll/${path}${searchParams ? `?${searchParams}` : ''}`;
    const fullUrl = `${BACKEND_URL}${backendPath}`;
    
    console.log('[Payroll API Proxy] Backend URL:', fullUrl);
    console.log('[Payroll API Proxy] Headers:', headers);

    // Forward cookies from the incoming request
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    const backendResponse = await fetch(fullUrl, {
      method: request.method,
      headers,
      body: body ? JSON.stringify(body) : null,
      credentials: 'include',
    });

    console.log('[Payroll API Proxy] Backend response status:', backendResponse.status);
    console.log('[Payroll API Proxy] Backend response headers:', Object.fromEntries(backendResponse.headers.entries()));

    const responseData = await backendResponse.text();
    console.log('[Payroll API Proxy] Response data:', responseData.substring(0, 500));

    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch (e) {
      console.error('[Payroll API Proxy] Failed to parse response:', e);
      console.log('[Payroll API Proxy] === ERROR END ===');
      return new NextResponse(responseData, {
        status: backendResponse.status,
        headers: {
          'Content-Type': backendResponse.headers.get('content-type') || 'text/plain',
        },
      });
    }

    console.log('[Payroll API Proxy] === SUCCESS END ===');
    return NextResponse.json(parsedData, { status: backendResponse.status });
  } catch (error) {
    console.error('[Payroll API Proxy] Request failed:', error);
    console.error('[Payroll API Proxy] Error stack:', error.stack);
    console.log('[Payroll API Proxy] === ERROR END ===');
    return NextResponse.json(
      { error: 'Failed to fetch from backend', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request, context) {
  return handleRequest(request, context);
}

export async function POST(request, context) {
  return handleRequest(request, context);
}

export async function PUT(request, context) {
  return handleRequest(request, context);
}

export async function PATCH(request, context) {
  return handleRequest(request, context);
}

export async function DELETE(request, context) {
  return handleRequest(request, context);
}