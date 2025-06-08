import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';
import { logger } from '@/utils/logger';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Cognito configuration
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

// Initialize the client
const client = new CognitoIdentityProviderClient({
  region: AWS_REGION,
  // Credentials will be automatically loaded in AWS Lambda environment
  // or from environment variables AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
});

/**
 * API route to fix Cognito attributes for onboarding completion
 */
export async function POST(request) {
  try {
    // Get session cookie properly with await
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('pyfactor_session');
    
    if (!sessionCookie || !sessionCookie.value) {
      logger.error('No session cookie found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse session data
    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch (error) {
      logger.error('Invalid session data', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const username = sessionData.username;
    if (!username) {
      logger.error('No username in session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get attributes to update from request body
    const { attributes = {} } = await request.json().catch(() => ({}));
    
    // For new users, always include onboarding status if not explicitly provided
    if (!attributes['custom:onboarding']) {
      attributes['custom:onboarding'] = 'INCOMPLETE';
    }
    
    // Format attributes for AWS SDK v3
    const userAttributes = Object.entries(attributes).map(([name, value]) => ({
      Name: name,
      Value: value,
    }));
    
    if (userAttributes.length === 0) {
      logger.warn('No attributes to update');
      return NextResponse.json({ success: true, message: 'No attributes to update' });
    }
    
    // Execute update
    const updateParams = {
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: username,
      UserAttributes: userAttributes,
    };
    
    const command = new AdminUpdateUserAttributesCommand(updateParams);
    await client.send(command);
    logger.info(`Updated attributes for user ${username}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error updating user attributes', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 