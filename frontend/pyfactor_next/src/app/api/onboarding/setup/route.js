import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverUtils';
import { cookies } from 'next/headers';
import { updateOnboardingStep } from '@/utils/onboardingUtils';

export async function POST(request) {
  try {
    // Get tokens from request headers
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const idToken = request.headers.get('X-Id-Token');
    
    if (!accessToken || !idToken) {
      logger.error('[Setup] No auth tokens in request headers');
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

    // Get user attributes
    const attributes = user.attributes || {};
    const onboardingStatus = attributes['custom:onboarding'] || 'NOT_STARTED';

    logger.debug('[Setup] User onboarding status:', {
      status: onboardingStatus,
      userId: user.userId
    });

    // Validate status transition
    if (onboardingStatus === 'COMPLETE') {
      return NextResponse.json(
        { error: 'Cannot update setup after onboarding is complete' },
        { status: 400 }
      );
    }

    const validPreviousStates = ['SUBSCRIPTION', 'PAYMENT'];
    if (!validPreviousStates.includes(onboardingStatus)) {
      return NextResponse.json(
        { error: 'Must complete subscription and payment (if required) before setup' },
        { status: 400 }
      );
    }

    // Check if payment is required but not completed
    const requiresPayment = attributes['custom:requirespayment'] === 'TRUE';
    if (requiresPayment && onboardingStatus !== 'PAYMENT') {
      return NextResponse.json(
        { error: 'Must complete payment before setup' },
        { status: 400 }
      );
    }

    const userId = user.userId;

    // Add CSRF protection header
    const csrfToken = request.headers.get('X-CSRF-Token') || crypto.randomUUID();
    
    // Get setup status to include business info
    const backendApiUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
    
    const setupStatusResponse = await fetch(
      `${backendApiUrl}/api/onboarding/setup/status/`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Id-Token': idToken,
          'X-User-ID': userId,
          'X-Onboarding-Status': onboardingStatus
        }
      }
    );

    if (!setupStatusResponse.ok) {
      logger.error('[Setup] Failed to fetch setup status:', {
        status: setupStatusResponse.status,
        url: `${backendApiUrl}/api/onboarding/setup/status/`
      });
      return NextResponse.json(
        { error: 'Failed to fetch setup status' },
        { status: setupStatusResponse.status }
      );
    }

    const setupStatus = await setupStatusResponse.json();
    if (!setupStatus.business?.id) {
      logger.error('[Setup] No business info found in setup status:', {
        setupStatus,
        userId: user.userId
      });
      return NextResponse.json(
        { error: 'Business information not found' },
        { status: 400 }
      );
    }

    // Forward request to backend with business info
    const backendUrl = `${backendApiUrl}/api/onboarding/setup/`;
    const requestBody = await request.json();

    logger.debug('[Setup] Forwarding request to backend:', {
      url: backendUrl,
      userId,
      businessId: setupStatus.business.id,
      setupOptions: {
        ...requestBody.setup_options,
        subscription: setupStatus.subscription,
        businessInfo: setupStatus.business
      }
    });

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Id-Token': idToken,
        'X-User-ID': userId,
        'X-CSRF-Token': csrfToken,
        'X-Onboarding-Status': onboardingStatus,
        'Origin': request.headers.get('Origin') || 'http://localhost:3000',
      },
      body: JSON.stringify({
        userId,
        businessId: setupStatus.business.id,
        current_status: onboardingStatus,
        next_status: 'SETUP',
        setup_options: {
          ...requestBody.setup_options,
          subscription: setupStatus.subscription,
          businessInfo: setupStatus.business,
          userAttributes: attributes
        }
      })
    });

    logger.debug('[Setup] Backend request sent:', {
      url: backendUrl,
      userId,
      businessId: setupStatus.business.id,
      currentStatus: onboardingStatus,
      nextStatus: 'SETUP'
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('[Setup] Backend request failed:', {
        status: response.status,
        data
      });

      return NextResponse.json(data, { status: response.status });
    }

    logger.debug('[Setup] Backend request successful:', {
      status: response.status,
      data
    });

    // Start schema setup in background
    const setupResponse = await fetch(`${backendApiUrl}/api/onboarding/setup/start/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Id-Token': idToken,
        'X-User-ID': userId,
        'X-Onboarding-Status': onboardingStatus
      },
      body: JSON.stringify({
        userId,
        businessId: setupStatus.business.id,
        setup_options: {
          ...requestBody.setup_options,
          subscription: setupStatus.subscription,
          businessInfo: setupStatus.business
        }
      })
    });

    if (!setupResponse.ok) {
      logger.error('[Setup] Failed to start background setup:', {
        status: setupResponse.status,
        error: await setupResponse.json()
      });
    }

    // Update onboarding status in Cognito with tokens
    await updateOnboardingStep('SETUP', {
      'custom:setupstarted': 'TRUE',
      'custom:setupstarttime': new Date().toISOString()
    }, {
      accessToken: accessToken,
      idToken: idToken
    });

    // Create response with updated cookies
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    };

    // Create response with dashboard redirect
    const jsonResponse = NextResponse.json({
      ...data,
      redirect: '/dashboard',
      message: 'Setup started in background. You will be notified when complete.'
    });

    // Set cookies in response
    jsonResponse.cookies.set('accessToken', accessToken, cookieOptions);
    jsonResponse.cookies.set('idToken', idToken, cookieOptions);
    jsonResponse.cookies.set('onboardingStep', 'SETUP', cookieOptions);

    return jsonResponse;

  } catch (error) {
    logger.error('[Setup] Error processing request:', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      {
        error: 'Setup process failed',
        details: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}