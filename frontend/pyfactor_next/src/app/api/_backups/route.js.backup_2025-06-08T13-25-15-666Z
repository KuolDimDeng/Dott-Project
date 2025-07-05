import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

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
      payment_method: data.payment_method,
      business_name: data.business_name,
      business_type: data.business_type
    });

    // In a real implementation, this would save the subscription details to the backend
    // But for now, we'll just simulate a successful response

    const response = NextResponse.json({
      success: true,
      next_step: data.plan === 'free' ? 'SETUP' : 'PAYMENT',
      redirect: data.plan === 'free' ? '/dashboard' : '/onboarding/payment',
      plan: data.plan,
      interval: data.interval,
      payment_method: data.payment_method,
      subscription_id: 'mock-subscription-id',
      business_id: 'b7fee399-ffca-4151-b636-94ccb65b3cd0',
      tenant_id: 'b7fee399-ffca-4151-b636-94ccb65b3cd0',
      business_name: data.business_name,
      business_type: data.business_type
    });

    // Set cookies to update the onboarding step
    const cookieStore = await cookies();
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 7); // 1 week
    
    // Set cookies for the subscription plan and interval
    response.cookies.set('subscriptionPlan', data.plan, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      httpOnly: false,
      sameSite: 'lax'
    });
    
    response.cookies.set('subscriptionInterval', data.interval || 'monthly', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      httpOnly: false,
      sameSite: 'lax'
    });
    
    // Set cookies for business info
    if (data.business_name) {
      response.cookies.set('businessName', data.business_name, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        httpOnly: false,
        sameSite: 'lax'
      });
    }
    
    if (data.business_type) {
      response.cookies.set('businessType', data.business_type, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        httpOnly: false,
        sameSite: 'lax'
      });
    }
    
    // Set the onboarding step
    response.cookies.set('onboardingStep', data.plan === 'free' ? 'SETUP' : 'PAYMENT', {
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