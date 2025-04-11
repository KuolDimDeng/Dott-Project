import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverUtils';
import { v4 as uuidv4 } from 'uuid';

/**
 * API endpoint to mark onboarding as complete
 * This calls the backend to ensure the user's onboarding status is updated
 */
export async function POST(request) {
  // Track request with unique ID
  const requestId = request.headers.get('X-Request-ID') || uuidv4();
  
  try {
    logger.info(`[api/onboarding/complete:${requestId}] Processing onboarding completion request`);
    
    // Validate the user's session
    const { user, tokens, verified } = await validateServerSession();
    
    // Get attributes from request body
    let attributes = {};
    try {
      const body = await request.json();
      attributes = body.attributes || {};
    } catch (e) {
      // If body parsing fails, use default attributes
      logger.warn(`[api/onboarding/complete:${requestId}] Failed to parse request body:`, e.message);
    }
    
    // Ensure required attributes are set
    attributes['custom:onboarding'] = 'complete'; // Always lowercase
    attributes['custom:setupdone'] = 'true';      // Always lowercase
    attributes['custom:updated_at'] = attributes['custom:updated_at'] || new Date().toISOString();
    
    logger.debug(`[api/onboarding/complete:${requestId}] Attributes to update:`, attributes);
    
    // If not verified, but we're in development, proceed with a mock success
    if (!verified && process.env.NODE_ENV === 'development') {
      logger.warn(`[api/onboarding/complete:${requestId}] Not authenticated but allowing in dev mode`);
      return NextResponse.json({
        success: true,
        message: 'Onboarding completion acknowledged (dev mode)',
        mock: true
      });
    }
    
    // For production, we require proper authentication
    if (!verified || !tokens?.idToken) {
      logger.error(`[api/onboarding/complete:${requestId}] Authentication required`);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Try three different approaches to ensure the attribute gets updated
    let backendSuccess = false;
    let cognitoSuccess = false;
    
    // 1. First try: Update via Cognito Admin API
    try {
      logger.debug(`[api/onboarding/complete:${requestId}] Attempting Cognito admin update`);
      
      // Import the AWS SDK for Cognito
      const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } = 
        await import('@aws-sdk/client-cognito-identity-provider');
      
      // Get configuration from environment
      const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
      const userPoolId = process.env.COGNITO_USER_POOL_ID;
      
      if (!userPoolId) {
        throw new Error('Missing user pool ID in environment variables');
      }
      
      // Map attributes to Cognito format
      const userAttributes = Object.entries(attributes).map(([name, value]) => ({
        Name: name,
        Value: String(value) // Ensure value is a string
      }));
      
      // Get user sub (ID) from token
      const sub = user?.sub || tokens?.idToken?.payload?.sub;
      
      if (!sub) {
        throw new Error('Could not determine user ID');
      }
      
      // Create Cognito client
      const client = new CognitoIdentityProviderClient({ region });
      
      // Create command
      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: sub,
        UserAttributes: userAttributes
      });
      
      // Send command
      await client.send(command);
      
      cognitoSuccess = true;
      logger.info(`[api/onboarding/complete:${requestId}] Cognito attributes updated successfully`);
    } catch (cognitoError) {
      logger.error(`[api/onboarding/complete:${requestId}] Cognito update failed:`, {
        error: cognitoError.message,
        code: cognitoError.code || 'unknown'
      });
    }
    
    // 2. Second try: Call backend API
    try {
      logger.debug(`[api/onboarding/complete:${requestId}] Attempting backend API update`);
      
      // Get the backend API URL from environment variables
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const endpoint = `/api/onboarding/complete/`;
      const requestUrl = `${backendUrl}${endpoint}`;
      
      // Make the request to the backend
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
          'X-Id-Token': tokens.idToken,
          'X-Request-ID': requestId
        },
        body: JSON.stringify({
          force_complete: true,
          attributes
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Backend returned status ${response.status}: ${errorText}`);
      }
      
      backendSuccess = true;
      
      const data = await response.json().catch(() => ({ status: 'success' }));
      logger.info(`[api/onboarding/complete:${requestId}] Backend update successful:`, {
        status: data.status,
        redirect: data.redirect_to || data.redirect
      });
      
      // Return response from backend
      return NextResponse.json({
        success: true,
        backendSuccess,
        cognitoSuccess,
        message: 'Onboarding completed successfully',
        redirect: data.redirect_to || data.redirect || '/dashboard',
        data
      });
    } catch (backendError) {
      logger.error(`[api/onboarding/complete:${requestId}] Backend API call failed:`, {
        error: backendError.message
      });
      
      // If Cognito update succeeded but backend failed, still return success
      if (cognitoSuccess) {
        return NextResponse.json({
          success: true,
          backendSuccess: false,
          cognitoSuccess: true,
          message: 'Onboarding marked as complete (Cognito only)',
          redirect: '/dashboard'
        });
      }
      
      // 3. Third try: Update using the user attributes API
      try {
        logger.debug(`[api/onboarding/complete:${requestId}] Attempting user attributes API as fallback`);
        
        const response = await fetch('/api/user/update-attributes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.accessToken}`,
            'X-Request-ID': requestId
          },
          body: JSON.stringify({
            attributes,
            forceUpdate: true
          })
        });
        
        if (!response.ok) {
          throw new Error(`User attributes API returned status ${response.status}`);
        }
        
        const result = await response.json();
        logger.info(`[api/onboarding/complete:${requestId}] User attributes API successful:`, {
          success: result.success
        });
        
        return NextResponse.json({
          success: true,
          backendSuccess: false,
          cognitoSuccess: false,
          attributesApiSuccess: true,
          message: 'Onboarding marked as complete (attributes API)',
          redirect: '/dashboard'
        });
      } catch (attributesError) {
        logger.error(`[api/onboarding/complete:${requestId}] All update methods failed:`, {
          error: attributesError.message
        });
        
        // Last resort: Return error with details
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to mark onboarding as complete after multiple attempts',
            details: backendError.message,
            request_id: requestId
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    logger.error(`[api/onboarding/complete:${requestId}] Unexpected error:`, {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
        request_id: requestId
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Validate session using server utils
    const { tokens, user } = await validateServerSession();

    const accessToken = tokens.accessToken.toString();
    const idToken = tokens.idToken.toString();
    const userId = user.userId;

    // Get user attributes
    const attributes = user.attributes || {};
    const onboardingStatus = (attributes['custom:onboarding'] || 'NOT_STARTED').toLowerCase();
    // Normalize setupDone to handle both 'TRUE' and 'true' values
    const setupDone = (attributes['custom:setupdone'] || '').toLowerCase() === 'true';

    return NextResponse.json({
      success: true,
      isComplete: onboardingStatus === 'complete' && setupDone,
      currentStatus: onboardingStatus,
      setupDone
    });
  } catch (error) {
    logger.error('[Complete] Error checking completion status:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check completion status',
      },
      { status: 500 }
    );
  }
}