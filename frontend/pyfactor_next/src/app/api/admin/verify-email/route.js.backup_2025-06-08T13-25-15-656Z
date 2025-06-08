import { NextResponse } from 'next/server';
import { 
  CognitoIdentityProviderClient, 
  AdminUpdateUserAttributesCommand 
} from '@aws-sdk/client-cognito-identity-provider';
import { logger } from '@/utils/serverLogger';

/**
 * API route to mark a user's email as verified via admin API
 * This is used when the standard verification flow confirms the user but doesn't mark email as verified
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
      logger.warn('[API] /admin/verify-email - Missing email in request');
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    logger.debug('[API] /admin/verify-email - Verifying email for user', { email });
    
    // Get AWS credentials from environment variables
    const region = process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1';
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    
    // Validate required environment variables
    if (!userPoolId || !accessKeyId || !secretAccessKey) {
      logger.error('[API] /admin/verify-email - Missing required environment variables', {
        hasUserPoolId: !!userPoolId,
        hasAccessKeyId: !!accessKeyId,
        hasSecretKey: !!secretAccessKey
      });
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Create Cognito client
    const client = new CognitoIdentityProviderClient({ 
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      } 
    });
    
    // Create command to set email_verified attribute to true
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        {
          Name: 'email_verified',
          Value: 'true'
        }
      ]
    });
    
    try {
      // Execute the command
      logger.debug('[API] /admin/verify-email - Sending AdminUpdateUserAttributes command');
      const result = await client.send(command);
      
      logger.info('[API] /admin/verify-email - Email verified successfully', { 
        email, 
        result: result.$metadata 
      });
      
      // Return success response
      return NextResponse.json(
        { success: true, message: 'Email verified successfully' },
        { status: 200, headers: corsHeaders }
      );
    } catch (cognitoError) {
      logger.error('[API] /admin/verify-email - Cognito error', {
        message: cognitoError.message,
        code: cognitoError.code,
        name: cognitoError.name
      });
      
      // Determine appropriate status code based on error
      let statusCode = 500;
      let errorMessage = 'An error occurred while verifying email';
      
      if (cognitoError.name === 'UserNotFoundException') {
        statusCode = 404;
        errorMessage = 'User not found';
      } else if (cognitoError.name === 'InvalidParameterException') {
        statusCode = 400;
        errorMessage = 'Invalid parameters';
      } else if (cognitoError.name === 'NotAuthorizedException') {
        statusCode = 403;
        errorMessage = 'Not authorized to perform this action';
      }
      
      // Return error response
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          details: cognitoError.message
        },
        { status: statusCode, headers: corsHeaders }
      );
    }
  } catch (error) {
    logger.error('[API] /admin/verify-email - Error verifying email', { 
      message: error.message, 
      stack: error.stack
    });
    
    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: 'An error occurred while verifying email',
        details: error.message
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 