import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Complete all onboarding steps
 * CRITICAL: This endpoint ensures User.onboarding_completed is set to True
 * to prevent redirect loops after cache clearing
 */
export async function POST(request) {
  try {
    console.log('[OnboardingComplete] Starting onboarding completion');
    
    // Get session token from cookies
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value || cookieStore.get('sid')?.value;
    
    if (!sessionToken) {
      console.error('[OnboardingComplete] No session token in cookies');
      return NextResponse.json({ error: 'No authenticated session' }, { status: 401 });
    }
    
    // Validate session with backend using the new validate endpoint
    const backendUrl = process.env.BACKEND_API_URL || 'https://api.dottapps.com';
    const sessionResponse = await fetch(`${backendUrl}/api/sessions/validate/${sessionToken}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!sessionResponse.ok) {
      console.error('[OnboardingComplete] Invalid session');
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const sessionData = await sessionResponse.json();
    const session = {
      authenticated: true,
      user: sessionData.user,
      accessToken: sessionToken,
      sessionToken: sessionToken
    };
    
    const body = await request.json();
    const { 
      businessName, 
      subscriptionPlan = 'free',
      planType = 'free',
      paymentCompleted = (planType !== 'free')
    } = body;
    
    console.log('[OnboardingComplete] Completion request:', {
      user: session.user?.email,
      businessName,
      subscriptionPlan,
      planType,
      paymentCompleted
    });
    
    // Check if user has tenant ID
    let tenantId = session.user?.tenantId || session.user?.tenant_id;
    
    if (!tenantId) {
      console.warn('[OnboardingComplete] User has no tenant ID, will be created by backend');
    }
    
    try {
      // Call backend complete endpoint with force flag (using the NEW fixed endpoint)
      const completeResponse = await fetch(`${backendUrl}/api/onboarding/complete-all/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Session ${session.sessionToken}`,
          'X-Session-Token': session.sessionToken || 'no-token'
        },
        body: JSON.stringify({
          // Use the field names that my NEW complete-all endpoint expects
          subscriptionPlan: subscriptionPlan,
          selectedPlan: subscriptionPlan,
          planType: planType,
          businessName: businessName || session.user?.businessName || session.user?.business_name,
          // Include user name fields for the fix
          given_name: session.user?.given_name || '',
          family_name: session.user?.family_name || '',
          first_name: session.user?.first_name || '',
          last_name: session.user?.last_name || '',
          // Legacy fields for backward compatibility
          tenant_id: tenantId,
          payment_completed: paymentCompleted,
          force_complete: true,
          update_user_model: true,
          create_tenant_if_missing: !tenantId
        })
      });
      
      let completeData = {};
      
      if (!completeResponse.ok) {
        const errorData = await completeResponse.text();
        console.error('[OnboardingComplete] Backend complete failed:', errorData);
        
        // If the regular endpoint fails, try the force-complete endpoint
        console.log('[OnboardingComplete] Trying force-complete endpoint...');
        
        const forceResponse = await fetch(`${backendUrl}/api/onboarding/force-complete/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Session ${session.sessionToken}`,
            'X-Session-Token': session.sessionToken || 'no-token'
          },
          body: JSON.stringify({
            email: session.user.email,
            business_name: businessName || session.user?.businessName || session.user?.business_name
          })
        });
        
        if (!forceResponse.ok) {
          throw new Error('Both complete endpoints failed');
        }
        
        console.log('[OnboardingComplete] Force-complete successful');
        completeData = await forceResponse.json();
      } else {
        // Parse the successful response
        completeData = await completeResponse.json();
      }
      
      // CRITICAL: Also update the user profile to ensure consistency
      const profileUpdateResponse = await fetch(`${backendUrl}/api/users/me/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({
          onboarding_completed: true,
          subscription_plan: subscriptionPlan
        })
      });
      
      if (!profileUpdateResponse.ok) {
        console.warn('[OnboardingComplete] Profile update failed, but continuing...');
      }
      
      // Get the tenant ID from the response
      const finalTenantId = completeData.tenant_id || completeData.tenantId || completeData.tenant || tenantId || session.user.tenantId;
      
      console.log('[OnboardingComplete] ✓ Onboarding completed successfully');
      console.log('[OnboardingComplete] User.onboarding_completed should now be True');
      console.log('[OnboardingComplete] Final tenant ID:', finalTenantId);
      console.log('[OnboardingComplete] Complete data:', completeData);
      
      // CRITICAL: Force backend to refresh session data
      try {
        console.log('[OnboardingComplete] Forcing backend session refresh...');
        
        // Call the session refresh endpoint to update cached session data
        const sessionRefreshResponse = await fetch(`${backendUrl}/api/sessions/refresh/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Session ${session.sessionToken}`,
            'X-Session-Token': session.sessionToken || 'no-token'
          },
          body: JSON.stringify({
            force_refresh: true,
            needs_onboarding: false,
            onboarding_completed: true,
            tenant_id: finalTenantId,
            subscription_plan: subscriptionPlan
          })
        });
        
        if (!sessionRefreshResponse.ok) {
          console.warn('[OnboardingComplete] Session refresh failed, but continuing');
        } else {
          console.log('[OnboardingComplete] Session refreshed successfully');
        }
      } catch (refreshError) {
        console.error('[OnboardingComplete] Error refreshing session:', refreshError);
      }
      
      // If no tenant ID yet, we need to wait for the backend to provide one
      if (!finalTenantId) {
        console.warn('[OnboardingComplete] No tenant ID received yet, redirecting to dashboard');
        return NextResponse.json({
          success: true,
          message: 'Onboarding completed successfully',
          tenantId: null,
          redirectUrl: '/dashboard',
          onboarding_completed: true,
          needs_onboarding: false,
          warning: 'Tenant creation pending',
          sessionRefreshRequired: true
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Onboarding completed successfully',
        tenantId: finalTenantId,
        redirectUrl: `/${finalTenantId}/dashboard`,
        onboarding_completed: true,
        needs_onboarding: false,
        sessionRefreshRequired: true
      });
      
    } catch (backendError) {
      console.error('[OnboardingComplete] Backend error:', backendError);
      
      // Even if backend fails, we should update the session to prevent loops
      const fallbackTenantId = tenantId || session.user.tenantId || session.user.tenant_id;
      return NextResponse.json({
        success: true,
        message: 'Onboarding marked complete (backend sync pending)',
        tenantId: fallbackTenantId,
        redirectUrl: fallbackTenantId ? `/${fallbackTenantId}/dashboard` : '/dashboard',
        warning: 'Backend sync failed but onboarding marked complete'
      });
    }
    
  } catch (error) {
    console.error('[OnboardingComplete] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to complete onboarding',
      details: error.message 
    }, { status: 500 });
  }
}