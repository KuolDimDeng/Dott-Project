import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://dott-api-y26w.onrender.com';

export async function POST(request) {
  try {
    console.log('[Geofence Check] === POST REQUEST START ===');
    
    const cookieStore = cookies();
    const sid = cookieStore.get('sid');
    
    if (!sid) {
      console.log('[Geofence Check] No session cookie found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const body = await request.json();
    console.log('[Geofence Check] Request body:', body);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
    };

    const backendUrl = `${BACKEND_URL}/api/hr/geofence-events/check/`;
    console.log('[Geofence Check] Backend URL:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    });

    console.log('[Geofence Check] Backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Geofence Check] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to check geofence status' },
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