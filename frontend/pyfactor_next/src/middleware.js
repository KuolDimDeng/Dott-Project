import { NextResponse } from 'next/server';
// We're having issues with the logger, use console.log instead
// import { logger } from '@/utils/logger';

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify',
  '/auth/callback',
  '/api/auth/callback',
  '/api/onboarding/verify-state',
  '/api/onboarding/state',
  '/api/user/update-attributes',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/images',
  '/fonts',
  '/static',
  '/docs'
];

// Define public API routes
const PUBLIC_API_ROUTES = [
  '/api/auth/signin',
  '/api/auth/signup',
  '/api/auth/reset-password',
  '/api/auth/verify',
  '/api/auth/callback',
  '/api/auth/set-cookies',
  '/api/auth/refresh',
  '/api/onboarding/verify-state',
  '/api/onboarding/state',
  '/api/user/update-attributes',
  '/api/tenant/current',
  '/api/tenant/exists',
  '/api/me'
];

// Define the onboarding steps in the required order
const ONBOARDING_STEPS = [
  'business-info',
  'subscription',
  'payment',
  'setup',
  'complete'
];

// Helper function to check if a route is public
export function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

// Check if a user has completed onboarding based on their cookies or session
export function isOnboardingComplete(session) {
  if (!session) return false;

  // If it's a cookies object
  if (session.get) {
    const onboardedStatus = session.get('onboardedStatus')?.value;
    const setupCompleted = session.get('setupCompleted')?.value;
    
    return onboardedStatus === 'COMPLETE' || setupCompleted === 'true' || setupCompleted === 'TRUE';
  }
  
  // If it's a session object with attributes
  return session.attributes?.['custom:onboarding'] === 'COMPLETE' || 
         session.attributes?.['custom:setupdone'] === 'TRUE';
}

// Helper function to check if we have a token expiration scenario
export function isTokenExpired(request) {
  // Check for session_expired query parameter
  const url = new URL(request.url);
  if (url.searchParams.get('session_expired') === 'true') {
    return true;
  }
  
  // Check if token expiration timestamp exists and has passed
  const tokenExpiredCookie = request.cookies.get('tokenExpired')?.value;
  if (tokenExpiredCookie === 'true') {
    return true;
  }
  
  // Check token expiration timestamp if available
  const tokenExpires = request.cookies.get('tokenExpires')?.value;
  if (tokenExpires) {
    try {
      const expiryTime = new Date(tokenExpires).getTime();
      const now = Date.now();
      // Check if token has expired (with 10 second buffer)
      if (expiryTime < now + 10000) {
        return true;
      }
    } catch (e) {
      // If parsing fails, ignore the check
    }
  }
  
  return false;
}

// Helper to determine the currently active onboarding step
export function getCurrentOnboardingStep(cookies) {
  // First check if we have a direct onboardingStep cookie
  const onboardingStep = cookies.get('onboardingStep')?.value;
  if (onboardingStep && ONBOARDING_STEPS.includes(onboardingStep)) {
    return onboardingStep;
  }
  
  // Check onboarding status directly
  const onboardedStatus = cookies.get('onboardedStatus')?.value;
  
  // Map status values to steps
  if (onboardedStatus === 'COMPLETE') {
    return 'complete';
  } else if (onboardedStatus === 'SETUP') {
    return 'setup';
  } else if (onboardedStatus === 'PAYMENT') {
    return 'payment';
  } else if (onboardedStatus === 'SUBSCRIPTION') {
    return 'subscription';
  } else if (onboardedStatus === 'BUSINESS_INFO') {
    return 'business-info';
  }
  
  // Check individual completion flags as fallback
  const businessInfoDone = cookies.get('businessInfoCompleted')?.value === 'true';
  const subscriptionDone = cookies.get('subscriptionCompleted')?.value === 'true';
  const paymentDone = cookies.get('paymentCompleted')?.value === 'true';
  const setupDone = cookies.get('setupCompleted')?.value === 'true';
  
  // Determine current step based on completion flags
  if (!businessInfoDone) {
    return 'business-info';
  } else if (!subscriptionDone) {
    return 'subscription';
  } else if (!paymentDone) {
    return 'payment';
  } else if (!setupDone) {
    return 'setup';
  } else {
    return 'complete';
  }
}

