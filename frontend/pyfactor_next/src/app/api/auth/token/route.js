import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    console.log('[Auth Token] Getting access token');
    
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
        console.log('[Auth Token] Using new session system');
        const response = await fetch(`${API_URL}/api/sessions/current/`, {
          headers: {
            'Authorization': `Session ${sessionId}`,
            'Cookie': `session_token=${sessionId}`
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          // Backend doesn't return access tokens directly for security
          // Return a success indicator instead
          return NextResponse.json({
            accessToken: 'session-v2-active',
            session_type: 'backend-v2',
            authenticated: true,
            success: true
          });
        } else {
          console.log('[Auth Token] Backend session invalid:', response.status);
          return NextResponse.json({ error: 'Session invalid' }, { status: 401 });
        }
      } catch (error) {
        console.error('[Auth Token] Error fetching backend session:', error);
        // Fall through to legacy check
      }
    }
    
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        
        // Check if session is expired
        if (sessionData.accessTokenExpiresAt && Date.now() > sessionData.accessTokenExpiresAt) {
          console.log('[Auth Token] Session expired');
          return NextResponse.json({ error: 'Session expired' }, { status: 401 });
        }
        
        if (sessionData.accessToken) {
          console.log('[Auth Token] Access token retrieved from session');
          return NextResponse.json({ 
            accessToken: sessionData.accessToken,
            expiresIn: Math.floor((sessionData.accessTokenExpiresAt - Date.now()) / 1000)
          });
        }
        
      } catch (parseError) {
        console.error('[Auth Token] Error parsing session cookie:', parseError);
      }
    }
    
    // Fallback: try individual token cookies
    const accessTokenCookie = cookieStore.get('auth0_access_token');
    const idTokenCookie = cookieStore.get('auth0_id_token');
    
    if (accessTokenCookie && accessTokenCookie.value) {
      console.log('[Auth Token] Access token retrieved from cookie');
      return NextResponse.json({ 
        accessToken: accessTokenCookie.value,
        success: true 
      });
    }
    
    if (idTokenCookie && idTokenCookie.value) {
      console.log('[Auth Token] Using ID token as access token fallback');
      return NextResponse.json({ 
        accessToken: idTokenCookie.value,
        success: true 
      });
    }
    
    console.log('[Auth Token] No access token available');
    return NextResponse.json({ error: 'No access token available' }, { status: 401 });
    
  } catch (error) {
    console.error('[Auth Token] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 