import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    console.log('[Create Auth0 User] Starting user creation/lookup process');
    
    // Get Auth0 session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      console.error('[Create Auth0 User] No Auth0 session cookie found');
      return NextResponse.json({ error: 'No Auth0 session found' }, { status: 401 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (parseError) {
      console.error('[Create Auth0 User] Error parsing session cookie:', parseError);
      return NextResponse.json({ error: 'Invalid session data' }, { status: 401 });
    }
    
    console.log('[Create Auth0 User] Session data structure:', {
      hasUser: !!sessionData.user,
      hasAccessToken: !!sessionData.accessToken,
      userEmail: sessionData.user?.email,
      userSub: sessionData.user?.sub,
      sessionKeys: Object.keys(sessionData)
    });
    
    const { user, accessToken } = sessionData;
    
    if (!user) {
      console.error('[Create Auth0 User] No user in session data. Session structure:', sessionData);
      return NextResponse.json({ 
        error: 'Invalid session - missing user data',
        fallback: true,
        tenant_id: uuidv4(),
        current_step: 'business_info',
        needs_onboarding: true
      }, { status: 200 });
    }
    
    console.log('[Create Auth0 User] Processing Auth0 user:', {
      email: user.email,
      sub: user.sub,
      name: user.name
    });
    
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://127.0.0.1:8000';
    console.log('[Create Auth0 User] Using API base URL:', apiBaseUrl);
    
    // Step 1: Check if user already exists using Auth0 token
    let existingUser = null;
    try {
      console.log('[Create Auth0 User] Checking for existing user with Auth0 token');
      
      const existingUserResponse = await fetch(`${apiBaseUrl}/api/users/me/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      
      console.log('[Create Auth0 User] Existing user lookup status:', existingUserResponse.status);
      
      if (existingUserResponse.ok) {
        existingUser = await existingUserResponse.json();
        console.log('[Create Auth0 User] Found existing user:', {
          email: existingUser.email,
          tenant_id: existingUser.tenant_id,
          onboarding_completed: existingUser.onboarding_completed,
          needs_onboarding: existingUser.needs_onboarding
        });
        
        // User exists - return their existing data
        return NextResponse.json({
          success: true,
          message: 'Existing user found',
          isExistingUser: true,
          user_id: existingUser.id,
          tenant_id: existingUser.tenant_id,
          email: existingUser.email,
          needs_onboarding: existingUser.needs_onboarding !== false,
          onboardingCompleted: existingUser.onboarding_completed === true,
          current_step: existingUser.current_onboarding_step || 'business_info'
        });
      } else {
        console.log('[Create Auth0 User] User does not exist yet (status:', existingUserResponse.status, ')');
      }
    } catch (error) {
      console.warn('[Create Auth0 User] Error checking existing user:', error.message);
    }
    
    // Step 2: Create new user if not found
    console.log('[Create Auth0 User] Creating new user in Django backend');
    const tenantId = uuidv4(); // Generate new tenant ID for new user
    
    try {
      const createUserResponse = await fetch(`${apiBaseUrl}/api/auth0/create-user/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          auth0_sub: user.sub,
          email: user.email,
          first_name: user.given_name || '',
          last_name: user.family_name || '',
          name: user.name || '',
          picture: user.picture || '',
          tenant_id: tenantId,
          needs_onboarding: true,
          onboarding_status: 'business_info'
        })
      });
      
      console.log('[Create Auth0 User] Create user response status:', createUserResponse.status);
      
      if (createUserResponse.ok) {
        const newUser = await createUserResponse.json();
        console.log('[Create Auth0 User] Successfully created new user:', {
          user_id: newUser.id,
          tenant_id: newUser.tenant_id,
          email: newUser.email
        });
        
        // Update session cookie with tenant ID for consistency
        const updatedSession = {
          ...sessionData,
          user: {
            ...sessionData.user,
            tenant_id: newUser.tenant_id,
            needs_onboarding: true,
            onboarding_completed: false
          }
        };
        
        const response = NextResponse.json({
          success: true,
          message: 'New user created successfully',
          isExistingUser: false,
          user_id: newUser.id,
          tenant_id: newUser.tenant_id,
          email: newUser.email,
          needs_onboarding: true,
          onboardingCompleted: false,
          current_step: 'business_info'
        });
        
        // Update session cookie
        response.cookies.set('appSession', Buffer.from(JSON.stringify(updatedSession)).toString('base64'), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        });
        
        return response;
      } else {
        const errorText = await createUserResponse.text();
        console.error('[Create Auth0 User] Failed to create user in Django:', errorText);
        
        // Handle duplicate user case
        if (createUserResponse.status === 409 || errorText.includes('already exists')) {
          console.log('[Create Auth0 User] User already exists (409), attempting to fetch existing user');
          
          // Retry getting the existing user
          try {
            const retryResponse = await fetch(`${apiBaseUrl}/api/users/me/`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              }
            });
            
            if (retryResponse.ok) {
              const existingUserData = await retryResponse.json();
              return NextResponse.json({
                success: true,
                message: 'Found existing user after conflict',
                isExistingUser: true,
                user_id: existingUserData.id,
                tenant_id: existingUserData.tenant_id,
                email: existingUserData.email,
                needs_onboarding: existingUserData.needs_onboarding !== false,
                onboardingCompleted: existingUserData.onboarding_completed === true,
                current_step: existingUserData.current_onboarding_step || 'business_info'
              });
            }
          } catch (retryError) {
            console.error('[Create Auth0 User] Failed to retry user lookup:', retryError);
          }
        }
        
        throw new Error(`Django API error: ${errorText}`);
      }
    } catch (error) {
      console.error('[Create Auth0 User] Error creating user in Django:', error);
      
      // Fallback: Return session-only data to prevent blocking user flow
      return NextResponse.json({
        success: false,
        fallback: true,
        message: 'Backend unavailable, using session fallback',
        isExistingUser: false,
        tenant_id: tenantId,
        email: user.email,
        needs_onboarding: true,
        onboardingCompleted: false,
        current_step: 'business_info',
        error: error.message
      }, { status: 200 });
    }
    
  } catch (error) {
    console.error('[Create Auth0 User] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
} 