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
    
    console.log('[CloudflareSession] Request data:', {
      hasEmail: !!data.email,
      hasPassword: !!data.password,
      hasAuth0Token: !!data.auth0_token,
      hasAuth0Sub: !!data.auth0_sub,
      cfRay: cfRay,
      cfCountry: cfCountry
    });
    
    // Call backend Cloudflare session endpoint
    const response = await fetch(`${API_URL}/api/sessions/cloudflare/create/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward Cloudflare headers
        ...(cfConnectingIp && { 'CF-Connecting-IP': cfConnectingIp }),
        ...(cfRay && { 'CF-Ray': cfRay }),
        ...(cfCountry && { 'CF-IPCountry': cfCountry }),
        // Add origin for CORS
        'Origin': 'https://dottapps.com'
      },
      body: JSON.stringify(data),
      // Important: include credentials for cookies
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Session creation failed' }));
      console.error('[CloudflareSession] Backend error:', error);
      return NextResponse.json(error, { status: response.status });
    }
    
    const sessionData = await response.json();
    console.log('[CloudflareSession] Session created successfully:', {
      authenticated: sessionData.authenticated,
      hasUser: !!sessionData.user,
      hasTenant: !!sessionData.tenant,
      userEmail: sessionData.user?.email
    });
    
    // Create response
    const frontendResponse = NextResponse.json(sessionData);
    
    // Set cookies on frontend response with Cloudflare-compatible settings
    if (sessionData.session_token) {
      const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'none', // Allow cross-site for Cloudflare
        maxAge: 86400, // 24 hours
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
      };
      
      frontendResponse.cookies.set('sid', sessionData.session_token, cookieOptions);
      frontendResponse.cookies.set('session_token', sessionData.session_token, cookieOptions);
    }
    
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