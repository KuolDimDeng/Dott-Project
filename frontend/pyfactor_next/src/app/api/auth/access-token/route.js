import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    console.log('[Auth Access Token] Getting access token');
    
    const cookieStore = cookies();
    // Check new session system first
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    // If we have new session cookies, use the backend session API
    if (sidCookie || sessionTokenCookie) {
      const sessionId = sidCookie?.value || sessionTokenCookie?.value;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
      
      try {
        console.log('[Auth Access Token] Using new session system');
        const response = await fetch(`${API_URL}/api/sessions/current/`, {
          headers: {
            'Authorization': `Session ${sessionId}`,
            'Cookie': `session_token=${sessionId}`
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          const sessionData = await response.json();
          // Backend doesn't return access tokens directly for security
          // Return a success indicator instead
          return NextResponse.json({
            access_token: 'session-v2-active',
            accessToken: 'session-v2-active',
            token: 'session-v2-active',
            session_type: 'backend-v2',
            authenticated: true
          });
        } else {
          console.log('[Auth Access Token] Backend session invalid:', response.status);
          return NextResponse.json({ error: 'Session invalid' }, { status: 401 });
        }
      } catch (error) {
        console.error('[Auth Access Token] Error fetching backend session:', error);
        // Fall through to legacy check
      }
    }
    
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        
        // Check if session is expired
        if (sessionData.accessTokenExpiresAt && Date.now() > sessionData.accessTokenExpiresAt) {
          console.log('[Auth Access Token] Session expired');
          return NextResponse.json({ error: 'Session expired' }, { status: 401 });
        }
        
        // Check both possible field names for access token
        const accessToken = sessionData.accessToken || sessionData.access_token;
        
        if (accessToken) {
          console.log('[Auth Access Token] Access token retrieved from session');
          return NextResponse.json({ 
            access_token: accessToken,
            accessToken: accessToken,  // Include both formats for compatibility
            token: accessToken,        // Also include as 'token' for maximum compatibility
            expires_in: Math.floor((sessionData.accessTokenExpiresAt - Date.now()) / 1000)
          });
        }
        
      } catch (parseError) {
        console.error('[Auth Access Token] Error parsing session cookie:', parseError);
      }
    }
    
    // Fallback: try Auth0 SDK session
    try {
      const { auth0 } = await import('@/lib/auth0');
      const session = await auth0.getSession(request);
      
      if (!session || !session.user) {
        console.log('[Auth Access Token] No session found');
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      
      // Try to get access token from Auth0 SDK
      const accessTokenResult = await auth0.getAccessToken(request);
      
      if (!accessTokenResult) {
        console.log('[Auth Access Token] No access token available');
        return NextResponse.json({ error: 'No access token available' }, { status: 401 });
      }
      
      console.log('[Auth Access Token] Access token retrieved from Auth0 SDK');
      
      return NextResponse.json({ 
        access_token: accessTokenResult.accessToken,
        expires_in: accessTokenResult.expiresIn 
      });
      
    } catch (tokenError) {
      console.error('[Auth Access Token] Error getting access token:', tokenError);
    }
    
    return NextResponse.json({ error: 'No access token available' }, { status: 401 });
    
  } catch (error) {
    console.error('[Auth Access Token] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 