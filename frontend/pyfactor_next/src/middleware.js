///Users/kuoldeng/projectx/frontend/pyfactor_next/src/middleware.js
import { NextResponse } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot',
  '/auth/reset',
  '/auth/verify',
  '/auth/verify-email',
  '/auth/callback',
  '/privacy',
  '/terms',
  '/contact'
];

// Onboarding routes and their order
const ONBOARDING_ROUTES = [
  '/onboarding/business-info',
  '/onboarding/subscription',
  '/onboarding/payment',
  '/onboarding/setup'
];

export function middleware(request) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Add environment variables to response headers
  const envVars = {
    NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION,
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  };
  // Add CSP headers to allow Crisp.chat
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://client.crisp.chat; " +
    "connect-src 'self' https://client.crisp.chat wss://client.relay.crisp.chat; " +
    "img-src 'self' https://image.crisp.chat; " +
    "style-src 'self' 'unsafe-inline';"
  );
  response.headers.set('x-environment', JSON.stringify(envVars));

  // First check if it's a public route
  if (PUBLIC_ROUTES.includes(pathname)) {
    return response;
  }

  // Then check auth for protected routes
  const idToken = request.cookies.get('idToken')?.value;
  const accessToken = request.cookies.get('accessToken')?.value;
  const onboardingStep = request.cookies.get('onboardingStep')?.value;

  if (!idToken || !accessToken) {
    // For API routes, return 401 instead of redirecting
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    // For other routes, redirect to signin
    const signinUrl = new URL('/auth/signin', request.url);
    signinUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signinUrl);
  }

  // Add auth tokens to API request headers
  if (pathname.startsWith('/api/')) {
    response.headers.set('Authorization', `Bearer ${accessToken}`);
    response.headers.set('X-Id-Token', idToken);
    return response;
  }

  // Handle onboarding routes
  if (pathname.startsWith('/onboarding/')) {
    const onboardedStatus = request.cookies.get('onboardedStatus')?.value;

    // If user is in SETUP state, allow access to setup page
    if (onboardedStatus === 'SETUP' && pathname === '/onboarding/setup') {
      return response;
    }

    // If no onboarding step set, default to business-info
    if (!onboardingStep) {
      return NextResponse.redirect(new URL('/onboarding/business-info', request.url));
    }

    // Transform onboardingStep back to the format used in routes
    const normalizedStep = onboardingStep?.toLowerCase().replace('_', '-');
    const currentStepIndex = ONBOARDING_ROUTES.indexOf(`/onboarding/${normalizedStep}`);
    const requestedStepIndex = ONBOARDING_ROUTES.indexOf(pathname);
  
    // If we're in BUSINESS_INFO state, ensure we're on the business-info page
    if (onboardedStatus === 'BUSINESS_INFO' && pathname !== '/onboarding/business-info') {
      return NextResponse.redirect(new URL('/onboarding/business-info', request.url));
    }

    // Only allow access to current or completed steps
    if (requestedStepIndex > currentStepIndex + 1) {
      return NextResponse.redirect(new URL(ONBOARDING_ROUTES[currentStepIndex], request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static (public static files)
     * - *.svg (SVG files)
     * - *.png (PNG files)
     */
    '/((?!_next/static|_next/image|favicon.ico|static|.*\\.svg|.*\\.png).*)',
    '/api/:path*'  // Include all API routes
  ],
};