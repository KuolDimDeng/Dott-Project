import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { customer_id, payment_method_id } = body;

    if (!payment_method_id) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Find the Stripe customer by metadata
    const customers = await stripe.customers.list({
      limit: 100,
    });

    const stripeCustomer = customers.data.find(
      (customer) => customer.metadata?.dott_customer_id === customer_id?.toString()
    );

    if (!stripeCustomer) {
      return NextResponse.json(
        { error: 'Customer not found in Stripe' },
        { status: 404 }
      );
    }

    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(payment_method_id, {
      customer: stripeCustomer.id,
    });

    // Check if this is the first payment method and set as default
    const allPaymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomer.id,
      type: 'card',
    });

    if (allPaymentMethods.data.length === 1) {
      // Set as default payment method for invoices
      await stripe.customers.update(stripeCustomer.id, {
        invoice_settings: {
          default_payment_method: payment_method_id,
        },
      });
    }

    // Retrieve the payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);

    console.log('[Attach Payment Method] Successfully attached:', {
      customer_id,
      stripe_customer_id: stripeCustomer.id,
      payment_method_id,
      type: paymentMethod.type,
    });

    return NextResponse.json({
      success: true,
      payment_method: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year,
        } : null,
      },
      message: 'Payment method attached successfully',
    });
  } catch (error) {
    console.error('[Attach Payment Method] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to attach payment method' },
      { status: 500 }
    );
  }
}