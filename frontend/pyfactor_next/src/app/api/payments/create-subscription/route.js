import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    // Get the request body
    const body = await request.json();
    const { paymentMethodId, plan, billingCycle } = body;

    logger.info('[Create Subscription] Request received:', {
      plan,
      billingCycle,
      paymentMethodId: paymentMethodId?.substring(0, 10) + '...'
    });

    // Get auth token from cookies
    const cookies = request.headers.get('cookie') || '';
    const accessToken = cookies
      .split(';')
      .find(c => c.trim().startsWith('access_token='))
      ?.split('=')[1];

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // For now, since the backend endpoint doesn't exist,
    // we'll simulate a successful subscription creation
    // In production, this should call your Django backend
    
    // TODO: Replace this with actual backend call when endpoint is ready
    // const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    // const response = await fetch(`${backendUrl}/payments/create-subscription/`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${accessToken}`
    //   },
    //   body: JSON.stringify({
    //     payment_method_id: paymentMethodId,
    //     plan: plan,
    //     billing_cycle: billingCycle
    //   })
    // });

    // Simulate successful subscription for now
    const subscriptionData = {
      success: true,
      subscription: {
        id: `sub_test_${Date.now()}`,
        status: 'active',
        plan: plan,
        billingCycle: billingCycle,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      message: 'Subscription created successfully (test mode)'
    };

    logger.info('[Create Subscription] Returning test subscription:', subscriptionData);

    // Update session with subscription info
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com'}/api/auth/update-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          subscriptionPlan: plan,
          subscriptionStatus: 'active',
          subscriptionId: subscriptionData.subscription.id
        })
      });
    } catch (error) {
      logger.error('[Create Subscription] Failed to update session:', error);
    }

    return NextResponse.json(subscriptionData);

  } catch (error) {
    logger.error('[Create Subscription] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create subscription',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}