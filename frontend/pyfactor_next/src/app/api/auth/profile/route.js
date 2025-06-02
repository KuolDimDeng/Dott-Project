import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    console.log('[Profile API] Getting user profile data');
    
    // Get Auth0 session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      console.log('[Profile API] No session cookie found');
      return NextResponse.json(null, { status: 200 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (parseError) {
      console.error('[Profile API] Error parsing session cookie:', parseError);
      return NextResponse.json(null, { status: 200 });
    }
    
    const { user, accessToken } = sessionData;
    
    if (!user) {
      console.log('[Profile API] No user data in session');
      return NextResponse.json(null, { status: 200 });
    }
    
    console.log('[Profile API] Session user data:', {
      email: user.email,
      hasOnboardingData: !!(user.needsOnboarding !== undefined || user.onboardingCompleted !== undefined),
      sessionOnboardingStatus: {
        needsOnboarding: user.needsOnboarding,
        onboardingCompleted: user.onboardingCompleted,
        currentStep: user.currentStep,
        current_onboarding_step: user.current_onboarding_step,
        businessInfoCompleted: user.businessInfoCompleted,
        lastUpdated: user.lastUpdated
      }
    });
    
    // Start with session data as base profile
    let profileData = {
      ...user,
      // Ensure consistent field names for onboarding status
      needsOnboarding: user.needsOnboarding !== false,
      onboardingCompleted: user.onboardingCompleted === true,
      currentStep: user.currentStep || user.current_onboarding_step || 'business_info',
      tenantId: user.tenantId || user.tenant_id,
      businessInfoCompleted: user.businessInfoCompleted === true
    };
    
    console.log('[Profile API] Initial profile data from session:', {
      email: profileData.email,
      needsOnboarding: profileData.needsOnboarding,
      onboardingCompleted: profileData.onboardingCompleted,
      currentStep: profileData.currentStep,
      businessInfoCompleted: profileData.businessInfoCompleted
    });
    
    // Try to fetch additional data from Django backend (if available)
    if (accessToken) {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://127.0.0.1:8000';
        
        console.log('[Profile API] Fetching profile from Django backend');
        
        const backendResponse = await fetch(`${apiBaseUrl}/api/users/me/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });
        
        if (backendResponse.ok) {
          const backendUser = await backendResponse.json();
          console.log('[Profile API] Backend user data:', {
            email: backendUser.email,
            tenant_id: backendUser.tenant_id,
            onboarding_completed: backendUser.onboarding_completed,
            needs_onboarding: backendUser.needs_onboarding,
            current_onboarding_step: backendUser.current_onboarding_step
          });
          
          // Merge backend data, but prioritize session data for onboarding status
          // (session data is more up-to-date after recent actions)
          const oldCurrentStep = profileData.currentStep;
          const sessionOnboardingComplete = user.onboardingCompleted;
          const sessionNeedsOnboarding = user.needsOnboarding;
          
          profileData = {
            ...profileData,
            // Backend data
            id: backendUser.id,
            tenant_id: backendUser.tenant_id,
            tenantId: backendUser.tenant_id, // Alias for compatibility
            
            // Onboarding status: Prioritize session data if it exists and looks recent
            needsOnboarding: user.needsOnboarding !== undefined 
              ? user.needsOnboarding 
              : (backendUser.needs_onboarding !== false),
            onboardingCompleted: user.onboardingCompleted !== undefined 
              ? user.onboardingCompleted 
              : (backendUser.onboarding_completed === true),
            currentStep: user.currentStep || user.current_onboarding_step || backendUser.current_onboarding_step || 'business_info',
            
            // Additional backend fields
            first_name: backendUser.first_name,
            last_name: backendUser.last_name,
            date_joined: backendUser.date_joined,
            last_login: backendUser.last_login
          };
          
          console.log('[Profile API] Data merge details:', {
            sessionCurrentStep: user.currentStep || user.current_onboarding_step,
            backendCurrentStep: backendUser.current_onboarding_step,
            finalCurrentStep: profileData.currentStep,
            sessionNeedsOnboarding: sessionNeedsOnboarding,
            backendNeedsOnboarding: backendUser.needs_onboarding,
            finalNeedsOnboarding: profileData.needsOnboarding,
            sessionBusinessInfoCompleted: user.businessInfoCompleted,
            finalBusinessInfoCompleted: profileData.businessInfoCompleted
          });
          
          console.log('[Profile API] Merged profile data with backend');
        } else {
          console.log('[Profile API] Backend request failed:', backendResponse.status);
        }
      } catch (backendError) {
        console.warn('[Profile API] Error fetching from backend:', backendError.message);
      }
    }
    
    // Ensure onboarding status consistency
    if (profileData.onboardingCompleted === true || profileData.currentStep === 'completed') {
      profileData.needsOnboarding = false;
      profileData.onboardingCompleted = true;
    }
    
    console.log('[Profile API] Final profile data:', {
      email: profileData.email,
      tenantId: profileData.tenantId,
      needsOnboarding: profileData.needsOnboarding,
      onboardingCompleted: profileData.onboardingCompleted,
      currentStep: profileData.currentStep
    });
    
    return NextResponse.json(profileData);
    
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 