import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request) {
  console.log('🔥 [USER_CURRENT] === STARTING USER CURRENT API ===');
  
  try {
    // Get session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      console.log('🔥 [USER_CURRENT] No session cookie found, returning null user');
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Parse session data
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

    console.log('🔥 [USER_CURRENT] Making backend API call to /api/users/me/');
    
    try {
      // Call backend to get user profile
      const backendResponse = await fetch(`${apiBaseUrl}/api/users/me/`, {
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