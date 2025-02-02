import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/options';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DOMAIN = process.env.NEXT_PUBLIC_APP_URL;

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { tier } = data;

    // Set price ID based on tier
    const priceId = tier === 'pro' ? 
      process.env.STRIPE_PRO_PRICE_ID :
      process.env.STRIPE_BASIC_PRICE_ID;

    // Create Stripe checkout session
    const stripeSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${DOMAIN}/onboarding/setup`,
      cancel_url: `${DOMAIN}/onboarding/subscription`,
      metadata: {
        userId: session.user.id,
        tier: tier
      }
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.error('Stripe checkout session creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
