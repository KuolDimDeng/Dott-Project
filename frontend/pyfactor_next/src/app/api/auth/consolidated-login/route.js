import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Consolidated login endpoint that handles authentication atomically
 * This follows security best practices by doing everything server-side
 */
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request) {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    headers: {},
    env: {},
    errors: []
  };
  
  try {
    // Log all headers for debugging
    const headers = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    debugInfo.headers = headers;
    
    // Log environment variables (sanitized)
    debugInfo.env = {
      hasApiUrl: !!process.env.NEXT_PUBLIC_API_URL,
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      hasAuth0Secret: !!process.env.AUTH0_SECRET,
      hasAuth0ClientSecret: !!process.env.AUTH0_CLIENT_SECRET,
      nodeEnv: process.env.NODE_ENV
    };
    
    const { email, password } = await request.json();
    const host = request.headers.get('host');
    
    debugInfo.requestData = {
      hasEmail: !!email,
      hasPassword: !!password,
      host
    };
    
    if (!email || !password) {
      debugInfo.errors.push('Missing email or password');
      console.error('[ConsolidatedLogin] Debug info:', debugInfo);
      return NextResponse.json({ 
        error: 'Email and password are required',
        debug: debugInfo
      }, { status: 400 });
    }
    
    console.log('🔄 [ConsolidatedLogin] ===== CONSOLIDATED LOGIN START =====');
    console.log('🔄 [ConsolidatedLogin] Email:', email);
    console.log('🔄 [ConsolidatedLogin] Password length:', password?.length);
    console.log('🔄 [ConsolidatedLogin] Timestamp:', new Date().toISOString());
    console.log('🔄 [ConsolidatedLogin] Environment:', {
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      auth0Domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
      hasAuth0ClientSecret: !!process.env.AUTH0_CLIENT_SECRET,
      hasAuth0Secret: !!process.env.AUTH0_SECRET
    });
    
    // Step 1: Authenticate with Auth0
    // In production/staging, Next.js API routes are relative to the current domain
    const authUrl = '/api/auth/authenticate';
    console.log('🎯 [ConsolidatedLogin] Step 1: Calling Auth0 authenticate endpoint');
    console.log('🎯 [ConsolidatedLogin] Auth endpoint:', authUrl);
    
    // When running in a server-side Next.js API route, we need the full URL
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const fullAuthUrl = `${protocol}://${host}${authUrl}`;
    console.log('🌐 [ConsolidatedLogin] Full auth URL:', fullAuthUrl);
    console.log('🌐 [ConsolidatedLogin] Protocol:', protocol);
    console.log('🌐 [ConsolidatedLogin] Host:', host);
    
    debugInfo.authRequest = {
      url: fullAuthUrl,
      method: 'POST',
      hasForwardedFor: !!request.headers.get('x-forwarded-for'),
      hasCfIp: !!request.headers.get('cf-connecting-ip')
    };
    
    console.log('📤 [ConsolidatedLogin] Making auth request...');
    const authResponse = await fetch(fullAuthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip'),
      },
      body: JSON.stringify({ email, password })
    });
    console.log('📥 [ConsolidatedLogin] Auth response received');
    console.log('📥 [ConsolidatedLogin] Auth status:', authResponse.status);
    console.log('📥 [ConsolidatedLogin] Auth status text:', authResponse.statusText);
    
    debugInfo.authResponse = {
      status: authResponse.status,
      statusText: authResponse.statusText,
      headers: Object.fromEntries(authResponse.headers)
    };
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('[ConsolidatedLogin] Auth failed:', {
        status: authResponse.status,
        contentType: authResponse.headers.get('content-type'),
        errorText: errorText.substring(0, 500)
      });
      
      let error;
      try {
        error = JSON.parse(errorText);
      } catch (e) {
        error = { error: 'Authentication failed', message: errorText };
      }
      
      debugInfo.errors.push(`Auth failed: ${authResponse.status}`);
      debugInfo.authError = error;
      console.error('[ConsolidatedLogin] Auth failure debug:', debugInfo);
      return NextResponse.json({
        ...error,
        debug: debugInfo
      }, { status: authResponse.status });
    }
    
    const authData = await authResponse.json();
    console.log('[ConsolidatedLogin] Auth successful, creating consolidated session...');
    console.log('[ConsolidatedLogin] Auth data received:', {
      hasUser: !!authData.user,
      userSub: authData.user?.sub,
      hasAccessToken: !!authData.access_token,
      accessToken: authData.access_token ? authData.access_token.substring(0, 20) + '...' : 'MISSING',
      hasIdToken: !!authData.id_token,
      hasBackendSessionId: !!authData.backend_session_id,
      backendSessionId: authData.backend_session_id
    });
    
    // Step 2: Check if we already have a backend session
    if (authData.backend_session_id) {
      console.log('[ConsolidatedLogin] 🔴 CRITICAL: Backend session already exists!');
      console.log('[ConsolidatedLogin] 🔴 Backend session ID:', authData.backend_session_id);
      console.log('[ConsolidatedLogin] 🔴 SKIPPING consolidated-auth to avoid duplicate session creation');
      
      // Fetch the existing session details using public endpoint
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
      console.log('[ConsolidatedLogin] Fetching existing session from public endpoint:', `${API_URL}/api/sessions/public/${authData.backend_session_id}/`);
      const sessionResponse = await fetch(`${API_URL}/api/sessions/public/${authData.backend_session_id}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': host && host.includes('staging') ? `https://${host}` : 'https://dottapps.com',
        }
      });
      
      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        console.error('[ConsolidatedLogin] Failed to fetch existing session:', {
          status: sessionResponse.status,
          statusText: sessionResponse.statusText,
          errorText: errorText.substring(0, 500)
        });
        
        // Fall back to creating a new session if we can't fetch the existing one
        console.log('[ConsolidatedLogin] Falling back to creating new session...');
        // Continue with the regular flow instead of throwing
      } else {
        const sessionData = await sessionResponse.json();
        console.log('[ConsolidatedLogin] Existing session fetched successfully');
        console.log('[ConsolidatedLogin] Session data:', {
          session_id: sessionData.session_id,
          user_email: sessionData.user?.email,
          tenant_id: sessionData.tenant?.id,
          needs_onboarding: sessionData.needs_onboarding
        });
        
        // Use the existing session data
        const responseData = {
          success: true,
          ...sessionData,
          sessionToken: authData.backend_session_id,
          session_token: authData.backend_session_id,
          useSessionBridge: true
        };
        
        console.log('[ConsolidatedLogin] 🔴 Using existing session:', authData.backend_session_id);
        return NextResponse.json(responseData);
      }
    }
    
    // Step 3: Call consolidated backend endpoint only if no existing session
    // Determine API URL based on environment
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    console.log('[ConsolidatedLogin] No existing backend session, creating new one...');
    console.log('[ConsolidatedLogin] Using API URL:', API_URL);
    console.log('[ConsolidatedLogin] Calling backend consolidated-auth at:', `${API_URL}/api/sessions/consolidated-auth/`);
    
    // Use the access token from auth data directly
    const accessTokenToSend = authData.access_token;
    
    console.log('[ConsolidatedLogin] Access token to send to backend:', accessTokenToSend ? accessTokenToSend.substring(0, 20) + '...' : 'MISSING');
    
    const consolidatedResponse = await fetch(`${API_URL}/api/sessions/consolidated-auth/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': host && host.includes('staging') ? `https://${host}` : 'https://dottapps.com',
      },
      body: JSON.stringify({
        auth0_sub: authData.user.sub,
        email: authData.user.email,
        access_token: accessTokenToSend,
        name: authData.user.name,
        given_name: authData.user.given_name,
        family_name: authData.user.family_name,
        picture: authData.user.picture,
        email_verified: authData.user.email_verified
      })
    });
    
    // Log backend response headers to debug cookie setting
    console.log('[ConsolidatedLogin] Backend response headers:', Object.fromEntries(consolidatedResponse.headers));
    const setCookieHeaders = consolidatedResponse.headers.getSetCookie ? 
      consolidatedResponse.headers.getSetCookie() : 
      consolidatedResponse.headers.get('set-cookie');
    console.log('[ConsolidatedLogin] Backend Set-Cookie headers:', setCookieHeaders);
    
    if (!consolidatedResponse.ok) {
      const contentType = consolidatedResponse.headers.get('content-type');
      let error;
      
      if (contentType && contentType.includes('application/json')) {
        error = await consolidatedResponse.json();
      } else {
        // Backend returned HTML (likely error page), extract text
        const text = await consolidatedResponse.text();
        console.error('[ConsolidatedLogin] Backend returned HTML:', text.substring(0, 500));
        error = { 
          error: 'Backend error', 
          message: 'The backend service is not responding correctly',
          details: consolidatedResponse.status === 404 ? 'Endpoint not found' : 'Internal server error'
        };
      }
      
      console.error('[ConsolidatedLogin] Session creation failed:', error);
      return NextResponse.json(error, { status: consolidatedResponse.status });
    }
    
    const sessionData = await consolidatedResponse.json();
    console.log('[ConsolidatedLogin] Raw backend response:', JSON.stringify(sessionData, null, 2));
    console.log('[ConsolidatedLogin] Consolidated auth successful:', {
      hasSession: !!sessionData.session_token,
      hasTenant: !!sessionData.tenant,
      needsOnboarding: sessionData.needs_onboarding
    });
    console.log('[ConsolidatedLogin] Full session data from backend:', {
      session_token: sessionData.session_token ? sessionData.session_token.substring(0, 20) + '...' : 'MISSING',
      user: sessionData.user ? { email: sessionData.user.email, id: sessionData.user.id } : null,
      tenant: sessionData.tenant,
      needs_onboarding: sessionData.needs_onboarding,
      expires_at: sessionData.expires_at
    });
    
    
    // Step 3: Return complete response with all data
    if (!sessionData.session_token) {
      console.error('[ConsolidatedLogin] No session token in response!');
      console.error('[ConsolidatedLogin] Session data:', sessionData);
      return NextResponse.json({
        error: 'No session token received from backend'
      }, { status: 500 });
    }
    
    console.log('[ConsolidatedLogin] Session token received:', sessionData.session_token.substring(0, 20) + '...');
    
    // Create the complete response data
    // Use session data from backend as the single source of truth
    const responseData = {
      success: true,
      ...sessionData,  // All session data from backend
      // Ensure we have the session token in both formats for compatibility
      sessionToken: sessionData.session_token,
      session_token: sessionData.session_token,
      // Add session bridge indicator
      useSessionBridge: true
    };
    
    console.log('[ConsolidatedLogin] Returning response for session bridge...');
    console.log('[ConsolidatedLogin] Response data includes:', {
      hasSessionToken: !!responseData.sessionToken,
      hasSession_token: !!responseData.session_token,
      useSessionBridge: responseData.useSessionBridge,
      success: responseData.success
    });
    
    // CRITICAL DEBUG: Log the exact session token being returned
    console.log('[ConsolidatedLogin] 🔴 CRITICAL: Session token being returned:', responseData.session_token);
    console.log('[ConsolidatedLogin] 🔴 Token first 20 chars:', responseData.session_token?.substring(0, 20));
    console.log('[ConsolidatedLogin] 🔴 Token last 20 chars:', responseData.session_token?.substring(responseData.session_token.length - 20));
    console.log('[ConsolidatedLogin] 🔴 Token length:', responseData.session_token?.length);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    debugInfo.errors.push(`Unexpected error: ${error.message}`);
    debugInfo.errorStack = error.stack;
    console.error('[ConsolidatedLogin] Unexpected error:', error);
    console.error('[ConsolidatedLogin] Debug info:', debugInfo);
    return NextResponse.json({ 
      error: 'Login failed',
      message: error.message,
      debug: debugInfo
    }, { status: 500 });
  }
}