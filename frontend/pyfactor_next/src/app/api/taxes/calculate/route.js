import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * GET /api/taxes/calculate
 * Calculate tax rate based on location
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      console.error('[Tax Calculate] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const state = searchParams.get('state');
    const county = searchParams.get('county');

    console.log('[Tax Calculate] Calculating tax for:', { country, state, county });

    // Build query string for backend
    const backendParams = new URLSearchParams();
    if (country) backendParams.append('country', country);
    if (state) backendParams.append('state', state);
    if (county) backendParams.append('county', county);

    // Call backend tax calculation endpoint
    const response = await fetch(
      `${BACKEND_URL}/api/taxes/calculate/?${backendParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Session ${sidCookie.value}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('[Tax Calculate] Backend error:', response.status);
      const errorText = await response.text();
      console.error('[Tax Calculate] Error details:', errorText);
      return NextResponse.json(
        { error: 'Failed to calculate tax', tax_rate: 0 },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Tax Calculate] Backend response:', data);

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Tax Calculate] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        tax_rate: 0
      },
      { status: 500 }
    );
  }
}