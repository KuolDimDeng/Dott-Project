import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { parseJwt } from '@/lib/authUtils';

export async function POST(request) {
  try {
    const { idToken, accessToken, refreshToken, onboardingStep, onboardedStatus, setupCompleted } = await request.json();
    
    if (!idToken || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required tokens' },
        { status: 400 }
      );
    }

    logger.debug('[API] Setting auth cookies');
    
    const isDev = process.env.NODE_ENV === 'development';
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: !isDev,
      sameSite: isDev ? 'lax' : 'strict',
      maxAge: 3600 // 1 hour
    };

    const response = NextResponse.json({ success: true });
    
    // Set cookies with proper HTTP headers
    response.cookies.set('idToken', idToken, cookieOptions);
    response.cookies.set('accessToken', accessToken, cookieOptions);
    
    if (refreshToken) {
      response.cookies.set('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 86400 // 24 hours
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