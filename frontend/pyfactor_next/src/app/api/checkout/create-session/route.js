import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

// Initialize Stripe with your secret key (use environment variable in production)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51ODoxjC4RUQfzaQvfxg5vW6ROiYQx8AFhGI4Qng0VqUOYqmfHCxM9kZ7u75GF0fwgixpR7vSbT5AXpMz1OYGcWiR00lGTQRQWF';
const stripe = new Stripe(stripeSecretKey);

// Map of Stripe price IDs for different plans and billing cycles
const PRICE_IDS = {
  professional: {
    monthly: 'price_1ODp08C4RUQfzaQv1KdILW1U',
    yearly: 'price_1ODp08C4RUQfzaQv1AcXLAC7',
  },
  enterprise: {
    monthly: 'price_1ODp2LC4RUQfzaQv5oMDFy7S',
    yearly: 'price_1ODp2LC4RUQfzaQv2O9UaBwD',
  }
};

export async function POST(request) {
  try {
    // Get the current authenticated user
    let user;
    try {
      const session = await fetchAuthSession();
      user = await getCurrentUser();
      
      if (!session || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      logger.debug('User authenticated:', { 
        username: user.username,
        email: user.attributes?.email 
      });
    } catch (authError) {
      logger.error('Failed to authenticate user:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const requestData = await request.json();
    const { 
      planId = 'professional', 
      billingCycle = 'monthly',
      priceId = null // Allow direct price ID to be passed
    } = requestData;
    
    logger.debug('Checkout request data:', { planId, billingCycle, priceId });
    
    // Determine which price ID to use
    let finalPriceId;
    
    if (priceId) {
      // If a specific price ID is provided, use it directly
      finalPriceId = priceId;
      logger.debug('Using provided price ID:', finalPriceId);
    } else {
      // Otherwise, lookup the price ID from our mapping
      const normalizedPlan = planId.toLowerCase();
      const normalizedCycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
      
      if (!PRICE_IDS[normalizedPlan]) {
        return NextResponse.json(
          { error: 'Invalid plan selected' },
          { status: 400 }
        );
      }
      
      finalPriceId = PRICE_IDS[normalizedPlan][normalizedCycle];
      logger.debug('Using mapped price ID:', { 
        plan: normalizedPlan, 
        cycle: normalizedCycle, 
        priceId: finalPriceId 
      });
    }
    
    if (!finalPriceId) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }
    
    // App URL for success/cancel redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000';
    
    // Create Stripe checkout session
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appUrl}/dashboard?subscription_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard?subscription_cancelled=true`,
      customer_email: user.attributes?.email,
      metadata: {
        userId: user.username,
        planId: requestData.planId || 'professional',
        billingCycle: requestData.billingCycle || 'monthly',
        timestamp: new Date().toISOString()
      },
      client_reference_id: user.username,
      allow_promotion_codes: true
    });

    logger.debug('Stripe checkout session created:', {
      sessionId: stripeSession.id,
      userId: user.username,
      priceId: finalPriceId,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      sessionId: stripeSession.id,
      success: true
    });
  } catch (error) {
    logger.error('Failed to create checkout session:', error);
    
    // Check if it's a Stripe API error
    const errorMessage = error.type === 'StripeInvalidRequestError' ? 
      'Invalid payment configuration. Please contact support.' : 
      (error.message || 'Failed to create checkout session');
    
    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: error.statusCode || 500 }
    );
  }
}
