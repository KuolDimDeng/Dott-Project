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

    const completionTimestamp = new Date().toISOString();

    // Update user attributes for completion
    const { updateUserAttributes } = await import('@/utils/userAttributes');
    const completionAttributes = {
      'custom:onboarding': 'COMPLETE',
      'custom:acctstatus': 'active',
      'custom:lastlogin': completionTimestamp,
    };

    await updateUserAttributes(completionAttributes);

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
          status: 'COMPLETE',
          lastStep: 'SETUP',
        }),
      }
    );

    if (!statusResponse.ok) {
      throw new Error(
        `Failed to update onboarding status: ${statusResponse.status}`
      );
    }

    // Verify all required attributes are present
    const { getCurrentUser: getUser } = await import('aws-amplify/auth');
    const updatedUser = await getUser();
    const userAttributes = updatedUser.signInUserSession.idToken.payload;

    const requiredAttributes = [
      'custom:onboarding',
      'custom:businessid',
      'custom:subplan',
      'custom:userrole',
      'custom:acctstatus',
      'custom:preferences',
    ];

    const missingAttributes = requiredAttributes.filter(
      (attr) => !userAttributes[attr]
    );

    if (missingAttributes.length > 0) {
      logger.error('Missing required attributes after completion:', {
        missingAttributes,
        userId: user.userId,
      });
      throw new Error('Missing required attributes after completion');
    }

    // Notify backend of completion
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/setup/complete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
          'X-Request-ID': crypto.randomUUID(),
        },
        body: JSON.stringify({
          attributes: {
            onboarding: userAttributes['custom:onboarding'],
            businessId: userAttributes['custom:businessid'],
            subplan: userAttributes['custom:subplan'],
            userrole: userAttributes['custom:userrole'],
            acctstatus: userAttributes['custom:acctstatus'],
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    logger.info('Onboarding completed successfully', {
      userId: user.userId,
      timestamp: completionTimestamp,
      attributes: {
        onboarding: userAttributes['custom:onboarding'],
        businessId: userAttributes['custom:businessid'],
        subplan: userAttributes['custom:subplan'],
        userrole: userAttributes['custom:userrole'],
        acctstatus: userAttributes['custom:acctstatus'],
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Setup completed successfully',
    });
  } catch (error) {
    logger.error('Failed to complete setup:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to complete setup process' },
      { status: error.response?.status || 500 }
    );
  }
}
