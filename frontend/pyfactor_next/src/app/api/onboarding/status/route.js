import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Frontend API route to check onboarding status
 * This avoids SSL errors by making the backend call server-side
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    
    // Get session token
    const sessionToken = cookieStore.get('session_token');
    const authSession = cookieStore.get('dott_auth_session');
    
    if (!sessionToken && !authSession) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Get backend API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
    
    // Forward the request to backend
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add appropriate auth header
    if (sessionToken) {
      headers['Authorization'] = `Session ${sessionToken.value}`;
    } else if (authSession) {
      // Forward the cookie
      headers['Cookie'] = `dott_auth_session=${authSession.value}`;
    }
    
    const response = await fetch(`${apiUrl}/api/onboarding/status/`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch onboarding status', details: error },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Onboarding Status API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}