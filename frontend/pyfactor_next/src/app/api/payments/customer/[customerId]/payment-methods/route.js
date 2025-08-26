import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function GET(request, { params }) {
  try {
    const customerId = params.customerId;
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Find Stripe customer by metadata
    const customers = await stripe.customers.list({
      limit: 100,
    });

    const stripeCustomer = customers.data.find(
      (customer) => customer.metadata?.dott_customer_id === customerId.toString()
    );

    if (!stripeCustomer) {
      // No Stripe customer found, return empty payment methods
      return NextResponse.json({
        payment_methods: [],
        message: 'No payment methods found',
      });
    }

    // Fetch payment methods for the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomer.id,
      type: 'card',
    });

    // Fetch bank accounts
    const bankAccounts = await stripe.paymentMethods.list({
      customer: stripeCustomer.id,
      type: 'us_bank_account',
    });

    // Format payment methods for frontend
    const formattedMethods = [
      ...paymentMethods.data.map((method) => ({
        id: method.id,
        type: 'card',
        brand: method.card.brand,
        last4: method.card.last4,
        exp_month: method.card.exp_month,
        exp_year: method.card.exp_year,
        is_default: stripeCustomer.invoice_settings?.default_payment_method === method.id,
      })),
      ...bankAccounts.data.map((method) => ({
        id: method.id,
        type: 'bank_account',
        bank_name: method.us_bank_account.bank_name,
        last4: method.us_bank_account.last4,
        account_type: method.us_bank_account.account_type,
        is_default: stripeCustomer.invoice_settings?.default_payment_method === method.id,
      })),
    ];

    return NextResponse.json({
      payment_methods: formattedMethods,
      stripe_customer_id: stripeCustomer.id,
      default_payment_method: stripeCustomer.invoice_settings?.default_payment_method,
    });
  } catch (error) {
    console.error('[Payment Methods] Error fetching payment methods:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}