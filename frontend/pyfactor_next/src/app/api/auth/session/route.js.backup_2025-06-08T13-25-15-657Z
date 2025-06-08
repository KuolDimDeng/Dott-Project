import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Custom session endpoint to ensure properly formatted JSON responses
 * This endpoint is called by the Next Auth client library
 * Falls back to Cognito when NextAuth fails
 */
export async function GET(request) {
  try {
    console.log('[Auth Session] Getting Auth0 session data');
    
    // Try to get session from custom cookie first
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      console.log('[Auth Session] No session cookie found');
      return NextResponse.json(null, { status: 200 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (parseError) {
      console.error('[Auth Session] Error parsing session cookie:', parseError);
      return NextResponse.json(null, { status: 200 });
    }
    
    // Check if session is expired
    if (sessionData.accessTokenExpiresAt && Date.now() > sessionData.accessTokenExpiresAt) {
      console.log('[Auth Session] Session expired');
      return NextResponse.json(null, { status: 200 });
    }
    
    const { user, accessToken, idToken } = sessionData;
    
    if (!user) {
      console.log('[Auth Session] No user in session data');
      return NextResponse.json(null, { status: 200 });
    }
    
    console.log('[Auth Session] Session found for user:', user.email);
    
    // Return session data in the format expected by the callback
    return NextResponse.json({
      user: user,
      accessToken: accessToken,
      idToken: idToken,
      authenticated: true,
      source: 'session-cookie'
    });
    
  } catch (error) {
    console.error('[Auth Session] Error getting session:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
} 