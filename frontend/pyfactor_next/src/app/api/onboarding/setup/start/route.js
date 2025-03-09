import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverUtils';
import { updateOnboardingStep } from '@/utils/onboardingUtils';

export async function POST(request) {
  try {
    // Get tokens from request headers
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const idToken = request.headers.get('X-Id-Token');
    
    if (!accessToken || !idToken) {
      logger.error('[SetupStart] No auth tokens in request headers');
      return NextResponse.json(
        { error: 'No valid session' },
        { status: 401 }
      );
    }

    // Store tokens for later use
    const tokens = {
      accessToken,
      idToken
    };

    // Validate session using server utils
    const { user } = await validateServerSession(tokens);
    const userId = user.userId;

    // Forward request to backend to start schema setup
    const backendApiUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
    
    // Log user information for debugging
    logger.debug('[SetupStart] User information:', {
      userId,
      hasAttributes: !!user.attributes,
      businessId: user.attributes?.['custom:businessid'],
      onboarding: user.attributes?.['custom:onboarding']
    });
    
    // Get request body
    const requestBody = await request.text();
    const parsedBody = JSON.parse(requestBody);
    
    // Ensure the request body includes the user ID
    const enhancedBody = {
      ...parsedBody,
      userId: userId,
      cognitoUserId: userId
    };
    
    // Add business ID if available
    if (user.attributes?.['custom:businessid']) {
      enhancedBody.businessId = user.attributes['custom:businessid'];
    }
    
    const response = await fetch(`${backendApiUrl}/api/onboarding/setup/start/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Id-Token': idToken,
        'X-User-ID': userId,
        'X-Cognito-Sub': userId,
        'X-Business-ID': user.attributes?.['custom:businessid'] || ''
      },
      body: JSON.stringify(enhancedBody)
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If response is not valid JSON, use text instead
        errorData = { error: await response.text() };
      }
      
      logger.error('[SetupStart] Backend request failed:', {
        status: response.status,
        error: errorData
      });
      
      return NextResponse.json(
        {
          error: 'Failed to start setup process',
          details: errorData.error || 'Unknown error',
          code: errorData.code || 'unknown_error'
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // If setup completed successfully
    if (data.setup_complete) {
      // Update onboarding status to COMPLETE
      await updateOnboardingStep('COMPLETE', {
        'custom:setupdone': 'TRUE',
        'custom:setupcompletetime': new Date().toISOString()
      }, {
        accessToken: accessToken,
        idToken: idToken
      });

      return NextResponse.json({
        success: true,
        message: 'Setup completed successfully',
        status: 'COMPLETE'
      });
    }

    // Return success response for background processing
    return NextResponse.json({
      success: true,
      message: 'Setup started in background',
      taskId: data.task_id
    });

  } catch (error) {
    logger.error('[SetupStart] Error processing request:', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      {
        error: 'Setup start process failed',
        details: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}