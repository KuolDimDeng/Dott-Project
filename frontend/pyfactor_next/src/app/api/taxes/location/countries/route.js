import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * GET /api/taxes/location/countries
 * Proxies to backend tax countries API
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      console.error('[Countries API] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[Countries API] Fetching from backend with session:', sidCookie.value.substring(0, 8) + '...');
    
    // Call backend directly - no trailing slash
    const response = await fetch(`${BACKEND_URL}/api/taxes/location/countries`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      cache: 'no-store'
    });

    const responseText = await response.text();
    
    // Check if response is HTML (error page)
    if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
      console.error('[Countries API] Received HTML error page instead of JSON');
      console.error('[Countries API] Response status:', response.status);
      console.error('[Countries API] First 500 chars:', responseText.substring(0, 500));
      return NextResponse.json(
        { error: 'Backend returned HTML error page', countries: [] },
        { status: 500 }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[Countries API] Failed to parse JSON:', parseError);
      console.error('[Countries API] Response text:', responseText.substring(0, 200));
      return NextResponse.json(
        { error: 'Invalid JSON response from backend', countries: [] },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('[Countries API] Backend error:', response.status, data);
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch countries', countries: [] },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Countries API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', countries: [] },
      { status: 500 }
    );
  }
}