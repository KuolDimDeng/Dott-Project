import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { customer_id, customer_email, customer_name } = body;

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
        name: customer_name,
        metadata: {
          dott_customer_id: customer_id.toString(),
        },
      });
    }

    // Create a Stripe Checkout Session for setup mode (no payment, just save card)
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: stripeCustomer.id,
      payment_method_types: ['card', 'us_bank_account'],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/customers?setup=success&customer=${customer_id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/customers?setup=cancelled`,
      metadata: {
        customer_id: customer_id.toString(),
        purpose: 'payment_method_setup',
      },
    });

    // Send email with the payment setup link (you can implement email sending here)
    // For now, we'll return the URL for the frontend to display
    
    console.log('[Payment Setup] Created setup link for customer:', {
      customer_id,
      customer_email,
      stripe_customer_id: stripeCustomer.id,
      checkout_session_id: session.id,
      setup_url: session.url,
    });

    return NextResponse.json({
      success: true,
      payment_link_url: session.url,
      checkout_session_id: session.id,
      stripe_customer_id: stripeCustomer.id,
      message: 'Payment setup link created successfully',
    });
  } catch (error) {
    console.error('[Payment Setup] Error creating setup link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment setup link' },
      { status: 500 }
    );
  }
}