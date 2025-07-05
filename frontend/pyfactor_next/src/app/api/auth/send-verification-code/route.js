import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Use Auth0 passwordless API to send a verification code
    const auth0Response = await fetch(`https://${process.env.AUTH0_DOMAIN}/passwordless/start`, {
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
      return NextResponse.json({ 
        success: true,
        message: 'Verification code sent successfully'
      });
    } else {
      const errorData = await auth0Response.json();
      console.error('Auth0 passwordless start error:', errorData);
      return NextResponse.json(
        { error: errorData.error_description || 'Failed to send verification code' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Send verification code error:', error);
    return NextResponse.json(
      { error: 'An error occurred while sending verification code' },
      { status: 500 }
    );
  }
}