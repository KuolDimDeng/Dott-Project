#!/usr/bin/env node

/**
 * Script to create new Enterprise prices in Stripe
 * Run this to create new $45/month and $432/year prices
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createNewEnterprisePrices() {
  try {
    console.log('Creating new Enterprise prices in Stripe...\n');

    // First, find the Enterprise product
    const products = await stripe.products.list({
      limit: 100,
    });

    const enterpriseProduct = products.data.find(
      p => p.name === 'Enterprise Plan' || p.name === 'Dott Enterprise'
    );

    if (!enterpriseProduct) {
      throw new Error('Enterprise product not found. Please create it first.');
    }

    console.log(`Found Enterprise product: ${enterpriseProduct.id}\n`);

    // Create new monthly price ($45)
    console.log('Creating Enterprise monthly price ($45/month)...');
    const enterpriseMonthly = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 4500, // $45.00 in cents
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
    console.log('  Amount: $45.00/month\n');

    // Create new yearly price ($432)
    console.log('Creating Enterprise yearly price ($432/year)...');
    const enterpriseYearly = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 43200, // $432.00 in cents (20% discount)
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
    console.log('  Amount: $432.00/year (20% discount)\n');

    console.log('\n========================================');
    console.log('NEW STRIPE PRICE IDs (Update in Render):');
    console.log('========================================');
    console.log(`STRIPE_PRICE_ENTERPRISE_MONTHLY=${enterpriseMonthly.id}`);
    console.log(`STRIPE_PRICE_ENTERPRISE_YEARLY=${enterpriseYearly.id}`);
    console.log('\n');

    console.log('Next steps:');
    console.log('1. Copy the price IDs above');
    console.log('2. Go to Render dashboard');
    console.log('3. Update the environment variables');
    console.log('4. Redeploy the service');
    console.log('\n');

    // Optionally archive old prices
    console.log('Would you like to archive the old prices? (Recommended)');
    console.log('Old monthly: price_1RZMDhFls6i75mQB9kMjeKtx');
    console.log('Old yearly: price_1RZMDiFls6i75mQBqQwHnERW');
    console.log('\nRun with --archive flag to archive old prices');

    if (process.argv.includes('--archive')) {
      console.log('\nArchiving old prices...');
      
      try {
        await stripe.prices.update('price_1RZMDhFls6i75mQB9kMjeKtx', {
          active: false,
        });
        console.log('✓ Archived old monthly price');
      } catch (e) {
        console.log('⚠ Could not archive old monthly price:', e.message);
      }

      try {
        await stripe.prices.update('price_1RZMDiFls6i75mQBqQwHnERW', {
          active: false,
        });
        console.log('✓ Archived old yearly price');
      } catch (e) {
        console.log('⚠ Could not archive old yearly price:', e.message);
      }
    }

  } catch (error) {
    console.error('Error creating prices:', error.message);
    process.exit(1);
  }
}

// Run the script
createNewEnterprisePrices();