import { NextResponse } from 'next/server';
import { validateServerSession } from '@/utils/serverUtils';
import { logger } from '@/utils/serverLogger';
import { v4 as uuidv4 } from 'uuid';

/**
 * API endpoint to update onboarding progress in Cognito
 * This provides a dedicated endpoint for updating the custom:onboarding attribute
 * as users navigate through the onboarding flow.
 */
export async function POST(request) {
  const requestId = uuidv4().substring(0, 8);
  logger.info(`[API:${requestId}] Update onboarding progress request initiated`);
  
  try {
    // Extract the request body first to get the step even if auth fails
    const body = await request.json();
    const { step, ...additionalAttributes } = body;
    
    // Make sure we have a step value
    if (!step) {
      logger.warn(`[API:${requestId}] Missing step value in request`);
      return NextResponse.json(
        { error: 'Missing step value' },
        { status: 400 }
      );
    }
    
    // Validate the step value
    const validSteps = [
      'not_started',
      'business_info',
      'subscription',
      'payment',
      'setup',
      'complete'
    ];
    
    if (!validSteps.includes(step.toLowerCase())) {
      logger.warn(`[API:${requestId}] Invalid onboarding step provided: ${step}`);
      return NextResponse.json(
        { error: 'Invalid step value' },
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
    
    logger.info(`[API:${requestId}] Update onboarding progress request:`, {
      step: normalizedStep,
      userId: user?.sub || 'unknown',
      authenticated: !!verified,
      attributesCount: Object.keys(additionalAttributes).length
    });
    
    // If we're not authenticated, return a mock success response
    // This allows the onboarding to continue visually while we wait for auth
    if (!verified || !user) {
      logger.warn(`[API:${requestId}] No authenticated user for onboarding progress update`);
      
      // Set cookies in the response to help with state management
      const response = NextResponse.json({
        success: true,
        message: 'Onboarding progress update saved in cookies (no authenticated user)',
        step: normalizedStep,
        mock: true
      });
      
      // Set cookies in the response
      response.cookies.set('onboardingStep', normalizedStep, { 
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/' 
      });
      response.cookies.set('onboardedStatus', normalizedStep, { 
        maxAge: 60 * 60 * 24 * 7, 
        path: '/' 
      });
      
      return response;
    }
    
    // Get AWS credentials from environment variables
    const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    
    if (!userPoolId) {
      logger.error(`[API:${requestId}] Missing Cognito user pool ID in environment`);
      return NextResponse.json(
        { error: 'Server configuration error: Missing user pool ID' },
        { status: 500 }
      );
    }
    
    // Prepare the attributes to update
    const attributes = {
      'custom:onboarding': normalizedStep,
      ...additionalAttributes
    };
    
    // Add additional attributes for the 'complete' step
    if (normalizedStep === 'complete') {
      attributes['custom:setupdone'] = 'true';
      attributes['custom:onboardingCompletedAt'] = new Date().toISOString();
      attributes['custom:updated_at'] = new Date().toISOString();
    }
    
    // Get the user ID from the token
    const sub = user?.sub || tokens?.idToken?.payload?.sub;
    
    if (!sub) {
      logger.error(`[API:${requestId}] Unable to determine user ID from token`);
      return NextResponse.json(
        { error: 'Unable to determine user ID' },
        { status: 400 }
      );
    }
    
    // Use dynamic import for AWS SDK to ensure it only loads on the server
    const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } =
      await import('@aws-sdk/client-cognito-identity-provider');
    
    // Create the AWS client
    const client = new CognitoIdentityProviderClient({ region });
    
    // Prepare the request payload
    const userAttributes = Object.entries(attributes).map(([Name, Value]) => ({
      Name,
      Value: String(Value)
    }));
    
    logger.info(`[API:${requestId}] Updating attributes for user ${sub.substring(0, 8)}:`, 
      userAttributes.map(attr => attr.Name).join(', '));
    
    const payload = {
      UserAttributes: userAttributes,
      UserPoolId: userPoolId,
      Username: sub
    };
    
    // Make the API call to Cognito with retry logic
    const maxRetries = 3;
    let retryCount = 0;
    let lastError = null;
    
    while (retryCount <= maxRetries) {
      try {
        const command = new AdminUpdateUserAttributesCommand(payload);
        await client.send(command);
        
        logger.info(`[API:${requestId}] Onboarding progress updated successfully: ${normalizedStep}`);
        
        // Create the success response
        const response = NextResponse.json({
          success: true,
          message: 'Onboarding progress updated successfully',
          step: normalizedStep,
          attributes: userAttributes.map(attr => attr.Name)
        });
        
        // Set cookies in the response as backup
        response.cookies.set('onboardingStep', normalizedStep, { 
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/' 
        });
        response.cookies.set('onboardedStatus', normalizedStep, { 
          maxAge: 60 * 60 * 24 * 7, 
          path: '/' 
        });
        
        return response;
      } catch (awsError) {
        lastError = awsError;
        retryCount++;
        
        logger.warn(`[API:${requestId}] AWS error updating onboarding progress (attempt ${retryCount}/${maxRetries}):`, awsError);
        
        if (retryCount <= maxRetries) {
          // Exponential backoff delay (100ms, 200ms, 400ms)
          const delay = 100 * Math.pow(2, retryCount - 1);
          logger.info(`[API:${requestId}] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // After all retries failed, try fallback method with token
    if (tokens?.accessToken) {
      try {
        logger.info(`[API:${requestId}] Attempting fallback update with user token`);
        
        const endpoint = `https://cognito-idp.${region}.amazonaws.com/`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.UpdateUserAttributes',
            'Authorization': `Bearer ${tokens.accessToken}`
          },
          body: JSON.stringify({
            AccessToken: tokens.accessToken,
            UserAttributes: userAttributes
          })
        });
        
        if (response.ok) {
          logger.info(`[API:${requestId}] Fallback update successful`);
          
          // Create the success response
          const successResponse = NextResponse.json({
            success: true,
            message: 'Onboarding progress updated successfully via token',
            step: normalizedStep
          });
          
          // Set cookies in the response as backup
          successResponse.cookies.set('onboardingStep', normalizedStep, { 
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/' 
          });
          successResponse.cookies.set('onboardedStatus', normalizedStep, { 
            maxAge: 60 * 60 * 24 * 7, 
            path: '/' 
          });
          
          return successResponse;
        } else {
          const errorData = await response.json().catch(() => ({}));
          logger.error(`[API:${requestId}] Fallback update failed:`, errorData);
          throw new Error(errorData.message || 'Failed to update attributes with token');
        }
      } catch (tokenError) {
        logger.error(`[API:${requestId}] Token-based update failed:`, tokenError);
        
        // Create a semi-success response with cookies despite the API error
        const fallbackResponse = NextResponse.json({
          success: true, // Report success to the client so the UI flow can continue
          warning: 'Failed to update Cognito attribute but saved in cookies',
          step: normalizedStep,
          fallback: true
        });
        
        // Set cookies in the response
        fallbackResponse.cookies.set('onboardingStep', normalizedStep, { 
          maxAge: 60 * 60 * 24 * 7, // 7 days 
          path: '/' 
        });
        fallbackResponse.cookies.set('onboardedStatus', normalizedStep, { 
          maxAge: 60 * 60 * 24 * 7, 
          path: '/' 
        });
        
        return fallbackResponse;
      }
    } else {
      // No access token available for fallback, but still return cookies
      logger.error(`[API:${requestId}] No access token available for fallback update`);
      
      // Create a semi-success response with cookies despite the error
      const cookieFallbackResponse = NextResponse.json({
        success: true, // Report success to the client so the UI flow can continue
        warning: 'Failed to update Cognito attribute but saved in cookies',
        step: normalizedStep,
        fallback: true
      });
      
      // Set cookies in the response
      cookieFallbackResponse.cookies.set('onboardingStep', normalizedStep, { 
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/' 
      });
      cookieFallbackResponse.cookies.set('onboardedStatus', normalizedStep, { 
        maxAge: 60 * 60 * 24 * 7, 
        path: '/' 
      });
      
      return cookieFallbackResponse;
    }
  } catch (error) {
    logger.error(`[API:${requestId}] Error processing onboarding progress update:`, error);
    
    // Create a semi-success response with cookies despite the error
    const errorResponse = NextResponse.json({
      success: true, // Report success to the client so the UI flow can continue
      warning: 'Error processing but saved in cookies',
      error: error.message || 'Unknown error',
      fallback: true
    });
    
    // Set cookies in the response if we have a step
    try {
      const normalizedStep = error.step || 'unknown';
      errorResponse.cookies.set('onboardingStep', normalizedStep, { 
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/' 
      });
      errorResponse.cookies.set('onboardedStatus', normalizedStep, { 
        maxAge: 60 * 60 * 24 * 7, 
        path: '/' 
      });
    } catch (cookieError) {
      logger.error(`[API:${requestId}] Failed to set cookies in error response:`, cookieError);
    }
    
    return errorResponse;
  }
} 