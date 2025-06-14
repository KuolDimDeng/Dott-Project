import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    // Get user email from request
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

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

    // Call backend API to reset onboarding
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/admin/reset-user-onboarding/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('[Admin] Failed to reset onboarding:', error);
      return NextResponse.json(
        { error: 'Failed to reset onboarding' },
        { status: response.status }
      );
    }

    const result = await response.json();
    logger.info('[Admin] Successfully reset onboarding for:', email);

    return NextResponse.json({
      success: true,
      message: `Onboarding reset for ${email}. User will be redirected to onboarding on next login.`,
      ...result
    });

  } catch (error) {
    logger.error('[Admin] Reset onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}