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
    
    // Get session from cookie - try new name first, then old
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    let sessionData;
    if (sessionCookie) {
      try {
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
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
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth0/user-sync`, {
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