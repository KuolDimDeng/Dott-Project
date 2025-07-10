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
    const cookieStore = await cookies();
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

    // Verify payment with Paystack
    if (!PAYSTACK_SECRET_KEY) {
      logger.error('[PaystackVerify] Missing Paystack secret key');
      return NextResponse.json({ 
        error: 'Payment configuration error' 
      }, { status: 500 });
    }

    // Call Paystack verification API
    const paystackResponse = await fetch(`${PAYSTACK_API_URL}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!paystackResponse.ok) {
      const errorData = await safeJsonParse(paystackResponse, 'PaystackVerify-PaystackError');
      logger.error('[PaystackVerify] Paystack API error:', {
        status: paystackResponse.status,
        error: errorData
      });
      
      return NextResponse.json({ 
        error: errorData.message || 'Payment verification failed' 
      }, { status: paystackResponse.status });
    }

    const paystackData = await safeJsonParse(paystackResponse, 'PaystackVerify-PaystackSuccess');
    logger.info('[PaystackVerify] Paystack response:', {
      status: paystackData.status,
      data: {
        status: paystackData.data?.status,
        amount: paystackData.data?.amount,
        currency: paystackData.data?.currency,
        reference: paystackData.data?.reference
      }
    });

    // Check if payment was successful
    if (!paystackData.status || paystackData.data?.status !== 'success') {
      logger.warn('[PaystackVerify] Payment not successful:', {
        status: paystackData.data?.status,
        reference
      });
      
      return NextResponse.json({ 
        error: 'Payment was not successful',
        payment_status: paystackData.data?.status
      }, { status: 400 });
    }

    // Extract payment details
    const paymentData = paystackData.data;
    const metadata = paymentData.metadata || {};
    
    // Get plan and billing cycle from metadata
    let plan = metadata.plan || metadata.subscription_plan || metadata.subscription_type;
    let billingCycle = metadata.billing_cycle || metadata.billingCycle || metadata.billing_period;
    
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

    logger.info('[PaystackVerify] Processing subscription update:', {
      plan,
      billingCycle,
      amount: paymentData.amount,
      currency: paymentData.currency,
      email: paymentData.customer?.email
    });

    // Update subscription in backend
    // First, try to create/update the subscription
    const backendResponse = await fetch(`${API_URL}/api/payments/create-subscription/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sessionId.value}`,
        'X-Request-ID': crypto.randomUUID()
      },
      body: JSON.stringify({
        payment_method_id: `paystack_${reference}`, // Use Paystack reference as payment method ID
        plan: plan.toLowerCase(),
        billing_cycle: billingCycle.toLowerCase(),
        // Include payment verification data
        payment_verified: true,
        payment_data: {
          provider: 'paystack',
          reference: paymentData.reference,
          transaction_id: paymentData.id,
          amount: paymentData.amount / 100, // Convert from kobo/cents to main unit
          currency: paymentData.currency,
          customer_email: paymentData.customer?.email,
          paid_at: paymentData.paid_at,
          channel: paymentData.channel,
          fees: paymentData.fees,
          status: 'success'
        }
      })
    });

    if (!backendResponse.ok) {
      const errorData = await safeJsonParse(backendResponse, 'PaystackVerify-BackendError');
      logger.error('[PaystackVerify] Backend update error:', {
        status: backendResponse.status,
        error: errorData
      });
      
      // Payment was successful but subscription update failed
      // This is critical - we should log this for manual intervention
      logger.error('[PaystackVerify] CRITICAL: Payment successful but subscription update failed', {
        reference,
        paystack_transaction_id: paymentData.id,
        amount: paymentData.amount,
        plan,
        billingCycle
      });
      
      return NextResponse.json({ 
        error: 'Payment successful but subscription update failed. Please contact support.',
        payment_reference: reference,
        requires_support: true
      }, { status: 500 });
    }

    const result = await safeJsonParse(backendResponse, 'PaystackVerify-BackendSuccess');
    logger.info('[PaystackVerify] Subscription updated successfully:', {
      subscription_id: result.subscription?.id,
      status: result.subscription?.status
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Payment verified and subscription activated successfully',
      subscription: result.subscription,
      payment: {
        reference: paymentData.reference,
        amount: paymentData.amount / 100,
        currency: paymentData.currency,
        paid_at: paymentData.paid_at
      }
    });

  } catch (error) {
    logger.error('[PaystackVerify] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to verify payment' 
    }, { status: 500 });
  }
}