import { NextResponse } from 'next/server';

export async function GET() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  // Log for debugging
  console.log('[Stripe Config API] Environment check:');
  console.log('  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', publishableKey ? 'SET' : 'NOT SET');
  console.log('  Runtime environment:', process.env.NODE_ENV);
  console.log('  All NEXT_PUBLIC_ vars:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')));
  
  // Return public Stripe configuration
  // This is safe because the publishable key is meant to be public
  return NextResponse.json({
    publishableKey: publishableKey,
    prices: {
      professionalMonthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
      professionalYearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY,
      enterpriseMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
      enterpriseYearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
    },
    debug: {
      hasKey: !!publishableKey,
      runtime: new Date().toISOString(),
      env: process.env.NODE_ENV
    }
  });
}