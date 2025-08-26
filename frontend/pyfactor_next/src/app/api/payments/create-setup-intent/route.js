import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { customer_id, customer_email } = body;

    if (!customer_email) {
      return NextResponse.json(
        { error: 'Customer email is required' },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    let stripeCustomer;
    
    // First, check if customer already exists in Stripe
    const existingCustomers = await stripe.customers.list({
      email: customer_email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      stripeCustomer = existingCustomers.data[0];
    } else {
      // Create new Stripe customer
      stripeCustomer = await stripe.customers.create({
        email: customer_email,
        metadata: {
          dott_customer_id: customer_id?.toString() || '',
        },
      });
    }

    // Create a SetupIntent for saving payment methods
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomer.id,
      payment_method_types: ['card', 'us_bank_account'],
      usage: 'off_session', // Allow charging the customer when they're not present
      metadata: {
        customer_id: customer_id?.toString() || '',
      },
    });

    console.log('[Setup Intent] Created for customer:', {
      customer_id,
      customer_email,
      stripe_customer_id: stripeCustomer.id,
      setup_intent_id: setupIntent.id,
    });

    return NextResponse.json({
      client_secret: setupIntent.client_secret,
      stripe_customer_id: stripeCustomer.id,
    });
  } catch (error) {
    console.error('[Setup Intent] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create setup intent' },
      { status: 500 }
    );
  }
}