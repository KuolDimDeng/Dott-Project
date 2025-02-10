import { NextResponse } from 'next/server';
import { getCurrentUser } from 'aws-amplify/auth';
import { configureAmplify } from '@/config/amplify';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    // Ensure Amplify is configured
    configureAmplify();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the request body
    const subscriptionData = await request.json();

    // Create subscription through backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
          'X-Request-ID': crypto.randomUUID(),
        },
        body: JSON.stringify({
          ...subscriptionData,
          status: 'pending', // Will be updated to 'active' after payment
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const subscription = await response.json();

    // Update user attributes with subscription info
    const { updateUserAttributes, getSubscriptionAttributes } = await import(
      '@/utils/userAttributes'
    );
    const subscriptionAttributes = getSubscriptionAttributes(
      subscriptionData.planId
    );

    await updateUserAttributes(subscriptionAttributes);

    // Update onboarding status
    const statusResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
          'X-Request-ID': crypto.randomUUID(),
        },
        body: JSON.stringify({
          status: 'PAYMENT',
          lastStep: 'SUBSCRIPTION',
        }),
      }
    );

    if (!statusResponse.ok) {
      throw new Error(
        `Failed to update onboarding status: ${statusResponse.status}`
      );
    }

    return NextResponse.json({
      success: true,
      subscription,
      message: 'Subscription created successfully',
    });
  } catch (error) {
    logger.error('Error creating subscription:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create subscription',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Ensure Amplify is configured
    configureAmplify();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get subscription data through backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/current`,
      {
        headers: {
          Authorization: `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
          'X-Request-ID': crypto.randomUUID(),
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const subscription = response.status === 404 ? null : await response.json();

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error) {
    logger.error('Error fetching subscription:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch subscription',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Ensure Amplify is configured
    configureAmplify();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the request body
    const updates = await request.json();

    // Update subscription through backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/current`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
          'X-Request-ID': crypto.randomUUID(),
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const subscription = await response.json();

    return NextResponse.json({
      success: true,
      subscription,
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    logger.error('Error updating subscription:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update subscription',
      },
      { status: 500 }
    );
  }
}
