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

    // Get onboarding status
    const statusResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/status`,
      {
        headers: {
          Authorization: `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
          'X-Request-ID': crypto.randomUUID(),
        },
      }
    );

    if (!statusResponse.ok) {
      throw new Error(
        `Failed to fetch onboarding status: ${statusResponse.status}`
      );
    }

    const onboardingStatus = await statusResponse.json();

    // Verify all previous steps are completed
    if (
      !onboardingStatus.business_info_completed ||
      !onboardingStatus.subscription_completed ||
      !onboardingStatus.payment_completed
    ) {
      return NextResponse.json(
        { error: 'Previous steps must be completed first' },
        { status: 400 }
      );
    }

    // Get setup tasks
    const tasksResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/setup/tasks`,
      {
        headers: {
          Authorization: `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
          'X-Request-ID': crypto.randomUUID(),
        },
      }
    );

    if (!tasksResponse.ok) {
      throw new Error(`Failed to fetch setup tasks: ${tasksResponse.status}`);
    }

    const setupTasks = await tasksResponse.json();

    // Verify all tasks are completed
    if (!setupTasks?.every((task) => task.completed)) {
      return NextResponse.json(
        { error: 'All setup tasks must be completed' },
        { status: 400 }
      );
    }

    // Complete setup through backend API
    const completeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/setup/complete`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
          'X-Request-ID': crypto.randomUUID(),
        },
      }
    );

    if (!completeResponse.ok) {
      throw new Error(`Failed to complete setup: ${completeResponse.status}`);
    }

    const data = await completeResponse.json();

    return NextResponse.json({
      message: 'Setup completed successfully',
      onboardingStatus: data.onboardingStatus,
    });
  } catch (error) {
    logger.error('Error completing setup:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to complete setup' },
      { status: 500 }
    );
  }
}
