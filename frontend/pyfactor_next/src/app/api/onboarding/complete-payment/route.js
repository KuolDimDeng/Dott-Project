import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { subscriptionId, plan, billingCycle, paymentIntentId } = await request.json();

    // Get the auth token from cookies
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Decode the token to get user info
    let user;
    try {
      const decoded = jwt.decode(token);
      user = decoded;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Update the backend with subscription details
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding/update-subscription/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: user.sub,
        subscription_plan: plan,
        billing_cycle: billingCycle,
        stripe_subscription_id: subscriptionId,
        stripe_payment_intent_id: paymentIntentId,
        payment_completed: true,
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
      }),
    });

    if (!backendResponse.ok) {
      logger.error('Error updating subscription data in backend');
      throw new Error('Failed to update subscription data');
    }

    logger.info('Payment completed and onboarding updated:', {
      userId: user.id,
      subscriptionId,
      plan,
      billingCycle,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment completed successfully',
    });
  } catch (error) {
    logger.error('Error completing payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete payment' },
      { status: 500 }
    );
  }
}