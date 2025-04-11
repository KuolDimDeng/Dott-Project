import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverUtils';

export async function POST(request) {
  try {
    // Validate session using server utils
    const { tokens, user } = await validateServerSession();

    const accessToken = tokens.accessToken.toString();
    const idToken = tokens.idToken.toString();
    const userId = user.userId;

    // Get user attributes
    const attributes = user.attributes || {};
    const onboardingStatus = attributes['custom:onboarding'] || 'NOT_STARTED';

    // Get the request body
    const paymentData = await request.json();

    // Process payment through backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/payments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Id-Token': idToken,
          'X-User-ID': userId,
          'X-Request-ID': crypto.randomUUID(),
          'X-Onboarding-Status': onboardingStatus
        },
        body: JSON.stringify({
          ...paymentData,
          periodEnd:
            paymentData.periodEnd ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default to 30 days
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    // Update onboarding status
    const statusResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Id-Token': idToken,
          'X-User-ID': userId,
          'X-Request-ID': crypto.randomUUID(),
          'X-Onboarding-Status': onboardingStatus
        },
        body: JSON.stringify({
          current_status: onboardingStatus,
          next_status: 'SETUP',
          lastStep: 'PAYMENT',
          userId: userId,
          attributes: {
            'custom:onboarding': 'SETUP',
            'custom:payment_status': 'COMPLETED',
            'custom:updated_at': new Date().toISOString()
          }
        }),
      }
    );

    if (!statusResponse.ok) {
      throw new Error(
        `Failed to update onboarding status: ${statusResponse.status}`
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      nextStep: 'SETUP'
    });
  } catch (error) {
    logger.error('Error processing payment:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process payment',
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
    const onboardingStatus = attributes['custom:onboarding'] || 'NOT_STARTED';

    // Get payment status through backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/status`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Id-Token': idToken,
          'X-User-ID': userId,
          'X-Request-ID': crypto.randomUUID(),
          'X-Onboarding-Status': onboardingStatus
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const status = await response.json();

    return NextResponse.json({
      success: true,
      paymentCompleted: status?.payment_completed || false,
      currentStatus: onboardingStatus
    });
  } catch (error) {
    logger.error('Error checking payment status:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check payment status',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Validate session using server utils
    const { tokens, user } = await validateServerSession();

    const accessToken = tokens.accessToken.toString();
    const idToken = tokens.idToken.toString();
    const userId = user.userId;

    // Get user attributes
    const attributes = user.attributes || {};
    const onboardingStatus = attributes['custom:onboarding'] || 'NOT_STARTED';

    // Get the request body
    const updates = await request.json();

    // Update payment information through backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/payments/current`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Id-Token': idToken,
          'X-User-ID': userId,
          'X-Request-ID': crypto.randomUUID(),
          'X-Onboarding-Status': onboardingStatus
        },
        body: JSON.stringify({
          ...updates,
          userId: userId
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment information updated successfully',
    });
  } catch (error) {
    logger.error('Error updating payment information:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update payment information',
      },
      { status: 500 }
    );
  }
}