export function middleware(request) {
  // Get the pathname from the URL
  const { pathname } = request.nextUrl;
  const url = new URL(request.url);
  
  // Check if this is a JavaScript file request
  if (pathname.endsWith('.js') || pathname.includes('/_next/static/chunks/')) {
    // For JavaScript files, ensure proper MIME type
    const response = NextResponse.next();
    response.headers.set('Content-Type', 'application/javascript; charset=utf-8');
    return response;
  }
  
  // Circuit breaker parameters
  const noRedirect = url.searchParams.get('noredirect') === 'true'; 
  const noLoop = url.searchParams.get('noloop') === 'true';
  const fromParam = url.searchParams.get('from');
  
  // Debug logging - uncomment for verbose logging
  // logger.debug('[Middleware] Processing request', { pathname, cookies: Object.fromEntries([...request.cookies.entries()].map(([k, v]) => [k, v.value])) });
  
  // If circuit breaker parameters are present, bypass middleware checks
  if (noRedirect || noLoop) {
    console.log('[Middleware] Circuit breaker active, passing through', {
      noRedirect,
      noLoop,
      pathname
    });
    return NextResponse.next();
  }
  
  // Skip redirect checks if coming from a known source to prevent loops
  if (fromParam === 'middleware' || fromParam === 'signin' || fromParam === 'oauth') {
    console.log('[Middleware] Request from known source, passing through', {
      fromParam,
      pathname
    });
    return NextResponse.next();
  }
  
  // Check for public routes - allow public access without redirects
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // For API routes, check if they're public
  if (pathname.startsWith('/api/')) {
    if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }
  }

  // Check for token expiration 
  if (isTokenExpired(request)) {
    // If token is expired, clear the expired flag and redirect to sign-in
    console.log('[Middleware] Token expired, redirecting to sign in');
    
    const response = NextResponse.redirect(new URL('/auth/signin?session_expired=true', request.url));
    
    // Clear the expired flag cookie
    response.cookies.set('tokenExpired', '', {
      expires: new Date(0),
      path: '/'
    });
    
    return response;
  }

  // Check authentication for protected routes
  const authToken = request.cookies.get('authToken')?.value;
  const idToken = request.cookies.get('idToken')?.value;

  if (!authToken && !idToken) {
    console.log('[Middleware] No auth tokens found, redirecting to sign in');
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('from', 'middleware');
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Special handling for onboarding routes to allow progress continuation
  if (pathname.startsWith('/onboarding')) {
    // Get specific onboarding step from the URL
    const pathStep = pathname.split('/')[2] || '';
    if (!pathStep) {
      // Redirect to first onboarding step if just /onboarding is accessed
      const redirectUrl = new URL('/onboarding/business-info', request.url); 
      redirectUrl.searchParams.set('from', 'middleware');
      return NextResponse.redirect(redirectUrl);
    }
    
    // Don't redirect on the complete page
    if (pathStep === 'complete') {
      return NextResponse.next();
    }
    
    // Special case for business-info - allow access even without full auth
    // This is the first step and we want to avoid redirect loops
    if (pathStep === 'business-info') {
      // Add onboarding status cookies to help client-side handling
      const response = NextResponse.next();
      response.cookies.set('onboardingInProgress', 'true', {
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
        httpOnly: false
      });
      response.cookies.set('onboardingStep', 'business-info', {
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
        httpOnly: false
      });
      return response;
    }
    
    // Verify the user is on the right step
    const currentStep = getCurrentOnboardingStep(request.cookies);
    
    // If trying to access a step ahead of current progress, redirect to current step
    const stepIndex = ONBOARDING_STEPS.indexOf(pathStep);
    const currentStepIndex = ONBOARDING_STEPS.indexOf(currentStep);
    
    // Only redirect if:
    // 1. The step in the URL is valid
    // 2. The current step determined from cookies is valid
    // 3. The URL step is ahead of the current progress step
    if (stepIndex !== -1 && currentStepIndex !== -1 && stepIndex > currentStepIndex) {
      console.log('[Middleware] Redirecting to current onboarding step:', {
        attemptedStep: pathStep,
        currentStep,
        currentStepIndex
      });
      
      const redirectUrl = new URL(`/onboarding/${currentStep}`, request.url);
      redirectUrl.searchParams.set('from', 'middleware');
      return NextResponse.redirect(redirectUrl);
    }
    
    // Otherwise, allow access to the requested step
    return NextResponse.next();
  }

  // Strict onboarding check for dashboard and other protected routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/app')) {
    // Only allow access if onboarding is complete
    if (!isOnboardingComplete(request.cookies)) {
      console.log('[Middleware] Protected route access denied: onboarding not complete');
      
      // Determine the current onboarding step
      const currentStep = getCurrentOnboardingStep(request.cookies);
      
      // Redirect to the appropriate onboarding step
      const redirectUrl = new URL(`/onboarding/${currentStep}`, request.url);
      redirectUrl.searchParams.set('from', 'middleware');
      return NextResponse.redirect(redirectUrl);
    }
  }
  
  // Always pass through for static assets
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot)$/)) {
    return NextResponse.next();
  }
  
  // Allow access to all other routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|static|.*\\.svg|.*\\.png).*)',
    '/api/:path*'
  ],
};