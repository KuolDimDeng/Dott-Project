import { NextResponse } from 'next/server';
import { validateServerSession } from '@/utils/serverUtils';
import { logger } from '@/utils/logger';

/**
 * API endpoint to update user attributes
 * This provides a direct server-side approach to updating Cognito attributes
 * which can be more reliable in certain scenarios than client-side updates
 */
export async function POST(request) {
  try {
    // Get the authenticated user from the session
    const { user, tokens } = await validateServerSession();
    
    if (!user || !tokens?.idToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Extract the request body
    const body = await request.json();
    const { attributes, forceUpdate = false } = body;
    
    if (!attributes || typeof attributes !== 'object') {
      return NextResponse.json(
        { error: 'Invalid attributes object' },
        { status: 400 }
      );
    }
    
    // Validate attributes - only allow specific attributes to be updated
    const allowedAttributes = [
      'custom:onboarding',
      'custom:setupdone',
      'custom:subplan',
      'custom:updated_at'
    ];
    
    // Filter out attributes that are not allowed
    const filteredAttributes = {};
    for (const key in attributes) {
      if (allowedAttributes.includes(key)) {
        filteredAttributes[key] = attributes[key];
      } else if (!forceUpdate) {
        logger.warn(`Attempting to update disallowed attribute: ${key}`);
      }
    }
    
    if (Object.keys(filteredAttributes).length === 0) {
      return NextResponse.json(
        { error: 'No valid attributes to update' },
        { status: 400 }
      );
    }
    
    // Get AWS credentials from environment variables
    const region = process.env.AWS_REGION || 'us-east-1';
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    
    if (!userPoolId) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing user pool ID' },
        { status: 500 }
      );
    }
    
    // Prepare the request to AWS Cognito
    const endpoint = `https://cognito-idp.${region}.amazonaws.com/`;
    
    // Create the attribute updates
    const userAttributes = Object.entries(filteredAttributes).map(([Name, Value]) => ({
      Name,
      Value: String(Value)
    }));
    
    // Get the user ID from the token
    const sub = user.sub || tokens.idToken.payload.sub;
    
    if (!sub) {
      return NextResponse.json(
        { error: 'Unable to determine user ID' },
        { status: 400 }
      );
    }
    
    // Prepare the request payload
    const payload = {
      UserAttributes: userAttributes,
      UserPoolId: userPoolId,
      Username: sub
    };
    
    // Make a direct call to the Admin API using our server's IAM role
    // This will only work if the server is properly configured with AWS IAM permissions
    try {
      const AWS = require('aws-sdk');
      AWS.config.update({ region });
      
      // Use Admin API rather than client API to ensure it works
      const cognitoProvider = new AWS.CognitoIdentityServiceProvider();
      const result = await cognitoProvider.adminUpdateUserAttributes(payload).promise();
      
      logger.info('[API] User attributes updated successfully:', { attributes: filteredAttributes });
      
      return NextResponse.json({
        success: true,
        message: 'Attributes updated successfully',
        attributes: filteredAttributes
      });
    } catch (awsError) {
      logger.error('[API] AWS error updating user attributes:', awsError);
      
      // Fallback to making the request using the user's token
      try {
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
          logger.info('[API] User attributes updated successfully with token:', { attributes: filteredAttributes });
          
          return NextResponse.json({
            success: true,
            message: 'Attributes updated successfully via token',
            attributes: filteredAttributes
          });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update attributes');
        }
      } catch (tokenError) {
        logger.error('[API] Token error updating user attributes:', tokenError);
        
        return NextResponse.json(
          { 
            error: 'Failed to update user attributes', 
            message: tokenError.message 
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    logger.error('[API] Error in update-attributes endpoint:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
} 