import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    
    // Get all cookies
    const allCookies = cookieStore.getAll();
    
    // Look for session-related cookies
    const sid = cookieStore.get('sid');
    const sessionToken = cookieStore.get('session_token');
    const authSession = cookieStore.get('dott_auth_session');
    
    // Get request headers for debugging
    const headers = {};
    request.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('cookie') || key.toLowerCase().includes('auth')) {
        headers[key] = value;
      }
    });
    
    return NextResponse.json({
      status: 'ok',
      cookies: {
        sid: sid ? { exists: true, value: sid.value.substring(0, 8) + '...', full: sid.value } : null,
        sessionToken: sessionToken ? { exists: true, value: sessionToken.value.substring(0, 8) + '...' } : null,
        authSession: authSession ? { exists: true, value: authSession.value.substring(0, 8) + '...' } : null,
        allCookies: allCookies.map(c => ({
          name: c.name,
          valueLength: c.value?.length || 0,
          valuePreview: c.value ? c.value.substring(0, 8) + '...' : null
        }))
      },
      headers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}