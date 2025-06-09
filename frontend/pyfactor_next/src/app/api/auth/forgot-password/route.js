import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
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

    logger.info('[ForgotPassword] Requesting password reset for:', email);

    // Request password reset from Auth0
    const resetEndpoint = `https://${AUTH0_DOMAIN}/dbconnections/change_password`;
    
    const resetBody = {
      client_id: AUTH0_CLIENT_ID,
      email: email,
      connection: 'Username-Password-Authentication'
    };

    const resetResponse = await fetch(resetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resetBody)
    });

    const resetResult = await resetResponse.text(); // Auth0 returns text, not JSON

    if (!resetResponse.ok) {
      logger.error('[ForgotPassword] Auth0 password reset failed:', {
        status: resetResponse.status,
        error: resetResult
      });

      // Try to parse error if it's JSON
      try {
        const errorData = JSON.parse(resetResult);
        return NextResponse.json(
          { error: errorData.description || errorData.message || 'Failed to send password reset email' },
          { status: resetResponse.status }
        );
      } catch {
        return NextResponse.json(
          { error: 'Failed to send password reset email' },
          { status: resetResponse.status }
        );
      }
    }

    logger.info('[ForgotPassword] Password reset email sent successfully');

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully'
    });

  } catch (error) {
    logger.error('[ForgotPassword] Error requesting password reset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}