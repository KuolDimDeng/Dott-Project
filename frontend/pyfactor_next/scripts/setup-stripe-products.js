#!/usr/bin/env node

// This script sets up Stripe products and prices for the subscription plans
// Run this once to create the products in your Stripe account
// Usage: STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe-products.js

const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Please set STRIPE_SECRET_KEY environment variable');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function setupProducts() {
  try {
    console.log('Setting up Stripe products and prices...\n');

    // Create Professional product
    const professionalProduct = await stripe.products.create({
      name: 'Professional Plan',
      description: 'Perfect for growing businesses',
      metadata: {
        plan_type: 'professional',
      },
    });
    console.log('✓ Created Professional product:', professionalProduct.id);

    // Create Professional prices
    const professionalMonthly = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 1500, // $15.00
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        plan_type: 'professional',
        billing_cycle: 'monthly',
      },
    });
    console.log('✓ Created Professional monthly price:', professionalMonthly.id);

    const professionalYearly = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 29000, // $290.00
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      metadata: {
        plan_type: 'professional',
        billing_cycle: 'yearly',
      },
    });
    console.log('✓ Created Professional yearly price:', professionalYearly.id);

    // Create Enterprise product
    const enterpriseProduct = await stripe.products.create({
      name: 'Enterprise Plan',
      description: 'For large organizations with advanced needs',
      metadata: {
        plan_type: 'enterprise',
      },
    });
    console.log('✓ Created Enterprise product:', enterpriseProduct.id);

    // Create Enterprise prices
    const enterpriseMonthly = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 3500, // $35.00
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        plan_type: 'enterprise',
        billing_cycle: 'monthly',
      },
    });
    console.log('✓ Created Enterprise monthly price:', enterpriseMonthly.id);

    const enterpriseYearly = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 99000, // $990.00
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      metadata: {
        plan_type: 'enterprise',
        billing_cycle: 'yearly',
      },
    });
    console.log('✓ Created Enterprise yearly price:', enterpriseYearly.id);

    console.log('\n✅ Setup complete! Add these price IDs to your .env file:\n');
    console.log(`STRIPE_PRICE_PROFESSIONAL_MONTHLY=${professionalMonthly.id}`);
    console.log(`STRIPE_PRICE_PROFESSIONAL_YEARLY=${professionalYearly.id}`);
    console.log(`STRIPE_PRICE_ENTERPRISE_MONTHLY=${enterpriseMonthly.id}`);
    console.log(`STRIPE_PRICE_ENTERPRISE_YEARLY=${enterpriseYearly.id}`);
    console.log('\nAlso make sure you have set up your webhook endpoint in Stripe Dashboard:');
    console.log('Endpoint URL: https://your-domain.com/api/stripe/webhook');
    console.log('Events to listen for: customer.subscription.*, invoice.payment_*');
    
  } catch (error) {
    console.error('Error setting up products:', error);
    process.exit(1);
  }
}

setupProducts();