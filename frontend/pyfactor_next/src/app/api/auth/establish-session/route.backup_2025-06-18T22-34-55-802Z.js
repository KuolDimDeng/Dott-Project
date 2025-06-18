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
    
    // Get the base URL for redirects
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://dottapps.com' 
      : request.url.split('/').slice(0, 3).join('/');
    
    if (!token) {
      console.error('[EstablishSession] No token provided');
      return NextResponse.redirect(new URL('/auth/email-signin?error=no_token', baseUrl));
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
      return NextResponse.redirect(new URL('/auth/email-signin?error=invalid_session', baseUrl));
    }
    
    const sessionData = await sessionResponse.json();
    console.log('[EstablishSession] Session validated:', {
      email: sessionData.email,
      tenantId: sessionData.tenant_id,
      needsOnboarding: sessionData.needs_onboarding
    });
    
    // Create response with redirect
    const finalRedirectUrl = redirectUrl.startsWith('http') 
      ? redirectUrl 
      : new URL(redirectUrl, baseUrl).toString();
    const response = NextResponse.redirect(finalRedirectUrl);
    
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
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://dottapps.com' 
      : request.url.split('/').slice(0, 3).join('/');
    return NextResponse.redirect(new URL('/auth/email-signin?error=session_failed', baseUrl));
  }
}

// Handle GET requests (in case of direct access)
export async function GET(request) {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://dottapps.com' 
    : request.url.split('/').slice(0, 3).join('/');
  return NextResponse.redirect(new URL('/auth/email-signin', baseUrl));
}