import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * GET /api/taxes/location/states
 * Proxies to backend tax states API
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      console.error('[States API] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    console.log('[States API] Fetching from backend with params:', queryString);
    
    // Call backend directly - no trailing slash
    const response = await fetch(`${BACKEND_URL}/api/taxes/location/states${queryString ? '?' + queryString : ''}`, {
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
      console.error('[States API] Received HTML error page instead of JSON');
      return NextResponse.json(
        { error: 'Backend returned HTML error page', states: [] },
        { status: 500 }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[States API] Failed to parse JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON response from backend', states: [] },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('[States API] Backend error:', response.status, data);
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch states', states: [] },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[States API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', states: [] },
      { status: 500 }
    );
  }
}