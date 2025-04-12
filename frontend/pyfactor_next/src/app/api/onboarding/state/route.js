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
    // Check if this is for the business-info step specifically
    const { searchParams } = new URL(request.url);
    const step = searchParams.get('step');
    const isBusinessInfoStep = step === 'business-info';
    const allowPartial = searchParams.get('allowPartial') === 'true';
    
    // Always provide minimum data for business-info step
    if (isBusinessInfoStep) {
      safeLogger.debug('[API] Business-info step detected, providing minimal data');
      return {
        email: '',
        'custom:onboarding': 'not_started',
        partial: true,
        businessInfo: false
      };
    }
    
    // Use our server-side authentication utility
    const user = await getServerUser(request);
    
    if (user) {
      safeLogger.debug('[API] Retrieved user through serverAuth');
      return user;
    }
    
    // Check if this is coming from our enhanced middleware
    const isOnboardingRoute = request.headers.get('X-Onboarding-Route') === 'true';
    
    if (isOnboardingRoute || allowPartial) {
      safeLogger.debug('[API] Onboarding route detected, trying alternative auth methods');
      
      // For business-info, we'll still return some minimal data
      safeLogger.debug('[API] Returning partial data for onboarding page');
      return {
        email: '',
        'custom:onboarding': 'not_started',
        partial: true,
        businessInfo: false
      };
    }
    
    return null;
  } catch (error) {
    safeLogger.error('[API] Error authenticating user:', error);
    return null;
  }
}

/**
 * Onboarding State API
 * 
 * This endpoint provides centralized state management for the onboarding flow.
 * It gets the current state (GET) or updates state (POST).
 */

// GET handler - retrieve current onboarding state
export async function GET(request) {
  try {
    safeLogger.debug('[API] Fetching onboarding state');
    
    // Get current user with enhanced handling
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      safeLogger.warn('[API] No authenticated user for state retrieval');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Special handling for partial responses
    const isPartial = user.partial === true;
    
    if (isPartial) {
      safeLogger.debug('[API] Returning partial state for unauthenticated business-info access');
      return NextResponse.json({
        status: 'not_started',
        currentStep: 'business-info',
        userData: {
          email: '',
          businessName: '',
          businessType: '',
        },
        isAuthenticated: false,
        isPartial: true
      });
    }
    
    // Extract onboarding information from user attributes
    const onboardingStatus = user['custom:onboarding'] || 'not_started';
    const businessName = user['custom:businessName'] || '';
    const businessType = user['custom:businessType'] || '';
    
    safeLogger.debug('[API] Onboarding state retrieved', { 
      onboardingStatus,
      hasBusinessInfo: !!businessName
    });
    
    // Map status to step
    const stepMap = {
      'not_started': 'business-info',
      'business_info': 'subscription',
      'subscription': 'payment',
      'payment': 'setup',
      'setup': 'dashboard',
      'complete': 'dashboard'
    };
    
    const currentStep = stepMap[onboardingStatus] || 'business-info';
    
    // Return state information
    return NextResponse.json({
      status: onboardingStatus,
      currentStep,
      userData: {
        email: user.email || '',
        businessName,
        businessType,
        // Add other relevant user data as needed
      },
      isAuthenticated: true
    });
    
  } catch (error) {
    safeLogger.error('[API] Error fetching onboarding state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding state' },
      { status: 500 }
    );
  }
}

// POST handler - update onboarding state
export async function POST(request) {
  try {
    // Parse request body
    const { step, data = {} } = await request.json();
    
    if (!step) {
      return NextResponse.json(
        { error: 'Missing required step parameter' },
        { status: 400 }
      );
    }
    
    safeLogger.debug('[API] Updating onboarding state', { step, data });
    
    // Get current user with server-side auth
    const user = await getAuthenticatedUser(request);
    if (!user) {
      safeLogger.warn('[API] No authenticated user for state update');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Map step to status
    const statusMap = {
      'business-info': 'not_started',
      'subscription': 'business_info',
      'payment': 'subscription',
      'setup': 'payment',
      'complete': 'complete'
    };
    
    const status = statusMap[step] || 'not_started';
    
    // For the server-side API, we'll just store the state without directly updating Cognito
    // The client side will handle the Cognito attribute updates

    // Store information that the status has been updated
    const cookies = request.cookies;
    const response = NextResponse.json({
      success: true,
      status,
      step,
      message: 'Onboarding state updated successfully'
    });
    
    // Store in cookies with 7-day expiration
    const cookieOptions = {
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'lax'
    };
    
    response.cookies.set('onboardingStep', step, cookieOptions);
    response.cookies.set('onboardedStatus', status, cookieOptions);
    
    // Add data-specific cookies
    if (step === 'business-info' && data.businessName) {
      response.cookies.set('businessName', data.businessName, cookieOptions);
      
      if (data.businessType) {
        response.cookies.set('businessType', data.businessType, cookieOptions);
      }
    }
    
    safeLogger.debug('[API] Onboarding state updated in cookies', { 
      step, 
      status
    });
    
    return response;
    
  } catch (error) {
    safeLogger.error('[API] Error updating onboarding state:', error);
    return NextResponse.json(
      { error: 'Failed to update onboarding state' },
      { status: 500 }
    );
  }
} 