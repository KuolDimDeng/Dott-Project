import { NextResponse } from 'next/server';
import { standardSecurityHeaders } from '@/utils/responseHeaders';

export async function POST(request) {
  try {
    const body = await request.json();
    const { accessToken, refreshToken, csrfToken } = body;

    if (!accessToken || !refreshToken || !csrfToken) {
      return NextResponse.json(
        { error: 'Missing required tokens' },
        { status: 400, headers: standardSecurityHeaders }
      );
    }

    // Create the response
    const response = NextResponse.json(
      { success: true },
      { status: 200, headers: standardSecurityHeaders }
    );
    
    // Store access token in httpOnly cookie
    response.cookies.set('admin_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours
    });

    // Store refresh token in httpOnly cookie
    response.cookies.set('admin_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Store CSRF token in regular cookie (needs to be readable by JavaScript)
    response.cookies.set('admin_csrf_token', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;

  } catch (error) {
    console.error('[Admin Auth Store] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: standardSecurityHeaders }
    );
  }
}