import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify that the session is ready before redirecting to dashboard
 * This helps prevent the issue where the dashboard redirects to login
 * because the session cookie hasn't been properly set yet
 */
export async function GET(request) {
  try {
    // Check for session cookie
    const sessionCookie = request.cookies.get('dott_auth_session') || request.cookies.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        ready: false, 
        reason: 'No session cookie found' 
      });
    }
    
    // Verify the session is valid by calling the me endpoint
    const meResponse = await fetch(`${request.nextUrl.origin}/api/auth/me`, {
      headers: {
        'Cookie': request.headers.get('cookie') || ''
      }
    });
    
    if (!meResponse.ok) {
      return NextResponse.json({ 
        ready: false, 
        reason: 'Session validation failed' 
      });
    }
    
    const meData = await meResponse.json();
    
    if (!meData.authenticated) {
      return NextResponse.json({ 
        ready: false, 
        reason: 'User not authenticated' 
      });
    }
    
    // Session is ready
    return NextResponse.json({ 
      ready: true,
      user: meData.user,
      accessToken: meData.accessToken
    });
    
  } catch (error) {
    console.error('[Verify Session Ready] Error:', error);
    return NextResponse.json({ 
      ready: false, 
      reason: 'Internal error',
      error: error.message 
    });
  }
}