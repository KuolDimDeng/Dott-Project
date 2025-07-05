import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { logger } from '@/utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request) {
  try {
    const { plan, billingCycle, email, userId } = await request.json();

    // Get the price ID for the selected plan
    const priceId = process.env[`STRIPE_PRICE_${plan.toUpperCase()}_${billingCycle.toUpperCase()}`];
    
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan or billing cycle' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Enable automatic tax calculation and currency conversion
      automatic_tax: {
        enabled: true,
      },
      // Customer email
      customer_email: email,
      // Enable promotional codes
      allow_promotion_codes: true,
      // Success and cancel URLs
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/payment/cancel`,
      // Metadata
      metadata: {
        userId,
        plan,
        billingCycle,
      },
      // This enables currency presentment - Stripe will show prices in customer's local currency
      currency_options: {
        // Stripe automatically detects and converts to customer's currency
      },
      // Subscription data
      subscription_data: {
        metadata: {
          userId,
          plan,
          billingCycle,
        },
      },
    });

    logger.info('Checkout session created:', {
      sessionId: session.id,
      plan,
      billingCycle,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}