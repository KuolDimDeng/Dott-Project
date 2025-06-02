import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    console.log('[Auth Profile] Getting user session');
    
    // Try to get session from custom cookie first
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        
        // Check if session is expired
        if (sessionData.accessTokenExpiresAt && Date.now() > sessionData.accessTokenExpiresAt) {
          console.log('[Auth Profile] Session expired');
          return NextResponse.json(null, { status: 200 });
        }
        
        console.log('[Auth Profile] Session found for user:', sessionData.user.email);
        return NextResponse.json(sessionData.user);
        
      } catch (parseError) {
        console.error('[Auth Profile] Error parsing session cookie:', parseError);
      }
    }
    
    // Fallback: try Auth0 SDK session
    try {
      const { auth0 } = await import('@/lib/auth0');
      const session = await auth0.getSession(request);
      
      if (session && session.user) {
        console.log('[Auth Profile] Auth0 SDK session found for user:', session.user.email);
        return NextResponse.json(session.user);
      }
    } catch (auth0Error) {
      console.log('[Auth Profile] Auth0 SDK session not available:', auth0Error.message);
    }
    
    console.log('[Auth Profile] No session found');
    return NextResponse.json(null, { status: 200 });
    
  } catch (error) {
    console.error('[Auth Profile] Error getting session:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
} 