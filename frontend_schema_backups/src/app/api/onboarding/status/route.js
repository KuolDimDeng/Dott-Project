///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/onboarding/status/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * GET /api/onboarding/status
 * Retrieves the current onboarding status from Cognito user attributes
 */
const VALID_ONBOARDING_STATES = [
  'NOT_STARTED',
  'BUSINESS_INFO',
  'SUBSCRIPTION',
  'PAYMENT',
  'SETUP',
  'COMPLETE',
];

/**
 * Validates onboarding state transition
 * @param {string} currentState - Current onboarding state
 * @param {string} newState - Requested new state
 * @returns {boolean} Whether the transition is valid
 */
const isValidStateTransition = (currentState, newState) => {
  const currentIndex = VALID_ONBOARDING_STATES.indexOf(currentState);
  const newIndex = VALID_ONBOARDING_STATES.indexOf(newState);

  // Allow moving to any previous step or the next step
  return newIndex <= currentIndex + 1;
};

/**
 * GET /api/onboarding/status
 * Retrieves the current onboarding status from Cognito user attributes
 */
export async function GET(request) {
  try {
    // Get auth tokens from request headers
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const idToken = request.headers.get('X-Id-Token');
    
    if (!accessToken || !idToken) {
      logger.error('[OnboardingStatus] No auth tokens in request headers');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user attributes from Cognito with retry logic
    let retryCount = 0;
    let userData = null;

    while (retryCount < 3) {
      try {
        const response = await fetch(
          'https://cognito-idp.us-east-1.amazonaws.com/',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-amz-json-1.1',
              'X-Amz-Target': 'AWSCognitoIdentityProviderService.GetUser',
              'Authorization': `Bearer ${accessToken}`,
              'X-Session-ID': idToken
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch user attributes: ${response.status}`
          );
        }

        userData = await response.json();
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === 3) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retryCount))
        );
      }
    }

    const onboardingStatus =
      userData.UserAttributes.find((attr) => attr.Name === 'custom:onboarding')
        ?.Value || 'NOT_STARTED';

    const lastStep =
      userData.UserAttributes.find((attr) => attr.Name === 'custom:lastStep')
        ?.Value || onboardingStatus;

    const completedAt =
      userData.UserAttributes.find(
        (attr) => attr.Name === 'custom:onboardingCompletedAt'
      )?.Value || null;

    // Validate status consistency
    if (!VALID_ONBOARDING_STATES.includes(onboardingStatus)) {
      logger.error('Invalid onboarding status detected:', { onboardingStatus });
      return NextResponse.json(
        { error: 'Invalid onboarding status' },
        { status: 500 }
      );
    }

    logger.debug('Onboarding status retrieved:', {
      status: onboardingStatus,
      lastStep,
      completedAt,
    });

    // Check if user has completed onboarding
    const setupDone = userData.UserAttributes.find(
      (attr) => attr.Name === 'custom:setupdone'
    )?.Value === 'TRUE';
    
    const businessId = userData.UserAttributes.find(
      (attr) => attr.Name === 'custom:businessid'
    )?.Value;
    
    // Consider onboarding complete if:
    // 1. Status is COMPLETE
    // 2. completedAt is set
    // 3. setupDone is TRUE
    // 4. businessId exists (indicating business info was completed)
    const setup_completed =
      onboardingStatus === 'COMPLETE' ||
      completedAt !== null ||
      setupDone ||
      (businessId && onboardingStatus !== 'NOT_STARTED');
    
    return NextResponse.json({
      status: onboardingStatus,
      lastStep,
      completedAt,
      setup_completed,
      businessId,
      setupDone
    });
  } catch (error) {
    logger.error('Error fetching onboarding status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch onboarding status',
        details: error.message,
      },
      { status: error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/**
 * POST /api/onboarding/status
 * Updates the onboarding status in Cognito user attributes
 */
/**
 * POST /api/onboarding/status
 * Updates the onboarding status in Cognito user attributes with atomic operations
 */
export async function POST(request) {
  try {
    // Get auth tokens from request headers
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const idToken = request.headers.get('X-Id-Token');
    
    if (!accessToken || !idToken) {
      logger.error('[OnboardingStatus] No auth tokens in request headers');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status, lastStep } = await request.json();
    if (!status || !VALID_ONBOARDING_STATES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status provided' },
        { status: 400 }
      );
    }

    // Get current status first
    const currentUserResponse = await fetch(
      'https://cognito-idp.us-east-1.amazonaws.com/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.GetUser',
          'Authorization': `Bearer ${accessToken}`,
          'X-Session-ID': idToken
        },
      }
    );

    if (!currentUserResponse.ok) {
      throw new Error('Failed to fetch current user attributes');
    }

    const currentUserData = await currentUserResponse.json();
    const currentStatus =
      currentUserData.UserAttributes.find(
        (attr) => attr.Name === 'custom:onboarding'
      )?.Value || 'NOT_STARTED';

    // Validate state transition
    if (!isValidStateTransition(currentStatus, status)) {
      logger.warn('Invalid state transition attempted:', {
        from: currentStatus,
        to: status,
      });
      return NextResponse.json(
        { error: 'Invalid state transition' },
        { status: 400 }
      );
    }

    // Prepare attributes update
    const userAttributes = [
      {
        Name: 'custom:onboarding',
        Value: status,
      },
    ];

    if (lastStep && VALID_ONBOARDING_STATES.includes(lastStep)) {
      userAttributes.push({
        Name: 'custom:lastStep',
        Value: lastStep,
      });
    }

    if (status === 'COMPLETE') {
      userAttributes.push({
        Name: 'custom:onboardingCompletedAt',
        Value: new Date().toISOString(),
      });
    }

    // Update attributes with retry logic
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const updateResponse = await fetch(
          'https://cognito-idp.us-east-1.amazonaws.com/',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-amz-json-1.1',
              'X-Amz-Target':
                'AWSCognitoIdentityProviderService.UpdateUserAttributes',
              'Authorization': `Bearer ${accessToken}`,
              'X-Session-ID': idToken
            },
            body: JSON.stringify({
              UserAttributes: userAttributes,
              SessionId: idToken
            }),
          }
        );

        if (!updateResponse.ok) {
          throw new Error('Failed to update user attributes');
        }

        logger.debug('Onboarding status updated:', {
          previousStatus: currentStatus,
          newStatus: status,
          lastStep: lastStep || status,
        });

        return NextResponse.json({
          status,
          lastStep: lastStep || status,
          completedAt: status === 'COMPLETE' ? new Date().toISOString() : null,
          previousStatus: currentStatus,
        });
      } catch (error) {
        retryCount++;
        if (retryCount === 3) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retryCount))
        );
      }
    }
  } catch (error) {
    logger.error('Error updating onboarding status:', error);
    return NextResponse.json(
      {
        error: 'Failed to update onboarding status',
        details: error.message,
      },
      { status: error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
