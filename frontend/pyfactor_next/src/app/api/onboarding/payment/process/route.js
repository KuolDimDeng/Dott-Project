import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * Handle payment processing API request
 * This is a simplified version that simulates a successful payment without contacting Stripe
 */
export async function POST(request) {
  try {
    const data = await request.json();
    
    logger.debug('[API] Payment processing request:', {
      amount: data.amount,
      currency: data.currency,
      paymentMethod: data.paymentMethod,
      plan: data.plan
    });

    // In a real implementation, this would process the payment through Stripe
    // But for now, we'll just simulate a successful response
    
    const response = NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      redirect: '/dashboard',
      payment_id: 'mock-payment-id',
      subscription_id: data.subscriptionId || 'mock-subscription-id',
      tenant_id: 'b7fee399-ffca-4151-b636-94ccb65b3cd0'
    });

    // Set cookies to update the onboarding step
    response.cookies.set('onboardingStep', 'SETUP', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      httpOnly: false,
      sameSite: 'lax'
    });
    
    response.cookies.set('onboardedStatus', 'SUBSCRIPTION', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      httpOnly: false,
      sameSite: 'lax'
    });

    return response;
  } catch (error) {
    logger.error('[API] Error processing payment:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process payment',
      message: error.message
    }, { status: 500 });
  }
} 