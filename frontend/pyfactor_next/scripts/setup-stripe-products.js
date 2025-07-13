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

    const professional6Month = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 7500, // $75.00 (6 months)
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 6,
      },
      metadata: {
        plan_type: 'professional',
        billing_cycle: '6month',
      },
    });
    console.log('✓ Created Professional 6-month price:', professional6Month.id);

    // Create discounted prices for developing countries (50% off)
    const professionalMonthlyDiscounted = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 750, // $7.50 (50% off)
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        plan_type: 'professional',
        billing_cycle: 'monthly',
        discount: '50_percent',
        discount_reason: 'developing_country',
      },
    });
    console.log('✓ Created Professional monthly discounted price:', professionalMonthlyDiscounted.id);

    const professional6MonthDiscounted = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 3750, // $37.50 (6 months, 50% off)
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 6,
      },
      metadata: {
        plan_type: 'professional',
        billing_cycle: '6month',
        discount: '50_percent',
        discount_reason: 'developing_country',
      },
    });
    console.log('✓ Created Professional 6-month discounted price:', professional6MonthDiscounted.id);

    const professionalYearly = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 14400, // $144.00 (20% discount)
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

    const professionalYearlyDiscounted = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 7200, // $72.00 (50% off)
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      metadata: {
        plan_type: 'professional',
        billing_cycle: 'yearly',
        discount: '50_percent',
        discount_reason: 'developing_country',
      },
    });
    console.log('✓ Created Professional yearly discounted price:', professionalYearlyDiscounted.id);

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
      unit_amount: 4500, // $45.00
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

    const enterprise6Month = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 22500, // $225.00 (6 months)
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 6,
      },
      metadata: {
        plan_type: 'enterprise',
        billing_cycle: '6month',
      },
    });
    console.log('✓ Created Enterprise 6-month price:', enterprise6Month.id);

    const enterpriseYearly = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 43200, // $432.00 (20% discount)
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

    // Create discounted Enterprise prices for developing countries (50% off)
    const enterpriseMonthlyDiscounted = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 2250, // $22.50 (50% off)
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        plan_type: 'enterprise',
        billing_cycle: 'monthly',
        discount: '50_percent',
        discount_reason: 'developing_country',
      },
    });
    console.log('✓ Created Enterprise monthly discounted price:', enterpriseMonthlyDiscounted.id);

    const enterprise6MonthDiscounted = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 11250, // $112.50 (6 months, 50% off)
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 6,
      },
      metadata: {
        plan_type: 'enterprise',
        billing_cycle: '6month',
        discount: '50_percent',
        discount_reason: 'developing_country',
      },
    });
    console.log('✓ Created Enterprise 6-month discounted price:', enterprise6MonthDiscounted.id);

    const enterpriseYearlyDiscounted = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 21600, // $216.00 (50% off)
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      metadata: {
        plan_type: 'enterprise',
        billing_cycle: 'yearly',
        discount: '50_percent',
        discount_reason: 'developing_country',
      },
    });
    console.log('✓ Created Enterprise yearly discounted price:', enterpriseYearlyDiscounted.id);

    console.log('\n✅ Setup complete! Add these price IDs to your .env file:\n');
    console.log('# Regular prices');
    console.log(`STRIPE_PRICE_PROFESSIONAL_MONTHLY=${professionalMonthly.id}`);
    console.log(`STRIPE_PRICE_PROFESSIONAL_6MONTH=${professional6Month.id}`);
    console.log(`STRIPE_PRICE_PROFESSIONAL_YEARLY=${professionalYearly.id}`);
    console.log(`STRIPE_PRICE_ENTERPRISE_MONTHLY=${enterpriseMonthly.id}`);
    console.log(`STRIPE_PRICE_ENTERPRISE_6MONTH=${enterprise6Month.id}`);
    console.log(`STRIPE_PRICE_ENTERPRISE_YEARLY=${enterpriseYearly.id}`);
    console.log('\n# Discounted prices (50% off for developing countries)');
    console.log(`STRIPE_PRICE_PROFESSIONAL_MONTHLY_DISCOUNTED=${professionalMonthlyDiscounted.id}`);
    console.log(`STRIPE_PRICE_PROFESSIONAL_6MONTH_DISCOUNTED=${professional6MonthDiscounted.id}`);
    console.log(`STRIPE_PRICE_PROFESSIONAL_YEARLY_DISCOUNTED=${professionalYearlyDiscounted.id}`);
    console.log(`STRIPE_PRICE_ENTERPRISE_MONTHLY_DISCOUNTED=${enterpriseMonthlyDiscounted.id}`);
    console.log(`STRIPE_PRICE_ENTERPRISE_6MONTH_DISCOUNTED=${enterprise6MonthDiscounted.id}`);
    console.log(`STRIPE_PRICE_ENTERPRISE_YEARLY_DISCOUNTED=${enterpriseYearlyDiscounted.id}`);
    console.log('\nAlso make sure you have set up your webhook endpoint in Stripe Dashboard:');
    console.log('Endpoint URL: https://your-domain.com/api/stripe/webhook');
    console.log('Events to listen for: customer.subscription.*, invoice.payment_*');
    
  } catch (error) {
    console.error('Error setting up products:', error);
    process.exit(1);
  }
}

setupProducts();