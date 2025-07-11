import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Consolidated login endpoint that handles authentication atomically
 * This follows security best practices by doing everything server-side
 */
export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 });
    }
    
    console.log('[ConsolidatedLogin] Starting atomic login flow for:', email);
    
    // Step 1: Authenticate with Auth0
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
    const authResponse = await fetch(`${baseUrl}/api/auth/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip'),
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!authResponse.ok) {
      const error = await authResponse.json();
      console.error('[ConsolidatedLogin] Auth failed:', error);
      
      
      return NextResponse.json(error, { status: authResponse.status });
    }
    
    const authData = await authResponse.json();
    console.log('[ConsolidatedLogin] Auth successful, creating consolidated session...');
    
    // Step 2: Call consolidated backend endpoint
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dott-api-y26w.onrender.com';
    console.log('[ConsolidatedLogin] Calling backend consolidated-auth at:', `${API_URL}/api/sessions/consolidated-auth/`);
    
    const consolidatedResponse = await fetch(`${API_URL}/api/sessions/consolidated-auth/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://dottapps.com',
      },
      body: JSON.stringify({
        auth0_sub: authData.user.sub,
        email: authData.user.email,
        access_token: authData.access_token,
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
    
    // Step 3: Return complete response with all data
    const response = NextResponse.json({
      success: true,
      ...authData,  // Auth0 tokens
      ...sessionData,  // Session and user data
      // Ensure consistent field names
      needs_onboarding: sessionData.needs_onboarding,
      tenant_id: sessionData.tenant?.id || sessionData.tenant_id
    });
    
    // Don't try to set cookies here - the client will use session bridge
    if (sessionData.session_token) {
      console.log('[ConsolidatedLogin] Session token received:', sessionData.session_token);
      console.log('[ConsolidatedLogin] Will use session bridge for cookie setting');
      
      // Add a flag to indicate session bridge should be used
      response = NextResponse.json({
        ...response.body,
        success: true,
        ...authData,  // Auth0 tokens
        ...sessionData,  // Session and user data
        // Ensure consistent field names
        needs_onboarding: sessionData.needs_onboarding,
        tenant_id: sessionData.tenant?.id || sessionData.tenant_id,
        // Add session bridge indicator
        useSessionBridge: true,
        sessionToken: sessionData.session_token
      });
    } else {
      console.error('[ConsolidatedLogin] No session token in response!');
      console.error('[ConsolidatedLogin] Session data:', sessionData);
    }
    
    console.log('[ConsolidatedLogin] Returning response for session bridge...');
    return response;
    
  } catch (error) {
    console.error('[ConsolidatedLogin] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Login failed',
      message: error.message 
    }, { status: 500 });
  }
}