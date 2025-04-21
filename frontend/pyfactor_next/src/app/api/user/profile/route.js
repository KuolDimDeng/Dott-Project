import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { isValidUUID } from '@/utils/tenantUtils';
import { getUserAttributes } from '@/utils/cognito'; // Import the Cognito utility

/**
 * API endpoint for fetching user profile data
 * Falls back to direct Cognito attribute access when needed
 */
export async function GET(request) {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    logger.debug(`[UserProfile API] Fetching profile, request ${requestId}`);
    
    // Get user attributes directly from Cognito
    try {
      const userAttributes = await getUserAttributes();
      
      if (!userAttributes || Object.keys(userAttributes).length === 0) {
        logger.warn(`[UserProfile API] No user attributes found, request ${requestId}`);
        return NextResponse.json(
          { 
            error: 'Not authenticated',
            requestId 
          },
          { status: 401 }
        );
      }
      
      // Prepare tenant ID - ensure it's a valid UUID
      let tenantId = userAttributes['custom:tenant_ID'] || 
                      userAttributes['custom:tenantId'] || 
                      userAttributes['custom:businessid'] || null;
      
      if (tenantId && !isValidUUID(tenantId)) {
        logger.warn(`[UserProfile API] Invalid tenant ID format: "${tenantId}", using null instead`);
        tenantId = null;
      }
      
      // Map available attributes to profile response
      const profile = {
        userId: userAttributes.sub,
        email: userAttributes.email,
        firstName: userAttributes['given_name'] || userAttributes['custom:firstname'] || '',
        lastName: userAttributes['family_name'] || userAttributes['custom:lastname'] || '',
        tenantId: tenantId,
        businessName: userAttributes['custom:businessname'] || '',
        businessType: userAttributes['custom:businesstype'] || '',
        legalStructure: userAttributes['custom:legalstructure'] || '',
        subscriptionPlan: userAttributes['custom:subplan'] || '',
        subscriptionStatus: userAttributes['custom:subscriptionstatus'] || 'pending',
        onboardingStatus: userAttributes['custom:onboarding'] || 'not_started',
        setupDone: userAttributes['custom:setupdone'] === 'TRUE' || userAttributes['custom:setupdone'] === 'true',
        currency: userAttributes['custom:currency'] || 'USD',
        timezone: userAttributes['custom:timezone'] || 'America/New_York',
        language: userAttributes['custom:language'] || 'en',
        userRole: userAttributes['custom:userrole'] || 'user',
        createdAt: userAttributes['custom:created_at'] || null,
        updatedAt: userAttributes['custom:updated_at'] || null
      };
      
      // Add flags to help the frontend with state decisions
      profile.isOnboarded = profile.setupDone === true;
      profile.requiresOnboarding = !profile.isOnboarded;
      
      // Determine onboarding progress
      profile.onboardingSteps = {
        businessInfo: Boolean(profile.businessName && profile.businessType),
        subscription: Boolean(profile.subscriptionPlan),
        payment: profile.subscriptionPlan === 'free' || userAttributes['custom:payverified'] === 'TRUE'
      };
      
      logger.info(`[UserProfile API] Profile fetched successfully from Cognito for ${profile.email}`);
      
      return NextResponse.json({
        profile,
        source: 'cognito',
        requestId
      });
      
    } catch (cognitoError) {
      logger.error(`[UserProfile API] Error fetching from Cognito: ${cognitoError.message}`);
      
      // Try fallback to localStorage/AppCache on client side
      // Return a response that triggers client-side fallback
      return NextResponse.json({
        error: 'use_client_fallback',
        message: 'Unable to fetch profile from server, use client-side fallback',
        requestId
      }, { status: 503 });
    }
  } catch (error) {
    logger.error(`[UserProfile API] Error fetching profile: ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch profile', 
        message: error.message,
        requestId 
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for updating user profile
 */
export async function POST(request) {
  logger.info('[API] User profile POST request received');
  try {
    // Get request body
    const profileData = await request.json();
    logger.debug('[API] User profile POST data:', profileData);
    
    // Since we're using Cognito directly, we'll just simulate a successful update
    // In a production implementation, this would call the updateUserAttributes API
    
    return NextResponse.json({
      ...profileData,
      updated_at: new Date().toISOString(),
      status: 'success',
      message: 'Profile update simulated. In production, this would update Cognito attributes.'
    });
  } catch (error) {
    logger.error('[API] User profile POST error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to update user profile',
      message: error.message 
    }, { status: 500 });
  }
} 