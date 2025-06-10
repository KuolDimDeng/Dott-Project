import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  console.log('[AUTH DEBUG] 📥 create-auth0-user POST request received');
  const startTime = Date.now();
  try {
    // Parse request body if present
    let requestBody = {};
    try {
      const body = await request.text();
      if (body) {
        requestBody = JSON.parse(body);
      }
    } catch (bodyError) {
      console.log('[Create Auth0 User] No request body or invalid JSON, continuing with empty body');
    }
    
    const { checkOnly = false, sessionData: bodySessionData } = requestBody;
    console.log('[Create Auth0 User] Request options:', { checkOnly, hasBodySessionData: !!bodySessionData });
    
    let sessionData;
    
    // First try to get session from cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    // Debug: Log all cookies
    const allCookies = cookieStore.getAll();
    console.log('[Create Auth0 User] All cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })));
    
    if (sessionCookie) {
      try {
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        console.log('[AUTH DEBUG] 📄 Session data parsed from cookie successfully');
      } catch (parseError) {
        console.error('[Create Auth0 User] Error parsing session cookie:', parseError);
      }
    }
    
    // If no session from cookie, try from request body (fallback for timing issues)
    if (!sessionData && bodySessionData) {
      console.log('[Create Auth0 User] Using session data from request body (fallback)');
      sessionData = bodySessionData;
    }
    
    if (!sessionData) {
      console.error('[Create Auth0 User] No session data found in cookie or request body');
      console.error('[Create Auth0 User] Available cookies:', allCookies.map(c => c.name));
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }
    
    const { user } = sessionData;
    // Check both possible field names for access token
    const accessToken = sessionData.accessToken || sessionData.access_token;
    
    if (!user || !user.email) {
      console.error('[Create Auth0 User] No user data in session');
      return NextResponse.json({ error: 'No user data in session' }, { status: 401 });
    }
    
    if (!accessToken) {
      console.error('[Create Auth0 User] No access token in session');
      console.error('[Create Auth0 User] Session data keys:', Object.keys(sessionData));
      return NextResponse.json({ error: 'No access token in session' }, { status: 401 });
    }
    
    console.log('[Create Auth0 User] Processing user:', {
      email: user.email,
      sub: user.sub,
      hasAccessToken: !!accessToken,
      tokenLength: accessToken ? accessToken.length : 0
    });
    
    // Check for existing tenant ID in session/cookies
    let existingTenantId = user.tenant_id || user.tenantId;
    
    // Check tenant cookies as fallback
    if (!existingTenantId) {
      const userTenantCookie = cookieStore.get('user_tenant_id');
      if (userTenantCookie) {
        existingTenantId = userTenantCookie.value;
        console.log('[Create Auth0 User] Found tenant ID in user_tenant_id cookie:', existingTenantId);
      }
    }
    
    // Check auth0 sub-based tenant cookie
    if (!existingTenantId && user.sub) {
      const auth0SubHash = Buffer.from(user.sub).toString('base64').substring(0, 16);
      const tenantCookie = cookieStore.get(`tenant_${auth0SubHash}`);
      if (tenantCookie) {
        existingTenantId = tenantCookie.value;
        console.log('[Create Auth0 User] Found tenant ID in sub-based cookie:', existingTenantId);
      }
    }
    
    console.log('[Create Auth0 User] Existing tenant ID check:', existingTenantId);
    
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://127.0.0.1:8000';
    console.log('[Create Auth0 User] Using API base URL:', apiBaseUrl);
    
    // Step 1: Check if user already exists in Django backend
    try {
      const existingUserResponse = await fetch(`${apiBaseUrl}/api/users/me/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      
      console.log('[Create Auth0 User] Existing user check response:', existingUserResponse.status);
      
      if (existingUserResponse.ok) {
        const existingUser = await existingUserResponse.json();
        console.log('[Create Auth0 User] Found existing user in backend:', {
          user_id: existingUser.id,
          tenant_id: existingUser.tenant_id,
          onboarding_completed: existingUser.onboarding_completed,
          needs_onboarding: existingUser.needs_onboarding,
          onboarding_status: existingUser.onboarding_status,
          setup_done: existingUser.setup_done,
          current_step: existingUser.current_step || existingUser.current_onboarding_step
        });
        
        // Extract tenant ID from backend response or onboarding data
        let backendTenantId = existingUser.tenant_id || existingUser.tenantId;
        
        // Check onboarding data for tenant ID if not found
        if (!backendTenantId && existingUser.onboarding) {
          if (existingUser.onboarding.tenantId) {
            backendTenantId = existingUser.onboarding.tenantId;
          } else if (existingUser.onboarding.progress && existingUser.onboarding.progress.tenant_id) {
            backendTenantId = existingUser.onboarding.progress.tenant_id;
          }
        }
        const finalTenantId = backendTenantId || existingTenantId;
        
        // Check backend onboarding status first
        const hasBackendCompletion = existingUser.onboarding_status === 'complete' ||
                                   existingUser.setup_done === true ||
                                   existingUser.onboarding_completed === true ||
                                   existingUser.current_step === 'complete';
        const hasTenantId = backendTenantId || finalTenantId;
        const needsOnboarding = hasBackendCompletion ? false : (hasTenantId ? false : 
          (existingUser.needs_onboarding === true || 
           (existingUser.needs_onboarding === undefined && existingUser.onboarding_completed !== true)));
        
        // Update session cookie with backend tenant ID
        const updatedSession = {
          ...sessionData,
          user: {
            ...sessionData.user,
            tenant_id: finalTenantId,
            tenantId: finalTenantId,
            needsOnboarding: needsOnboarding,
            onboardingCompleted: !needsOnboarding
          }
        };
        
        const response = NextResponse.json({
          success: true,
          message: 'Existing user found',
          isExistingUser: true,
          user_id: existingUser.id,
          tenant_id: finalTenantId,
          tenantId: finalTenantId,
          email: existingUser.email,
          needs_onboarding: needsOnboarding,
          needsOnboarding: needsOnboarding,
          onboardingCompleted: hasBackendCompletion ? true : (hasTenantId ? true : !needsOnboarding),
          onboardingComplete: hasBackendCompletion ? true : (hasTenantId ? true : !needsOnboarding),
          backendCompleted: hasBackendCompletion,
          backendOnboardingStatus: existingUser.onboarding_status,
          setupDone: existingUser.setup_done,
          current_step: existingUser.current_onboarding_step || 'business_info',
          backendUser: {
            ...existingUser,
            tenant_id: finalTenantId,
            tenantId: finalTenantId
          }
        });
        
        // Update session cookie
        response.cookies.set('appSession', Buffer.from(JSON.stringify(updatedSession)).toString('base64'), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        });
        
        // Store tenant ID in dedicated cookie for future lookups
        if (finalTenantId) {
          response.cookies.set('user_tenant_id', finalTenantId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30 // 30 days
          });
          
          if (user.sub) {
            const auth0SubHash = Buffer.from(user.sub).toString('base64').substring(0, 16);
            response.cookies.set(`tenant_${auth0SubHash}`, finalTenantId, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 30 // 30 days
            });
          }
        }
        
        console.log('[Create Auth0 User] Returning existing user:', {
          tenantId: finalTenantId,
          backendCompleted: hasBackendCompletion,
          needsOnboarding: needsOnboarding
        });
        return response;
      } else {
        console.log('[Create Auth0 User] User does not exist in backend (status:', existingUserResponse.status, ')');
      }
    } catch (error) {
      console.warn('[Create Auth0 User] Error checking existing user:', error.message);
    }
    
    // If we have an existing tenant ID from session/cookies, use it instead of creating new one
    if (existingTenantId) {
      console.log('[Create Auth0 User] RETURNING EXISTING TENANT ID:', existingTenantId);
      
      // Update session to ensure tenant ID is preserved
      const updatedSession = {
        ...sessionData,
        user: {
          ...sessionData.user,
          tenant_id: existingTenantId,
          tenantId: existingTenantId,
          needs_onboarding: sessionData.user?.needsOnboarding !== false,
          onboarding_completed: sessionData.user?.onboardingCompleted === true
        }
      };
      
      const response = NextResponse.json({
        success: true,
        message: 'Existing user found (session/cookie)',
        isExistingUser: true,
        tenantId: existingTenantId,
        tenant_id: existingTenantId,
        email: user.email,
        needs_onboarding: sessionData.user?.needsOnboarding !== false,
        needsOnboarding: sessionData.user?.needsOnboarding !== false,
        onboardingCompleted: sessionData.user?.onboardingCompleted === true,
        current_step: sessionData.user?.currentStep || 'business_info'
      });
      
      // Update session cookie with tenant ID
      response.cookies.set('appSession', Buffer.from(JSON.stringify(updatedSession)).toString('base64'), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      
      // Store tenant ID in dedicated cookie for future lookups
      const auth0SubHash = Buffer.from(user.sub).toString('base64').substring(0, 16);
      response.cookies.set(`tenant_${auth0SubHash}`, existingTenantId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
      
      response.cookies.set('user_tenant_id', existingTenantId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
      
      return response;
    }
    
    // Step 2: Create new user only if no existing tenant ID found
    console.log('[Create Auth0 User] Creating new user - no existing tenant ID found');
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
          role: 'owner', // New signups get owner role by default
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
            tenantId: newUser.tenant_id,
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
          tenantId: newUser.tenant_id,
          email: newUser.email,
          needs_onboarding: true,
          needsOnboarding: true,
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
        
        // Store tenant ID for future lookups
        const auth0SubHash = Buffer.from(user.sub).toString('base64').substring(0, 16);
        response.cookies.set(`tenant_${auth0SubHash}`, newUser.tenant_id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30 // 30 days
        });
        
        response.cookies.set('user_tenant_id', newUser.tenant_id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30 // 30 days
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
              const backendTenantId = existingUserData.tenant_id || existingUserData.tenantId;
              
              return NextResponse.json({
                success: true,
                message: 'Found existing user after conflict',
                isExistingUser: true,
                user_id: existingUserData.id,
                tenant_id: backendTenantId,
                tenantId: backendTenantId,
                email: existingUserData.email,
                needs_onboarding: existingUserData.needs_onboarding !== false,
                needsOnboarding: existingUserData.needs_onboarding !== false,
                onboardingCompleted: existingUserData.onboarding_completed === true,
                current_step: existingUserData.current_onboarding_step || 'business_info',
                backendUser: {
                  ...existingUserData,
                  tenant_id: backendTenantId,
                  tenantId: backendTenantId
                }
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
      
      // ENHANCED FALLBACK: Check for existing tenant ID one more time before creating new one
      if (!existingTenantId) {
        console.log('[Create Auth0 User] No existing tenant ID found anywhere, creating new one for fallback');
      } else {
        console.log('[Create Auth0 User] Using existing tenant ID for fallback:', existingTenantId);
      }
      
      const fallbackTenantId = existingTenantId || tenantId;
      
      // Update session with tenant ID for consistency
      const updatedSession = {
        ...sessionData,
        user: {
          ...sessionData.user,
          tenant_id: fallbackTenantId,
          tenantId: fallbackTenantId,
          needs_onboarding: true,
          onboarding_completed: false
        }
      };
      
      const response = NextResponse.json({
        success: false,
        fallback: true,
        message: 'Backend unavailable, using session fallback',
        isExistingUser: !!existingTenantId,
        tenant_id: fallbackTenantId,
        tenantId: fallbackTenantId,
        email: user.email,
        needs_onboarding: true,
        needsOnboarding: true,
        onboardingCompleted: false,
        current_step: 'business_info',
        error: error.message
      }, { status: 200 });
      
      // Update session cookie
      response.cookies.set('appSession', Buffer.from(JSON.stringify(updatedSession)).toString('base64'), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      
      // Store tenant ID for future lookups if it's new
      if (fallbackTenantId) {
        const auth0SubHash = Buffer.from(user.sub).toString('base64').substring(0, 16);
        response.cookies.set(`tenant_${auth0SubHash}`, fallbackTenantId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30 // 30 days
        });
        
        response.cookies.set('user_tenant_id', fallbackTenantId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30 // 30 days
        });
      }
      
      return response;
    }
    
  } catch (error) {
    console.error('[Create Auth0 User] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}