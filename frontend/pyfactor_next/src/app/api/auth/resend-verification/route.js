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

    const auth0Domain = process.env.AUTH0_DOMAIN || process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
    const clientId = process.env.AUTH0_CLIENT_ID || process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
    const clientSecret = process.env.AUTH0_CLIENT_SECRET;

    if (!auth0Domain || !clientId || !clientSecret) {
      logger.error('[Resend Verification] Auth0 configuration missing');
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      );
    }

    try {
      // Get Management API token
      const tokenResponse = await fetch(`https://${auth0Domain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          audience: `https://${auth0Domain}/api/v2/`
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        logger.error('[Resend Verification] Failed to get management token:', error);
        return NextResponse.json(
          { error: 'Failed to authenticate with verification service' },
          { status: 500 }
        );
      }

      const { access_token } = await tokenResponse.json();

      // Search for the user
      const searchResponse = await fetch(
        `https://${auth0Domain}/api/v2/users-by-email?` + new URLSearchParams({ email }),
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      if (!searchResponse.ok || (await searchResponse.json()).length === 0) {
        logger.error('[Resend Verification] User not found');
        return NextResponse.json(
          { error: 'User not found. Please sign up first.' },
          { status: 404 }
        );
      }

      const users = await searchResponse.json();
      const user = users[0];

      // Send verification email using Auth0 Management API
      const verificationResponse = await fetch(
        `https://${auth0Domain}/api/v2/jobs/verification-email`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.user_id,
            client_id: clientId
          })
        }
      );

      if (verificationResponse.ok) {
        logger.info('[Resend Verification] Verification email sent successfully to:', email);
        return NextResponse.json({
          success: true,
          message: 'Verification email sent successfully. Please check your inbox.'
        });
      } else {
        const errorData = await verificationResponse.json();
        logger.error('[Resend Verification] Failed to send verification email:', errorData);
        return NextResponse.json(
          { error: errorData.message || 'Failed to send verification email' },
          { status: 400 }
        );
      }
    } catch (error) {
      logger.error('[Resend Verification] Unexpected error:', error);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
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