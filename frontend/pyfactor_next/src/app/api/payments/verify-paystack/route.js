import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';
import { safeJsonParse } from '@/utils/responseParser';
import { checkRateLimit, rateLimitResponse } from '@/middleware/rateLimit';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = 'https://api.paystack.co';

/**
 * Verifies Paystack payment and updates user subscription
 * POST /api/payments/verify-paystack
 * Body: { reference: string }
 */
export async function POST(request) {
  // Check rate limit
  const rateLimitResult = checkRateLimit(request, 'payment');
  if (rateLimitResult.limited) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    // Get session
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid') || cookieStore.get('session_token');
    
    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { reference } = body;
    
    if (!reference) {
      return NextResponse.json({ 
        error: 'Payment reference is required' 
      }, { status: 400 });
    }

    logger.info('[PaystackVerify] === START ===', {
      reference,
      hasSecretKey: !!PAYSTACK_SECRET_KEY
    });

    // Proxy to backend for secure verification
    logger.info('[PaystackVerify] Proxying to backend for verification');
    
    // Get session data first
    const sessionResponse = await fetch(`${API_URL}/api/auth/session-v2`, {
      headers: {
        'Cookie': cookieStore.toString()
      }
    });
    
    let sessionData = {};
    if (sessionResponse.ok) {
      sessionData = await safeJsonParse(sessionResponse, 'PaystackVerify-Session');
    }
    
    // Call backend verification endpoint
    const backendResponse = await fetch(`${API_URL}/api/payments/verify-paystack/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': sessionData.auth_token ? `Bearer ${sessionData.auth_token}` : '',
        'X-Session-ID': sessionId.value,
        'Cookie': cookieStore.toString()
      },
      body: JSON.stringify({ reference })
    });

    if (!backendResponse.ok) {
      const errorData = await safeJsonParse(backendResponse, 'PaystackVerify-BackendError');
      logger.error('[PaystackVerify] Backend verification error:', {
        status: backendResponse.status,
        error: errorData
      });
      
      return NextResponse.json({ 
        error: errorData.message || errorData.error || 'Payment verification failed',
        details: errorData
      }, { status: backendResponse.status });
    }

    const verificationResult = await safeJsonParse(backendResponse, 'PaystackVerify-BackendSuccess');
    logger.info('[PaystackVerify] Backend verification response:', {
      status: verificationResult.status,
      hasTransaction: !!verificationResult.transaction,
      hasSubscription: !!verificationResult.subscription
    });

    // Check if payment was successful
    if (verificationResult.status !== 'success') {
      logger.warn('[PaystackVerify] Payment verification failed:', verificationResult);
      
      return NextResponse.json({ 
        error: verificationResult.message || 'Payment verification failed',
        payment_status: verificationResult.status
      }, { status: 400 });
    }

    // Extract payment details from backend response
    const paymentData = verificationResult.transaction || {};
    const subscriptionData = verificationResult.subscription || {};
    
    // Get plan and billing cycle from subscription data
    let plan = subscriptionData.plan_type || subscriptionData.plan || 'professional';
    let billingCycle = subscriptionData.billing_cycle || 'monthly';
    
    // Check if we have the required subscription information
    if (!plan || !billingCycle) {
      // Try to extract from other possible locations
      const possiblePlan = paymentData.plan || paymentData.subscription_plan;
      const possibleBillingCycle = paymentData.billing_cycle || paymentData.interval;
      
      if (!possiblePlan || !possibleBillingCycle) {
        logger.error('[PaystackVerify] Missing subscription metadata:', {
          metadata,
          paymentData: {
            plan: paymentData.plan,
            subscription_plan: paymentData.subscription_plan,
            interval: paymentData.interval
          },
          reference
        });
        
        return NextResponse.json({ 
          error: 'Invalid payment metadata. Please ensure payment includes subscription details.' 
        }, { status: 400 });
      }
      
      // Use the extracted values
      plan = possiblePlan;
      billingCycle = possibleBillingCycle;
    }

    logger.info('[PaystackVerify] Subscription details from backend:', {
      plan,
      billingCycle,
      amount: paymentData.amount,
      currency: paymentData.currency
    });

    // Return success response with backend data
    return NextResponse.json({
      success: true,
      message: verificationResult.message || 'Payment verified successfully',
      plan: plan,
      billing_cycle: billingCycle,
      subscription: subscriptionData,
      payment: {
        reference: paymentData.reference,
        amount: paymentData.amount,
        currency: paymentData.currency,
        paid_at: paymentData.paid_at,
        channel: paymentData.channel
      }
    });

  } catch (error) {
    logger.error('[PaystackVerify] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to verify payment' 
    }, { status: 500 });
  }
}