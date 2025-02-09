import { NextResponse } from 'next/server';
import { getCurrentUser } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { logger } from '@/utils/logger';
import { configureAmplify } from '@/config/amplify';

const CACHE_CONFIG = {
  STALE_TIME: 10000, // 10 seconds
  CACHE_CONTROL: 'public, s-maxage=10, stale-while-revalidate=59'
};

export async function GET(request) {
  try {
    // Ensure Amplify is configured
    configureAmplify();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    logger.debug('Checking onboarding status for user:', user.userId);

    // Fetch status from backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/status`, {
      headers: {
        'Authorization': `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
        'X-Request-ID': crypto.randomUUID()
      },
      next: {
        revalidate: CACHE_CONFIG.STALE_TIME / 1000 // Convert to seconds
      }
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const data = await response.json();

    // Add cache headers
    const apiResponse = NextResponse.json(data);
    apiResponse.headers.set('Cache-Control', CACHE_CONFIG.CACHE_CONTROL);
    return apiResponse;

  } catch (error) {
    logger.error('Onboarding status check failed:', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Ensure Amplify is configured
    configureAmplify();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Force sync with backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/status/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
        'X-Request-ID': crypto.randomUUID()
      }
    });

    if (!response.ok) {
      throw new Error(`Backend sync failed: ${response.status}`);
    }

    const data = await response.json();

    // Clear cache by setting max-age=0
    const apiResponse = NextResponse.json(data);
    apiResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return apiResponse;

  } catch (error) {
    logger.error('Onboarding status sync failed:', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      { error: 'Failed to sync onboarding status' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Ensure Amplify is configured
    configureAmplify();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Clear backend cache
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/status/cache`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
        'X-Request-ID': crypto.randomUUID()
      }
    });

    if (!response.ok) {
      throw new Error(`Cache clear failed: ${response.status}`);
    }

    const apiResponse = NextResponse.json({ status: 'success' });
    apiResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return apiResponse;

  } catch (error) {
    logger.error('Cache clear failed:', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
