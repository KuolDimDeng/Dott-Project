import { NextResponse } from 'next/server';
// Removed AWS Cognito import - now using Auth0
import { validateServerSession } from '@/utils/serverUtils';
import { logger } from '@/utils/serverLogger';
import { v4 as uuidv4 } from 'uuid';

/**
 * API endpoint to update onboarding progress in Cognito
 * This provides a dedicated endpoint for updating the custom:onboarding attribute
 * as users navigate through the onboarding flow.
 * 
 * Simplified approach:
 * - Sets 'subscription' when business info is submitted
 * - Sets 'complete' when subscription is submitted
 */
export async function POST(request) {
  const requestId = uuidv4().substring(0, 8);
  logger.info(`[API:${requestId}] Update onboarding step request initiated`);
  
  try {
    // Extract the request body first to get the step even if auth fails
    const body = await request.json();
    const { step, attributes = {} } = body;
    
    // Make sure we have a step value
    if (!step) {
      logger.warn(`[API:${requestId}] Missing step value in request`);
      return NextResponse.json(
        { error: 'Missing step value' },
        { status: 400 }
      );
    }
    
    // Normalize the step value to lowercase
    const normalizedStep = step.toLowerCase();
    
    // Get the authenticated user from the session
    const { user, tokens, verified } = await validateServerSession().catch(err => {
      logger.warn(`[API:${requestId}] Session validation failed:`, err);
      return { user: null, tokens: null, verified: false };
    });
    
    logger.info(`[API:${requestId}] Update onboarding step request:`, {
      step: normalizedStep,
      userId: user?.sub || 'unknown',
      authenticated: !!verified,
      attributesCount: Object.keys(attributes).length
    });
    
    // If we're not authenticated, return a mock success response
    // This allows the onboarding to continue visually while we wait for auth
    if (!verified || !user) {
      logger.warn(`[API:${requestId}] No authenticated user for onboarding step update`);
      
      // Set cookies in the response to help with state management
      const response = NextResponse.json({
        success: true,
        message: 'Onboarding step update saved in cookies (no authenticated user)',
        step: normalizedStep,
        mock: true
      });
      
      // Set cookies in the response
      response.cookies.set('onboardingStep', normalizedStep, { 
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/' 
      });
      
      return response;
    }
    
    // Simplified approach - Map to appropriate Cognito custom:onboarding value
    // based on the current step
    let onboardingValue;
    
    // Check if this is for a free plan specifically
    const isFreeOrBasicPlan = body.plan === 'free' || body.plan === 'basic';
    
    if (isFreeOrBasicPlan) {
      // Always set to complete for free plans
      onboardingValue = 'complete';
    } else if (normalizedStep === 'business_info' || normalizedStep === 'business-info') {
      onboardingValue = 'subscription';
    } else if (normalizedStep === 'subscription') {
      onboardingValue = 'complete';
    } else {
      onboardingValue = normalizedStep;
    }
    
    // Prepare the attributes to update
    const attributesToUpdate = {
      'custom:onboarding': onboardingValue,
      'custom:updated_at': new Date().toISOString(),
      ...attributes
    };
    
    // Add additional attributes for the 'complete' step
    if (onboardingValue === 'complete') {
      attributesToUpdate['custom:setupdone'] = 'true';
      attributesToUpdate['custom:onboardingCompletedAt'] = new Date().toISOString();
    }
    
    logger.debug(`[API:${requestId}] Updating user attributes:`, {
      attributes: Object.keys(attributesToUpdate),
      onboardingValue,
      originalStep: normalizedStep
    });
    
    try {
      // Update Cognito attributes
      await updateUserAttributesServer(user.sub, attributesToUpdate);
      
      logger.info(`[API:${requestId}] Successfully updated Cognito attributes`);
      
      // Send success response
      return NextResponse.json({
        success: true,
        message: 'Onboarding step updated successfully',
        step: normalizedStep,
        onboardingValue
      });
    } catch (cognitoError) {
      logger.error(`[API:${requestId}] Failed to update Cognito attributes:`, {
        error: cognitoError.message,
        code: cognitoError.code
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to update user attributes',
          message: cognitoError.message
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    logger.error(`[API:${requestId}] Error in update-step:`, error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
} 