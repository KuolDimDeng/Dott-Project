import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Get cookies from the request
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value || cookieStore.get('sid')?.value;
    
    console.log('[session-proxy] GET request for session');
    console.log('[session-proxy] Session token found:', !!sessionToken);
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    // Call the session-v2 endpoint using the frontend proxy pattern
    const response = await fetch(`${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/api/auth/session-v2`, {
      headers: {
        'Cookie': `session_token=${sessionToken}; sid=${sessionToken}`,
      },
    });

    if (!response.ok) {
      console.error('[session-proxy] Session validation failed:', response.status);
      return NextResponse.json(
        { error: 'Session invalid' },
        { status: 401 }
      );
    }

    const sessionData = await response.json();
    console.log('[session-proxy] Session data retrieved:', {
      authenticated: sessionData.authenticated,
      hasUser: !!sessionData.user,
      userEmail: sessionData.user?.email
    });
    
    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('[session-proxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}