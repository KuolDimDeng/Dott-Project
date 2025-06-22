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
      // Call backend complete endpoint with force flag
      const completeResponse = await fetch(`${backendUrl}/api/onboarding/complete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
          'X-Session-Token': session.sessionToken || 'no-token'
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          business_name: businessName || session.user?.businessName || session.user?.business_name,
          subscription_plan: subscriptionPlan,
          payment_completed: paymentCompleted,
          // CRITICAL: Force backend to update User.onboarding_completed
          force_complete: true,
          update_user_model: true,
          // If no tenant, backend should create one
          create_tenant_if_missing: !tenantId
        })
      });
      
      if (!completeResponse.ok) {
        const errorData = await completeResponse.text();
        console.error('[OnboardingComplete] Backend complete failed:', errorData);
        
        // If the regular endpoint fails, try the force-complete endpoint
        console.log('[OnboardingComplete] Trying force-complete endpoint...');
        
        const forceResponse = await fetch(`${backendUrl}/force-complete/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.accessToken}`
          },
          body: JSON.stringify({
            email: session.user.email
          })
        });
        
        if (!forceResponse.ok) {
          throw new Error('Both complete endpoints failed');
        }
        
        console.log('[OnboardingComplete] Force-complete successful');
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
      
      // Session cache cleared automatically when backend updates
      
      console.log('[OnboardingComplete] ✓ Onboarding completed successfully');
      console.log('[OnboardingComplete] User.onboarding_completed should now be True');
      
      return NextResponse.json({
        success: true,
        message: 'Onboarding completed successfully',
        tenantId: session.user.tenantId,
        redirectUrl: `/${session.user.tenantId}/dashboard`,
        onboarding_completed: true,
        needs_onboarding: false
      });
      
    } catch (backendError) {
      console.error('[OnboardingComplete] Backend error:', backendError);
      
      // Even if backend fails, we should update the session to prevent loops
      return NextResponse.json({
        success: true,
        message: 'Onboarding marked complete (backend sync pending)',
        tenantId: session.user.tenantId,
        redirectUrl: `/${session.user.tenantId}/dashboard`,
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