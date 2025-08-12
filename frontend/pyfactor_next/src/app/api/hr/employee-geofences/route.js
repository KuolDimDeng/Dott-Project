import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // Get session ID from sid cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = request.headers.get('X-Tenant-ID');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await request.json();

    // Forward to Django backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${API_URL}/api/hr/employee-geofences/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('[EmployeeGeofence] Create failed:', { status: response.status, error });
      return NextResponse.json({ error: 'Failed to assign geofence' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[EmployeeGeofence] Create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    console.log('[EmployeeGeofence] === GET REQUEST START ===');
    
    // Get session ID from sid cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      console.log('[EmployeeGeofence] No session cookie found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant ID from header or cookie
    let tenantId = request.headers.get('X-Tenant-ID');
    
    // If not in header, try to get from session cookie data
    if (!tenantId) {
      // For now, we'll make the tenant ID optional and let the backend handle it
      console.log('[EmployeeGeofence] No tenant ID in header, proceeding without it');
    }

    const searchParams = request.nextUrl.searchParams;
    const queryParams = new URLSearchParams();
    
    // Forward query parameters
    for (const [key, value] of searchParams) {
      queryParams.append(key, value);
    }
    
    console.log('[EmployeeGeofence] Query params:', queryParams.toString());

    // Forward to Django backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const backendUrl = `${API_URL}/api/hr/employee-geofences/?${queryParams}`;
    console.log('[EmployeeGeofence] Backend URL:', backendUrl);
    
    const headers = {
      'Authorization': `Session ${sidCookie.value}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // Only add tenant ID if we have it
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }
    
    console.log('[EmployeeGeofence] Request headers:', { ...headers, Authorization: 'Session ***' });
    
    const response = await fetch(backendUrl, { headers });
    
    console.log('[EmployeeGeofence] Response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('[EmployeeGeofence] List failed:', { status: response.status, error });
      logger.error('[EmployeeGeofence] List failed:', { status: response.status, error });
      return NextResponse.json({ error: 'Failed to get employee geofences' }, { status: response.status });
    }

    const data = await response.json();
    console.log('[EmployeeGeofence] Success, data received');
    console.log('[EmployeeGeofence] Data type:', typeof data);
    console.log('[EmployeeGeofence] Is array:', Array.isArray(data));
    console.log('[EmployeeGeofence] Data count:', Array.isArray(data) ? data.length : (data.results ? data.results.length : 'N/A'));
    console.log('[EmployeeGeofence] === GET REQUEST END ===');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[EmployeeGeofence] List error:', error);
    console.error('[EmployeeGeofence] Error stack:', error.stack);
    logger.error('[EmployeeGeofence] List error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}