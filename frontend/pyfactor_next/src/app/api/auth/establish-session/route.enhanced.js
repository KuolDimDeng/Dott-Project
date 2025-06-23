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
    
    if (!token) {
      console.error('[EstablishSession] No token provided');
      return NextResponse.redirect(new URL('/auth/email-signin?error=no_token', baseUrl));
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
    
    // Get session details from Django using the token
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const sessionResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${token}`,
        'Cookie': `session_token=${token}`,
        'X-Device-Fingerprint': JSON.stringify(fingerprintData)
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
      needsOnboarding: sessionData.needs_onboarding,
      securityInfo: sessionData.security
    });
    
    // Check security status
    if (sessionData.security?.requires_verification) {
      console.warn('[EstablishSession] Session requires additional verification');
      // Could redirect to verification page
    }
    
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
    
    // Set security info cookie (non-httpOnly for client access)
    if (sessionData.security) {
      response.cookies.set('session_security', JSON.stringify({
        riskScore: sessionData.security.risk_score,
        deviceTrusted: sessionData.security.device_trusted,
        requiresVerification: sessionData.security.requires_verification
      }), {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(sessionData.expires_at),
        path: '/'
      });
    }
    
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