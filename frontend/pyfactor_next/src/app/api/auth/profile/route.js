import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  console.log('🚨 [PROFILE API] GET REQUEST STARTED - Version 2.1');
  console.log('🚨 [PROFILE API] Environment:', process.env.NODE_ENV);
  
  try {
    console.log('[Profile API] Getting user profile data');
    
    // Get Auth0 session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    console.log('🚨 [PROFILE API] Session cookie exists:', !!sessionCookie);
    console.log('🚨 [PROFILE API] Session cookie size:', sessionCookie?.value?.length || 0, 'bytes');
    
    if (!sessionCookie) {
      console.log('🚨 [PROFILE API] ❌ NO SESSION COOKIE FOUND');
      return NextResponse.json(null, { status: 200 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      console.log('🚨 [PROFILE API] ✅ Session cookie parsed successfully');
    } catch (parseError) {
      console.error('🚨 [PROFILE API] ❌ Error parsing session cookie:', parseError);
      return NextResponse.json(null, { status: 200 });
    }
    
    const { user, accessToken } = sessionData;
    
    if (!user) {
      console.log('🚨 [PROFILE API] ❌ No user data in session');
      return NextResponse.json(null, { status: 200 });
    }
    
    console.log('🚨 [PROFILE API] RAW SESSION USER DATA:', {
      email: user.email,
      needsOnboarding: user.needsOnboarding,
      onboardingCompleted: user.onboardingCompleted,
      currentStep: user.currentStep,
      current_onboarding_step: user.current_onboarding_step,
      businessInfoCompleted: user.businessInfoCompleted,
      lastUpdated: user.lastUpdated,
      tenantId: user.tenantId || user.tenant_id
    });
    
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
      console.log('🚨 [PROFILE API] ATTEMPTING BACKEND FETCH - Access token exists');
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://127.0.0.1:8000';
        
        console.log('[Profile API] Fetching profile from Django backend');
        console.log('🚨 [PROFILE API] Backend URL:', `${apiBaseUrl}/api/users/me/`);
        
        const backendResponse = await fetch(`${apiBaseUrl}/api/users/me/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });
        
        console.log('🚨 [PROFILE API] Backend response status:', backendResponse.status, backendResponse.ok);
        
        if (backendResponse.ok) {
          const backendUser = await backendResponse.json();
          console.log('🚨 [PROFILE API] ✅ BACKEND USER DATA:', {
            email: backendUser.email,
            tenant_id: backendUser.tenant_id,
            onboarding_completed: backendUser.onboarding_completed,
            needs_onboarding: backendUser.needs_onboarding,
            current_onboarding_step: backendUser.current_onboarding_step
          });
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
          
          console.log('🚨 [PROFILE API] BEFORE MERGE - Session vs Backend:', {
            sessionNeedsOnboarding: user.needsOnboarding,
            backendNeedsOnboarding: backendUser.needs_onboarding,
            sessionCurrentStep: user.currentStep || user.current_onboarding_step,
            backendCurrentStep: backendUser.current_onboarding_step,
            sessionBusinessInfo: user.businessInfoCompleted,
            willPrioritizeSession: user.needsOnboarding !== undefined
          });
          
          profileData = {
            ...profileData,
            // Backend data
            id: backendUser.id,
            tenant_id: backendUser.tenant_id,
            tenantId: backendUser.tenant_id, // Alias for compatibility
            
            // Onboarding status: ALWAYS prioritize session data if it exists
            // Session data is more current after form submissions
            needsOnboarding: user.needsOnboarding !== undefined 
              ? user.needsOnboarding 
              : (backendUser.needs_onboarding !== false),
            onboardingCompleted: user.onboardingCompleted !== undefined 
              ? user.onboardingCompleted 
              : (backendUser.onboarding_completed === true),
            currentStep: user.currentStep || user.current_onboarding_step || backendUser.current_onboarding_step || 'business_info',
            businessInfoCompleted: user.businessInfoCompleted !== undefined 
              ? user.businessInfoCompleted 
              : false,
            
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
            finalBusinessInfoCompleted: profileData.businessInfoCompleted,
            dataSource: 'session data prioritized over backend'
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
    
    // CRITICAL FIX: Handle edge cases where session data might be inconsistent
    // If business info is completed but currentStep is still business_info, advance to subscription
    if (profileData.businessInfoCompleted === true && profileData.currentStep === 'business_info') {
      console.log('[Profile API] Business info completed but currentStep is business_info, correcting to subscription');
      profileData.currentStep = 'subscription';
    }
    
    // If we have no currentStep but business info is completed, set to subscription
    if (!profileData.currentStep && profileData.businessInfoCompleted === true) {
      console.log('[Profile API] No currentStep but business info completed, setting to subscription');
      profileData.currentStep = 'subscription';
    }
    
    console.log('[Profile API] Final profile data:', {
      email: profileData.email,
      tenantId: profileData.tenantId,
      needsOnboarding: profileData.needsOnboarding,
      onboardingCompleted: profileData.onboardingCompleted,
      currentStep: profileData.currentStep,
      businessInfoCompleted: profileData.businessInfoCompleted
    });
    
    console.log('🚨 [PROFILE API] ✅ FINAL PROFILE DATA BEING RETURNED:', {
      email: profileData.email,
      tenantId: profileData.tenantId,
      needsOnboarding: profileData.needsOnboarding,
      onboardingCompleted: profileData.onboardingCompleted,
      currentStep: profileData.currentStep,
      businessInfoCompleted: profileData.businessInfoCompleted,
      hasAllRequiredFields: !!(profileData.email && profileData.tenantId),
      dataSource: accessToken ? 'session+backend' : 'session-only'
    });
    
    return NextResponse.json(profileData);
    
  } catch (error) {
    console.error('🚨 [PROFILE API] ❌ CRITICAL ERROR:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    console.error('[Profile API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 