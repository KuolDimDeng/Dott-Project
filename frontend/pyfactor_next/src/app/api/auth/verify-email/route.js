// /api/auth/verify-email/route.js
export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ message: 'Verification token is required' }, { status: 400 });
    }

    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/verify-email/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!backendResponse.ok) {
      const error = await backendResponse.json();
      return NextResponse.json(
        { message: error.message || 'Email verification failed' },
        { status: backendResponse.status }
      );
    }

    // Redirect to signin page after successful verification
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  } catch (error) {
    logger.error('Email verification error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}
