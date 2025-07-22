import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://dott-api-y26w.onrender.com';

export async function GET(request) {
  try {
    console.log('[Geofences Debug API] === GET REQUEST START ===');
    
    const cookieStore = cookies();
    const sid = cookieStore.get('sid');
    
    if (!sid) {
      console.log('[Geofences Debug API] No session cookie found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
    };

    const backendUrl = `${BACKEND_URL}/api/hr/geofences/debug_list/`;
    
    console.log(`[Geofences Debug API] Backend URL:`, backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    console.log(`[Geofences Debug API] Backend response status:`, response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Geofences Debug API] Backend error:`, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch debug data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Geofences Debug API] Success, data received:`, data);
    console.log(`[Geofences Debug API] === GET REQUEST END ===`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[Geofences Debug API] Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}