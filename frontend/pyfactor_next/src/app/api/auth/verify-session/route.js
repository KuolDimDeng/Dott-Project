import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverAuth';

/**
 * Endpoint to verify user session and return Cognito attribute data
 * This is a preferred replacement for cookie-based session validation
 */
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
      // Prepare the response with cognito attributes
      logger.debug(`[Session API] Session verification successful for user ${user.userId} ${requestId}`);
      
      // Extract relevant user attributes from token
      const {
        email,
        given_name: firstName = '',
        family_name: lastName = '',
        sub: userId,
        'custom:onboarding': onboardingStatus = 'not_started',
        'custom:businessname': businessName = '',
        'custom:businesstype': businessType = '',
        'custom:tenant_id': tenantId = '',
        'custom:businessid': businessId = '',
        'custom:setupdone': setupDone = '',
        'custom:subscription_done': subscriptionDone = '',
        'custom:payment_done': paymentDone = '',
        'custom:business_info_done': businessInfoDone = '',
        'custom:subplan': subscriptionPlan = ''
      } = user.attributes || {};
      
      const response = {
        isLoggedIn: true,
        authenticated: true,
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          onboardingStatus,
          businessName,
          businessType,
          tenantId: tenantId || businessId || null,
          subscriptionPlan,
          setupDone: setupDone === 'TRUE',
          subscriptionDone: subscriptionDone === 'TRUE',
          paymentDone: paymentDone === 'TRUE',
          businessInfoDone: businessInfoDone === 'TRUE',
          lastVerified: new Date().toISOString(),
        },
        requestId
      };
      
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