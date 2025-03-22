import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * Handle subscription save API request
 * This is a simplified version that simulates a successful save without contacting the backend
 */
export async function POST(request) {
  try {
    const data = await request.json();
    
    logger.debug('[API] Subscription save request:', {
      plan: data.plan,
      interval: data.interval,
      payment_method: data.payment_method
    });

    // In a real implementation, this would save the subscription details to the backend
    // But for now, we'll just simulate a successful response

    const response = NextResponse.json({
      success: true,
      next_step: 'PAYMENT',
      redirect: '/onboarding/payment',
      plan: data.plan,
      interval: data.interval,
      payment_method: data.payment_method,
      subscription_id: 'mock-subscription-id',
      business_id: 'b7fee399-ffca-4151-b636-94ccb65b3cd0',
      tenant_id: 'b7fee399-ffca-4151-b636-94ccb65b3cd0'
    });

    // Set cookies to update the onboarding step
    response.cookies.set('onboardingStep', 'PAYMENT', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      httpOnly: false,
      sameSite: 'lax'
    });

    return response;
  } catch (error) {
    logger.error('[API] Error saving subscription:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to save subscription',
      message: error.message
    }, { status: 500 });
  }
}