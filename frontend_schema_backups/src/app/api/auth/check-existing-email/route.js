import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';

export async function POST(request) {
  try {
    const requestData = await request.json();
    const email = requestData.email?.toLowerCase();

    logger.info('[check-existing-email] Checking if email exists:', { email });

    if (!email) {
      logger.info('[check-existing-email] No email provided');
      return NextResponse.json({ exists: false, error: 'No email provided' }, { status: 400 });
    }

    const exists = await checkEmailInCognito(email);

    logger.info('[check-existing-email] Email check result:', { email, exists });

    return NextResponse.json({ exists });
  } catch (error) {
    logger.info('[check-existing-email] Error checking email:', {
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: error.message, exists: false },
      { status: 500 }
    );
  }
}

/**
 * Check if an email exists in Cognito or development mock database
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} - Whether the email exists
 */
async function checkEmailInCognito(email) {
  // For development environment, use a mock list
  if (process.env.NODE_ENV === 'development') {
    // Mock list of existing emails for development
    const mockExistingEmails = [
      'test@example.com', 
      'user@example.com', 
      'admin@example.com'
    ];
    
    return mockExistingEmails.includes(email.toLowerCase());
  }
  
  // In production, check against Cognito
  try {
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const region = process.env.NEXT_PUBLIC_AWS_REGION;
    
    if (!userPoolId || !region) {
      logger.info('[check-existing-email] Missing Cognito configuration');
      throw new Error('Missing Cognito configuration');
    }
    
    // Dynamically import AWS SDK v3 to ensure it only loads on the server
    const { CognitoIdentityProviderClient, ListUsersCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const client = new CognitoIdentityProviderClient({ region });
    
    // Use listUsers with a filter to check if the email exists
    const params = {
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
      Limit: 1
    };
    
    const command = new ListUsersCommand(params);
    const result = await client.send(command);
    return result.Users && result.Users.length > 0;
  } catch (error) {
    logger.info('[check-existing-email] Error checking email in Cognito:', {
      message: error.message,
      code: error.code
    });
    
    // Consider the email as not existing if there's an error
    // This is safer than blocking sign-ups
    return false;
  }
} 