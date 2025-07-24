import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

async function handleRequest(request, method) {
  try {
    console.log(`[Geofences API] === ${method} REQUEST START ===`);
    
    const cookieStore = cookies();
    const sid = cookieStore.get('sid');
    
    if (!sid) {
      console.log('[Geofences API] No session cookie found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
    };

    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = await request.json();
        console.log(`[Geofences API] Request body:`, body);
      } catch (e) {
        console.log('[Geofences API] No JSON body or parse error:', e.message);
      }
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    const searchParams = url.searchParams.toString();
    
    // Extract subpath from the request
    let subPath = '';
    if (pathname.includes('/api/hr/geofences/')) {
      subPath = pathname.split('/api/hr/geofences/')[1] || '';
    } else if (pathname.includes('/api/hr/geofences')) {
      // Handle case without trailing slash
      const parts = pathname.split('/api/hr/geofences');
      subPath = parts[1] ? parts[1].replace(/^\/+/, '') : '';
    }
    
    const backendUrl = `${BACKEND_URL}/api/hr/geofences/${subPath}${searchParams ? `?${searchParams}` : ''}`;
    
    console.log(`[Geofences API] Original pathname:`, pathname);
    console.log(`[Geofences API] Extracted subPath:`, JSON.stringify(subPath));
    console.log(`[Geofences API] Backend URL:`, backendUrl);
    
    const response = await fetch(backendUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      credentials: 'include',
    });

    console.log(`[Geofences API] Backend response status:`, response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Geofences API] Backend error:`, errorText);
      console.error(`[Geofences API] Backend status:`, response.status);
      console.error(`[Geofences API] Backend URL was:`, backendUrl);
      
      // Try to parse error as JSON
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { detail: errorText };
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to process geofence request',
          detail: errorData,
          status: response.status 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Geofences API] Success, data received:`, data);
    console.log(`[Geofences API] Data type:`, typeof data);
    console.log(`[Geofences API] Is array:`, Array.isArray(data));
    console.log(`[Geofences API] Data keys:`, Object.keys(data || {}));
    if (Array.isArray(data)) {
      console.log(`[Geofences API] Array length:`, data.length);
    } else if (data?.results) {
      console.log(`[Geofences API] Paginated results count:`, data.results?.length);
    }
    console.log(`[Geofences API] === ${method} REQUEST END ===`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[Geofences API] Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return handleRequest(request, 'GET');
}

export async function POST(request) {
  return handleRequest(request, 'POST');
}

export async function PUT(request) {
  return handleRequest(request, 'PUT');
}

export async function PATCH(request) {
  return handleRequest(request, 'PATCH');
}

export async function DELETE(request) {
  return handleRequest(request, 'DELETE');
}