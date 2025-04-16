import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { logger } from '@/utils/logger';
import { getAuth } from '@/lib/auth';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Constants for pricing
const PLAN_PRICES = {
  professional: {
    monthly: 1500, // $15.00
    annual: 15000, // $150.00
  },
  enterprise: {
    monthly: 4500, // $45.00
    annual: 45000, // $450.00
  }
};

/**
 * Create a payment intent for subscription payment
 */
export async function POST(request) {
  const requestId = Date.now().toString(36);

  try {
    logger.debug(`[CreatePaymentIntent:${requestId}] Processing payment intent request`);

    // Get auth context for the current user
    const auth = await getAuth();
    if (!auth?.user?.sub) {
      logger.error(`[CreatePaymentIntent:${requestId}] No authenticated user found`);
      return NextResponse.json({
        success: false,
        error: 'unauthorized',
        message: 'Authentication required'
      }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { plan, billingCycle } = body;
    
    // Validate input
    if (!plan || !billingCycle) {
      logger.error(`[CreatePaymentIntent:${requestId}] Invalid request data`, { plan, billingCycle });
      return NextResponse.json({
        success: false,
        error: 'invalid_request',
        message: 'Plan and billing cycle are required'
      }, { status: 400 });
    }
    
    // Verify plan is valid
    if (!PLAN_PRICES[plan]) {
      logger.error(`[CreatePaymentIntent:${requestId}] Invalid plan: ${plan}`);
      return NextResponse.json({
        success: false,
        error: 'invalid_plan',
        message: 'Invalid subscription plan'
      }, { status: 400 });
    }
    
    // Get price amount based on plan and billing cycle
    const amount = PLAN_PRICES[plan][billingCycle] || 0;
    if (!amount) {
      logger.error(`[CreatePaymentIntent:${requestId}] Invalid billing cycle: ${billingCycle}`);
      return NextResponse.json({
        success: false,
        error: 'invalid_billing_cycle',
        message: 'Invalid billing cycle'
      }, { status: 400 });
    }
    
    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        userId: auth.user.sub,
        plan,
        billingCycle,
        requestId
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    logger.info(`[CreatePaymentIntent:${requestId}] Created payment intent: ${paymentIntent.id}`);
    
    // Return client secret for processing
    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount,
    });
  } catch (error) {
    logger.error(`[CreatePaymentIntent:${requestId}] Payment intent error:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'payment_intent_error',
      message: 'Error creating payment intent',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
} 