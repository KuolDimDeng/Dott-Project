import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    console.log('[Auth Token] Getting access token');
    
    // Try to get session from custom cookie first
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
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