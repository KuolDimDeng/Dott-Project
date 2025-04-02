import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getServerUser } from '@/utils/getServerUser';

/**
 * Get user from various token sources with fallbacks using server-side auth
 */
async function getAuthenticatedUser(request) {
  try {
    // Use our server-side authentication utility
    const user = await getServerUser(request);
    
    if (user) {
      logger.debug('[API] Retrieved user through serverAuth');
      return user;
    }
    
    // Special handling for business-info page even without auth
    const { searchParams } = new URL(request.url);
    const requestedStep = searchParams.get('step');
    
    if (requestedStep === 'business-info') {
      logger.debug('[API] Special handling for business-info page without auth');
      return {
        email: '',
        'custom:onboarding': 'NOT_STARTED',
        partial: true
      };
    }
    
    return null;
  } catch (error) {
    logger.error('[API] Error authenticating user:', error);
    return null;
  }
}

/**
 * Verify Onboarding State API
 * 
 * This endpoint checks if the user's current onboarding state is valid for 
 * the requested step. It returns the user data if valid, or redirects to
 * the appropriate step if not.
 */
export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const requestedStep = searchParams.get('step');
    
    if (!requestedStep) {
      return NextResponse.json(
        { error: 'Missing required step parameter' },
        { status: 400 }
      );
    }
    
    logger.debug('[API] Verifying onboarding state', { requestedStep });
    
    // Get current user with enhanced handling
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      logger.warn('[API] No authenticated user for state verification');
      return NextResponse.json(
        { 
          isValid: false, 
          redirectUrl: '/auth/signin',
          message: 'Authentication required' 
        },
        { status: 401 }
      );
    }
    
    // Special handling for partial responses on business-info page
    if (user.partial === true && requestedStep === 'business-info') {
      logger.debug('[API] Allowing partial access to business-info page');
      return NextResponse.json({
        isValid: true,
        userData: {
          email: '',
          onboardingStatus: 'NOT_STARTED',
          businessName: '',
          businessType: '',
        },
        isPartial: true
      });
    }
    
    // Get onboarding status from user attributes
    const onboardingStatus = user['custom:onboarding'] || 'NOT_STARTED';
    logger.debug('[API] User onboarding status', { onboardingStatus });
    
    // Map of valid steps for each status
    const allowedSteps = {
      'NOT_STARTED': ['business-info'],
      'BUSINESS_INFO': ['business-info', 'subscription'],
      'SUBSCRIPTION': ['business-info', 'subscription', 'payment'],
      'PAYMENT': ['business-info', 'subscription', 'payment', 'setup'],
      'SETUP': ['business-info', 'subscription', 'payment', 'setup', 'dashboard'],
      'COMPLETE': ['dashboard']
    };
    
    // Check if requested step is allowed
    const isAllowed = allowedSteps[onboardingStatus]?.includes(requestedStep);
    
    if (!isAllowed) {
      // Find the appropriate step for this status
      const nextStep = getNextStep(onboardingStatus);
      logger.warn('[API] Invalid step for current status', { 
        requestedStep, 
        onboardingStatus, 
        nextStep 
      });
      
      return NextResponse.json(
        { 
          isValid: false, 
          redirectUrl: `/onboarding/${nextStep}`,
          message: 'Invalid step for current onboarding status' 
        },
        { status: 200 }
      );
    }
    
    // Return user data for the valid step
    return NextResponse.json({
      isValid: true,
      userData: {
        email: user.email,
        onboardingStatus,
        businessName: user['custom:businessName'] || '',
        businessType: user['custom:businessType'] || '',
        // Add other relevant user data
      }
    });
    
  } catch (error) {
    logger.error('[API] Error verifying onboarding state:', error);
    return NextResponse.json(
      { error: 'Failed to verify onboarding state' },
      { status: 500 }
    );
  }
}

/**
 * Get the next appropriate step based on onboarding status
 */
function getNextStep(status) {
  const stepMap = {
    'NOT_STARTED': 'business-info',
    'BUSINESS_INFO': 'subscription',
    'SUBSCRIPTION': 'payment',
    'PAYMENT': 'setup',
    'SETUP': 'dashboard',
    'COMPLETE': 'dashboard'
  };
  
  return stepMap[status] || 'business-info';
} 