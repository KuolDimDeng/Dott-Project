import { NextResponse } from 'next/server';

/**
 * Direct email/password login endpoint that creates a session
 * Works with Cloudflare proxy
 */
export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 });
    }
    
    console.log('[EmailLogin] Attempting login for:', email);
    console.log('[EmailLogin] Environment:', {
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
      auth0Domain: process.env.AUTH0_CUSTOM_DOMAIN,
      hasClientId: !!process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
      hasClientSecret: !!process.env.AUTH0_CLIENT_SECRET,
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      backendApiUrl: process.env.BACKEND_API_URL
    });
    
    // First authenticate with Auth0
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
    console.log('[EmailLogin] Calling authenticate endpoint:', `${baseUrl}/api/auth/authenticate`);
    console.log('[EmailLogin] Request headers:', {
      'X-Forwarded-For': request.headers.get('x-forwarded-for'),
      'CF-Connecting-IP': request.headers.get('cf-connecting-ip'),
      'CF-Ray': request.headers.get('cf-ray'),
      'Host': request.headers.get('host')
    });
    
    let authResponse;
    try {
      authResponse = await fetch(`${baseUrl}/api/auth/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip'),
        },
        body: JSON.stringify({ email, password })
      });
    } catch (fetchError) {
      console.error('[EmailLogin] Fetch error:', {
        message: fetchError.message,
        stack: fetchError.stack,
        type: fetchError.constructor.name
      });
      return NextResponse.json({ 
        error: 'Network error', 
        message: fetchError.message,
        details: 'Unable to reach authentication server'
      }, { status: 503 });
    }
    
    console.log('[EmailLogin] Auth response status:', authResponse.status);
    console.log('[EmailLogin] Auth response headers:', Object.fromEntries(authResponse.headers.entries()));
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: 'Authentication failed', details: errorText };
      }
      console.error('[EmailLogin] Authentication failed:', {
        status: authResponse.status,
        error: error,
        message: error.message || error.error,
        debugLog: error.debugLog
      });
      return NextResponse.json(error, { status: authResponse.status });
    }
    
    const authData = await authResponse.json();
    console.log('[EmailLogin] Auth successful, creating session...', {
      hasAccessToken: !!authData.access_token,
      hasUser: !!authData.user,
      userEmail: authData.user?.email,
      userSub: authData.user?.sub
    });
    
    // Create session using cloudflare endpoint
    const sessionPayload = {
      email: authData.user.email,
      auth0_token: authData.access_token,
      auth0_sub: authData.user.sub,
      user: authData.user
    };
    
    console.log('[EmailLogin] Session payload:', {
      email: sessionPayload.email,
      hasAuth0Token: !!sessionPayload.auth0_token,
      auth0Sub: sessionPayload.auth0_sub
    });
    
    console.log('[EmailLogin] Calling cloudflare-session endpoint:', `${baseUrl}/api/auth/cloudflare-session`);
    console.log('[EmailLogin] CloudflareSession URL analysis:', {
      baseUrl: baseUrl,
      fullUrl: `${baseUrl}/api/auth/cloudflare-session`,
      isLocalhost: baseUrl.includes('localhost'),
      isHttps: baseUrl.startsWith('https')
    });
    let sessionResponse;
    try {
      sessionResponse = await fetch(`${baseUrl}/api/auth/cloudflare-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip'),
        },
        body: JSON.stringify(sessionPayload)
      });
    } catch (fetchError) {
      console.error('[EmailLogin] Session fetch error:', {
        message: fetchError.message,
        stack: fetchError.stack,
        type: fetchError.constructor.name
      });
      return NextResponse.json({ 
        error: 'Session creation network error', 
        message: fetchError.message,
        details: 'Unable to create session'
      }, { status: 503 });
    }
    
    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: 'Session creation failed', details: errorText };
      }
      console.error('[EmailLogin] Session creation failed:', {
        status: sessionResponse.status,
        statusText: sessionResponse.statusText,
        error: error,
        isCloudflareError: errorText.includes('Cloudflare'),
        hasError1000: errorText.includes('Error 1000') || errorText.includes('DNS points to prohibited IP'),
        responseHeaders: Object.fromEntries(sessionResponse.headers.entries())
      });
      return NextResponse.json(error, { status: sessionResponse.status });
    }
    
    const sessionData = await sessionResponse.json();
    
    // Return combined response
    return NextResponse.json({
      success: true,
      ...authData,
      ...sessionData
    });
    
  } catch (error) {
    console.error('[EmailLogin] Error:', error);
    return NextResponse.json({ 
      error: 'Login failed',
      message: error.message 
    }, { status: 500 });
  }
}