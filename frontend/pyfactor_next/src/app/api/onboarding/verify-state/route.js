import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getServerUser } from '@/utils/getServerUser';

// Create a safe logger that falls back to console methods if logger methods aren't available
const safeLogger = {
  debug: (...args) => {
    if (typeof logger.debug === 'function') {
      logger.debug(...args);
    } else {
      console.debug(...args);
    }
  },
  info: (...args) => {
    if (typeof logger.info === 'function') {
      logger.info(...args);
    } else {
      console.info(...args);
    }
  },
  warn: (...args) => {
    if (typeof logger.warn === 'function') {
      logger.warn(...args);
    } else {
      console.warn(...args);
    }
  },
  error: (...args) => {
    if (typeof logger.error === 'function') {
      logger.error(...args);
    } else {
      console.error(...args);
    }
  }
};

/**
 * Get user from various token sources with fallbacks using server-side auth
 */
async function getAuthenticatedUser(request) {
  try {
    // Use our server-side authentication utility
    const user = await getServerUser(request);
    
    if (user) {
      safeLogger.debug('[API] Retrieved user through serverAuth');
      return user;
    }
    
    // Special handling for business-info page even without auth
    const { searchParams } = new URL(request.url);
    const requestedStep = searchParams.get('step');
    
    if (requestedStep === 'business-info') {
      safeLogger.debug('[API] Special handling for business-info page without auth');
      return {
        email: '',
        'custom:onboarding': 'NOT_STARTED',
        partial: true
      };
    }
    
    return null;
  } catch (error) {
    safeLogger.error('[API] Error authenticating user:', error);
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
    
    safeLogger.debug('[API] Verifying onboarding state', { requestedStep });
    
    // Get current user with enhanced handling
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      safeLogger.warn('[API] No authenticated user for state verification');
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
      safeLogger.debug('[API] Allowing partial access to business-info page');
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
    // Normalize to lowercase for consistency
    const onboardingStatus = (user['custom:onboarding'] || 'NOT_STARTED').toLowerCase();
    safeLogger.debug('[API] User onboarding status', { 
      onboardingStatus,
      originalStatus: user['custom:onboarding'] || 'NOT_STARTED'
    });
    
    // Map onboarding steps to allowed status values (all lowercase for consistency)
    const stepAccess = {
      'business-info': ['not_started', 'business_info', 'business-info', 'business-info-completed'],
      'subscription': ['business_info', 'business-info', 'business-info-completed', 'subscription'],
      'payment': ['subscription', 'payment'],
      'setup': ['payment', 'setup', 'database-setup', 'database_setup'],
      'database-setup': ['setup', 'database-setup', 'database_setup'],
      'complete': ['setup', 'database-setup', 'database_setup', 'review', 'complete']
    };
    
    // Check if onboarding is complete
    const isComplete = onboardingStatus === 'complete' || onboardingStatus === 'completed';
    
    // For dashboard access, onboarding must be complete
    if (requestedStep === 'dashboard' && !isComplete) {
      safeLogger.debug('[API] Dashboard access denied - onboarding incomplete', {
        onboardingStatus
      });
      return NextResponse.json({
        isValid: false,
        redirectUrl: '/onboarding/business-info',
        message: 'Onboarding incomplete'
      });
    }
    
    // Check if requested step is allowed
    let isAllowed = stepAccess[requestedStep]?.includes(onboardingStatus);
    
    // Special case for payment page - check for plan type
    if (requestedStep === 'payment') {
      // If user has a free or basic plan, payment page is not allowed
      const planType = user?.['custom:subplan']?.toLowerCase();
      if (planType === 'free' || planType === 'basic') {
        safeLogger.info('[API] Payment page access denied for free/basic plan', { planType });
        isAllowed = false;
        
        // Redirect to setup
        return NextResponse.json(
          { 
            isValid: false, 
            redirectUrl: '/dashboard?freePlan=true',
            message: 'Free/basic plans do not require payment' 
          },
          { status: 200 }
        );
      }
    }
    
    if (!isAllowed) {
      // Find the appropriate step for this status
      const nextStep = getNextStep(onboardingStatus, user);
      safeLogger.warn('[API] Invalid step for current status', { 
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
    safeLogger.error('[API] Error verifying onboarding state:', error);
    return NextResponse.json(
      { error: 'Failed to verify onboarding state' },
      { status: 500 }
    );
  }
}

/**
 * Get the next appropriate step based on onboarding status
 */
function getNextStep(status, user) {
  const stepMap = {
    'not_started': 'business-info',
    'business_info': 'subscription',
    'business-info': 'subscription', 
    'subscription': 'payment',
    'payment': 'setup',
    'setup': 'dashboard',
    'complete': 'dashboard',
    'completed': 'dashboard'
  };

  // Normalize status to lowercase for consistent mapping
  const normalizedStatus = status?.toLowerCase() || 'not_started';
  
  // Special case for subscription stage: check plan type
  if (normalizedStatus === 'subscription') {
    // Check if user has a free or basic plan
    const planType = user?.['custom:subplan']?.toLowerCase();
    if (planType === 'free' || planType === 'basic') {
      // Skip payment for free/basic plans
      return 'setup';
    }
  }
  
  return stepMap[normalizedStatus] || 'business-info';
} 