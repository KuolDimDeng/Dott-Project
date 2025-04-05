import { NextResponse } from 'next/server';
import { 
  CognitoIdentityProviderClient, 
  AdminConfirmSignUpCommand,
  AdminUpdateUserAttributesCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { logger } from '@/utils/serverLogger';

/**
 * API route to confirm a user via admin API
 * This is a fallback mechanism when the normal confirmation process fails
 */
export async function POST(request) {
  // Enable CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
  }
  
  try {
    // Parse request body
    const body = await request.json();
    const { email } = body;
    
    // Validate input
    if (!email) {
      logger.warn('[API] /admin/confirm-user - Missing email in request');
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    logger.debug('[API] /admin/confirm-user - Confirming user', { email });
    
    // Get AWS credentials from environment variables
    const region = process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1';
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    
    // Validate required environment variables
    if (!userPoolId || !accessKeyId || !secretAccessKey) {
      logger.error('[API] /admin/confirm-user - Missing required environment variables', {
        hasUserPoolId: !!userPoolId,
        hasAccessKeyId: !!accessKeyId,
        hasSecretKey: !!secretAccessKey
      });
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    logger.debug('[API] /admin/confirm-user - Creating Cognito client with credentials', {
      region,
      userPoolId,
      hasAccessKey: !!accessKeyId,
      hasSecretKey: !!secretAccessKey,
      envVars: Object.keys(process.env).filter(key => key.startsWith('AWS_') || key.startsWith('NEXT_PUBLIC_')),
    });
    
    // Create Cognito client
    const client = new CognitoIdentityProviderClient({ 
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      } 
    });
    
    logger.debug('[API] /admin/confirm-user - Creating AdminConfirmSignUp command', {
      userPoolId,
      username: email
    });
    
    // Create the AdminConfirmSignUp command
    const command = new AdminConfirmSignUpCommand({
      UserPoolId: userPoolId,
      Username: email
    });
    
    try {
      // Execute the command
      logger.debug('[API] /admin/confirm-user - Sending AdminConfirmSignUp command');
      const result = await client.send(command);
      
      logger.info('[API] /admin/confirm-user - User confirmed successfully', { 
        email, 
        result: result.$metadata 
      });
      
      // Also mark email as verified
      try {
        logger.debug('[API] /admin/confirm-user - Setting email_verified attribute to true');
        const adminUpdateAttributesCommand = new AdminUpdateUserAttributesCommand({
          UserPoolId: userPoolId,
          Username: email,
          UserAttributes: [
            {
              Name: 'email_verified',
              Value: 'true'
            }
          ]
        });
        
        await client.send(adminUpdateAttributesCommand);
        logger.info('[API] /admin/confirm-user - Set email_verified attribute to true');
      } catch (attrError) {
        logger.error('[API] /admin/confirm-user - Error setting email_verified attribute', {
          message: attrError.message,
          code: attrError.code
        });
        // Continue anyway since the main confirmation succeeded
      }
      
      // Return success response
      return NextResponse.json(
        { success: true, message: 'User confirmed successfully' },
        { status: 200, headers: corsHeaders }
      );
    } catch (cognitoError) {
      logger.error('[API] /admin/confirm-user - Cognito error', {
        message: cognitoError.message,
        code: cognitoError.code,
        name: cognitoError.name,
        stack: cognitoError.stack
      });
      
      // Determine appropriate status code based on error
      let statusCode = 500;
      let errorMessage = 'An error occurred while confirming the user';
      let errorDetail = cognitoError.message;
      
      if (cognitoError.name === 'UserNotFoundException') {
        statusCode = 404;
        errorMessage = 'User not found';
      } else if (cognitoError.name === 'InvalidParameterException') {
        statusCode = 400;
        errorMessage = 'Invalid parameters';
      } else if (cognitoError.name === 'NotAuthorizedException') {
        statusCode = 403;
        errorMessage = 'Not authorized to perform this action';
      } else if (
        cognitoError.name === 'UnrecognizedClientException' || 
        cognitoError.name === 'InvalidSignatureException' ||
        (cognitoError.message && cognitoError.message.includes('security token'))
      ) {
        statusCode = 401;
        errorMessage = 'AWS credentials are invalid or expired';
        errorDetail = 'The AWS credentials configured for this application are invalid or expired. ' +
                      'Please check the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables ' +
                      'in the .env.local file and ensure they are correct and active in the AWS IAM console.';
        
        // Log detailed credential diagnostic info (without exposing secrets)
        logger.error('[API] /admin/confirm-user - AWS credential issue detected', {
          hasAccessKeyId: !!accessKeyId,
          accessKeyIdPrefix: accessKeyId ? accessKeyId.substring(0, 4) + '...' : 'NONE',
          hasSecretKey: !!secretAccessKey,
          secretKeyLength: secretAccessKey ? secretAccessKey.length : 0,
          region,
          userPoolId
        });
      }
      
      // Return error response
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          details: errorDetail,
          errorName: cognitoError.name,
          code: cognitoError.code
        },
        { status: statusCode, headers: corsHeaders }
      );
    }
  } catch (error) {
    logger.error('[API] /admin/confirm-user - Error confirming user', { 
      message: error.message, 
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    
    // Determine appropriate status code based on error
    let statusCode = 500;
    let errorMessage = 'An error occurred while confirming the user';
    
    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: statusCode, headers: corsHeaders }
    );
  }
} 