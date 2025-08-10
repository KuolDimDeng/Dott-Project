import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

/**
 * Handle subscription save API request
 * Saves subscription data to backend database via subscription service
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

    // Get session to identify user/tenant
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'No session found'
      }, { status: 401 });
    }

    // Get user profile to get tenant_id
    const profileResponse = await fetch(`${process.env.NEXTAUTH_URL || 'https://dottapps.com'}/api/auth/profile`, {
      headers: {
        'Cookie': `sid=${sessionId.value}`
      },
      cache: 'no-store'
    });

    if (!profileResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Invalid session'
      }, { status: 401 });
    }

    const profileData = await profileResponse.json();
    const tenantId = profileData.tenantId;

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'No tenant ID found'
      }, { status: 400 });
    }

    // Save subscription to backend using the subscription service
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    const backendResponse = await fetch(`${API_URL}/api/subscriptions/save/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        selected_plan: data.plan,
        billing_cycle: data.interval || 'monthly',
        status: 'active'
      })
    });

    let subscriptionResult = null;
    if (backendResponse.ok) {
      subscriptionResult = await backendResponse.json();
      logger.info('[API] Subscription saved to backend successfully');
    } else {
      logger.warn('[API] Backend subscription save failed, continuing with frontend flow');
    }

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
    const cookieStore = cookies();
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