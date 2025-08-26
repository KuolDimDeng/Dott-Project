import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { customer_id, bank_token, account_type } = body;

    if (!bank_token) {
      return NextResponse.json(
        { error: 'Bank token is required' },
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

    // Create a bank account source for the customer
    const source = await stripe.customers.createSource(stripeCustomer.id, {
      source: bank_token,
    });

    // For ACH payments, we need to verify the bank account
    // This typically involves micro-deposits that the customer needs to verify
    // You can initiate verification here
    await stripe.customers.verifySource(stripeCustomer.id, source.id, {
      amounts: [32, 45], // In production, don't include this - let Stripe handle the amounts
    });

    console.log('[Attach Bank Account] Successfully attached:', {
      customer_id,
      stripe_customer_id: stripeCustomer.id,
      source_id: source.id,
      account_type,
      last4: source.last4,
    });

    return NextResponse.json({
      success: true,
      bank_account: {
        id: source.id,
        type: 'bank_account',
        bank_name: source.bank_name,
        last4: source.last4,
        account_holder_name: source.account_holder_name,
        account_type,
        status: source.status,
        verification_status: 'pending', // Will need micro-deposit verification
      },
      message: 'Bank account added. Please check your bank statement for two small deposits to verify the account.',
      requires_verification: true,
    });
  } catch (error) {
    console.error('[Attach Bank Account] Error:', error);
    
    // Handle specific Stripe errors
    if (error.code === 'bank_account_exists') {
      return NextResponse.json(
        { error: 'This bank account is already attached to the customer.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to attach bank account' },
      { status: 500 }
    );
  }
}