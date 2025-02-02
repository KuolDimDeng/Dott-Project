
///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/resend-verification/route.js
import { NextResponse } from 'next/server';
import logger from '@/utils/logger';

export async function POST(req) {
  logger.debug('POST request received at /api/auth/resend-verification');

  try {
    // Parse the request body to get the email
    const body = await req.json();
    const { email } = body;

    // Validate email presence
    if (!email) {
      logger.warn('Resend verification attempt without email');
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn('Invalid email format for resend verification', { email });
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    // Make request to Django backend to resend verification email
    logger.debug('Sending resend verification request to backend', {
      email,
      url: `${process.env.NEXT_PUBLIC_API_URL}/api/resend-verification/`,
    });

    const backendResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/resend-verification/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          confirmation_url: `${process.env.NEXT_PUBLIC_URL}/auth/verify-email`,
        }),
      }
    );

    // Log the backend response for debugging
    logger.debug('Received response from backend', {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
    });

    // Handle unsuccessful backend response
    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();

      // Handle specific error cases
      if (backendResponse.status === 404) {
        logger.warn('User not found for verification email resend', { email });
        return NextResponse.json(
          { message: 'No user found with this email address' },
          { status: 404 }
        );
      }

      if (backendResponse.status === 409) {
        logger.info('Attempted to resend verification for already verified email', { email });
        return NextResponse.json({ message: 'This email is already verified' }, { status: 409 });
      }

      // Handle other backend errors
      logger.error('Backend error during verification resend', errorData);
      return NextResponse.json(
        { message: errorData.message || 'Failed to resend verification email' },
        { status: backendResponse.status }
      );
    }

    // Handle successful resend
    const data = await backendResponse.json();
    logger.info('Successfully resent verification email', { email });

    return NextResponse.json({
      success: true,
      message: 'Verification email has been resent. Please check your inbox.',
      data,
    });
  } catch (error) {
    // Handle unexpected errors
    logger.error('Unexpected error in resend verification route', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { message: 'An unexpected error occurred while resending verification email' },
      { status: 500 }
    );
  }
}
