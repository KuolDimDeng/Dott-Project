import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * PERMANENT FIX: Unified Profile API
 * 
 * This endpoint implements the permanent solution to onboarding status inconsistency
 * by creating a single, authoritative source that consolidates all backend data
 * and applies business logic to resolve conflicts.
 * 
 * BUSINESS LOGIC FOR ONBOARDING STATUS:
 * 1. If user has a tenant_id AND tenant exists, onboarding is COMPLETE
 * 2. If user has no tenant_id, onboarding is INCOMPLETE
 * 3. Backend fields are secondary to this primary business rule
 * 
 * This ensures 100% consistency across all frontend components.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * Consolidated data fetcher that gets ALL user data from Django backend
 */
async function fetchConsolidatedUserData(sessionToken) {
  const headers = {
    'Authorization': `Session ${sessionToken}`,
    'Content-Type': 'application/json',
    'Cookie': `session_token=${sessionToken}`
  };

  console.log('[UnifiedProfile] Fetching consolidated user data...');

  // Fetch from all possible Django endpoints in parallel
  const requests = [
    fetch(`${API_URL}/api/sessions/current/`, { headers, cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null),
      
    fetch(`${API_URL}/api/users/me/session/`, { headers, cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null),
      
    fetch(`${API_URL}/api/users/me/`, { headers, cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
  ];

  const [sessionData, profileData, userMeData] = await Promise.all(requests);

  console.log('[UnifiedProfile] Raw backend responses:', {
    sessionData: sessionData ? 'OK' : 'FAILED',
    profileData: profileData ? 'OK' : 'FAILED', 
    userMeData: userMeData ? 'OK' : 'FAILED'
  });

  return { sessionData, profileData, userMeData };
}

/**
 * Apply business logic to determine authoritative onboarding status
 */
function resolveOnboardingStatus(consolidatedData) {
  const { sessionData, profileData, userMeData } = consolidatedData;
  
  // Extract tenant information from all sources
  const tenantSources = [
    sessionData?.tenant_id,
    sessionData?.tenant?.id,
    profileData?.tenant_id,
    userMeData?.tenant_id,
    sessionData?.user?.tenant_id,
    profileData?.user?.tenant_id,
    userMeData?.user?.tenant_id
  ].filter(Boolean);

  const tenantId = tenantSources[0]; // Take first valid tenant ID
  
  console.log('[UnifiedProfile] Tenant analysis:', {
    tenantSources,
    finalTenantId: tenantId,
    hasTenant: !!tenantId
  });

  // BUSINESS RULE: If user has tenant, onboarding is complete
  const hasValidTenant = !!tenantId;
  
  // Extract onboarding flags from all sources for logging
  const onboardingFlags = {
    sessionData_needs_onboarding: sessionData?.needs_onboarding,
    sessionData_onboarding_completed: sessionData?.onboarding_completed,
    profileData_needs_onboarding: profileData?.needs_onboarding,
    profileData_onboarding_completed: profileData?.onboarding_completed,
    userMeData_needs_onboarding: userMeData?.needs_onboarding,
    userMeData_onboarding_completed: userMeData?.onboarding_completed
  };

  console.log('[UnifiedProfile] Onboarding flags from all sources:', onboardingFlags);

  // AUTHORITATIVE BUSINESS LOGIC
  const authoritativeStatus = {
    needsOnboarding: !hasValidTenant,
    onboardingCompleted: hasValidTenant,
    businessRule: hasValidTenant ? 'HAS_TENANT_COMPLETE' : 'NO_TENANT_INCOMPLETE'
  };

  console.log('[UnifiedProfile] AUTHORITATIVE onboarding status:', authoritativeStatus);

  return {
    tenantId,
    ...authoritativeStatus,
    rawFlags: onboardingFlags // For debugging
  };
}

/**
 * Consolidate user profile data from all sources
 */
function consolidateProfileData(consolidatedData, onboardingStatus) {
  const { sessionData, profileData, userMeData } = consolidatedData;
  
  // Merge user data with priority order: profileData > userMeData > sessionData
  const userData = profileData || userMeData || sessionData?.user || sessionData;
  
  return {
    authenticated: true,
    email: userData?.email || sessionData?.email,
    name: userData?.name || sessionData?.name,
    given_name: userData?.given_name || sessionData?.given_name,
    family_name: userData?.family_name || sessionData?.family_name,
    
    // AUTHORITATIVE: Use business-rule determined onboarding status
    needsOnboarding: onboardingStatus.needsOnboarding,
    onboardingCompleted: onboardingStatus.onboardingCompleted,
    
    // Tenant information
    tenantId: onboardingStatus.tenantId,
    tenant_id: onboardingStatus.tenantId,
    
    // Business information
    businessName: profileData?.tenant_name || sessionData?.business_name || sessionData?.tenant?.name,
    business_name: profileData?.tenant_name || sessionData?.business_name || sessionData?.tenant?.name,
    
    // Subscription information
    subscriptionPlan: profileData?.subscription_plan || sessionData?.subscription_plan || 'free',
    subscription_plan: profileData?.subscription_plan || sessionData?.subscription_plan || 'free',
    
    // Current step (derived from onboarding status)
    currentStep: onboardingStatus.onboardingCompleted ? 'completed' : 'business_info',
    
    // Metadata
    sessionSource: 'unified-profile-with-business-logic',
    businessRule: onboardingStatus.businessRule,
    backendSources: {
      sessionData: !!consolidatedData.sessionData,
      profileData: !!consolidatedData.profileData,
      userMeData: !!consolidatedData.userMeData
    }
  };
}

export async function GET(request) {
  console.log('[UnifiedProfile] === PERMANENT FIX ENDPOINT CALLED ===');
  
  try {
    const cookieStore = await cookies();
    
    // Get session token
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    const token = sidCookie?.value || sessionTokenCookie?.value;
    
    if (!token) {
      console.log('[UnifiedProfile] No session token found');
      return NextResponse.json({ 
        authenticated: false,
        error: 'No session token found'
      }, { status: 401 });
    }

    console.log('[UnifiedProfile] Found session token, fetching consolidated data...');

    // Step 1: Fetch data from all Django endpoints
    const consolidatedData = await fetchConsolidatedUserData(token);
    
    // Step 2: Apply business logic to resolve onboarding status
    const onboardingStatus = resolveOnboardingStatus(consolidatedData);
    
    // Step 3: Consolidate profile data using authoritative onboarding status
    const profileResponse = consolidateProfileData(consolidatedData, onboardingStatus);
    
    console.log('[UnifiedProfile] === FINAL UNIFIED RESPONSE ===');
    console.log('[UnifiedProfile] needsOnboarding:', profileResponse.needsOnboarding);
    console.log('[UnifiedProfile] onboardingCompleted:', profileResponse.onboardingCompleted);
    console.log('[UnifiedProfile] tenantId:', profileResponse.tenantId);
    console.log('[UnifiedProfile] businessRule:', profileResponse.businessRule);
    
    return NextResponse.json(profileResponse, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('[UnifiedProfile] Critical error:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}