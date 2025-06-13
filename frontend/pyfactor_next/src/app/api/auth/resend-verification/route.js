import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * Resend email verification for Auth0 users
 * This endpoint triggers Auth0 to resend the verification email
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    logger.info('[Resend Verification] Processing request for:', email);

    // Auth0 Management API endpoint to resend verification email
    const auth0Domain = process.env.AUTH0_DOMAIN || process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
    const managementApiToken = process.env.AUTH0_MANAGEMENT_API_TOKEN;

    if (!auth0Domain) {
      logger.error('[Resend Verification] Auth0 domain not configured');
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      );
    }

    // Use Auth0 passwordless API to send a verification code
    const auth0Response = await fetch(`https://${auth0Domain}/passwordless/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        connection: 'email',
        email: email,
        send: 'code',
      }),
    });

    if (auth0Response.ok) {
      logger.info('[Resend Verification] Verification code sent successfully to:', email);
      return NextResponse.json({
        success: true,
        message: 'Verification code sent successfully'
      });
    } else {
      const errorData = await auth0Response.json();
      logger.error('[Resend Verification] Auth0 passwordless error:', errorData);
      return NextResponse.json(
        { error: errorData.error_description || 'Failed to send verification code' },
        { status: 400 }
      );
    }

  } catch (error) {
    logger.error('[Resend Verification] Error:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}