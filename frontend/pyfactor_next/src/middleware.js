///Users/kuoldeng/projectx/frontend/pyfactor_next/src/middleware.js
import { NextResponse } from 'next/server';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { configureAmplify } from '@/config/amplify';
import { isPublicRoute } from '@/lib/authUtils';
import { logger } from '@/utils/logger';

// ✅ Ensure Amplify is only configured once
if (!globalThis.AMPLIFY_CONFIGURED) {
  configureAmplify();
  globalThis.AMPLIFY_CONFIGURED = true;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // ✅ Allow access to public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  try {
    logger.debug(`[Middleware] Checking authentication for ${pathname}`);

    // ✅ Fetch session tokens first
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();

    // ✅ Check for valid session token in cookies
    if (!idToken) {
      logger.warn(`[Middleware] No session token found, redirecting to sign-in for ${pathname}`);
      return NextResponse.redirect(
        new URL(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`, request.url)
      );
    }

    // ✅ Fetch user (should work now with a valid session)
    const user = await getCurrentUser();
    if (!user) {
      logger.warn(`[Middleware] User not found after session check, redirecting to sign-in.`);
      return NextResponse.redirect(
        new URL(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`, request.url)
      );
    }

    logger.debug(`[Middleware] User authenticated: ${user.username}`);

    // ✅ Attach session token to response cookies for consistency
    const response = NextResponse.next();
    response.cookies.set('idToken', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('[Middleware] Authentication check failed:', error);
    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`, request.url)
    );
  }
}

// ✅ Configure protected routes
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
