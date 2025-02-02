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
    // Redirect with success parameter
    const redirectUrl = new URL('/auth/signin', req.url);
    redirectUrl.searchParams.set('verified', 'true');
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    logger.error('Email verification error:', error);
    const redirectUrl = new URL('/auth/signin', req.url);
    redirectUrl.searchParams.set('verificationError', error.message);
    return NextResponse.redirect(redirectUrl);
  }
}