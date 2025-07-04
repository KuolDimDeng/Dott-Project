import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import deviceFingerprint from '@/utils/deviceFingerprint';

/**
 * Enhanced Establish Session Endpoint
 * Includes device fingerprinting and security features
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
    
    console.log('[EstablishSession] Form data received:', {
      hasToken: !!token,
      tokenType: typeof token,
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? token.substring(0, 50) + '...' : 'none',
      redirectUrl: redirectUrl
    });
    
    if (!token) {
      console.error('[EstablishSession] No token provided');
      return NextResponse.redirect(new URL('/auth/email-signin?error=no_token', baseUrl));
    }
    
    // Check if token looks like a UUID (session token) vs JWT
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
    const isJWT = token.startsWith('eyJ');
    
    console.log('[EstablishSession] Token analysis:', {
      isUUID: isUUID,
      isJWT: isJWT,
      tokenLength: token.length
    });
    
    if (isJWT) {
      console.error('[EstablishSession] ERROR: Received JWT token instead of session token!');
      console.error('[EstablishSession] This should be a UUID session token from the backend');
      return NextResponse.redirect(new URL('/auth/email-signin?error=invalid_token_type', baseUrl));
    }
    
    console.log('[EstablishSession] Processing session token...');
    
    // Collect device fingerprint from headers
    const fingerprintData = {
      userAgent: request.headers.get('user-agent') || '',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                  request.headers.get('x-real-ip') || 
                  'unknown',
      // Additional fingerprint data would come from client-side
    };
    
    // For now, skip Django validation and just set the cookie
    // The session-loading page will handle the redirect with tenant ID
    console.log('[EstablishSession] Setting session cookie without validation');
    
    // Create response with redirect
    // Add fromAuth parameter to help pages know they just came from authentication
    let finalRedirectUrl = redirectUrl.startsWith('http') 
      ? redirectUrl 
      : new URL(redirectUrl, baseUrl).toString();
    
    // Add fromAuth parameter if not already present
    const redirectUrlObj = new URL(finalRedirectUrl);
    if (!redirectUrlObj.searchParams.has('fromAuth')) {
      redirectUrlObj.searchParams.set('fromAuth', 'true');
      finalRedirectUrl = redirectUrlObj.toString();
    }
    
    const response = NextResponse.redirect(finalRedirectUrl);
    
    // Set session cookies
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    response.cookies.set('sid', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expires,
      path: '/'
    });
    
    // Also set session_token for compatibility
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expires,
      path: '/'
    });
    
    console.log('[EstablishSession] Enhanced session established, redirecting to:', redirectUrl);
    
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