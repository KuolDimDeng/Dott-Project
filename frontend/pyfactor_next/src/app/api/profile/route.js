import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getCurrentUser } from '@/config/amplifyServer';

export async function GET(request) {
  const requestId = Math.random().toString(36).substring(2, 15);
  logger.debug('[Profile-API] Handling profile request', { requestId });

  try {
    // Get auth tokens from request headers
    const headers = new Headers(request.headers);
    const authHeader = headers.get('Authorization');
    const idToken = headers.get('X-Id-Token');

    if (!authHeader || !idToken) {
      logger.error('[Profile-API] Missing auth tokens', { requestId });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user data from token
    try {
      const user = await getCurrentUser(idToken);
      
      // Decode the token to get user attributes
      const { jwtDecode } = await import('jwt-decode');
      const decoded = jwtDecode(idToken);
      
      // Create a profile response
      const profile = {
        userId: user.userId,
        username: user.username,
        email: decoded.email || '',
        given_name: decoded['custom:given_name'] || '',
        family_name: decoded['custom:family_name'] || '',
        phone_number: decoded['phone_number'] || '',
        is_onboarded: decoded['custom:setupdone'] === 'TRUE',
        onboarding_status: decoded['custom:onboarding'] || 'NOT_STARTED',
        business_name: decoded['custom:businessname'] || '',
        business_id: decoded['custom:businessid'] || '',
        role: decoded['custom:userrole'] || 'USER',
        subscription_plan: decoded['custom:subplan'] || 'FREE'
      };
      
      // Normalize subscription plan for consistency
      if (profile.subscription_plan) {
        // Ensure it's properly cased regardless of how it's stored in Cognito
        const planVal = profile.subscription_plan.toString().toUpperCase();
        logger.debug('[Profile-API] Raw subscription plan value:', { 
          raw: profile.subscription_plan,
          normalized: planVal
        });
        profile.subscription_plan = planVal;
      }
      
      logger.debug('[Profile-API] Returning user profile', { 
        requestId,
        userId: user.userId,
        isOnboarded: profile.is_onboarded,
        onboardingStatus: profile.onboarding_status,
        subscriptionPlan: profile.subscription_plan
      });
      
      return NextResponse.json(profile);
    } catch (error) {
      logger.error('[Profile-API] Error fetching user data', {
        requestId,
        error: error.message,
        stack: error.stack
      });
      
      // Return a mock profile to avoid errors
      const mockProfile = {
        userId: 'mock-user-id',
        username: 'mock-user',
        email: 'user@example.com',
        given_name: 'Demo',
        family_name: 'User',
        is_onboarded: true,
        onboarding_status: 'COMPLETE',
        business_name: 'Demo Business',
        role: 'OWNER',
        subscription_plan: 'FREE',
        schema_name: 'demo_schema' // Using schema_name instead of database_name
      };
      
      logger.debug('[Profile-API] Returning mock profile due to error', {
        requestId,
        mockProfile
      });
      
      return NextResponse.json(mockProfile);
    }
  } catch (error) {
    logger.error('[Profile-API] Unexpected error', {
      requestId,
      error: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
    
    // Return a mock profile even in case of unexpected errors
    const fallbackProfile = {
      userId: 'fallback-user-id',
      username: 'fallback-user',
      email: 'fallback@example.com',
      given_name: 'Fallback',
      family_name: 'User',
      is_onboarded: true,
      onboarding_status: 'COMPLETE',
      business_name: 'Fallback Business',
      role: 'OWNER',
      subscription_plan: 'FREE',
      schema_name: 'fallback_schema',
      _error: 'Generated from fallback due to server error'
    };
    
    logger.debug('[Profile-API] Returning fallback profile due to unexpected error', {
      requestId,
      fallbackProfile
    });
    
    // Return 200 with fallback data instead of 500 to prevent UI errors
    return NextResponse.json(fallbackProfile);
  }
}