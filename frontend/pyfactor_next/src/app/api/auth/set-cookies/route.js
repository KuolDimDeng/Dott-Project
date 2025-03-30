import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { parseJwt } from '@/lib/authUtils';

export async function POST(request) {
  try {
    const { idToken, accessToken, refreshToken, onboardingStep, onboardedStatus, setupCompleted, rememberMe, maxAge } = await request.json();
    
    if (!idToken || !accessToken) {
      logger.error('[API] Missing required tokens for set-cookies:', { 
        hasIdToken: !!idToken, 
        hasAccessToken: !!accessToken 
      });
      return NextResponse.json(
        { error: 'Missing required tokens' },
        { status: 400 }
      );
    }

    logger.debug('[API] Setting auth cookies', {
      hasIdToken: !!idToken,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      onboardingStep,
      onboardedStatus,
      setupCompleted,
      rememberMe,
      customMaxAge: maxAge
    });
    
    const isDev = process.env.NODE_ENV === 'development';
    // Use provided maxAge or determine based on rememberMe flag
    const defaultMaxAge = rememberMe ? 
      30 * 24 * 60 * 60 : // 30 days for rememberMe
      24 * 60 * 60;      // 24 hours for standard session
      
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: !isDev,
      sameSite: isDev ? 'lax' : 'strict',
      maxAge: maxAge || defaultMaxAge // Use provided maxAge or calculate based on rememberMe
    };

    const response = NextResponse.json({ success: true });
    
    // Set cookies with proper HTTP headers
    response.cookies.set('idToken', idToken, cookieOptions);
    response.cookies.set('accessToken', accessToken, cookieOptions);
    
    // Set authToken cookie which is used by middleware for authentication detection
    response.cookies.set('authToken', 'true', {
      ...cookieOptions,
      httpOnly: false,  // Make accessible to JS
    });
    
    if (refreshToken) {
      // For refresh token, always use a longer expiry - either the rememberMe duration or at least 7 days
      const refreshTokenMaxAge = rememberMe ? 
        30 * 24 * 60 * 60 : // 30 days for rememberMe
        7 * 24 * 60 * 60;  // 7 days for standard session
        
      response.cookies.set('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: refreshTokenMaxAge
      });
    }
    
    // Extract onboarding status from token for verification
    let cognitoOnboardingStatus = null;
    let cognitoSetupDone = false;
    
    try {
      const decodedToken = parseJwt(idToken);
      cognitoOnboardingStatus = decodedToken['custom:onboarding'];
      cognitoSetupDone = decodedToken['custom:setupdone'] === 'TRUE';
      
      logger.debug('[API] Extracted onboarding status from token:', { 
        cognitoOnboardingStatus,
        cognitoSetupDone
      });
    } catch (parseError) {
      logger.warn('[API] Failed to parse JWT for onboarding status:', parseError);
    }
    
    // Determine the correct onboarding state based on all available information
    // Priority: 1. Explicit parameters, 2. Cognito attributes, 3. Default for new users
    let finalOnboardingStatus = onboardedStatus || cognitoOnboardingStatus || 'NOT_STARTED';
    let finalOnboardingStep = null;
    
    // Ensure onboardingStatus and onboardingStep are consistent with each other
    if (finalOnboardingStatus === 'COMPLETE') {
      finalOnboardingStep = onboardingStep || 'complete';
      
      // Double-check: If step is not 'complete' but status is 'COMPLETE', we have inconsistent state
      if (finalOnboardingStep !== 'complete' && finalOnboardingStep !== 'dashboard') {
        logger.warn('[API] Inconsistent onboarding state detected: status is COMPLETE but step is not complete', {
          status: finalOnboardingStatus,
          step: finalOnboardingStep
        });
        
        // For safety, override to a consistent state based on Cognito
        if (cognitoOnboardingStatus === 'COMPLETE') {
          finalOnboardingStep = 'complete';
        } else {
          // If Cognito says not complete, trust that over the inconsistent cookies
          finalOnboardingStatus = cognitoOnboardingStatus || 'NOT_STARTED';
          finalOnboardingStep = onboardingStep || 'business-info';
        }
      }
    } else {
      // For non-complete states, make sure step matches status
      finalOnboardingStep = onboardingStep || (
        finalOnboardingStatus === 'NOT_STARTED' ? 'business-info' :
        finalOnboardingStatus === 'BUSINESS_INFO' ? 'subscription' :
        finalOnboardingStatus === 'SUBSCRIPTION' ? 'payment' :
        finalOnboardingStatus === 'PAYMENT' ? 'setup' : 
        finalOnboardingStatus === 'INCOMPLETE' ? 'business-info' : 'business-info'
      );
    }
    
    // Set the determined onboarding cookies
    response.cookies.set('onboardingStep', finalOnboardingStep, cookieOptions);
    response.cookies.set('onboardedStatus', finalOnboardingStatus, cookieOptions);
    
    logger.debug('[API] Set final onboarding cookies:', { 
      onboardingStep: finalOnboardingStep,
      onboardedStatus: finalOnboardingStatus
    });
    
    // Set setupCompleted cookie based on determined state
    const isSetupComplete = setupCompleted !== undefined ? 
      !!setupCompleted : 
      (cognitoSetupDone || finalOnboardingStatus === 'COMPLETE');
    
    response.cookies.set('setupCompleted', isSetupComplete ? 'true' : 'false', {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 // 30 days - longer expiry for this cookie
    });
    
    logger.debug('[API] Set setupCompleted cookie:', { setupCompleted: isSetupComplete });
    logger.debug('[API] Auth cookies set successfully');
    
    return response;
  } catch (error) {
    logger.error('[API] Error setting auth cookies:', error);
    return NextResponse.json(
      { error: 'Failed to set cookies' },
      { status: 500 }
    );
  }
}