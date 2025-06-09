import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

export async function POST(request) {
  try {
    const { email, password, given_name, family_name, name } = await request.json();

    logger.info('[Signup] Creating new account:', { email, given_name, family_name });

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!given_name || !family_name) {
      return NextResponse.json(
        { error: 'First and last name are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Create user in Auth0
    const signupEndpoint = `https://${AUTH0_DOMAIN}/dbconnections/signup`;
    
    const signupBody = {
      client_id: AUTH0_CLIENT_ID,
      email: email,
      password: password,
      connection: 'Username-Password-Authentication',
      user_metadata: {
        given_name: given_name,
        family_name: family_name,
        name: name || `${given_name} ${family_name}`,
        needs_onboarding: 'true',
        onboarding_completed: 'false'
      }
    };

    logger.debug('[Signup] Sending signup request to Auth0:', {
      endpoint: signupEndpoint,
      connection: 'Username-Password-Authentication',
      email: email
    });

    const signupResponse = await fetch(signupEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signupBody)
    });

    const signupResult = await signupResponse.json();

    if (!signupResponse.ok) {
      logger.error('[Signup] Auth0 signup failed:', {
        status: signupResponse.status,
        error: signupResult
      });

      // Handle specific Auth0 errors
      if (signupResult.code === 'invalid_signup' && signupResult.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: signupResult.description || signupResult.message || 'Failed to create account' },
        { status: signupResponse.status }
      );
    }

    logger.info('[Signup] Account created successfully:', {
      userId: signupResult._id,
      email: signupResult.email
    });

    // Return success - the client will handle auto-login
    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      userId: signupResult._id,
      email: signupResult.email
    });

  } catch (error) {
    logger.error('[Signup] Error creating account:', error);
    return NextResponse.json(
      { error: 'Internal server error during signup' },
      { status: 500 }
    );
  }
}