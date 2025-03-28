import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverAuth';

export async function GET(request) {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    logger.debug(`[Session API] Verification request ${requestId}`);
    
    // Validate session using server utils
    const { tokens, user } = await validateServerSession();
    
    if (!user) {
      logger.debug(`[Session API] Session verification failed - user not authenticated ${requestId}`);
      return NextResponse.json({
        isLoggedIn: false,
        authenticated: false,
        requestId
      });
    }
    
    try {
      // Return basic user session data
      logger.debug(`[Session API] Session verification successful for user ${user.userId} ${requestId}`);
      
      const response = {
        isLoggedIn: true,
        authenticated: true,
        user: {
          id: user.userId,
          email: user.attributes?.email,
          lastLogin: new Date().toISOString(),
        },
        requestId
      };
      
      // Add onboarding status if available
      if (user.attributes && user.attributes['custom:onboarding']) {
        response.user.onboardingStatus = user.attributes['custom:onboarding'];
      }
      
      return NextResponse.json(response);
      
    } catch (error) {
      logger.error(`[Session API] Error constructing session response: ${error.message}`);
      throw error;
    }
    
  } catch (error) {
    logger.error(`[Session API] Error verifying session: ${error.message}`);
    
    // Return fallback error but with 200 status so client can handle it gracefully
    return NextResponse.json({
      isLoggedIn: false,
      authenticated: false,
      error: 'Failed to verify session',
      fallback: true,
      requestId
    }, { 
      status: 200
    });
  }
} 