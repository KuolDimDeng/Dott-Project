import { NextResponse } from 'next/server';
import { verifyToken } from '@/utils/tokenUtils';
import { serverLogger } from '@/utils/logger';
import { 
  AdminSetUserPasswordCommand, 
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient
} from '@aws-sdk/client-cognito-identity-provider';

// Initialize Cognito client
function getCognitoClient() {
  return new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
}

/**
 * POST endpoint to complete employee verification and set password
 */
export async function POST(request) {
  try {
    // Get request body
    const body = await request.json();
    const { token, password } = body;
    
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: token, password' },
        { status: 400 }
      );
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }
    
    // Get user details from token
    const { userId, email } = decoded;
    
    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Invalid token data' },
        { status: 400 }
      );
    }
    
    // Initialize Cognito client
    const client = getCognitoClient();
    
    // Get user pool ID from environment variables
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) {
      return NextResponse.json(
        { error: 'User pool ID not configured' },
        { status: 500 }
      );
    }
    
    // 1. Set user password
    try {
      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: userId,
        Password: password,
        Permanent: true // Make the password permanent (not temporary)
      });
      
      await client.send(setPasswordCommand);
    } catch (error) {
      serverLogger.error('Error setting user password:', error);
      return NextResponse.json(
        { error: 'Failed to set password: ' + error.message },
        { status: 500 }
      );
    }
    
    // 2. Mark email as verified
    try {
      const updateAttributesCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: userId,
        UserAttributes: [
          {
            Name: 'email_verified',
            Value: 'true'
          }
        ]
      });
      
      await client.send(updateAttributesCommand);
    } catch (error) {
      serverLogger.error('Error updating user attributes:', error);
      // Continue anyway - the important part is that the password is set
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Employee verification completed successfully'
    });
  } catch (error) {
    serverLogger.error('Error completing employee verification:', error);
    return NextResponse.json(
      { error: 'Failed to complete verification: ' + error.message },
      { status: 500 }
    );
  }
} 