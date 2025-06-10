import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
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
      return NextResponse.json(null, { status: 200 }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      console.log('🚨 [PROFILE API] ✅ Session cookie parsed successfully');
    } catch (parseError) {
      console.error('🚨 [PROFILE API] ❌ Error parsing session cookie:', parseError);
      return NextResponse.json(null, { status: 200 }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    const { user, accessToken } = sessionData;
    
    if (!user) {
      console.log('🚨 [PROFILE API] ❌ No user data in session');
      return NextResponse.json(null, { status: 200 }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    console.log('🚨 [PROFILE API] RAW SESSION USER DATA:', {
      email: user.email,
      needsOnboarding: user.needsOnboarding,
      onboardingCompleted: user.onboardingCompleted,
      currentStep: user.currentStep,
      current_onboarding_step: user.current_onboarding_step,
      businessInfoCompleted: user.businessInfoCompleted,
      lastUpdated: user.lastUpdated,
      tenantId: user.tenantId || user.tenant_id,
      businessName: user.businessName,
      businessType: user.businessType,
      subscriptionPlan: user.subscriptionPlan
    });
    
    console.log('🚨 [PROFILE API] === SESSION DATA ANALYSIS ===');
    console.log('🚨 [PROFILE API] Session user fields check:');
    console.log('🚨 [PROFILE API] - user.needsOnboarding !== undefined:', user.needsOnboarding !== undefined);
    console.log('🚨 [PROFILE API] - user.needsOnboarding value:', user.needsOnboarding);
    console.log('🚨 [PROFILE API] - user.needsOnboarding !== false:', user.needsOnboarding !== false);
    console.log('🚨 [PROFILE API] - user.onboardingCompleted:', user.onboardingCompleted);
    console.log('🚨 [PROFILE API] - user.currentStep:', user.currentStep);
    console.log('🚨 [PROFILE API] - user.businessInfoCompleted:', user.businessInfoCompleted);
    
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
      // If session has tenantId, user has completed onboarding
      needsOnboarding: (user.tenantId || user.tenant_id) ? false : 
        (user.needsOnboarding === true || (user.needsOnboarding === undefined && user.onboardingCompleted !== true)),
      onboardingCompleted: user.onboardingCompleted === true,
      currentStep: user.currentStep || user.current_onboarding_step || 'business_info',
      tenantId: user.tenantId || user.tenant_id,
      businessInfoCompleted: user.businessInfoCompleted === true,
      // Include business info from session
      businessName: user.businessName,
      businessType: user.businessType,
      subscriptionPlan: user.subscriptionPlan
    };
    
    console.log('🚨 [PROFILE API] === INITIAL PROFILE DATA (FROM SESSION) ===');
    console.log('🚨 [PROFILE API] Initial profile construction:', {
      email: profileData.email,
      needsOnboarding: profileData.needsOnboarding,
      onboardingCompleted: profileData.onboardingCompleted,
      currentStep: profileData.currentStep,
      tenantId: profileData.tenantId,
      businessInfoCompleted: profileData.businessInfoCompleted
    });
    
    // Try to fetch additional data from Django backend (if available)
    let backendUser = null;
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
          backendUser = await backendResponse.json();
          
          // Also check for onboarding progress in backend
          let onboardingProgress = null;
          if (backendUser.onboarding && backendUser.onboarding.progress_id) {
            onboardingProgress = backendUser.onboarding;
          } else if (backendUser.onboarding_status || backendUser.current_step) {
            onboardingProgress = {
              status: backendUser.onboarding_status,
              currentStep: backendUser.current_step || backendUser.current_onboarding_step,
              tenantId: backendUser.onboarding_tenant_id
            };
          }
          
          console.log('🚨 [PROFILE API] ✅ BACKEND USER DATA:', {
            email: backendUser.email,
            tenant_id: backendUser.tenant_id,
            onboarding_completed: backendUser.onboarding_completed,
            needs_onboarding: backendUser.needs_onboarding,
            current_onboarding_step: backendUser.current_onboarding_step,
            onboarding_status: backendUser.onboarding_status,
            setup_done: backendUser.setup_done,
            onboardingProgress: onboardingProgress
          });
          console.log('[Profile API] Backend user data:', {
            email: backendUser.email,
            tenant_id: backendUser.tenant_id,
            onboarding_completed: backendUser.onboarding_completed,
            needs_onboarding: backendUser.needs_onboarding,
            current_onboarding_step: backendUser.current_onboarding_step
          });
          
          // Business info is already in session from onboarding
          const backendTenantId = backendUser.tenant_id || backendUser.tenantId;
          let businessInfo = null;
          
          // Check if business info is already in the session user data
          if (user.businessName) {
            businessInfo = {
              businessName: user.businessName,
              businessType: user.businessType,
              subscriptionPlan: user.subscriptionPlan || 'free'
            };
            console.log('[Profile API] Business info from session:', businessInfo);
          }
          
          // Also get businessName from backend response
          if (backendUser.businessName || (backendUser.tenant && backendUser.tenant.name)) {
            businessInfo = businessInfo || {};
            businessInfo.businessName = backendUser.businessName || backendUser.tenant?.name || businessInfo.businessName;
            console.log('[Profile API] Business name from backend:', businessInfo.businessName);
          }
          
          // Use the tenant ID we already fetched
          const sessionTenantId = user.tenantId || user.tenant_id;
          const finalTenantId = sessionTenantId || backendTenantId;
          
          // Determine onboarding status from backend data
          const hasCompletedOnboarding = (
            backendUser.onboarding_status === 'complete' ||
            backendUser.current_step === 'complete' ||
            backendUser.setup_done === true ||
            backendUser.onboarding_completed === true ||
            (backendTenantId && (
            backendUser.onboarding_completed === true || 
            backendUser.onboarding_status === 'complete' ||
            backendUser.setup_done === true
          )));
          
          // Merge backend data, prioritizing tenant info from backend
          profileData = {
            ...profileData,
            // Backend data
            id: backendUser.id,
            tenant_id: finalTenantId,
            tenantId: finalTenantId, // Alias for compatibility
            
            // Subscription data from backend (prioritize backend over session)
            subscriptionPlan: backendUser.subscription_plan || backendUser.selected_plan || backendUser.subscription_type || businessInfo?.subscriptionPlan || user.subscriptionPlan || profileData.subscriptionPlan || 'free',
            subscriptionType: backendUser.subscription_plan || backendUser.selected_plan || backendUser.subscription_type || businessInfo?.subscriptionPlan || user.subscriptionPlan || profileData.subscriptionPlan || 'free',
            selected_plan: backendUser.selected_plan || backendUser.subscription_plan || backendUser.subscription_type || businessInfo?.subscriptionPlan || user.subscriptionPlan || profileData.subscriptionPlan || 'free',
            selectedPlan: backendUser.selected_plan || backendUser.subscription_plan || backendUser.subscription_type || businessInfo?.subscriptionPlan || user.subscriptionPlan || profileData.subscriptionPlan || 'free',
            
            // Business info from backend or session
            businessName: businessInfo?.businessName || user.businessName || profileData.businessName,
            businessType: businessInfo?.businessType || user.businessType || profileData.businessType,
            
            // Onboarding status: if user has tenant in backend, they've completed onboarding
            // Check backend onboarding status first, then tenant ID
            needsOnboarding: (backendUser && (
              backendUser.onboarding_status === 'complete' ||
              backendUser.setup_done === true ||
              backendUser.onboarding_completed === true
            )) ? false : (finalTenantId ? false : 
                           (user.onboardingCompleted === true ? false :
                            (user.needsOnboarding === true || backendUser?.needs_onboarding === true))),
            onboardingCompleted: (backendUser && (
              backendUser.onboarding_status === 'complete' ||
              backendUser.setup_done === true ||
              backendUser.onboarding_completed === true
            )) ? true : (finalTenantId ? true :
                               (user.onboardingCompleted === true || 
                                backendUser?.onboarding_completed === true)),
            currentStep: (backendUser && backendUser.onboarding_status === 'complete') ? 'completed' :
                        (backendUser && backendUser.current_step === 'complete') ? 'completed' :
                        (finalTenantId ? 'completed' :
                        (user.currentStep || user.current_onboarding_step || backendUser?.current_onboarding_step || 'business_info')),
            businessInfoCompleted: user.businessInfoCompleted !== undefined 
              ? user.businessInfoCompleted 
              : false,
            
            // Additional backend fields
            first_name: backendUser.first_name,
            last_name: backendUser.last_name,
            date_joined: backendUser.date_joined,
            last_login: backendUser.last_login,
            
            // Additional business info
            businessInfo: businessInfo
          };
          
          console.log('🚨 [PROFILE API] === AFTER BACKEND MERGE ===');
          console.log('🚨 [PROFILE API] Final merged values:');
          console.log('🚨 [PROFILE API] - Final needsOnboarding:', profileData.needsOnboarding);
          console.log('🚨 [PROFILE API] - Final onboardingCompleted:', profileData.onboardingCompleted);
          console.log('🚨 [PROFILE API] - Final currentStep:', profileData.currentStep);
          console.log('🚨 [PROFILE API] - Final businessInfoCompleted:', profileData.businessInfoCompleted);
          
          console.log('[Profile API] Data merge details:', {
            sessionCurrentStep: user.currentStep || user.current_onboarding_step,
            backendCurrentStep: backendUser.current_onboarding_step,
            finalCurrentStep: profileData.currentStep,
            sessionNeedsOnboarding: user.needsOnboarding,
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
    // CRITICAL: Check backend status or tenant ID for completion
    if ((profileData.tenantId || profileData.tenant_id) ||
        (backendUser && (backendUser.onboarding_status === 'complete' || 
         backendUser.setup_done === true ||
         backendUser.onboarding_completed === true))) {
      profileData.needsOnboarding = false;
      profileData.onboardingCompleted = true;
      if (profileData.currentStep !== 'completed') {
        profileData.currentStep = 'completed';
      }
    } else if (profileData.onboardingCompleted === true || profileData.currentStep === 'completed') {
      profileData.needsOnboarding = false;
      profileData.onboardingCompleted = true;
    }
    
    // Backend update removed - will be handled by explicit user actions
    
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
    
    // Add backend completion status flag
    profileData.backendCompleted = (backendUser && (
      backendUser.onboarding_status === 'complete' ||
      backendUser.setup_done === true ||
      backendUser.onboarding_completed === true
    )) || false;
    
    console.log('🚨 [PROFILE API] ✅ FINAL PROFILE DATA BEING RETURNED:', {
      email: profileData.email,
      tenantId: profileData.tenantId,
      needsOnboarding: profileData.needsOnboarding,
      onboardingCompleted: profileData.onboardingCompleted,
      currentStep: profileData.currentStep,
      businessInfoCompleted: profileData.businessInfoCompleted,
      subscriptionPlan: profileData.subscriptionPlan,
      subscriptionType: profileData.subscriptionType,
      hasAllRequiredFields: !!(profileData.email && profileData.tenantId),
      backendCompleted: profileData.backendCompleted,
      dataSource: accessToken ? 'session+backend' : 'session-only'
    });
    
    return NextResponse.json(profileData, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    
  } catch (error) {
    console.error('🚨 [PROFILE API] ❌ CRITICAL ERROR:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    console.error('[Profile API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
  }
} 