import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Return the Stripe publishable key
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.error('[Stripe Config API] No publishable key found in environment');
      return NextResponse.json(
        { error: 'Stripe configuration not found' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      publishableKey: publishableKey
    });
    
  } catch (error) {
    console.error('[Stripe Config API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get Stripe configuration' },
      { status: 500 }
    );
  }
}