import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * API route for handling OAuth callback
 * This endpoint receives data from the client callback page and sets cookies
 */
export async function POST(request) {
  try {
    const data = await request.json();
    const { idToken, accessToken, refreshToken, onboardingStep, onboardedStatus, setupCompleted } = data;
    
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
    
    if (onboardingStep) {
      response.cookies.set('onboardingStep', onboardingStep, cookieOptions);
    }
    
    if (onboardedStatus) {
      response.cookies.set('onboardedStatus', onboardedStatus, cookieOptions);
    }
    
    if (setupCompleted) {
      response.cookies.set('setupCompleted', true, cookieOptions);
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