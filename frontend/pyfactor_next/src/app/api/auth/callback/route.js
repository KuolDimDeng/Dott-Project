import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getCurrentUser, fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { determineOnboardingStep } from '@/utils/cookieManager';

/**
 * API route for handling OAuth callback
 * This endpoint receives data from the client callback page and sets cookies
 * It also verifies the user's onboarding status and sets appropriate cookies
 */
export async function POST(request) {
  try {
    const data = await request.json();
    const { idToken, accessToken, refreshToken } = data;
    
    if (!idToken || !accessToken) {
      logger.error('[API Auth Callback] Missing required tokens');
      return NextResponse.json(
        { error: 'Missing required tokens' },
        { status: 400 }
      );
    }
    
    // Create response
    const response = NextResponse.json({ success: true });
    
    // Set secure cookie options
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 // 24 hours
    };
    
    // Set required cookies
    response.cookies.set('idToken', idToken, cookieOptions);
    response.cookies.set('accessToken', accessToken, cookieOptions);
    
    // Set optional cookies if available
    if (refreshToken) {
      response.cookies.set('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30 // 30 days for refresh token
      });
    }
    
    // Try to fetch user attributes to determine onboarding status
    try {
      const userAttributes = await fetchUserAttributes();
      const onboardingStep = determineOnboardingStep(userAttributes);
      
      // Set onboarding cookies
      const onboardingStatus = userAttributes['custom:onboarding'] || 'not_started';
      response.cookies.set('onboardedStatus', onboardingStatus, cookieOptions);
      response.cookies.set('onboardingStep', onboardingStep, cookieOptions);
      
      // Set completed steps cookies
      const businessInfoDone = userAttributes['custom:business_info_done'] === 'TRUE';
      const subscriptionDone = userAttributes['custom:subscription_done'] === 'TRUE'; 
      const paymentDone = userAttributes['custom:payment_done'] === 'TRUE';
      const setupDone = (userAttributes['custom:setupdone'] || '').toLowerCase() === 'true';
      
      response.cookies.set('businessInfoCompleted', businessInfoDone ? 'true' : 'false', cookieOptions);
      response.cookies.set('subscriptionCompleted', subscriptionDone ? 'true' : 'false', cookieOptions);
      response.cookies.set('paymentCompleted', paymentDone ? 'true' : 'false', cookieOptions);
      response.cookies.set('setupCompleted', setupDone ? 'true' : 'false', cookieOptions);
      
      // Set tenant ID if available
      if (userAttributes['custom:tenant_id']) {
        response.cookies.set('tenantId', userAttributes['custom:tenant_id'], cookieOptions);
      }
      
      logger.debug('[API Auth Callback] Set onboarding cookies for status:', {
        onboardingStatus,
        nextStep: onboardingStep
      });
    } catch (error) {
      logger.warn('[API Auth Callback] Could not fetch user attributes for onboarding status:', error);
      // Set default onboarding cookies in case of error
      response.cookies.set('onboardedStatus', 'not_started', cookieOptions);
      response.cookies.set('onboardingStep', 'business-info', cookieOptions);
    }
    
    logger.debug('[API Auth Callback] Successfully set cookies for OAuth callback');
    
    return response;
  } catch (error) {
    logger.error('[API Auth Callback] Error setting cookies:', error);
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    );
  }
}