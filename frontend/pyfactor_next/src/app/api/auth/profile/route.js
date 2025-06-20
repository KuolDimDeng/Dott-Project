import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt } from '@/utils/sessionEncryption';

export async function GET(request) {
  console.log('🚨 [PROFILE API] GET REQUEST STARTED - Version 2.1');
  console.log('🚨 [PROFILE API] Environment:', process.env.NODE_ENV);
  
  try {
    console.log('[Profile API] Getting user profile data');
    
    // Get session cookie - check new session system first
    const cookieStore = await cookies();
    // Check for new session management system cookies first
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    console.log('🚨 [PROFILE API] Cookie check:', {
      hasSid: !!sidCookie,
      hasSessionToken: !!sessionTokenCookie,
      hasDottAuth: !!sessionCookie,
      sidValue: sidCookie?.value?.substring(0, 8) + '...',
      sessionTokenValue: sessionTokenCookie?.value?.substring(0, 8) + '...'
    });
    
    // If we have sid or session_token, use the new session system
    if (sidCookie || sessionTokenCookie) {
      console.log('🚨 [PROFILE API] Found new session system cookies, fetching from backend');
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
      const token = sidCookie?.value || sessionTokenCookie?.value;
      
      try {
        const response = await fetch(`${API_URL}/api/sessions/current/`, {
          headers: {
            'Authorization': `SessionID ${token}`,
            'Cookie': `session_token=${token}`
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          const sessionData = await response.json();
          console.log('🚨 [PROFILE API] Full backend response:', sessionData);
          
          // Handle nested data structures from backend
          const userData = sessionData.user || sessionData;
          const tenantData = sessionData.tenant || {};
          
          console.log('🚨 [PROFILE API] Backend session data:', {
            email: userData.email || sessionData.email,
            tenantId: userData.tenant_id || sessionData.tenant_id || tenantData.id,
            needsOnboarding: sessionData.needs_onboarding,
            onboardingCompleted: sessionData.onboarding_completed
          });
          
          // Check cookies for additional onboarding status
          const onboardingCompletedCookie = cookieStore.get('onboardingCompleted');
          const onboardingJustCompletedCookie = cookieStore.get('onboarding_just_completed');
          const userTenantIdCookie = cookieStore.get('user_tenant_id');
          
          // Determine final onboarding status
          // Special check: if backend says onboarding_step is 'complete', trust that
          const isBackendComplete = sessionData.onboarding_step === 'complete' || 
                                  sessionData.current_onboarding_step === 'complete';
          
          const hasCompletedOnboarding = (
            onboardingCompletedCookie?.value === 'true' ||
            onboardingJustCompletedCookie?.value === 'true' ||
            sessionData.onboarding_completed === true ||
            sessionData.needs_onboarding === false ||
            isBackendComplete
          );
          
          // Return profile data from backend
          return NextResponse.json({
            authenticated: true,
            email: userData.email || sessionData.email || 'unknown',
            needsOnboarding: hasCompletedOnboarding ? false : (sessionData.needs_onboarding ?? true),
            onboardingCompleted: hasCompletedOnboarding || (sessionData.onboarding_completed ?? false),
            currentStep: sessionData.current_onboarding_step || 'business_info',
            tenantId: userData.tenant_id || sessionData.tenant_id || tenantData.id || userTenantIdCookie?.value,
            tenant_id: userData.tenant_id || sessionData.tenant_id || tenantData.id || userTenantIdCookie?.value,
            businessName: sessionData.business_name || userData.business_name,
            subscriptionPlan: sessionData.subscription_plan || userData.subscription_plan || 'free',
            sessionSource: 'backend-v2'
          }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
        } else {
          console.log('🚨 [PROFILE API] Backend session invalid:', response.status);
        }
      } catch (error) {
        console.error('🚨 [PROFILE API] Error fetching backend session:', error);
      }
    }
    
    console.log('🚨 [PROFILE API] Session cookie exists:', !!sessionCookie);
    console.log('🚨 [PROFILE API] Session cookie size:', sessionCookie?.value?.length || 0, 'bytes');
    
    if (!sessionCookie) {
      console.log('🚨 [PROFILE API] ❌ NO SESSION COOKIE FOUND');
      
      // Check for authorization header as fallback
      const authHeader = request.headers.get('authorization');
      console.log('🚨 [PROFILE API] Authorization header check:', {
        hasAuthHeader: !!authHeader,
        startsWithBearer: authHeader?.startsWith('Bearer '),
        headerLength: authHeader?.length || 0
      });
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('🚨 [PROFILE API] Found authorization header, using token');
        console.log('🚨 [PROFILE API] Token preview:', token.substring(0, 20) + '...');
        
        // Try to decode the token to get user info
        try {
          const base64Payload = token.split('.')[1];
          const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
          console.log('🚨 [PROFILE API] Decoded token payload:', {
            sub: payload.sub,
            email: payload.email,
            exp: payload.exp,
            iat: payload.iat
          });
          
          // Return profile data based on token
          return NextResponse.json({
            authenticated: true,
            source: 'authorization-header',
            email: payload.email,
            sub: payload.sub,
            needsOnboarding: true, // Default to true since we can't check backend
            onboardingCompleted: false,
            currentStep: 'business_info'
          }, { status: 200 });
        } catch (decodeError) {
          console.error('🚨 [PROFILE API] Error decoding token:', decodeError);
        }
      }
      
      console.log('🚨 [PROFILE API] Returning null response (no session/auth)');
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
      // Try to decrypt first (new format)
      try {
        const decrypted = decrypt(sessionCookie.value);
        sessionData = JSON.parse(decrypted);
        console.log('🚨 [PROFILE API] ✅ Session cookie decrypted successfully');
      } catch (decryptError) {
        // Fallback to old base64 format for backward compatibility
        console.warn('🚨 [PROFILE API] Using legacy base64 format');
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        console.log('🚨 [PROFILE API] ✅ Session cookie parsed successfully (legacy format)');
      }
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
      // Don't make assumptions - use the actual session values
      needsOnboarding: user.needsOnboarding !== false, // Default to true unless explicitly false
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
    
    // CRITICAL: Check if we have a recent onboarding completion indicator
    const onboardingCompletedCookie = cookieStore.get('onboardingCompleted');
    const onboardingJustCompletedCookie = cookieStore.get('onboarding_just_completed');
    const userTenantIdCookie = cookieStore.get('user_tenant_id');
    
    if (onboardingCompletedCookie?.value === 'true' || onboardingJustCompletedCookie?.value === 'true') {
      console.log('🚨 [PROFILE API] Found onboarding completion cookie, user just completed onboarding');
      console.log('🚨 [PROFILE API] - onboardingCompleted:', onboardingCompletedCookie?.value);
      console.log('🚨 [PROFILE API] - onboarding_just_completed:', onboardingJustCompletedCookie?.value);
      console.log('🚨 [PROFILE API] - user_tenant_id:', userTenantIdCookie?.value);
      
      // Override session data with completion status
      profileData.needsOnboarding = false;
      profileData.onboardingCompleted = true;
      profileData.currentStep = 'complete';
      
      if (userTenantIdCookie) {
        profileData.tenantId = userTenantIdCookie.value;
        profileData.tenant_id = userTenantIdCookie.value;
      }
      
      // Also get subscription plan from cookies if available
      const subscriptionPlanCookie = cookieStore.get('subscriptionPlan');
      if (subscriptionPlanCookie) {
        profileData.subscriptionPlan = subscriptionPlanCookie.value;
      }
    }
    
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
          
          // Special debug logging for kdeng@dottapps.com
          if (user.email === 'kdeng@dottapps.com') {
            console.log('🚨 [PROFILE API] KDENG DEBUG - Full backend response:', JSON.stringify(backendUser, null, 2));
            console.log('🚨 [PROFILE API] KDENG DEBUG - Onboarding decision factors:', {
              backend_needs_onboarding: backendUser.needs_onboarding,
              backend_onboarding_completed: backendUser.onboarding_completed,
              backend_setup_done: backendUser.setup_done,
              backend_onboarding_status: backendUser.onboarding_status,
              has_tenant: !!backendUser.tenant_id,
              onboarding_progress_status: onboardingProgress?.onboarding_status,
              onboarding_progress_completed: onboardingProgress?.setup_completed,
              payment_completed: onboardingProgress?.payment_completed,
              completed_steps: onboardingProgress?.completed_steps
            });
          }
          
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
          
          // CRITICAL FIX: More comprehensive backend completion check
          const hasCompletedOnboarding = (
            backendUser.onboarding_status === 'complete' ||
            backendUser.current_step === 'complete' ||
            backendUser.setup_done === true ||
            backendUser.onboarding_completed === true ||
            backendUser.setup_completed === true ||
            (backendUser.onboarding && (
              backendUser.onboarding.onboardingCompleted === true ||
              backendUser.onboarding.needsOnboarding === false ||
              backendUser.onboarding.currentStep === 'complete'
            )) ||
            (backendTenantId && (
              backendUser.onboarding_completed === true || 
              backendUser.onboarding_status === 'complete' ||
              backendUser.setup_done === true
            ))
          );
          
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
            
            // Onboarding status: Trust backend data as source of truth
            needsOnboarding: backendUser ? backendUser.needs_onboarding : profileData.needsOnboarding,
            onboardingCompleted: backendUser ? backendUser.onboarding_completed : profileData.onboardingCompleted,
            currentStep: backendUser ? (backendUser.current_onboarding_step || backendUser.current_step || 'business_info') : profileData.currentStep,
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
    
    // Ensure we're not overriding backend status
    // Backend is the source of truth for onboarding status
    
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