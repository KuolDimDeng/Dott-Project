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
    
    // Get session details from Django using the token
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const sessionResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `SessionID ${token}`,
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
    
    // Fix for users who have tenant but still marked as needing onboarding
    if (sessionData.tenant_id && sessionData.needs_onboarding) {
      console.warn('[EstablishSession] User has tenant but needs_onboarding=true, attempting to fix...');
      
      try {
        const fixResponse = await fetch(`${baseUrl}/api/auth/force-clear-onboarding`, {
          method: 'POST',
          headers: {
            'Cookie': `session_token=${token}`
          }
        });
        
        if (fixResponse.ok) {
          const fixResult = await fixResponse.json();
          console.log('[EstablishSession] Onboarding status fixed:', fixResult);
          // Update sessionData to reflect the fix
          sessionData.needs_onboarding = false;
          // Change redirect to dashboard
          const dashboardUrl = `/tenant/${sessionData.tenant_id}/dashboard`;
          const response = NextResponse.redirect(new URL(dashboardUrl, baseUrl));
          
          // Set all the cookies as before
          response.cookies.set('sid', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: new Date(sessionData.expires_at),
            path: '/'
          });
          
          response.cookies.set('session_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: new Date(sessionData.expires_at),
            path: '/'
          });
          
          return response;
        }
      } catch (fixError) {
        console.error('[EstablishSession] Failed to fix onboarding status:', fixError);
      }
    }
    
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