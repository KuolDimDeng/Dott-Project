import { NextResponse } from 'next/server';
import { validateServerSession } from '@/utils/serverUtils';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * API endpoint to fix onboarding status for users who are stuck in the "subscription" state
 * This is specifically for free plan users whose onboarding status wasn't properly updated
 */
export async function POST(request) {
  const requestId = request.headers.get('X-Request-ID') || uuidv4();
  
  try {
    logger.info(`[api/onboarding/fix-status:${requestId}] Processing fix request`);
    
    // Validate the user's session
    const { user, tokens, verified } = await validateServerSession();
    
    if (!verified || !tokens?.idToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get current user attributes
    const attributes = user?.attributes || {};
    
    // Handle different case variations of 'subscription' status
    const currentOnboardingStatus = attributes['custom:onboarding'] || '';
    const normalizedOnboardingStatus = currentOnboardingStatus.toLowerCase();
    
    // Handle different case variations of 'free' plan
    const currentPlan = attributes['custom:subplan'] || '';
    const normalizedPlan = currentPlan.toLowerCase();
    
    logger.debug(`[api/onboarding/fix-status:${requestId}] Current user status:`, {
      onboarding: currentOnboardingStatus,
      normalizedOnboarding: normalizedOnboardingStatus,
      plan: currentPlan,
      normalizedPlan: normalizedPlan
    });
    
    // Only fix users who are in "subscription" state with "free" plan
    // Check both lowercase and uppercase variations
    if (
      normalizedOnboardingStatus === 'subscription' && 
      normalizedPlan === 'free'
    ) {
      console.log(`[DEBUG][${new Date().toISOString()}] FIX STATUS - Eligible for fix:`, {
        onboarding: currentOnboardingStatus,
        normalizedOnboarding: normalizedOnboardingStatus,
        plan: currentPlan,
        normalizedPlan: normalizedPlan
      });
      
      try {
        // Fix via direct Cognito update
        const { updateUserAttributes } = await import('aws-amplify/auth');
        const timestamp = new Date().toISOString();
        
        // Create the attributes object with all required fields - consistent lowercase
        const attributesToUpdate = {
          'custom:onboarding': 'complete',
          'custom:setupdone': 'true',
          'custom:acctstatus': 'active',
          'custom:updated_at': timestamp,
          'custom:setupcompletedtime': timestamp,
          'custom:onboardingCompletedAt': timestamp
        };
        
        console.log(`[DEBUG][${new Date().toISOString()}] FIX STATUS - Updating attributes:`, attributesToUpdate);
        
        // Update the attributes
        await updateUserAttributes({
          userAttributes: attributesToUpdate
        });
        
        console.log(`[DEBUG][${new Date().toISOString()}] FIX STATUS - Update successful`);
        logger.info(`[api/onboarding/fix-status:${requestId}] Status fixed successfully`);
        
        return NextResponse.json({
          success: true,
          message: 'Onboarding status fixed successfully',
          previousStatus: currentOnboardingStatus,
          currentStatus: 'complete'
        });
      } catch (error) {
        console.error(`[DEBUG][${new Date().toISOString()}] FIX STATUS - Update failed:`, error);
        logger.error(`[api/onboarding/fix-status:${requestId}] Error updating attributes:`, error);
        
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to update attributes',
            message: error.message
          },
          { status: 500 }
        );
      }
    } else {
      // User is not eligible for the fix
      logger.info(`[api/onboarding/fix-status:${requestId}] User not eligible for fix`);
      
      return NextResponse.json({
        success: false,
        message: 'User not eligible for fix',
        onboarding: currentOnboardingStatus,
        normalizedOnboarding: normalizedOnboardingStatus,
        plan: currentPlan,
        normalizedPlan: normalizedPlan
      });
    }
  } catch (error) {
    logger.error(`[api/onboarding/fix-status:${requestId}] Unhandled error:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if a user is eligible for the fix
 */
export async function GET(request) {
  try {
    // Validate the user's session
    const { user } = await validateServerSession();
    
    // Get current user attributes
    const attributes = user?.attributes || {};
    
    // Handle different case variations when checking eligibility
    const currentOnboardingStatus = attributes['custom:onboarding'] || '';
    const normalizedOnboardingStatus = currentOnboardingStatus.toLowerCase();
    
    const currentPlan = attributes['custom:subplan'] || '';
    const normalizedPlan = currentPlan.toLowerCase();
    
    // Check if user is eligible for the fix - using normalized lowercase comparisons
    const isEligible = (
      normalizedOnboardingStatus === 'subscription' && 
      normalizedPlan === 'free'
    );
    
    return NextResponse.json({
      isEligible,
      currentStatus: {
        onboarding: currentOnboardingStatus,
        normalizedOnboarding: normalizedOnboardingStatus,
        plan: currentPlan,
        normalizedPlan: normalizedPlan
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to check eligibility'
      },
      { status: 500 }
    );
  }
} 