import { NextResponse } from 'next/server';

/**
 * Cloudflare-compatible session creation endpoint
 * Creates sessions directly with the backend using Cloudflare-friendly settings
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function POST(request) {
  try {
    console.log('[CloudflareSession] Creating session through Cloudflare-compatible endpoint');
    
    const data = await request.json();
    
    // Get real IP and Cloudflare headers
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    const cfRay = request.headers.get('cf-ray');
    const cfCountry = request.headers.get('cf-ipcountry');
    const origin = request.headers.get('origin') || 'https://dottapps.com';
    
    console.log('[CloudflareSession] Request data:', {
      hasEmail: !!data.email,
      hasPassword: !!data.password,
      hasAuth0Token: !!data.auth0_token,
      hasAuth0Sub: !!data.auth0_sub,
      cfRay: cfRay,
      cfCountry: cfCountry,
      origin: origin
    });
    
    // Call backend Cloudflare session endpoint
    console.log('[CloudflareSession] Calling backend:', `${API_URL}/api/sessions/cloudflare/create/`);
    let response;
    try {
      response = await fetch(`${API_URL}/api/sessions/cloudflare/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward Cloudflare headers
          ...(cfConnectingIp && { 'CF-Connecting-IP': cfConnectingIp }),
          ...(cfRay && { 'CF-Ray': cfRay }),
          ...(cfCountry && { 'CF-IPCountry': cfCountry }),
          // Add origin for CORS
          'Origin': origin,
          // Forward the real user agent
          'User-Agent': request.headers.get('user-agent') || 'NextJS-Frontend'
        },
        body: JSON.stringify(data)
      });
    } catch (fetchError) {
      console.error('[CloudflareSession] Network error:', {
        message: fetchError.message,
        type: fetchError.constructor.name,
        cause: fetchError.cause,
        apiUrl: API_URL
      });
      
      // Check if this is a DNS error
      if (fetchError.message.includes('ENOTFOUND') || 
          fetchError.message.includes('getaddrinfo') ||
          fetchError.message.includes('DNS')) {
        return NextResponse.json({
          error: 'Backend unavailable',
          message: 'The backend server is temporarily unavailable. This is likely a DNS issue that should resolve shortly.',
          details: `DNS lookup failed for ${API_URL}`,
          debugInfo: {
            apiUrl: API_URL,
            errorType: 'DNS_RESOLUTION_FAILED',
            timestamp: new Date().toISOString()
          }
        }, { status: 503 });
      }
      
      return NextResponse.json({
        error: 'Network error',
        message: fetchError.message,
        details: 'Unable to connect to backend server'
      }, { status: 503 });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: 'Session creation failed', details: errorText };
      }
      console.error('[CloudflareSession] Backend error:', {
        status: response.status,
        error: error,
        requestData: {
          hasEmail: !!data.email,
          hasAuth0Token: !!data.auth0_token,
          auth0Sub: data.auth0_sub
        }
      });
      return NextResponse.json(error, { status: response.status });
    }
    
    const sessionData = await response.json();
    console.log('[CloudflareSession] Session created successfully:', {
      authenticated: sessionData.authenticated,
      hasUser: !!sessionData.user,
      hasTenant: !!sessionData.tenant,
      userEmail: sessionData.user?.email
    });
    
    // Create response with success flag
    const responseData = {
      success: true,
      authenticated: sessionData.authenticated,
      session_token: sessionData.session_token,
      user: sessionData.user,
      tenant: sessionData.tenant,
      needs_onboarding: sessionData.user?.needsOnboarding || sessionData.needsOnboarding || false
    };
    
    const frontendResponse = NextResponse.json(responseData);
    
    // Set cookies on frontend response with Cloudflare-compatible settings
    if (sessionData.session_token) {
      const isProduction = process.env.NODE_ENV === 'production';
      
      // For production with Cloudflare, use specific settings
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction, // Only secure in production
        sameSite: isProduction ? 'lax' : 'lax', // Use 'lax' for better compatibility
        maxAge: 86400, // 24 hours
        path: '/'
        // Don't set domain to allow it to default to current domain
      };
      
      console.log('[CloudflareSession] Setting cookies with options:', cookieOptions);
      
      frontendResponse.cookies.set('sid', sessionData.session_token, cookieOptions);
      frontendResponse.cookies.set('session_token', sessionData.session_token, cookieOptions);
      
      // Clear any old cookies that might interfere
      const oldCookies = ['dott_auth_session', 'appSession', 'session_pending'];
      oldCookies.forEach(name => {
        frontendResponse.cookies.delete(name);
      });
    }
    
    // Add CORS headers for Cloudflare
    frontendResponse.headers.set('Access-Control-Allow-Origin', origin);
    frontendResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return frontendResponse;
    
  } catch (error) {
    console.error('[CloudflareSession] Error:', error);
    return NextResponse.json(
      { error: 'Session creation failed', details: error.message },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://dottapps.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}