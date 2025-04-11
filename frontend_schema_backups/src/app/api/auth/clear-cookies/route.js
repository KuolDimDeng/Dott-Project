import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function POST() {
  try {
    logger.debug('[API] Clearing auth cookies');
    
    const response = NextResponse.json({ success: true });
    
    // Clear cookies by setting them with an expired date
    const expiredOptions = {
      path: '/',
      httpOnly: true,
      expires: new Date(0), // Set to epoch time to expire immediately
      maxAge: 0
    };
    
    response.cookies.set('idToken', '', expiredOptions);
    response.cookies.set('accessToken', '', expiredOptions);
    response.cookies.set('refreshToken', '', expiredOptions);
    response.cookies.set('onboardingStep', '', expiredOptions);
    response.cookies.set('onboardedStatus', '', expiredOptions);
    
    logger.debug('[API] Auth cookies cleared successfully');
    
    return response;
  } catch (error) {
    logger.error('[API] Error clearing auth cookies:', error);
    return NextResponse.json(
      { error: 'Failed to clear cookies' },
      { status: 500 }
    );
  }
}