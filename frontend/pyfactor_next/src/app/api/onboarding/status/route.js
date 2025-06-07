///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/onboarding/status/route.js
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * GET /api/onboarding/status
 * Retrieves the current onboarding status from Cognito user attributes
 */
const VALID_ONBOARDING_STATES = [
  'not_started',
  'business_info',
  'subscription',
  'payment',
  'setup',
  'complete',
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
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }
    
    // Check for cached onboarding status in URL if available (enhances persistence)
    const cachedStatus = searchParams.get('cachedStatus');
    if (cachedStatus === 'complete') {
      console.log('[Onboarding Status] Using cached complete status for tenant:', tenantId);
      return NextResponse.json({
        status: 'complete',
        currentStep: 'complete',
        completedSteps: ['business_info', 'subscription', 'payment', 'setup'],
        businessInfoCompleted: true,
        subscriptionCompleted: true,
        paymentCompleted: true,
        setupCompleted: true,
        tenantId: tenantId
      });
    }
    
    // Check for cached onboarding status in URL if available (enhances persistence)
    const cachedStatus = searchParams.get('cachedStatus');
    if (cachedStatus === 'complete') {
      console.log('[Onboarding Status] Using cached complete status for tenant:', tenantId);
      return NextResponse.json({
        status: 'complete',
        currentStep: 'complete',
        completedSteps: ['business_info', 'subscription', 'payment', 'setup'],
        businessInfoCompleted: true,
        subscriptionCompleted: true,
        paymentCompleted: true,
        setupCompleted: true,
        tenantId: tenantId
      });
    }
    
    // Get session cookie to get user info
    const sessionCookie = request.cookies.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    if (!sessionData.user) {
      return NextResponse.json({ error: 'No user in session' }, { status: 401 });
    }
    
    console.log('[Onboarding Status] Checking onboarding for tenant:', tenantId);
    
    // Call backend API to get onboarding status
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
      const response = await fetch(`${backendUrl}/api/onboarding/status/?tenant_id=${tenantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.accessToken}`,
          'X-User-Email': sessionData.user.email,
          'X-User-Sub': sessionData.user.sub,
        },
      });
      
      if (response.ok) {
        const onboardingData = await response.json();
        console.log('[Onboarding Status] Backend onboarding data:', onboardingData);
        
        // Transform backend data to frontend format
        const status = {
          status: onboardingData.status || 'not_started',
          currentStep: onboardingData.current_step || 'business_info',
          completedSteps: onboardingData.completed_steps || [],
          businessInfoCompleted: onboardingData.business_info_completed || false,
          subscriptionCompleted: onboardingData.subscription_completed || false,
          paymentCompleted: onboardingData.payment_completed || false,
          setupCompleted: onboardingData.setup_completed || false,
          tenantId: tenantId
        };
        
        return NextResponse.json(status);
      } else if (response.status === 404) {
        // Onboarding not found - return default new user status
        console.log('[Onboarding Status] Onboarding not found, returning default status');
        
        const defaultStatus = {
          status: 'not_started',
          currentStep: 'business_info',
          completedSteps: [],
          businessInfoCompleted: false,
          subscriptionCompleted: false,
          paymentCompleted: false,
          setupCompleted: false,
          tenantId: tenantId
        };
        
        return NextResponse.json(defaultStatus);
      } else {
        console.error('[Onboarding Status] Backend API error:', response.status, response.statusText);
        throw new Error(`Backend API returned ${response.status}`);
      }
    } catch (fetchError) {
      console.error('[Onboarding Status] Failed to fetch from backend:', fetchError);
      
      // Check if user has completed onboarding previously
      try {
        // Try to load from local storage as a fallback
        const localStorageCheck = typeof localStorage !== 'undefined' && 
          localStorage.getItem(`onboarding_${tenantId}`);
          
        if (localStorageCheck === 'complete') {
          console.log('[Onboarding Status] Using locally cached complete status');
          return NextResponse.json({
            status: 'complete',
            currentStep: 'complete',
            completedSteps: ['business_info', 'subscription', 'payment', 'setup'],
            businessInfoCompleted: true,
            subscriptionCompleted: true,
            paymentCompleted: true,
            setupCompleted: true,
            tenantId: tenantId
          });
        }
      } catch (e) {
        console.log('[Onboarding Status] Error checking local storage:', e);
      }
      
      // Check if user has completed onboarding previously
      try {
        // Try to load from local storage as a fallback
        const localStorageCheck = typeof localStorage !== 'undefined' && 
          localStorage.getItem(`onboarding_${tenantId}`);
          
        if (localStorageCheck === 'complete') {
          console.log('[Onboarding Status] Using locally cached complete status');
          return NextResponse.json({
            status: 'complete',
            currentStep: 'complete',
            completedSteps: ['business_info', 'subscription', 'payment', 'setup'],
            businessInfoCompleted: true,
            subscriptionCompleted: true,
            paymentCompleted: true,
            setupCompleted: true,
            tenantId: tenantId
          });
        }
      } catch (e) {
        console.log('[Onboarding Status] Error checking local storage:', e);
      }
      
      // Fallback: return default status for new users
      const fallbackStatus = {
        status: 'not_started',
        currentStep: 'business_info',
        completedSteps: [],
        businessInfoCompleted: false,
        subscriptionCompleted: false,
        paymentCompleted: false,
        setupCompleted: false,
        tenantId: tenantId
      };
      
      return NextResponse.json(fallbackStatus);
    }
    
  } catch (error) {
    console.error('[Onboarding Status] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      )?.Value || 'not_started';

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

    if (status === 'complete') {
      userAttributes.push({
        Name: 'custom:onboardingCompletedAt',
        Value: new Date().toISOString(),
      });
      
      // Enhanced persistence for onboarding completion
      userAttributes.push({
        Name: 'custom:onboardingComplete',
        Value: 'true',
      });
      
      // Also store tenant ID to help with future lookups
      if (request.headers.get('X-Tenant-ID')) {
        userAttributes.push({
          Name: 'custom:tenantId',
          Value: request.headers.get('X-Tenant-ID'),
        });
      }
      
      // Try to persist in local storage on client side
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`onboarding_${request.headers.get('X-Tenant-ID')}`, 'complete');
        }
      } catch (e) {
        console.log('[Onboarding Status] Error setting local storage:', e);
      }
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
          completedAt: status === 'complete' ? new Date().toISOString() : null,
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
