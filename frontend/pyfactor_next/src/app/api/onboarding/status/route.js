/**
 * Onboarding Status API Routes
 * 
 * This file handles API routes for managing onboarding status with a hierarchical storage approach:
 * 1. Primary: Backend Database (Django OnboardingProgress model)
 * 2. Secondary: Auth0 User Attributes
 * 3. Tertiary: Browser localStorage (client-side only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getSession } from '@auth0/nextjs-auth0';

// Constants
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
 * Retrieves the current onboarding status with hierarchical fallbacks:
 * 1. First tries the backend API
 * 2. If that fails, checks Auth0 user attributes
 * 3. Client-side code handles localStorage fallback
 */
export async function GET(request) {
  console.log('🔍 [OnboardingStatus] Checking onboarding status with hierarchical storage');
  try {
    // Get tenant ID from query params
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }
    
    // Get user session from Auth0
    const { session } = await getSession(request, new Response());
    
    if (!session?.user) {
      logger.warn('[OnboardingStatus] No authenticated user session found');
      return NextResponse.json(
        { 
          status: 'not_started',
          currentStep: 'business_info',
          completedSteps: [],
          businessInfoCompleted: false,
          subscriptionCompleted: false,
          paymentCompleted: false,
          setupCompleted: false,
          tenantId,
          _source: 'unauthenticated_default'
        }, 
        { status: 200 }
      );
    }
    
    // Primary source: Backend API
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
      const response = await fetch(`${backendUrl}/api/onboarding/status/?tenant_id=${tenantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
          'X-User-Email': session.user.email,
          'X-User-Sub': session.user.sub,
        },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const onboardingData = await response.json();
        logger.debug('[OnboardingStatus] Backend API success', onboardingData);
        
        // Transform backend data to frontend format
        const status = {
          status: onboardingData.status || 'not_started',
          currentStep: onboardingData.current_step || 'business_info',
          completedSteps: onboardingData.completed_steps || [],
          businessInfoCompleted: onboardingData.business_info_completed || false,
          subscriptionCompleted: onboardingData.subscription_completed || false,
          paymentCompleted: onboardingData.payment_completed || false,
          setupCompleted: onboardingData.setup_completed || false,
          tenantId,
          _source: 'backend_api'
        };
        
        return NextResponse.json(status);
      } else if (response.status === 404) {
        // 404 means the onboarding record doesn't exist yet, which is not an error
        logger.info('[OnboardingStatus] Backend API returned 404, onboarding not started yet');
      } else {
        // Any other error status
        logger.error('[OnboardingStatus] Backend API error:', response.status, response.statusText);
        // Continue to fallbacks
      }
    } catch (apiError) {
      logger.error('[OnboardingStatus] Backend API fetch error:', apiError);
      // Continue to fallbacks
    }
    
    // Secondary source: Auth0 user attributes
    try {
      const userOnboardingStatus = session.user.custom_onboarding;
      
      if (userOnboardingStatus) {
        logger.debug('[OnboardingStatus] Using Auth0 user attributes', { userOnboardingStatus });
        
        const completedSteps = VALID_ONBOARDING_STATES.slice(
          0, 
          VALID_ONBOARDING_STATES.indexOf(userOnboardingStatus) + 1
        ).filter(step => step !== 'not_started');
        
        const status = {
          status: userOnboardingStatus,
          currentStep: userOnboardingStatus,
          completedSteps,
          businessInfoCompleted: completedSteps.includes('business_info'),
          subscriptionCompleted: completedSteps.includes('subscription'),
          paymentCompleted: completedSteps.includes('payment'),
          setupCompleted: completedSteps.includes('setup'),
          tenantId,
          _source: 'auth0_attributes'
        };
        
        return NextResponse.json(status);
      }
    } catch (auth0Error) {
      logger.error('[OnboardingStatus] Auth0 attributes error:', auth0Error);
      // Continue to default fallback
    }
    
    // If we reach here, both backend and Auth0 fallbacks failed
    // Client-side code will handle localStorage as tertiary fallback
    
    // Default fallback (will be overridden by localStorage on client if available)
    logger.warn('[OnboardingStatus] All backend sources failed, returning default status');
    return NextResponse.json({
      status: 'not_started',
      currentStep: 'business_info',
      completedSteps: [],
      businessInfoCompleted: false,
      subscriptionCompleted: false,
      paymentCompleted: false,
      setupCompleted: false,
      tenantId,
      _source: 'api_default'
    });
    
  } catch (error) {
    logger.error('[OnboardingStatus] Unhandled error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/onboarding/status
 * Updates the onboarding status in the hierarchical storage system:
 * 1. First updates the backend database
 * 2. Then updates Auth0 user attributes
 * 3. Client-side code handles localStorage updates
 */
export async function POST(request) {
  try {
    // Get user session from Auth0
    const { session } = await getSession(request, new Response());
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { status, lastStep, ...additionalData } = body;
    
    // Validate status
    if (!status || !VALID_ONBOARDING_STATES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status provided' },
        { status: 400 }
      );
    }
    
    const tenantId = request.headers.get('X-Tenant-ID') || additionalData.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    // Get current status from Auth0 user attributes
    const currentStatus = session.user.custom_onboarding || 'not_started';
    
    // Validate state transition
    if (!isValidStateTransition(currentStatus, status)) {
      logger.warn('[OnboardingStatus] Invalid state transition attempted:', {
        from: currentStatus,
        to: status,
      });
      return NextResponse.json(
        { error: 'Invalid state transition' },
        { status: 400 }
      );
    }
    
    let backendResult = null;
    
    // Primary storage: Backend API
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
      const response = await fetch(`${backendUrl}/api/onboarding/status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
          'X-User-Email': session.user.email,
          'X-User-Sub': session.user.sub,
          'X-Tenant-ID': tenantId
        },
        body: JSON.stringify({
          status,
          last_step: lastStep || status,
          tenant_id: tenantId,
          ...additionalData
        })
      });
      
      if (response.ok) {
        backendResult = await response.json();
        logger.debug('[OnboardingStatus] Backend API update success', backendResult);
      } else {
        logger.error('[OnboardingStatus] Backend API update error:', response.status, response.statusText);
      }
    } catch (apiError) {
      logger.error('[OnboardingStatus] Backend API update failed:', apiError);
    }
    
    // Secondary storage: Update Auth0 user attributes
    // Use the Auth0 Management API to update the user's attributes
    try {
      const managementApiToken = process.env.AUTH0_MANAGEMENT_API_TOKEN;
      const auth0Domain = process.env.AUTH0_ISSUER_BASE_URL || 'https://auth.dottapps.com';
      
      if (!managementApiToken) {
        logger.warn('[OnboardingStatus] No Auth0 Management API token available, skipping Auth0 attribute update');
      } else {
        // Build user metadata updates
        const userMetadata = {
          custom_onboarding: status
        };
        
        if (lastStep) {
          userMetadata.custom_lastStep = lastStep;
        }
        
        if (status === 'complete') {
          userMetadata.custom_onboardingComplete = 'true';
          userMetadata.custom_onboardingCompletedAt = new Date().toISOString();
          userMetadata.custom_tenantId = tenantId;
        }
        
        // Update Auth0 user metadata
        const auth0Response = await fetch(`${auth0Domain}/api/v2/users/${session.user.sub}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${managementApiToken}`
          },
          body: JSON.stringify({
            user_metadata: userMetadata
          })
        });
        
        if (auth0Response.ok) {
          logger.debug('[OnboardingStatus] Auth0 attributes updated successfully');
        } else {
          logger.error('[OnboardingStatus] Auth0 attributes update failed:', 
            auth0Response.status, 
            auth0Response.statusText
          );
        }
      }
    } catch (auth0Error) {
      logger.error('[OnboardingStatus] Auth0 attributes update error:', auth0Error);
    }
    
    // Return result (with preference for backend result if available)
    const resultToReturn = backendResult || {
      status,
      lastStep: lastStep || status,
      completedAt: status === 'complete' ? new Date().toISOString() : null,
      previousStatus: currentStatus,
      tenantId,
      _persisted: backendResult ? 'backend_and_auth0' : 'auth0_only'
    };
    
    return NextResponse.json(resultToReturn);
    
  } catch (error) {
    logger.error('[OnboardingStatus] Unhandled error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update onboarding status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
