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
    
    // Use the profile API to get session data (same as other APIs)
    const profileResponse = await fetch(`${process.env.NEXTAUTH_URL || 'https://dottapps.com'}/api/auth/profile`, {
      headers: {
        'Cookie': `sid=${sessionId.value}; session_token=${sessionId.value}`
      },
      cache: 'no-store'
    });
    
    if (!profileResponse.ok) {
      console.log('[Business Info API] Session validation failed:', profileResponse.status);
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const profileData = await profileResponse.json();
    const user = profileData.user || profileData;
    const tenantData = { id: profileData.tenantId, name: profileData.businessName };
    
    console.log('[Business Info API] Session validated, user:', profileData.email);
    console.log('[Business Info API] Profile data:', {
      tenantId: profileData.tenantId,
      businessName: profileData.businessName,
      subscriptionPlan: profileData.subscriptionPlan,
      hasBusinessName: !!profileData.businessName
    });
    
    // Get tenant ID from session or query params
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || profileData.tenantId;
    
    if (!tenantId) {
      console.log('[Business Info API] No tenant ID found');
      return NextResponse.json({ error: 'No tenant ID found' }, { status: 400 });
    }
    
    console.log('[Business Info API] Using tenant ID:', tenantId);
    
    // If we already have business name from profile, use it as fallback
    if (profileData.businessName) {
      console.log('[Business Info API] Found business name in profile:', profileData.businessName);
      return NextResponse.json({
        businessName: profileData.businessName,
        businessType: '',
        subscriptionPlan: profileData.subscriptionPlan || 'free',
        tenantId: tenantId,
        source: 'profile'
      });
    }
    
    try {
      // First try to get onboarding data which includes business info
      const onboardingResponse = await fetch(`${apiBaseUrl}/api/onboarding/data/?tenant_id=${tenantId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Session ${sessionId.value}`,
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
            const profileResponse = await fetch(`${apiBaseUrl}/api/auth/profile`, {
              method: 'GET',
              headers: {
                'Authorization': `Session ${sessionId.value}`,
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
          businessName: onboardingData.business_name || onboardingData.legal_name || tenantData.name || '',
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
    if (user.businessName || tenantData.name) {
      console.log('[Business Info API] Returning business info from session');
      return NextResponse.json({
        businessName: user.businessName || tenantData.name || '',
        businessType: user.businessType || '',
        subscriptionPlan: user.subscriptionPlan || sessionData.subscription_plan || 'free',
        tenantId: tenantId,
        source: 'session'
      });
    }
    
    console.log('[Business Info API] No business info found');
    return NextResponse.json({
      businessName: tenantData.name || '',
      businessType: '',
      subscriptionPlan: sessionData.subscription_plan || 'free',
      tenantId: tenantId,
      source: 'none'
    });
    
  } catch (error) {
    console.error('[Business Info API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}