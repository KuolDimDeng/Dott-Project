import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/tenant/business-info
 * Fetches business information for the authenticated user's tenant
 * Updated to use Session V2 architecture
 */
export async function GET(request) {
  try {
    console.log('[Business Info API] Fetching business information');
    
    // Get session ID from cookie (Session V2 uses 'sid')
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      console.log('[Business Info API] No session found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    console.log('[Business Info API] Found session ID, fetching session data...');
    
    // Backend API URL
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
    
    // First, get the current session from backend to get user details
    const sessionResponse = await fetch(`${apiBaseUrl}/api/sessions/current/`, {
      headers: {
        'Authorization': `SessionID ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`
      },
      cache: 'no-store'
    });
    
    if (!sessionResponse.ok) {
      console.log('[Business Info API] Session validation failed:', sessionResponse.status);
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const sessionData = await sessionResponse.json();
    const user = sessionData.user || sessionData;
    const tenantData = sessionData.tenant || {};
    
    console.log('[Business Info API] Session validated, user:', user.email);
    
    // Get tenant ID from session or query params
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || user.tenant_id || tenantData.id;
    
    if (!tenantId) {
      console.log('[Business Info API] No tenant ID found');
      return NextResponse.json({ error: 'No tenant ID found' }, { status: 400 });
    }
    
    console.log('[Business Info API] Fetching business info for tenant:', tenantId);
    
    try {
      // First try to get onboarding data which includes business info
      const onboardingResponse = await fetch(`${apiBaseUrl}/api/onboarding/data/?tenant_id=${tenantId}`, {
        method: 'GET',
        headers: {
          'Authorization': `SessionID ${sessionId.value}`,
          'Cookie': `session_token=${sessionId.value}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      
      if (onboardingResponse.ok) {
        const onboardingData = await onboardingResponse.json();
        console.log('[Business Info API] Found onboarding data:', {
          hasBusinessName: !!onboardingData.business_name,
          hasTenantId: !!onboardingData.tenant_id,
          subscriptionPlan: onboardingData.selected_plan || onboardingData.subscription_plan || onboardingData.subscription_type
        });
        
        let subscriptionPlan = onboardingData.selected_plan || onboardingData.subscription_plan || onboardingData.subscription_type;
        
        // If no subscription plan in onboarding data, try to get from user profile
        if (!subscriptionPlan || subscriptionPlan === 'free') {
          try {
            const profileResponse = await fetch(`${apiBaseUrl}/api/users/me/`, {
              method: 'GET',
              headers: {
                'Authorization': `SessionID ${sessionId.value}`,
                'Cookie': `session_token=${sessionId.value}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              }
            });
            
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              console.log('[Business Info API] Profile data subscription fields:', {
                subscription_plan: profileData.subscription_plan,
                selected_plan: profileData.selected_plan,
                subscription_type: profileData.subscription_type
              });
              subscriptionPlan = profileData.selected_plan || profileData.subscription_plan || profileData.subscription_type || subscriptionPlan || 'free';
            }
          } catch (profileError) {
            console.error('[Business Info API] Error fetching profile for subscription:', profileError);
          }
        }
        
        const businessInfo = {
          businessName: onboardingData.business_name || onboardingData.legal_name || '',
          businessType: onboardingData.business_type || '',
          legalStructure: onboardingData.legal_structure || '',
          country: onboardingData.country || '',
          state: onboardingData.state || '',
          subscriptionPlan: subscriptionPlan || 'free',
          tenantId: tenantId,
          ownerFirstName: onboardingData.owner_first_name || '',
          ownerLastName: onboardingData.owner_last_name || '',
          phoneNumber: onboardingData.phone_number || '',
          address: onboardingData.address || '',
          onboardingCompleted: onboardingData.onboarding_completed || false,
          source: 'backend_onboarding'
        };
        
        console.log('[Business Info API] Final business info with subscription:', {
          businessName: businessInfo.businessName,
          subscriptionPlan: businessInfo.subscriptionPlan
        });
        
        // In Session V2, we don't update client-side cookies
        // All session data is managed server-side
        return NextResponse.json(businessInfo);
      }
    } catch (error) {
      console.error('[Business Info API] Error fetching from backend:', error);
    }
    
    // If backend fetch failed, return session data if available
    if (user.businessName) {
      console.log('[Business Info API] Returning business info from session');
      return NextResponse.json({
        businessName: user.businessName,
        businessType: user.businessType || '',
        subscriptionPlan: user.subscriptionPlan || 'free',
        tenantId: tenantId,
        source: 'session'
      });
    }
    
    console.log('[Business Info API] No business info found');
    return NextResponse.json({
      businessName: '',
      businessType: '',
      subscriptionPlan: 'free',
      tenantId: tenantId,
      source: 'none'
    });
    
  } catch (error) {
    console.error('[Business Info API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}