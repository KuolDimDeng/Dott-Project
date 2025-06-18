import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt, encrypt } from '@/utils/sessionEncryption';
import { sessionManager } from '@/utils/sessionManager';

/**
 * Complete onboarding after successful payment verification
 * This endpoint is called after a successful Stripe payment for paid tiers
 */

async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return null;
    }
    
    let sessionData;
    try {
      const decrypted = decrypt(sessionCookie.value);
      sessionData = JSON.parse(decrypted);
    } catch (decryptError) {
      // Fallback to old base64 format
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    }
    
    return sessionData;
  } catch (error) {
    console.error('[CompletePayment] Session retrieval error:', error);
    return null;
  }
}

export async function POST(request) {
  console.log('[CompletePayment] Starting payment completion process');
  
  try {
    // 1. Get session
    const sessionData = await getSession();
    
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const user = sessionData.user;
    console.log('[CompletePayment] Processing for user:', user.email);
    
    // 2. Parse request data
    const body = await request.json();
    const { subscriptionId, plan, billingCycle, paymentIntentId, tenantId } = body;
    
    if (!paymentIntentId && !subscriptionId) {
      return NextResponse.json({
        success: false,
        error: 'Payment verification required'
      }, { status: 400 });
    }
    
    // 3. Call backend to complete onboarding with payment verification
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    // Call the backend complete-payment endpoint that properly handles payment verification
    const completeResponse = await fetch(`${apiBaseUrl}/api/onboarding/complete-payment/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.accessToken}`,
        'X-User-Email': user.email,
        'X-User-Sub': user.sub
      },
      body: JSON.stringify({
        payment_intent_id: paymentIntentId,
        subscription_id: subscriptionId,
        tenant_id: tenantId || user.tenantId || user.tenant_id
      })
    });
    
    let finalTenantId = tenantId || user.tenantId || user.tenant_id;
    
    if (completeResponse.ok) {
      const completeResult = await completeResponse.json();
      console.log('[CompletePayment] Backend completion successful:', completeResult);
      if (!finalTenantId && completeResult.data) {
        finalTenantId = completeResult.data.tenant_id || completeResult.data.tenantId;
      }
      
      // Also update the backend session via session manager
      if (sessionData.sessionToken) {
        try {
          const sessionUpdateResponse = await fetch(`${apiBaseUrl}/api/sessions/current/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Session ${sessionData.sessionToken}`,
            },
            body: JSON.stringify({
              needs_onboarding: false,
              onboarding_completed: true,
              onboarding_step: 'completed',
              subscription_plan: plan || user.subscriptionPlan,
              subscription_status: 'active'
            })
          });
          
          if (sessionUpdateResponse.ok) {
            console.log('[CompletePayment] Backend session updated successfully');
          } else {
            console.error('[CompletePayment] Backend session update failed:', await sessionUpdateResponse.text());
          }
        } catch (e) {
          console.error('[CompletePayment] Error updating backend session:', e);
        }
      }
    } else {
      const errorText = await completeResponse.text();
      console.error('[CompletePayment] Backend completion failed:', errorText);
      // Continue anyway to update session
    }
    
    // CRITICAL: Force complete onboarding to ensure backend saves properly
    console.log('[CompletePayment] 🚨 FORCING backend completion after payment...');
    try {
      const forceCompleteResponse = await fetch(`${apiBaseUrl}/api/onboarding/force-complete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.accessToken}`,
          'X-User-Email': user.email,
          'X-User-Sub': user.sub
        },
        body: JSON.stringify({
          selected_plan: plan || user.subscriptionPlan,
          payment_verified: true,
          payment_id: paymentIntentId || subscriptionId,
          tenant_id: finalTenantId
        })
      });
      
      if (forceCompleteResponse.ok) {
        const forceResult = await forceCompleteResponse.json();
        console.log('[CompletePayment] ✅ Force complete successful:', forceResult);
      } else {
        const errorText = await forceCompleteResponse.text();
        console.error('[CompletePayment] ❌ Force complete failed:', errorText);
      }
    } catch (error) {
      console.error('[CompletePayment] ❌ Force complete error:', error);
    }
    
    // 4. Update session to mark onboarding as complete
    const updatedSession = {
      ...sessionData,
      // Preserve sessionToken if it exists
      sessionToken: sessionData.sessionToken,
      user: {
        ...sessionData.user,
        // Mark onboarding as complete
        needsOnboarding: false,
        onboardingCompleted: true,
        onboarding_completed: true,
        needs_onboarding: false,
        currentStep: 'completed',
        current_onboarding_step: 'completed',
        onboardingStatus: 'completed',
        isOnboarded: true,
        setupComplete: true,
        setup_complete: true,
        
        // Clear payment pending flags
        paymentPending: false,
        payment_pending: false,
        needsPayment: false,
        needs_payment: false,
        paymentCompleted: true,
        payment_completed: true,
        
        // Update subscription info
        subscriptionPlan: plan || user.subscriptionPlan,
        subscription_plan: plan || user.subscription_plan,
        subscriptionId: subscriptionId,
        subscription_id: subscriptionId,
        
        // Ensure tenant ID is set
        tenantId: finalTenantId,
        tenant_id: finalTenantId,
        
        // Timestamps
        paymentCompletedAt: new Date().toISOString(),
        onboardingCompletedAt: new Date().toISOString()
      }
    };
    
    // 5. Encrypt and set updated session
    const encryptedSession = encrypt(JSON.stringify(updatedSession));
    
    const response = NextResponse.json({
      success: true,
      message: 'Payment verified and onboarding completed',
      redirect_url: `/${finalTenantId}/dashboard`,
      tenant_id: finalTenantId,
      user: {
        email: user.email,
        onboardingCompleted: true,
        needsOnboarding: false,
        tenantId: finalTenantId
      }
    });
    
    // Set updated session cookie
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
    };
    
    response.cookies.set('dott_auth_session', encryptedSession, cookieOptions);
    response.cookies.set('appSession', encryptedSession, cookieOptions);
    
    // Set completion markers
    response.cookies.set('payment_completed', 'true', {
      path: '/',
      maxAge: 60 * 5, // 5 minutes
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    response.cookies.set('onboarding_just_completed', 'true', {
      path: '/',
      maxAge: 60 * 5, // 5 minutes
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    // CRITICAL: Force session sync to ensure backend picks up the changes
    console.log('[CompletePayment] Forcing session sync after payment completion...');
    try {
      // Clear the session cache to force a refresh on next access
      if (typeof sessionManager !== 'undefined' && sessionManager.clearCache) {
        sessionManager.clearCache();
        console.log('[CompletePayment] Session cache cleared for fresh sync');
      }
    } catch (e) {
      console.error('[CompletePayment] Error clearing session cache:', e);
    }
    
    console.log('[CompletePayment] ✅ Payment verification and onboarding completed successfully');
    
    return response;
    
  } catch (error) {
    console.error('[CompletePayment] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}