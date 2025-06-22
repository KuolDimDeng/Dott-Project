import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request) {
  console.log('🔥 [USER_CURRENT] === STARTING USER CURRENT API ===');
  
  try {
    const cookieStore = await cookies();
    // Check new session system first
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    // If we have new session cookies, use the backend session API
    if (sidCookie || sessionTokenCookie) {
      const sessionId = sidCookie?.value || sessionTokenCookie?.value;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
      
      try {
        console.log('🔥 [USER_CURRENT] Using new session system');
        const response = await fetch(`${API_URL}/api/sessions/current/`, {
          headers: {
            'Authorization': `SessionID ${sessionId}`,
            'Cookie': `session_token=${sessionId}`
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          const sessionData = await response.json();
          // Transform backend session data to user format
          const user = {
            email: sessionData.email,
            name: sessionData.name || sessionData.email,
            picture: sessionData.picture,
            needsOnboarding: sessionData.needs_onboarding,
            onboardingCompleted: sessionData.onboarding_completed,
            currentStep: sessionData.current_onboarding_step || 'business_info',
            tenantId: sessionData.tenant_id,
            debug: {
              session_type: 'backend-v2',
              session_id: sessionId.substring(0, 8) + '...'
            }
          };
          
          console.log('🔥 [USER_CURRENT] New session user data:', user);
          return NextResponse.json({ user });
        } else {
          console.log('🔥 [USER_CURRENT] Backend session invalid:', response.status);
          return NextResponse.json({ user: null }, { status: 401 });
        }
      } catch (error) {
        console.error('🔥 [USER_CURRENT] Error fetching backend session:', error);
        // Fall through to legacy check
      }
    }
    
    if (!sessionCookie) {
      console.log('🔥 [USER_CURRENT] No session cookie found, returning null user');
      return NextResponse.json({ user: null }, { status: 401 });
    }
    
    // Parse session data (legacy)
    let session;
    try {
      session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (parseError) {
      console.error('🔥 [USER_CURRENT] Error parsing session cookie:', parseError);
      return NextResponse.json({ user: null }, { status: 401 });
    }
    
    console.log('🔥 [USER_CURRENT] Session data:', {
      hasUser: !!session?.user,
      email: session?.user?.email,
      hasAccessToken: !!session?.accessToken
    });

    if (!session?.user) {
      console.log('🔥 [USER_CURRENT] No session found, returning null user');
      return NextResponse.json({ user: null }, { status: 401 });
    }
    
    // Get access token
    const accessToken = session.accessToken;
    if (!accessToken) {
      console.log('🔥 [USER_CURRENT] No access token found');
      return NextResponse.json({ user: null }, { status: 401 });
    }

    console.log('🔥 [USER_CURRENT] Making backend API call to /api/auth/profile');
    
    try {
      // Call backend to get user profile
      const backendResponse = await fetch(`${apiBaseUrl}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-User-Email': session.user.email,
          'X-User-Sub': session.user.sub,
        },
      });
      
      console.log('🔥 [USER_CURRENT] Backend response status:', backendResponse.status);

      if (backendResponse.ok) {
        const userData = await backendResponse.json();
        console.log('🔥 [USER_CURRENT] Raw backend response:', userData);
        
        // Transform backend response to frontend format
        const transformedUser = {
          email: userData.user?.email || session.user.email,
          name: userData.user?.name || session.user.name,
          picture: userData.user?.picture || session.user.picture,
          
          // Onboarding status from backend
          needsOnboarding: userData.onboarding?.needsOnboarding ?? true,
          onboardingCompleted: userData.onboarding?.onboardingCompleted ?? false,
          currentStep: userData.onboarding?.currentStep || 'business_info',
          tenantId: userData.onboarding?.tenantId || userData.tenant?.id,
          
          // Debug info
          debug: {
            backend_onboarding_status: userData.onboarding_status,
            backend_setup_done: userData.setup_done,
            tenant_id: userData.tenant?.id,
            progress_id: userData.onboarding?.progress_id,
            raw_onboarding: userData.onboarding
          }
        };

        console.log('🔥 [USER_CURRENT] Transformed user data:', transformedUser);
        console.log('🔥 [USER_CURRENT] === USER CURRENT API COMPLETE ===');
        
        return NextResponse.json({ user: transformedUser });
      } else {
        const errorText = await backendResponse.text();
        console.error('🔥 [USER_CURRENT] Backend API error:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorText
        });
        
        // Fallback - use session data with conservative defaults
        console.log('🔥 [USER_CURRENT] Using session fallback data');
        const fallbackUser = {
          email: session.user.email,
          name: session.user.name,
          picture: session.user.picture,
          needsOnboarding: true,  // Conservative default
          onboardingCompleted: false,
          currentStep: 'business_info',
          tenantId: null,
          debug: {
            fallback_reason: 'backend_api_error',
            backend_status: backendResponse.status
          }
        };
        
        console.log('🔥 [USER_CURRENT] Fallback user data:', fallbackUser);
        return NextResponse.json({ user: fallbackUser });
      }
    } catch (backendError) {
      console.error('🔥 [USER_CURRENT] Backend API call failed:', backendError);
      
      // Fallback - use session data
      const fallbackUser = {
        email: session.user.email,
        name: session.user.name,
        picture: session.user.picture,
        needsOnboarding: true,  // Conservative default
        onboardingCompleted: false,
        currentStep: 'business_info',
        tenantId: null,
        debug: {
          fallback_reason: 'backend_api_exception',
          error: backendError.message
        }
      };
      
      console.log('🔥 [USER_CURRENT] Exception fallback user data:', fallbackUser);
      return NextResponse.json({ user: fallbackUser });
    }
    
  } catch (error) {
    console.error('🔥 [USER_CURRENT] General error:', error);
    return NextResponse.json({ 
      user: null, 
      error: 'Internal server error',
      debug: { error: error.message }
    }, { status: 500 });
  }
} 