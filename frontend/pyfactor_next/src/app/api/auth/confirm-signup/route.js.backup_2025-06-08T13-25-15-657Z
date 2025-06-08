import { NextResponse } from 'next/server';
import { confirmSignUp } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';

/**
 * API handler for confirming user signup
 * This endpoint is used to confirm a user's registration with a verification code
 */
export async function POST(request) {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
      logger.info(`[API] Confirm-signup received request:`, { 
        username: requestBody.username ? `${requestBody.username.substring(0, 5)}...` : undefined,
        hasCode: !!requestBody.code
      });
    } catch (parseError) {
      logger.error(`[API] Error parsing request body:`, parseError);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400, headers }
      );
    }

    const { username, code } = requestBody;
    
    if (!username || !code) {
      logger.warn(`[API] Missing required fields for confirm-signup`);
      return NextResponse.json(
        { error: 'Username and verification code are required' },
        { status: 400, headers }
      );
    }
    
    logger.info(`[API] Confirming signup for user: ${username.substring(0, 5)}...`);
    
    // Call Amplify's confirmSignUp function
    try {
      const result = await confirmSignUp({
        username,
        confirmationCode: code
      });
      
      logger.info(`[API] Signup confirmation result:`, result);
      
      // Return successful response
      return NextResponse.json({
        success: true,
        message: 'Email verification successful'
      }, { headers });
    } catch (confirmError) {
      logger.error(`[API] Error from Amplify confirmSignUp:`, confirmError);
      throw confirmError; // Pass to catch block below
    }
  } catch (error) {
    logger.error('[API] Error confirming signup:', error);
    
    // Handle different Cognito error types
    if (error.name === 'CodeMismatchException') {
      return NextResponse.json(
        { error: 'Invalid verification code. Please try again.' },
        { status: 400, headers }
      );
    } else if (error.name === 'ExpiredCodeException') {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new code.' },
        { status: 400, headers }
      );
    } else if (error.name === 'UserNotFoundException') {
      return NextResponse.json(
        { error: 'User not found. Please sign up first.' },
        { status: 404, headers }
      );
    } else if (error.name === 'NotAuthorizedException') {
      // This often happens when a user is already confirmed
      return NextResponse.json(
        { 
          success: true,
          message: 'User is already confirmed. Please sign in.',
          alreadyConfirmed: true
        },
        { headers }
      );
    }
    
    // Generic error response
    return NextResponse.json(
      { error: 'An error occurred during verification. Please try again.' },
      { status: 500, headers }
    );
  }
}

// Support OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    }
  });
} 