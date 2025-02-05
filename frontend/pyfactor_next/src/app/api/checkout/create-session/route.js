import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Auth } from 'aws-amplify';
import { logger } from '@/utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    // Get the current authenticated user from Amplify
    const session = await Auth.currentSession();
    const user = await Auth.currentAuthenticatedUser();

    if (!session || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { priceId } = await request.json();

    // Create Stripe checkout session
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/setup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/subscription`,
      customer_email: user.attributes.email,
      metadata: {
        userId: user.username,
        plan: 'professional'
      },
    });

    logger.debug('Stripe checkout session created:', {
      sessionId: stripeSession.id,
      userId: user.username,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ sessionId: stripeSession.id });
  } catch (error) {
    logger.error('Failed to create checkout session:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
