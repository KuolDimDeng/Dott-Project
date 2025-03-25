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
    
    // Set onboarding cookies if provided
    if (onboardingStep) {
      response.cookies.set('onboardingStep', onboardingStep, cookieOptions);
      logger.debug('[API] Set onboardingStep cookie:', { onboardingStep });
    }
    
    if (onboardedStatus) {
      response.cookies.set('onboardedStatus', onboardedStatus, cookieOptions);
      logger.debug('[API] Set onboardedStatus cookie:', { onboardedStatus });
    } else {
      // Try to extract onboarding status from the ID token if not provided
      try {
        const decodedToken = parseJwt(idToken);
        const customAttributes = decodedToken['custom:onboarding_status'];
        
        if (customAttributes) {
          response.cookies.set('onboardedStatus', customAttributes, cookieOptions);
          logger.debug('[API] Set onboardedStatus cookie from token:', { onboardedStatus: customAttributes });
        }
      } catch (parseError) {
        logger.warn('[API] Failed to parse JWT for onboarding status:', parseError);
      }
    }
    
    // Set setupCompleted cookie if provided
    if (setupCompleted !== undefined) {
      response.cookies.set('setupCompleted', setupCompleted ? 'true' : 'false', {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 // 30 days - longer expiry for this cookie
      });
      logger.debug('[API] Set setupCompleted cookie:', { setupCompleted });
    } else {
      // Try to determine if setup is completed from token or other parameters
      try {
        const decodedToken = parseJwt(idToken);
        const setupDone = decodedToken['custom:setupdone'] === 'TRUE';
        const onboardingComplete =
          decodedToken['custom:onboarding'] === 'COMPLETE' ||
          onboardingStep === 'complete' ||
          onboardedStatus === 'COMPLETE';
        
        if (setupDone || onboardingComplete) {
          response.cookies.set('setupCompleted', 'true', {
            ...cookieOptions,
            maxAge: 30 * 24 * 60 * 60 // 30 days
          });
          logger.debug('[API] Set setupCompleted cookie from token data:', {
            setupDone,
            onboardingComplete
          });
        }
      } catch (parseError) {
        logger.warn('[API] Failed to parse JWT for setup status:', parseError);
      }
    }
    
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