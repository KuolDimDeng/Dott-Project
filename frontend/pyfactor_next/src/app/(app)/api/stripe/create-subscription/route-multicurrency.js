import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { logger } from '@/utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Base prices in USD (in cents)
const BASE_PRICES = {
  professional: {
    monthly: 1500,  // $15.00
    yearly: 29000,  // $290.00
  },
  enterprise: {
    monthly: 4500,  // $45.00
    yearly: 43200,  // $432.00 (20% discount)
  },
};

// Currency conversion rates (you might want to fetch these dynamically)
const CURRENCY_MULTIPLIERS = {
  USD: 1,
  EUR: 0.95,  // Approximate
  GBP: 0.82,  // Approximate
  CAD: 1.35,  // Approximate
  AUD: 1.55,  // Approximate
  // Add more currencies as needed
};

// Get product ID based on plan
const PRODUCT_IDS = {
  professional: process.env.STRIPE_PRODUCT_PROFESSIONAL || 'prod_professional',
  enterprise: process.env.STRIPE_PRODUCT_ENTERPRISE || 'prod_enterprise',
};

export async function POST(request) {
  try {
    const { plan, billingCycle, email, userId, currency = 'USD', discountCode } = await request.json();

    if (!plan || !billingCycle || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate currency
    const selectedCurrency = currency.toUpperCase();
    if (!CURRENCY_MULTIPLIERS[selectedCurrency]) {
      return NextResponse.json(
        { error: 'Unsupported currency' },
        { status: 400 }
      );
    }

    // Calculate price in selected currency
    const basePrice = BASE_PRICES[plan]?.[billingCycle];
    if (!basePrice) {
      return NextResponse.json(
        { error: 'Invalid plan or billing cycle' },
        { status: 400 }
      );
    }

    const currencyMultiplier = CURRENCY_MULTIPLIERS[selectedCurrency];
    const localPrice = Math.round(basePrice * currencyMultiplier);

    // Create or retrieve customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      });
    }

    // Create a price dynamically for the selected currency
    const price = await stripe.prices.create({
      unit_amount: localPrice,
      currency: selectedCurrency.toLowerCase(),
      product: PRODUCT_IDS[plan],
      recurring: {
        interval: billingCycle === 'monthly' ? 'month' : 'year',
      },
      metadata: {
        plan,
        billingCycle,
        baseCurrency: 'USD',
        basePrice: basePrice.toString(),
      },
    });

    // Prepare subscription options
    const subscriptionOptions = {
      customer: customer.id,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        plan,
        billingCycle,
        userId,
        currency: selectedCurrency,
      },
    };

    // Apply discount if provided
    if (discountCode) {
      try {
        // Validate the coupon exists
        const coupon = await stripe.coupons.retrieve(discountCode);
        if (coupon && coupon.valid) {
          subscriptionOptions.discounts = [{ coupon: discountCode }];
        }
      } catch (error) {
        logger.warn('Invalid discount code:', discountCode);
        // Continue without discount if invalid
      }
    }

    // Create the subscription
    const subscription = await stripe.subscriptions.create(subscriptionOptions);

    // Get the client secret from the payment intent
    const clientSecret = subscription.latest_invoice.payment_intent.client_secret;

    logger.info('Subscription created:', {
      subscriptionId: subscription.id,
      customerId: customer.id,
      plan,
      billingCycle,
      currency: selectedCurrency,
      amount: localPrice,
      discountApplied: !!subscriptionOptions.discounts,
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
      amount: localPrice,
      currency: selectedCurrency,
      displayAmount: `${(localPrice / 100).toFixed(2)} ${selectedCurrency}`,
    });
  } catch (error) {
    logger.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}