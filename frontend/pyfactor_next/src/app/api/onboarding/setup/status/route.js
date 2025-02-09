import { NextResponse } from 'next/server';
import { getCurrentUser } from 'aws-amplify/auth';
import { configureAmplify } from '@/config/amplify';
import { logger } from '@/utils/logger';

export async function GET(request) {
  try {
    // Ensure Amplify is configured
    configureAmplify();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get onboarding and setup status through backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/setup/status`,
      {
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

    return NextResponse.json({
      onboardingStatus: data.onboardingStatus,
      setupTasks: data.setupTasks || [],
    });
  } catch (error) {
    logger.error('Error fetching setup status:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch setup status' },
      { status: 500 }
    );
  }
}
