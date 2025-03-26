import { NextResponse } from 'next/server';
import acceptLanguage from 'accept-language';
import { i18n } from '../next-i18next.config.mjs';

// Set up accept-language with supported locales
acceptLanguage.languages(i18n.locales);

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot',
  '/auth/reset',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify',
  '/auth/verify-email',
  '/auth/callback',
  '/privacy',
  '/terms',
  '/cookies',  // Added Cookie Policy to public routes
  '/contact',
  '/about',  // Added About page to public routes
  '/careers', // Added Careers page to public routes
  '/press',   // Added Press page to public routes
  '/blog',    // Added Blog to public routes for future use
  '/favicon.ico' // Added favicon.ico to bypass middleware
];

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth/check-existing-email',
  '/api/onboarding/setup/trigger',
  '/api/onboarding/setup/status',
  '/api/auth/set-cookies',
  '/api/auth/callback'
];

// Onboarding routes and their order
const ONBOARDING_ROUTES = [
  '/onboarding/business-info',
  '/onboarding/subscription',
  '/onboarding/payment',
  '/onboarding/setup'
];

export function middleware(request) {
  // Get the pathname from the URL
  const { pathname } = request.nextUrl;
  
  // DETAILED LOGGING: Log all requests with cookies and headers for debugging
  console.log(`[Middleware] Request: ${pathname}`, { 
    cookieCount: request.cookies.getAll().length,
    hasIdToken: !!request.cookies.get('idToken')?.value,
    hasAccessToken: !!request.cookies.get('accessToken')?.value,
    hasTenantId: !!request.cookies.get('tenantId')?.value,
    method: request.method,
    referer: request.headers.get('referer')
  });
  
  // PRODUCT CREATION DEBUGGING: Add special handling for product routes
  if (pathname.startsWith('/dashboard/products/') || pathname === '/dashboard/products/new') {
    console.log(`[Middleware] 🔍 PRODUCT ROUTE DETECTED: ${pathname}`);
    console.log(`[Middleware] 🔍 Product Route Details:`, {
      tenantId: request.cookies.get('tenantId')?.value || 'Not set',
      idToken: request.cookies.get('idToken')?.value ? 'Present (truncated)' : 'Not present',
      allCookies: request.cookies.getAll().map(c => c.name),
      headers: {
        referer: request.headers.get('referer'),
        accept: request.headers.get('accept'),
        'user-agent': request.headers.get('user-agent')
      }
    });
    
    // Ensure we have the tenantId cookie for product operations
    if (!request.cookies.get('tenantId')?.value) {
      console.log(`[Middleware] ⚠️ WARNING: tenantId cookie missing for product route: ${pathname}`);
    }
    
    // Allow product routes to pass through even in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Middleware] 🔧 Development mode: Bypassing strict checks for product route: ${pathname}`);
      return NextResponse.next();
    }
  }
  
  // CRITICAL: Immediately bypass middleware for verify-email routes
  if (pathname === '/auth/verify-email' || pathname.startsWith('/auth/verify-email')) {
    console.log(`[Middleware] BYPASSING ALL CHECKS for verify-email route: ${pathname}`);
    
    // Add some useful debugging information
    console.log(`[Middleware] Verify-email access: pathname=${pathname}, cookies=${request.cookies.getAll().length}, params=${request.nextUrl.searchParams.toString()}`);
    
    return NextResponse.next();
  }
  
  // CRITICAL: Allow direct access to dashboard after subscription
  // This ensures users can access the dashboard after selecting a plan
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    console.log(`[Middleware] 🏠 Dashboard route accessed: ${pathname}`);
    const onboardingStep = request.cookies.get('onboardingStep')?.value;
    const onboardedStatus = request.cookies.get('onboardedStatus')?.value;
    const tenantId = request.cookies.get('tenantId')?.value;
    
    console.log(`[Middleware] 🏠 Dashboard route details:`, {
      tenantId: tenantId || 'Not set',
      onboardingStep: onboardingStep || 'Not set',
      onboardedStatus: onboardedStatus || 'Not set',
      isAuthenticated: !!(request.cookies.get('idToken')?.value && request.cookies.get('accessToken')?.value)
    });
    
    // If we have any indication that the user has completed subscription, allow dashboard access
    // Use a simplified check to reduce processing overhead
    if (onboardingStep?.toUpperCase() === 'SETUP' ||
        onboardedStatus?.toUpperCase() === 'SUBSCRIPTION' ||
        onboardedStatus?.toUpperCase() === 'SETUP' ||
        onboardedStatus?.toUpperCase() === 'COMPLETE') {
      console.log(`[Middleware] BYPASSING CHECKS for dashboard after subscription: step=${onboardingStep}, status=${onboardedStatus}`);
      return NextResponse.next();
    }
  }
  
  // CRITICAL: Handle the /onboarding route when user is already in subscription step
  // This prevents the redirect loop issue
  if (pathname === '/onboarding') {
    const onboardingStep = request.cookies.get('onboardingStep')?.value;
    const onboardedStatus = request.cookies.get('onboardedStatus')?.value;
    
    if (onboardingStep === 'subscription' && onboardedStatus === 'BUSINESS_INFO') {
      console.log(`[Middleware] Redirecting /onboarding to /onboarding/subscription to prevent redirect loop`);
      return NextResponse.redirect(new URL('/onboarding/subscription', request.url));
    }
  }
  
  // Initial response setup
  let response = NextResponse.next();

  // Handle i18n - Determine language
  let lng;
  
  // Check for language in cookies
  if (request.cookies.has('i18nextLng')) {
    lng = request.cookies.get('i18nextLng').value;
  }
  
  // Check for language in Accept-Language header if no cookie
  if (!lng) {
    lng = acceptLanguage.get(request.headers.get('Accept-Language'));
  }
  
  // Fallback to default locale
  if (!lng || !i18n.locales.includes(lng)) {
    lng = i18n.defaultLocale;
  }

  // Store the language in a cookie
  response.cookies.set('i18nextLng', lng);

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
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://client.crisp.chat; " +
    "connect-src 'self' https://client.crisp.chat wss://client.relay.crisp.chat https://cognito-idp.us-east-1.amazonaws.com https://*.stripe.com http://127.0.0.1:8000 http://localhost:8000; " +
    "img-src 'self' data: https://image.crisp.chat; " +
    "style-src 'self' 'unsafe-inline' https://client.crisp.chat; " +
    "font-src 'self' https://client.crisp.chat; " +
    "frame-src 'self' https://www.youtube.com https://*.stripe.com;"
  );
  response.headers.set('x-environment', JSON.stringify(envVars));

  // Log the current pathname for debugging
  console.log(`[Middleware] Processing route: ${pathname}`);
  
  // First check if it's a public route
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || pathname === '/';
  // Check if it's a public API route
  const isPublicApiRoute = PUBLIC_API_ROUTES.some(route => pathname === route);
  
  if (isPublicRoute) {
    console.log(`[Middleware] Public route detected: ${pathname}`);
    return response;
  }

  if (isPublicApiRoute) {
    console.log(`[Middleware] Public API route detected: ${pathname}, bypassing auth check`);
    return response;
  }

  // Then check auth for protected routes
  const idToken = request.cookies.get('idToken')?.value;
  const accessToken = request.cookies.get('accessToken')?.value;
  const onboardingStep = request.cookies.get('onboardingStep')?.value;
  const onboardedStatus = request.cookies.get('onboardedStatus')?.value;

  console.log(`[Middleware] Auth check: idToken=${!!idToken}, accessToken=${!!accessToken}, onboardingStep=${onboardingStep}, onboardedStatus=${onboardedStatus}`);

  // In development mode, be more lenient with authentication
  if (process.env.NODE_ENV !== 'production' && pathname.startsWith('/onboarding/')) {
    console.log(`[Middleware] Development mode: Bypassing strict auth for onboarding route: ${pathname}`);
    
    // If we're in development and this is an onboarding route, allow access
    // This helps with testing the onboarding flow without valid tokens
    if (!idToken || !accessToken) {
      console.log(`[Middleware] Development mode: Setting dummy cookies for onboarding route`);
      
      // Set dummy cookies for development
      response.cookies.set('onboardingStep', 'business-info', {
        path: '/',
        maxAge: 24 * 60 * 60
      });
      
      response.cookies.set('onboardedStatus', 'NOT_STARTED', {
        path: '/',
        maxAge: 24 * 60 * 60
      });
      
      // For business-info page, allow access in development
      if (pathname === '/onboarding/business-info') {
        console.log(`[Middleware] Development mode: Allowing access to business-info page without auth`);
        return response;
      }
    }
  }

  if (!idToken || !accessToken) {
    // For API routes, return 401 instead of redirecting
    if (pathname.startsWith('/api/') && !isPublicApiRoute) {
      console.log(`[Middleware] API route without auth, returning 401`);
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
    // Add language parameter
    signinUrl.searchParams.set('lng', lng);
    console.log(`[Middleware] Route without auth, redirecting to: ${signinUrl}`);
    return NextResponse.redirect(signinUrl);
  }

  // Check if user has completed onboarding - if so, redirect to dashboard
  // This needs to be checked BEFORE the onboardingStep check
  if (onboardedStatus === 'COMPLETE' && !pathname.startsWith('/api/') && pathname !== '/dashboard') {
    console.log(`[Middleware] User has COMPLETE onboarding status, redirecting to dashboard`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Check if user needs to be redirected to onboarding
  // Only redirect if onboardedStatus is not COMPLETE
  if (!onboardingStep && !pathname.startsWith('/onboarding/') && !pathname.startsWith('/api/') && onboardedStatus !== 'COMPLETE') {
    console.log(`[Middleware] Authenticated user without onboarding step, redirecting to onboarding`);
    const redirectUrl = new URL('/onboarding/business-info', request.url);
    redirectUrl.searchParams.set('lng', lng);
    return NextResponse.redirect(redirectUrl);
  }

  // Add auth tokens to API request headers
  if (pathname.startsWith('/api/')) {
    response.headers.set('Authorization', `Bearer ${accessToken}`);
    response.headers.set('X-Id-Token', idToken);
    // Add language header for API responses
    response.headers.set('Accept-Language', lng);
    return response;
  }

  // Check for onboarding status is now handled earlier in the middleware
  
  // Handle onboarding routes
  if (pathname.startsWith('/onboarding/')) {
    console.log(`[Middleware] Onboarding route detected: ${pathname}, status: ${onboardedStatus}, step: ${onboardingStep}`);
    console.log(`[Middleware] Cookies available:`, {
      idToken: !!request.cookies.get('idToken')?.value,
      accessToken: !!request.cookies.get('accessToken')?.value,
      refreshToken: !!request.cookies.get('refreshToken')?.value,
      onboardingStep: request.cookies.get('onboardingStep')?.value,
      onboardedStatus: request.cookies.get('onboardedStatus')?.value,
      cookieCount: request.cookies.getAll().length
    });

    // Special case for business-info page - always allow access if authenticated
    if (pathname === '/onboarding/business-info' && idToken && accessToken) {
      console.log(`[Middleware] Allowing access to business-info page for authenticated user`);
      return response;
    }

    // If user is in SETUP state, allow access to setup page
    if (onboardedStatus === 'SETUP' && pathname === '/onboarding/setup') {
      return response;
    }

    // If no onboarding step set, default to business-info
    if (!onboardingStep) {
      const redirectUrl = new URL('/onboarding/business-info', request.url);
      redirectUrl.searchParams.set('lng', lng);
      console.log(`[Middleware] No onboarding step set, redirecting to: ${redirectUrl}`);
      return NextResponse.redirect(redirectUrl);
    }

    // Transform onboardingStep back to the format used in routes
    const normalizedStep = onboardingStep?.toLowerCase().replace('_', '-');
    const currentStepIndex = ONBOARDING_ROUTES.indexOf(`/onboarding/${normalizedStep}`);
    const requestedStepIndex = ONBOARDING_ROUTES.indexOf(pathname);
    
    console.log(`[Middleware] Onboarding step indices: current=${currentStepIndex}, requested=${requestedStepIndex}`);
  
    // Normalize onboardingStep to lowercase for comparison
    const normalizedOnboardingStep = onboardingStep?.toLowerCase();
    // Normalize onboardedStatus to match Cognito format (uppercase with underscores)
    const normalizedOnboardedStatus = onboardedStatus?.toUpperCase().replace(/-/g, '_');
    
    // Special case for subscription page - allow access if:
    // 1. onboardingStep is 'subscription' (regardless of status)
    // 2. onboardedStatus is 'BUSINESS_INFO' (regardless of step)
    // 3. onboardedStatus is 'SUBSCRIPTION' (regardless of step)
    // This covers all valid combinations after completing business info
    if (pathname === '/onboarding/subscription' &&
        (normalizedOnboardingStep === 'subscription' ||
         normalizedOnboardedStatus === 'BUSINESS_INFO' ||
         normalizedOnboardedStatus === 'SUBSCRIPTION')) {
      console.log(`[Middleware] Allowing access to subscription page with step=${normalizedOnboardingStep}, status=${normalizedOnboardedStatus}`);
      return response;
    }
    
    // Special case for payment page - allow access if onboardingStep is 'PAYMENT' or coming from subscription
    if (pathname === '/onboarding/payment' &&
        (normalizedOnboardingStep === 'payment' ||
         normalizedOnboardingStep === 'subscription' ||
         normalizedOnboardedStatus === 'BUSINESS_INFO')) {
      console.log(`[Middleware] Allowing access to payment page with step=${normalizedOnboardingStep}`);
      return response;
    }
    
    // Special case for dashboard - simplified check to reduce memory usage
    // Allow access if onboardingStep is setup/complete or onboardedStatus is SUBSCRIPTION/SETUP
    const setupCompleted = request.cookies.get('setupCompleted')?.value === 'true';
    
    if (pathname === '/dashboard' &&
        (normalizedOnboardingStep === 'setup' ||
         normalizedOnboardingStep === 'complete' ||
         normalizedOnboardedStatus === 'SUBSCRIPTION' ||
         normalizedOnboardedStatus === 'SETUP' ||
         setupCompleted)) {
      console.log(`[Middleware] Allowing access to dashboard with step=${normalizedOnboardingStep}, status=${normalizedOnboardedStatus}`);
      return response;
    }
    
    // If we're in BUSINESS_INFO state, ensure we're on the business-info or subscription page
    if (normalizedOnboardedStatus === 'BUSINESS_INFO' &&
        pathname !== '/onboarding/business-info' &&
        pathname !== '/onboarding/subscription') {
      // If onboardingStep is 'subscription', redirect to subscription page
      if (normalizedOnboardingStep === 'subscription') {
        const redirectUrl = new URL('/onboarding/subscription', request.url);
        redirectUrl.searchParams.set('lng', lng);
        console.log(`[Middleware] In BUSINESS_INFO state with subscription step, redirecting to: ${redirectUrl}`);
        return NextResponse.redirect(redirectUrl);
      }
      
      // Otherwise redirect to business-info page
      const redirectUrl = new URL('/onboarding/business-info', request.url);
      redirectUrl.searchParams.set('lng', lng);
      console.log(`[Middleware] In BUSINESS_INFO state, redirecting to: ${redirectUrl}`);
      return NextResponse.redirect(redirectUrl);
    }

    // Only allow access to current or completed steps
    if (requestedStepIndex > currentStepIndex + 1) {
      // Special case: Simplified check for dashboard access
      if ((normalizedOnboardingStep === 'subscription' ||
           normalizedOnboardingStep === 'setup' ||
           normalizedOnboardedStatus === 'SUBSCRIPTION' ||
           normalizedOnboardedStatus === 'SETUP') &&
          pathname === '/dashboard') {
        console.log(`[Middleware] Allowing access to dashboard from subscription or setup state`);
        return response;
      }
      
      // Special case: If onboardedStatus is SUBSCRIPTION but step is NOT_STARTED, redirect to subscription page
      if (normalizedOnboardedStatus === 'SUBSCRIPTION' && normalizedOnboardingStep === 'not_started' &&
          pathname !== '/onboarding/subscription') {
        const redirectUrl = new URL('/onboarding/subscription', request.url);
        redirectUrl.searchParams.set('lng', lng);
        console.log(`[Middleware] In SUBSCRIPTION state with NOT_STARTED step, redirecting to: ${redirectUrl}`);
        return NextResponse.redirect(redirectUrl);
      }
      
      // Handle case where currentStepIndex is -1 (not found in ONBOARDING_ROUTES)
      if (currentStepIndex === -1) {
        // Default to business-info if we can't determine the current step
        const redirectUrl = new URL('/onboarding/business-info', request.url);
        redirectUrl.searchParams.set('lng', lng);
        console.log(`[Middleware] Current step not found in routes, defaulting to business-info: ${redirectUrl}`);
        return NextResponse.redirect(redirectUrl);
      }
      
      const redirectUrl = new URL(ONBOARDING_ROUTES[currentStepIndex], request.url);
      redirectUrl.searchParams.set('lng', lng);
      console.log(`[Middleware] Requested step ahead of current step, redirecting to: ${redirectUrl}`);
      return NextResponse.redirect(redirectUrl);
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