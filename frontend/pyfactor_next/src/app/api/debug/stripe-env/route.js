import { NextResponse } from 'next/server';

export async function GET() {
  // Debug endpoint to check Stripe environment variables
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  return NextResponse.json({
    hasStripeKey: !!stripeKey,
    keyLength: stripeKey?.length || 0,
    keyPrefix: stripeKey ? stripeKey.substring(0, 7) : 'NOT_SET',
    nodeEnv: process.env.NODE_ENV,
    allStripeEnvVars: Object.keys(process.env)
      .filter(key => key.includes('STRIPE'))
      .reduce((acc, key) => ({
        ...acc,
        [key]: process.env[key] ? `${process.env[key].substring(0, 15)}...` : 'undefined'
      }), {}),
    allPublicEnvVars: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .map(key => ({
        key,
        hasValue: !!process.env[key],
        valueLength: process.env[key]?.length || 0
      })),
    timestamp: new Date().toISOString()
  });
}