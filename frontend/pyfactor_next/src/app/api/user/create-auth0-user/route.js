import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Legacy endpoint - redirects to new user-sync endpoint
 * This ensures backward compatibility while migrating to the new system
 */
export async function POST(request) {
  console.log('[Create Auth0 User] Legacy endpoint called, redirecting to new user-sync');
  
  try {
    // Get the request body
    const body = await request.text();
    let requestData = {};
    
    if (body) {
      try {
        requestData = JSON.parse(body);
      } catch (e) {
        console.error('[Create Auth0 User] Failed to parse request body');
      }
    }
    
    // Get session from cookie - check new session system first
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    let sessionData;
    
    // If we have new session cookies, use those
    if (sidCookie || sessionTokenCookie) {
      console.log('[Create Auth0 User] Found new session cookies (sid/session_token)');
      
      // For new session system, construct session data from request body
      // The auth flow sends user data directly, not wrapped in sessionData
      if (requestData.auth0_sub && requestData.email) {
        console.log('[Create Auth0 User] Using user data from request body with new session');
        
        // Get the access token from Authorization header
        const authHeader = request.headers.get('Authorization');
        const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        
        sessionData = {
          user: {
            sub: requestData.auth0_sub,
            email: requestData.email,
            name: requestData.name,
            given_name: requestData.given_name,
            family_name: requestData.family_name,
            picture: requestData.picture,
            email_verified: requestData.email_verified
          },
          accessToken: accessToken || requestData.access_token,
          // Session already exists, so this is valid
          authenticated: true
        };
        console.log('[Create Auth0 User] Constructed session data for new session system');
      } else {
        // If no user data in body but we have session cookies, user is already authenticated
        console.log('[Create Auth0 User] New session exists, user already authenticated');
        return NextResponse.json({
          success: true,
          message: 'User already authenticated with new session system',
          isExistingUser: true,
          sessionSource: 'new-session-v2'
        });
      }
    } else if (sessionCookie) {
      // Fallback to old session format
      try {
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        console.log('[Create Auth0 User] Using old session format');
      } catch (e) {
        console.error('[Create Auth0 User] Failed to parse session cookie');
      }
    }
    
    // Use session data from body if not in cookie
    if (!sessionData && requestData.sessionData) {
      sessionData = requestData.sessionData;
    }
    
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }
    
    // Call the new user-sync endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com'}/api/auth0/user-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.accessToken || sessionData.access_token}`,
        'X-Session-Id': `legacy_${Date.now()}`
      },
      body: JSON.stringify({
        auth0_sub: sessionData.user.sub,
        email: sessionData.user.email,
        name: sessionData.user.name,
        picture: sessionData.user.picture,
        email_verified: sessionData.user.email_verified
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Create Auth0 User] User sync failed:', errorText);
      return NextResponse.json({ error: 'Failed to sync user' }, { status: response.status });
    }
    
    const userData = await response.json();
    
    // Format response for backward compatibility
    const legacyResponse = {
      success: true,
      message: userData.is_existing_user ? 'Existing user found' : 'New user created',
      isExistingUser: userData.is_existing_user,
      user_id: userData.id || userData.user_id,
      tenant_id: userData.tenant_id,
      tenantId: userData.tenant_id,
      email: userData.email,
      needs_onboarding: userData.needs_onboarding,
      needsOnboarding: userData.needs_onboarding,
      onboardingCompleted: userData.onboarding_completed || !userData.needs_onboarding,
      onboardingComplete: userData.onboarding_completed || !userData.needs_onboarding,
      current_step: userData.current_step || 'business_info'
    };
    
    console.log('[Create Auth0 User] Legacy response:', {
      email: legacyResponse.email,
      tenantId: legacyResponse.tenantId,
      needsOnboarding: legacyResponse.needsOnboarding
    });
    
    return NextResponse.json(legacyResponse);
    
  } catch (error) {
    console.error('[Create Auth0 User] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}