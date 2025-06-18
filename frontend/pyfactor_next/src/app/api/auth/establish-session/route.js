import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Establish Session Endpoint
 * Receives session token from session bridge and sets secure cookies
 */

export async function POST(request) {
  try {
    const formData = await request.formData();
    const token = formData.get('token');
    const redirectUrl = formData.get('redirectUrl') || '/';
    
    if (!token) {
      console.error('[EstablishSession] No token provided');
      return NextResponse.redirect(new URL('/auth/email-signin?error=no_token', request.url));
    }
    
    console.log('[EstablishSession] Processing session token...');
    
    // Get session details from Django using the token
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const sessionResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `SessionID ${token}`,
        'Cookie': `session_token=${token}`
      }
    });
    
    if (!sessionResponse.ok) {
      console.error('[EstablishSession] Failed to validate session:', sessionResponse.status);
      return NextResponse.redirect(new URL('/auth/email-signin?error=invalid_session', request.url));
    }
    
    const sessionData = await sessionResponse.json();
    console.log('[EstablishSession] Session validated:', {
      email: sessionData.email,
      tenantId: sessionData.tenant_id,
      needsOnboarding: sessionData.needs_onboarding
    });
    
    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));
    
    // Set session cookies
    response.cookies.set('sid', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(sessionData.expires_at),
      path: '/'
    });
    
    // Also set session_token for compatibility
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(sessionData.expires_at),
      path: '/'
    });
    
    console.log('[EstablishSession] Session established, redirecting to:', redirectUrl);
    
    return response;
    
  } catch (error) {
    console.error('[EstablishSession] Error:', error);
    return NextResponse.redirect(new URL('/auth/email-signin?error=session_failed', request.url));
  }
}

// Handle GET requests (in case of direct access)
export async function GET(request) {
  return NextResponse.redirect(new URL('/auth/email-signin', request.url));
}