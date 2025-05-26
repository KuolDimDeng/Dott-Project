import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { isValidUUID } from '@/utils/tenantUtils';
import { validateServerSession } from '@/utils/serverAuth';

/**
 * API endpoint for fetching user profile data
 * Uses proper token-based authentication instead of server-side Cognito calls
 */
export async function GET(request) {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    logger.debug(`[UserProfile API] Fetching profile, request ${requestId}`);
    
    // Use server session validation instead of direct Cognito calls
    try {
      const sessionData = await validateServerSession(request);
      
      if (!sessionData.verified || !sessionData.user) {
        logger.warn(`[UserProfile API] Session validation failed, request ${requestId}:`, sessionData.error);
        return NextResponse.json(
          { 
            error: 'Not authenticated',
            message: sessionData.error || 'Session validation failed',
            requestId 
          },
          { status: 401 }
        );
      }
      
      const { user } = sessionData;
      const userAttributes = user.attributes || {};
      
      // Prepare tenant ID - ensure it's a valid UUID
      let tenantId = userAttributes['custom:tenant_ID'] ||
                     userAttributes['custom:tenantId'] ||
                     userAttributes['custom:businessid'] ||
                     userAttributes['custom:tenant_id'] ||
                     null;
      
      if (tenantId && !isValidUUID(tenantId)) {
        logger.warn(`[UserProfile API] Invalid tenant ID format: "${tenantId}", using null instead`);
        tenantId = null;
      }
      
      // Map available attributes to profile response
      const profile = {
        userId: userAttributes.sub || user.userId,
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
      
      logger.info(`[UserProfile API] Profile fetched successfully from session for ${profile.email}`);
      
      return NextResponse.json({
        profile,
        source: 'session',
        requestId
      });
      
    } catch (sessionError) {
      logger.error(`[UserProfile API] Session validation failed: ${sessionError.message}`);
      
      // Return a response that triggers client-side fallback
      return NextResponse.json({
        error: 'use_client_fallback',
        message: 'Session validation failed, use client-side fallback',
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