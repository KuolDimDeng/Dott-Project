import { NextRequest, NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get session cookie to get user info
    const sessionCookie = request.cookies.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    if (!sessionData.user) {
      return NextResponse.json({ error: 'No user in session' }, { status: 401 });
    }
    
    console.log('[User Current] Fetching user data for:', sessionData.user.email);
    
    // Call backend API to get user profile
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
      
      console.log('[User Current] Calling backend:', `${backendUrl}/api/users/me/`);
      
      const response = await fetch(`${backendUrl}/api/users/me/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.accessToken}`,
          'X-User-Email': sessionData.user.email,
          'X-User-Sub': sessionData.user.sub,
        },
      });
      
      console.log('[User Current] Backend response status:', response.status);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('[User Current] Backend user data retrieved:', {
          email: userData.user?.email,
          tenantId: userData.tenant?.id,
          onboardingStatus: userData.onboarding_status,
          setupDone: userData.setup_done
        });
        
        // Check onboarding completion from multiple sources
        const onboardingCompleted = userData.setup_done === true || 
                                   userData.onboarding_status === 'complete' ||
                                   userData.onboarding?.onboarding_completed === true;
        
        // Transform backend data to frontend format
        const userProfile = {
          email: userData.user.email,
          sub: sessionData.user.sub,
          name: userData.user.name || sessionData.user.name,
          picture: userData.user.picture || sessionData.user.picture,
          tenantId: userData.tenant?.id || null,
          needsOnboarding: !onboardingCompleted,
          onboardingCompleted: onboardingCompleted,
          currentStep: onboardingCompleted ? 'complete' : (userData.onboarding?.current_step || 'business_info'),
          isNewUser: false
        };
        
        console.log('[User Current] Transformed user profile:', {
          email: userProfile.email,
          tenantId: userProfile.tenantId,
          needsOnboarding: userProfile.needsOnboarding,
          onboardingCompleted: userProfile.onboardingCompleted,
          currentStep: userProfile.currentStep
        });
        
        return NextResponse.json(userProfile);
      } else if (response.status === 404) {
        // User not found in backend - treat as new user
        console.log('[User Current] User not found in backend, treating as new user');
        
        const newUserProfile = {
          email: sessionData.user.email,
          sub: sessionData.user.sub,
          name: sessionData.user.name,
          picture: sessionData.user.picture,
          tenantId: null,
          needsOnboarding: true,
          onboardingCompleted: false,
          currentStep: 'business_info',
          isNewUser: true
        };
        
        return NextResponse.json(newUserProfile);
      } else {
        const errorText = await response.text();
        console.error('[User Current] Backend API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: `${backendUrl}/api/users/me/`
        });
        throw new Error(`Backend API returned ${response.status}: ${errorText}`);
      }
    } catch (fetchError) {
      console.error('[User Current] Failed to fetch from backend:', fetchError);
      
      // Fallback: Check session for onboarding status
      const sessionOnboardingCompleted = sessionData.user.onboardingCompleted === true ||
                                        sessionData.user.onboarding_completed === true ||
                                        sessionData.user.needsOnboarding === false ||
                                        sessionData.user.needs_onboarding === false;
      
      const fallbackProfile = {
        email: sessionData.user.email,
        sub: sessionData.user.sub,
        name: sessionData.user.name,
        picture: sessionData.user.picture,
        tenantId: sessionData.user.tenantId || null,
        needsOnboarding: !sessionOnboardingCompleted,
        onboardingCompleted: sessionOnboardingCompleted,
        currentStep: sessionOnboardingCompleted ? 'complete' : 'business_info',
        isNewUser: true
      };
      
      console.log('[User Current] Using fallback profile:', {
        email: fallbackProfile.email,
        onboardingCompleted: fallbackProfile.onboardingCompleted,
        needsOnboarding: fallbackProfile.needsOnboarding
      });
      
      return NextResponse.json(fallbackProfile);
    }
    
  } catch (error) {
    console.error('[User Current] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 