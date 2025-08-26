import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { customer_id, customer_email, payment_data } = body;

    if (!customer_email || !payment_data) {
      return NextResponse.json(
        { error: 'Customer email and payment data are required' },
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
          dott_customer_id: customer_id.toString(),
        },
      });
    }

    let paymentMethod;

    if (payment_data.type === 'card') {
      // For card payments, create a payment method and attach it
      // Note: In production, you should use Stripe Elements or Payment Element
      // to securely collect card details. This is for demonstration purposes.
      
      // Create a test token (in production, this would come from Stripe.js)
      const token = await stripe.tokens.create({
        card: {
          number: payment_data.card_number,
          exp_month: payment_data.exp_month,
          exp_year: payment_data.exp_year,
          cvc: payment_data.cvc,
          name: payment_data.cardholder_name,
        },
      });

      // Create payment method from token
      paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          token: token.id,
        },
      });

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: stripeCustomer.id,
      });

    } else if (payment_data.type === 'bank') {
      // For bank accounts, create ACH payment method
      // Note: In production, you should verify bank account with microdeposits
      
      // Create a bank account token
      const token = await stripe.tokens.create({
        bank_account: {
          country: 'US',
          currency: 'usd',
          account_holder_name: payment_data.account_holder_name,
          account_holder_type: 'individual',
          routing_number: payment_data.routing_number,
          account_number: payment_data.account_number,
        },
      });

      // Create a bank account source
      const source = await stripe.customers.createSource(stripeCustomer.id, {
        source: token.id,
      });

      // For ACH, we need to verify the bank account (in production)
      // This would typically involve microdeposits
      
      paymentMethod = {
        id: source.id,
        type: 'bank_account',
        bank_account: {
          bank_name: source.bank_name,
          last4: source.last4,
          account_holder_name: payment_data.account_holder_name,
        },
      };
    }

    // Set as default payment method if it's the first one
    const allPaymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomer.id,
    });

    if (allPaymentMethods.data.length === 1 && payment_data.type === 'card') {
      await stripe.customers.update(stripeCustomer.id, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });
    }

    console.log('[Add Payment Method] Successfully added payment method:', {
      customer_id,
      customer_email,
      stripe_customer_id: stripeCustomer.id,
      payment_method_id: paymentMethod.id,
      type: payment_data.type,
    });

    return NextResponse.json({
      success: true,
      payment_method: paymentMethod,
      stripe_customer_id: stripeCustomer.id,
      message: 'Payment method added successfully',
    });
  } catch (error) {
    console.error('[Add Payment Method] Error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: 'Card was declined. Please check your card details.' },
        { status: 400 }
      );
    }
    
    if (error.code === 'incorrect_number') {
      return NextResponse.json(
        { error: 'Invalid card number. Please check and try again.' },
        { status: 400 }
      );
    }
    
    if (error.code === 'invalid_expiry_month' || error.code === 'invalid_expiry_year') {
      return NextResponse.json(
        { error: 'Invalid expiry date. Please check and try again.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to add payment method' },
      { status: 500 }
    );
  }
}