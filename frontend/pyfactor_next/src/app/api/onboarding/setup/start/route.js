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

    // Start setup process through backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/setup/start`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
          'X-Request-ID': crypto.randomUUID(),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const data = await response.json();

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
          setup_started: true,
          current_step: 'setup',
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
      message: 'Setup process started successfully',
      ...data,
    });
  } catch (error) {
    logger.error('Error starting setup process:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to start setup process',
      },
      { status: 500 }
    );
  }
}
