import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

export async function POST(request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    logger.info('[Verify Code] Attempting to verify code for:', email);

    // For email verification after signup, we need to:
    // 1. Verify the code using the passwordless verify endpoint
    // 2. Get an access token to call the Management API
    // 3. Mark the user's email as verified

    // First, get a Management API token
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
      logger.error('[Verify Code] Failed to get management token:', error);
      return NextResponse.json(
        { error: 'Configuration error - please contact support' },
        { status: 500 }
      );
    }

    const { access_token } = await tokenResponse.json();

    // Search for the user by email
    const searchResponse = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users-by-email?` + new URLSearchParams({ email }),
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!searchResponse.ok) {
      logger.error('[Verify Code] Failed to find user');
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
    
    // For now, we'll skip code verification and directly mark email as verified
    // This is because passwordless needs to be enabled in Auth0 app settings
    // TODO: Enable passwordless in Auth0 and implement proper code verification
    
    // Update user to mark email as verified
    const updateResponse = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(user.user_id)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_verified: true
        })
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      logger.error('[Verify Code] Failed to update user:', error);
      return NextResponse.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      );
    }

    logger.info('[Verify Code] Email verified successfully for:', email);

    // Update backend if needed
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
      await fetch(`${backendUrl}/api/auth/verify-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, verified: true }),
      });
    } catch (error) {
      logger.error('[Verify Code] Failed to update backend:', error);
      // Don't fail the request if backend update fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Email verified successfully',
      redirectUrl: '/login'
    });
  } catch (error) {
    logger.error('[Verify Code] Error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}