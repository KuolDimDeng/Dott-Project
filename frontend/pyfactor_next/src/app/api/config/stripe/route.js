import { NextResponse } from 'next/server';

export async function GET() {
  // Return public Stripe configuration
  // This is safe because the publishable key is meant to be public
  return NextResponse.json({
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    prices: {
      professionalMonthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
      professionalYearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY,
      enterpriseMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
      enterpriseYearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
    }
  });
}