import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getServerUser } from '@/utils/getServerUser';

/**
 * Onboarding Navigation API
 * 
 * This endpoint provides navigation instructions for the onboarding flow.
 * It determines the next appropriate step and the best navigation method
 * based on the current step and user state.
 */
export async function POST(request) {
  try {
    // Parse request body
    const { currentStep, data = {} } = await request.json();
    
    if (!currentStep) {
      return NextResponse.json(
        { error: 'Missing required currentStep parameter' },
        { status: 400 }
      );
    }
    
    logger.debug('[API] Getting navigation instructions', { currentStep, data });
    
    // Get current user with server-side auth
    const user = await getServerUser(request);
    if (!user) {
      logger.warn('[API] No authenticated user for navigation request');
      return NextResponse.json({
        redirectUrl: '/auth/signin',
        navigationMethod: 'redirect',
        message: 'Authentication required'
      }, { status: 200 });
    }
    
    // Get onboarding status from user attributes
    const onboardingStatus = user['custom:onboarding'] || 'not_started';
    logger.debug('[API] User onboarding status for navigation', { onboardingStatus });
    
    // Map steps to their next step
    const nextStepMap = {
      'business-info': 'subscription',
      'subscription': 'payment',
      'payment': 'setup',
      'setup': 'dashboard',
      'complete': 'dashboard'
    };
    
    // Determine next step based on current step
    const nextStep = nextStepMap[currentStep] || 'business-info';
    
    // Determine if we need to use server-side redirect
    // Use server-side redirect for business-info to ensure cookies are set correctly
    const useServerRedirect = currentStep === 'business-info';
    
    // Construct redirect URL
    let redirectUrl = `/onboarding/${nextStep}`;
    
    // Add query parameters if necessary
    if (Object.keys(data).length > 0) {
      const params = new URLSearchParams();
      
      // Add timestamp to prevent caching
      params.append('ts', Date.now().toString());
      
      // Add all data as parameters
      Object.entries(data).forEach(([key, value]) => {
        if (value) {
          params.append(key, value.toString());
        }
      });
      
      redirectUrl += `?${params.toString()}`;
    } else {
      // Always add timestamp to prevent caching
      redirectUrl += `?ts=${Date.now()}`;
    }
    
    logger.debug('[API] Navigation instructions prepared', { 
      nextStep,
      redirectUrl,
      navigationMethod: useServerRedirect ? 'server-redirect' : 'client-redirect'
    });
    
    // Return navigation instructions
    return NextResponse.json({
      nextStep,
      redirectUrl,
      navigationMethod: useServerRedirect ? 'server-redirect' : 'client-redirect',
      useServerForm: currentStep === 'business-info', // Use form submission for business-info
      serverRedirectUrl: useServerRedirect ? '/api/onboarding/redirect' : null
    });
    
  } catch (error) {
    logger.error('[API] Error providing navigation instructions:', error);
    return NextResponse.json(
      { error: 'Failed to determine navigation path' },
      { status: 500 }
    );
  }
} 