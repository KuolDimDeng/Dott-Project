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
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 });
    }
    
    console.log('[ConsolidatedLogin] Starting atomic login flow for:', email);
    console.log('[ConsolidatedLogin] Environment:', {
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      hasAuth0ClientSecret: !!process.env.AUTH0_CLIENT_SECRET,
      hasAuth0Secret: !!process.env.AUTH0_SECRET
    });
    
    // Step 1: Authenticate with Auth0
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
    console.log('[ConsolidatedLogin] Auth endpoint:', `${baseUrl}/api/auth/authenticate`);
    
    const authResponse = await fetch(`${baseUrl}/api/auth/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip'),
      },
      body: JSON.stringify({ email, password })
    });
    
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
      
      return NextResponse.json(error, { status: authResponse.status });
    }
    
    const authData = await authResponse.json();
    console.log('[ConsolidatedLogin] Auth successful, creating consolidated session...');
    console.log('[ConsolidatedLogin] Auth data received:', {
      hasUser: !!authData.user,
      userSub: authData.user?.sub,
      hasAccessToken: !!authData.access_token,
      accessToken: authData.access_token ? authData.access_token.substring(0, 20) + '...' : 'MISSING',
      hasIdToken: !!authData.id_token
    });
    
    // Step 2: Call consolidated backend endpoint
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dott-api-y26w.onrender.com';
    console.log('[ConsolidatedLogin] Calling backend consolidated-auth at:', `${API_URL}/api/sessions/consolidated-auth/`);
    
    // CRITICAL: If we're using backend auth, the access_token from authenticate is already the session ID
    // We need to pass the actual Auth0 token or a valid token for the backend
    const accessTokenToSend = authData.access_token === 'backend_session' ? 
      // Generate a temporary token for backend auth
      `temp_${Date.now()}_${Math.random().toString(36).substring(2)}` : 
      authData.access_token;
    
    console.log('[ConsolidatedLogin] Access token to send to backend:', accessTokenToSend ? accessTokenToSend.substring(0, 20) + '...' : 'MISSING');
    
    const consolidatedResponse = await fetch(`${API_URL}/api/sessions/consolidated-auth/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://dottapps.com',
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
    
    // CRITICAL: If backend didn't return a session token, we need to create one
    if (!sessionData.session_token && authData.access_token) {
      console.log('[ConsolidatedLogin] No session token from backend, creating session via session-v2...');
      
      // Create session using the session-v2 endpoint
      const sessionResponse = await fetch(`${baseUrl}/api/auth/session-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: authData.access_token,
          idToken: authData.id_token,
          user: authData.user
        })
      });
      
      if (sessionResponse.ok) {
        const newSessionData = await sessionResponse.json();
        console.log('[ConsolidatedLogin] Created new session:', {
          session_token: newSessionData.session_token ? newSessionData.session_token.substring(0, 20) + '...' : 'MISSING'
        });
        
        // Merge the session data
        sessionData.session_token = newSessionData.session_token;
        if (newSessionData.user) {
          sessionData.user = { ...sessionData.user, ...newSessionData.user };
        }
      } else {
        console.error('[ConsolidatedLogin] Failed to create session via session-v2');
      }
    }
    
    // Step 3: Return complete response with all data
    if (!sessionData.session_token) {
      console.error('[ConsolidatedLogin] No session token in response!');
      console.error('[ConsolidatedLogin] Session data:', sessionData);
      return NextResponse.json({
        error: 'No session token received from backend'
      }, { status: 500 });
    }
    
    console.log('[ConsolidatedLogin] Session token received:', sessionData.session_token.substring(0, 20) + '...');
    
    // CRITICAL: Validate the session token exists before proceeding
    console.log('[ConsolidatedLogin] Validating session token with backend...');
    const validateResponse = await fetch(`${API_URL}/api/sessions/validate/${sessionData.session_token}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sessionData.session_token}`
      }
    });
    
    if (!validateResponse.ok) {
      console.error('[ConsolidatedLogin] Session validation failed:', validateResponse.status);
      console.log('[ConsolidatedLogin] Session token does not exist in backend, creating new session...');
      
      // The token doesn't exist, we need to create a proper session
      // Use the Auth0 token to create a new session
      const createResponse = await fetch(`${API_URL}/api/sessions/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.access_token}`,
          'Origin': 'https://dottapps.com'
        },
        body: JSON.stringify({})
      });
      
      if (createResponse.ok) {
        const newSession = await createResponse.json();
        console.log('[ConsolidatedLogin] Created new session:', {
          session_token: newSession.session_token ? newSession.session_token.substring(0, 20) + '...' : 'MISSING'
        });
        
        // Replace the invalid session token with the new one
        sessionData.session_token = newSession.session_token;
        sessionData.expires_at = newSession.expires_at;
        if (newSession.user) {
          sessionData.user = { ...sessionData.user, ...newSession.user };
        }
      } else {
        console.error('[ConsolidatedLogin] Failed to create new session');
        return NextResponse.json({
          error: 'Failed to create valid session'
        }, { status: 500 });
      }
    } else {
      console.log('[ConsolidatedLogin] Session validation successful');
    }
    
    console.log('[ConsolidatedLogin] Will use session bridge for cookie setting');
    
    // Create the complete response data
    // CRITICAL: Only use session data from backend, not auth data
    const responseData = {
      success: true,
      // DON'T spread authData - it contains wrong tokens!
      // ...authData,  // This was causing the issue - it overwrites session_token
      ...sessionData,  // Session and user data from backend
      // Ensure consistent field names
      needs_onboarding: sessionData.needs_onboarding,
      tenant_id: sessionData.tenant?.id || sessionData.tenant_id,
      // Add session bridge indicator
      useSessionBridge: true,
      sessionToken: sessionData.session_token,
      session_token: sessionData.session_token, // Include both formats
      // Only include specific auth fields that don't conflict
      user: {
        ...sessionData.user,
        // Merge any additional user data from auth that's not in session
        ...(authData.user && {
          picture: authData.user.picture || sessionData.user?.picture,
          locale: authData.user.locale
        })
      }
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
    console.error('[ConsolidatedLogin] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Login failed',
      message: error.message 
    }, { status: 500 });
  }
}