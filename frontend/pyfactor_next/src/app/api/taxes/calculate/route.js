import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * GET /api/taxes/calculate
 * Calculate tax rate based on location
 */
export async function GET(request) {
  console.log('[Tax Calculate] === START PROXY REQUEST ===');
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    console.log('[Tax Calculate] Session cookie:', sidCookie ? `${sidCookie.value.substring(0, 8)}...` : 'MISSING');
    
    if (!sidCookie?.value) {
      console.error('[Tax Calculate] ❌ No session cookie found');
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

    console.log('[Tax Calculate] 📍 Request params:', { 
      country: country || 'EMPTY',
      state: state || 'EMPTY', 
      county: county || 'EMPTY'
    });

    // Build query string for backend
    const backendParams = new URLSearchParams();
    if (country) backendParams.append('country', country);
    if (state) backendParams.append('state', state);
    if (county) backendParams.append('county', county);

    // Call backend tax calculation endpoint
    const backendUrl = `${BACKEND_URL}/api/taxes/calculate/?${backendParams.toString()}`;
    console.log('[Tax Calculate] 🔄 Calling backend:', backendUrl);
    console.log('[Tax Calculate] Authorization header:', `Session ${sidCookie.value.substring(0, 8)}...`);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[Tax Calculate] Backend response status:', response.status);

    if (!response.ok) {
      console.error('[Tax Calculate] ❌ Backend error:', response.status);
      const errorText = await response.text();
      console.error('[Tax Calculate] Error response body:', errorText.substring(0, 500));
      
      return NextResponse.json(
        { 
          error: 'Failed to calculate tax', 
          tax_rate: 0,
          details: errorText.substring(0, 200)
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Tax Calculate] ✅ Backend success:', data);
    console.log('[Tax Calculate] === END PROXY REQUEST ===');

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Tax Calculate] ❌ Exception in proxy:', error);
    console.error('[Tax Calculate] Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        tax_rate: 0,
        message: error.message
      },
      { status: 500 }
    );
  }
}