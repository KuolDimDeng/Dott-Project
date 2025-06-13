import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    // Call Auth0 to verify the code
    const auth0Response = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'http://auth0.com/oauth/grant-type/passwordless/otp',
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        username: email,
        otp: code,
        realm: 'email',
        audience: process.env.AUTH0_AUDIENCE,
        scope: 'openid profile email',
      }),
    });

    if (auth0Response.ok) {
      const data = await auth0Response.json();
      
      // Mark email as verified in your backend if needed
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-email/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, verified: true }),
        });
      } catch (error) {
        console.error('Failed to update backend:', error);
      }

      return NextResponse.json({ 
        success: true,
        message: 'Email verified successfully'
      });
    } else {
      const errorData = await auth0Response.json();
      return NextResponse.json(
        { error: errorData.error_description || 'Invalid verification code' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}