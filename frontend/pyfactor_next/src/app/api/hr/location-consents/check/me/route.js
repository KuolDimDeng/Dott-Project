import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://dott-api-y26w.onrender.com';

export async function GET(request) {
  try {
    console.log('[Location Consent Check] === GET REQUEST START ===');
    
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid');
    
    if (!sid) {
      console.log('[Location Consent Check] No session cookie found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
    };

    const backendUrl = `${BACKEND_URL}/api/hr/location-consents/check/me/`;
    console.log('[Location Consent Check] Backend URL:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    console.log('[Location Consent Check] Backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Location Consent Check] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to check location consent' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Location Consent Check] Success, returning data');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Location Consent Check] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}