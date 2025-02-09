import { NextResponse } from 'next/server';
import { getCurrentUser } from 'aws-amplify/auth';
import { configureAmplify } from '@/config/amplify';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    // Ensure Amplify is configured
    configureAmplify();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get the request body
    const paymentData = await request.json();

    // Process payment through backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
        'X-Request-ID': crypto.randomUUID()
      },
      body: JSON.stringify({
        ...paymentData,
        periodEnd: paymentData.periodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Default to 30 days
      })
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    // Update onboarding status
    const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
        'X-Request-ID': crypto.randomUUID()
      },
      body: JSON.stringify({
        payment_completed: true,
        current_step: 'setup'
      })
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to update onboarding status: ${statusResponse.status}`);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Payment processed successfully'
    });

  } catch (error) {
    logger.error('Error processing payment:', {
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to process payment'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Ensure Amplify is configured
    configureAmplify();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get payment status through backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/status`, {
      headers: {
        'Authorization': `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
        'X-Request-ID': crypto.randomUUID()
      }
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const status = await response.json();

    return NextResponse.json({ 
      success: true,
      paymentCompleted: status?.payment_completed || false
    });

  } catch (error) {
    logger.error('Error checking payment status:', {
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to check payment status'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Ensure Amplify is configured
    configureAmplify();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get the request body
    const updates = await request.json();

    // Update payment information through backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/current`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
        'X-Request-ID': crypto.randomUUID()
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Payment information updated successfully'
    });

  } catch (error) {
    logger.error('Error updating payment information:', {
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to update payment information'
      },
      { status: 500 }
    );
  }
}
