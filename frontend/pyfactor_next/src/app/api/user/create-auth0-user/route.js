import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    console.log('[Create Auth0 User] Creating user in Django backend');
    
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
    
    if (!accessToken) {
      console.warn('[Create Auth0 User] No access token in session data, continuing anyway');
    }
    
    console.log('[Create Auth0 User] Creating user for:', user.email);
    
    // Prepare user data for Django backend
    const userData = {
      email: user.email,
      auth0_sub: user.sub,
      first_name: user.given_name || user.name?.split(' ')[0] || '',
      last_name: user.family_name || user.name?.split(' ').slice(1).join(' ') || '',
      name: user.name || user.email,
      picture: user.picture || '',
      is_verified: user.email_verified || true,
      auth_provider: 'auth0'
    };
    
    // Generate a tenant ID for the user
    const tenantId = uuidv4();
    userData.tenant_id = tenantId;
    
    console.log('[Create Auth0 User] User data prepared:', {
      email: userData.email,
      auth0_sub: userData.auth0_sub,
      tenant_id: userData.tenant_id,
      hasAccessToken: !!accessToken
    });
    
    // Call Django backend to create user
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBaseUrl) {
      throw new Error('API configuration missing - backend URL not configured');
    }
    
    try {
      const backendResponse = await fetch(`${apiBaseUrl}/api/auth0/create-user/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-User-Email': user.email,
          'X-User-Sub': user.sub,
          'X-Source': 'auth0-callback'
        },
        body: JSON.stringify(userData)
      });
      
      let responseData = {};
      
      if (backendResponse.ok) {
        try {
          responseData = await backendResponse.json();
          console.log('[Create Auth0 User] Backend user creation successful:', {
            userId: responseData.user_id,
            tenantId: responseData.tenant_id,
            success: responseData.success
          });
        } catch (jsonError) {
          console.log('[Create Auth0 User] Backend responded OK but no JSON data');
          responseData = { 
            success: true, 
            message: 'User created successfully',
            tenant_id: tenantId,
            user_id: user.sub
          };
        }
      } else {
        const errorText = await backendResponse.text().catch(() => 'Unknown error');
        console.error('[Create Auth0 User] Backend user creation failed:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorText
        });
        
        // If it's a "user already exists" error (409), that's actually OK
        if (backendResponse.status === 409) {
          console.log('[Create Auth0 User] User already exists in backend, fetching existing user');
          
          // Try to get existing user
          const getUserResponse = await fetch(`${apiBaseUrl}/api/users/me/`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'X-User-Email': user.email,
              'X-User-Sub': user.sub
            }
          });
          
          if (getUserResponse.ok) {
            const existingUser = await getUserResponse.json();
            console.log('[Create Auth0 User] Found existing user:', {
              userId: existingUser.id,
              tenantId: existingUser.tenant_id,
              currentStep: existingUser.current_step
            });
            
            return NextResponse.json({
              success: true,
              message: 'User already exists',
              user: existingUser,
              tenant_id: existingUser.tenant_id || existingUser.tenantId,
              current_step: existingUser.current_step || 'business_info',
              needs_onboarding: existingUser.needs_onboarding !== false
            });
          }
        }
        
        // For other errors, return them but don't fail completely
        return NextResponse.json({
          success: false,
          error: 'Backend user creation failed',
          details: errorText,
          fallback: true,
          // Provide fallback data so frontend can continue
          tenant_id: tenantId,
          current_step: 'business_info',
          needs_onboarding: true
        }, { status: 200 }); // Return 200 so frontend doesn't fail
      }
      
      // Update session cookie with tenant information
      try {
        const updatedSessionData = {
          ...sessionData,
          user: {
            ...sessionData.user,
            tenantId: responseData.tenant_id || tenantId,
            currentStep: responseData.current_step || 'business_info',
            needsOnboarding: responseData.needs_onboarding !== false,
            onboardingCompleted: false
          }
        };
        
        const updatedSessionCookie = Buffer.from(JSON.stringify(updatedSessionData)).toString('base64');
        
        const response = NextResponse.json({
          success: true,
          message: 'User created successfully in Django backend',
          user: responseData,
          tenant_id: responseData.tenant_id || tenantId,
          current_step: responseData.current_step || 'business_info',
          needs_onboarding: responseData.needs_onboarding !== false
        });
        
        // Update the session cookie
        response.cookies.set('appSession', updatedSessionCookie, {
          path: '/',
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 // 7 days
        });
        
        console.log('[Create Auth0 User] Session updated with tenant information');
        return response;
        
      } catch (cookieError) {
        console.error('[Create Auth0 User] Error updating session cookie:', cookieError);
        // Continue without cookie update
      }
      
      return NextResponse.json({
        success: true,
        message: 'User created successfully in Django backend',
        user: responseData,
        tenant_id: responseData.tenant_id || tenantId,
        current_step: responseData.current_step || 'business_info',
        needs_onboarding: responseData.needs_onboarding !== false
      });
      
    } catch (backendError) {
      console.error('[Create Auth0 User] Backend communication failed:', {
        message: backendError.message,
        stack: backendError.stack
      });
      
      return NextResponse.json({
        success: false,
        error: 'Failed to communicate with backend',
        details: backendError.message,
        fallback: true,
        // Provide fallback data so frontend can continue
        tenant_id: tenantId,
        current_step: 'business_info', 
        needs_onboarding: true
      }, { status: 200 }); // Return 200 so frontend doesn't fail
    }
    
  } catch (error) {
    console.error('[Create Auth0 User] Critical error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    return NextResponse.json({
      success: false,
      error: 'Critical error creating user',
      message: error.message
    }, { status: 500 });
  }
} 