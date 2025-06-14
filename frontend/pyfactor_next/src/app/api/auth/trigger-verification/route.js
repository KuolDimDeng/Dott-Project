import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    logger.info('[Trigger Verification] Processing request for:', email);

    // Get Management API token
    const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        audience: `https://${AUTH0_DOMAIN}/api/v2/`
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      logger.error('[Trigger Verification] Failed to get management token:', error);
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      );
    }

    const { access_token } = await tokenResponse.json();

    // Search for the user
    const searchResponse = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users-by-email?` + new URLSearchParams({ email }),
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!searchResponse.ok) {
      logger.error('[Trigger Verification] Failed to find user');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const users = await searchResponse.json();
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Send verification email using Auth0 Management API
    const verificationResponse = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/jobs/verification-email`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.user_id,
          client_id: AUTH0_CLIENT_ID
        })
      }
    );

    if (!verificationResponse.ok) {
      const error = await verificationResponse.json();
      logger.error('[Trigger Verification] Failed to send verification email:', error);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    logger.info('[Trigger Verification] Verification email sent successfully to:', email);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
      note: 'Please check your email for the verification link'
    });

  } catch (error) {
    logger.error('[Trigger Verification] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}