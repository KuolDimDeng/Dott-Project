import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    console.log('[Geofence Check] === GET REQUEST START ===');
    
    const cookieStore = cookies();
    const sid = cookieStore.get('sid');
    
    if (!sid) {
      console.log('[Geofence Check] No session cookie found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
    };

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');
    const employee_id = searchParams.get('employee_id');
    
    console.log('[Geofence Check] Query params:', { latitude, longitude, employee_id });
    
    if (!latitude || !longitude || !employee_id) {
      return NextResponse.json(
        { error: 'latitude, longitude, and employee_id are required' },
        { status: 400 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/hr/geofences/check_location/?latitude=${latitude}&longitude=${longitude}&employee_id=${employee_id}`;
    console.log('[Geofence Check] Backend URL:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    console.log('[Geofence Check] Backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Geofence Check] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to check geofence location' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Geofence Check] Success, returning data');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Geofence Check] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}