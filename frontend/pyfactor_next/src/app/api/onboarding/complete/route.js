import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverUtils';

export async function POST(request) {
  try {
    // Validate session using server utils
    const { tokens, user } = await validateServerSession();

    const accessToken = tokens.accessToken.toString();
    const idToken = tokens.idToken.toString();
    const userId = user.userId;

    // Get user attributes
    const attributes = user.attributes || {};
    const onboardingStatus = attributes['custom:onboarding'] || 'NOT_STARTED';

    // Verify current status is SETUP before proceeding
    if (onboardingStatus !== 'SETUP') {
      logger.error('[Complete] Invalid onboarding status:', {
        currentStatus: onboardingStatus,
        expectedStatus: 'SETUP',
        userId
      });
      return NextResponse.json(
        { error: 'Invalid onboarding status. Must complete setup first.' },
        { status: 400 }
      );
    }

    // Update onboarding status to COMPLETE
    const statusResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Id-Token': idToken,
          'X-User-ID': userId,
          'X-Request-ID': crypto.randomUUID(),
          'X-Onboarding-Status': onboardingStatus
        },
        body: JSON.stringify({
          current_status: onboardingStatus,
          next_status: 'COMPLETE',
          lastStep: 'SETUP',
          userId,
          attributes: {
            'custom:onboarding': 'COMPLETE',
            'custom:setupdone': 'TRUE',
            'custom:updated_at': new Date().toISOString()
          }
        }),
      }
    );

    if (!statusResponse.ok) {
      throw new Error(
        `Failed to update onboarding status: ${statusResponse.status}`
      );
    }

    const statusData = await statusResponse.json();

    // Mark setup as complete in backend
    const completeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/complete/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Id-Token': idToken,
          'X-User-ID': userId,
          'X-Request-ID': crypto.randomUUID(),
          'X-Onboarding-Status': 'COMPLETE'
        },
        body: JSON.stringify({
          userId,
          setupCompleted: true,
          completedAt: new Date().toISOString()
        }),
      }
    );

    if (!completeResponse.ok) {
      throw new Error(
        `Failed to mark setup as complete: ${completeResponse.status}`
      );
    }

    const completeData = await completeResponse.json();

    logger.debug('[Complete] Onboarding completed successfully:', {
      userId,
      statusUpdate: statusData,
      setupComplete: completeData
    });

    // Create response with updated cookies
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    };

    // Create response
    const jsonResponse = NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      nextStep: 'DASHBOARD',
      setupCompleted: true
    });

    // Set cookies in response
    jsonResponse.cookies.set('accessToken', accessToken, cookieOptions);
    jsonResponse.cookies.set('idToken', idToken, cookieOptions);
    jsonResponse.cookies.set('onboardingStep', 'complete', cookieOptions);

    return jsonResponse;

  } catch (error) {
    logger.error('[Complete] Error completing onboarding:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to complete onboarding',
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Validate session using server utils
    const { tokens, user } = await validateServerSession();

    const accessToken = tokens.accessToken.toString();
    const idToken = tokens.idToken.toString();
    const userId = user.userId;

    // Get user attributes
    const attributes = user.attributes || {};
    const onboardingStatus = attributes['custom:onboarding'] || 'NOT_STARTED';
    const setupDone = attributes['custom:setupdone'] === 'TRUE';

    return NextResponse.json({
      success: true,
      isComplete: onboardingStatus === 'COMPLETE' && setupDone,
      currentStatus: onboardingStatus,
      setupDone
    });
  } catch (error) {
    logger.error('[Complete] Error checking completion status:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check completion status',
      },
      { status: 500 }
    );
  }
}