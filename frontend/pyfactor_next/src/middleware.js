import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

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
  '/api/auth/refresh'
];

// Define the onboarding steps in the required order
const ONBOARDING_STEPS = [
  'business-info',
  'subscription',
  'payment',
  'setup',
  'complete'
];

// Improved helper function to check if a route matches any patterns
function routeMatches(pathname, patterns) {
  return patterns.some(pattern => {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return pathname.startsWith(prefix);
    }
    return pathname === pattern;
  });
}

// Helper function to get the current onboarding step from the URL
function getOnboardingStepFromUrl(pathname) {
  const parts = pathname.split('/');
  if (parts.length >= 3 && parts[1] === 'onboarding') {
    return parts[2];
  }
  return null;
}

// Helper to get the next onboarding step
function getNextOnboardingStep(currentStep, selectedPlan) {
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
  if (currentIndex === -1) return 'business-info';
  
  // Skip payment for free plan
  if (currentStep === 'subscription' && selectedPlan === 'free') {
    return 'setup';
  }
  
  // Go to the next step or dashboard if we've completed all steps
  if (currentIndex < ONBOARDING_STEPS.length - 1) {
    return ONBOARDING_STEPS[currentIndex + 1];
  }
  
  return 'dashboard';
}

// Helper to check if a user should be redirected based on their onboarding status
function shouldRedirectOnboarding(pathname, cookies) {
  // Allow direct access to auth pages or non-onboarding pages
  if (!pathname.includes('/onboarding/')) return null;
  
  // Get current onboarding step from URL
  const urlStep = getOnboardingStepFromUrl(pathname);
  if (!urlStep) return null;
  
  // Get steps from cookies
  const cookieStep = cookies.get('onboardingStep')?.value;
  const onboardingStatus = cookies.get('onboardedStatus')?.value;
  const selectedPlan = cookies.get('selectedPlan')?.value;
  
  logger.debug('[Middleware] Checking onboarding navigation', {
    urlStep,
    cookieStep,
    onboardingStatus,
    selectedPlan,
    pathname
  });
  
  // If force parameter is present, allow the navigation
  const url = new URL(pathname, 'http://localhost');
  if (url.searchParams.get('force') === 'true') {
    logger.debug('[Middleware] Force parameter present, allowing navigation');
    return null;
  }
  
  // Special case: Allow business-info access for new users
  if (urlStep === 'business-info' && (!onboardingStatus || onboardingStatus === 'NOT_STARTED')) {
    return null;
  }
  
  // Check if trying to skip ahead
  const urlStepIndex = ONBOARDING_STEPS.indexOf(urlStep);
  const expectedStepIndex = cookieStep ? ONBOARDING_STEPS.indexOf(cookieStep) : 0;
  
  if (urlStepIndex > expectedStepIndex && expectedStepIndex >= 0) {
    logger.debug('[Middleware] Attempting to skip ahead in onboarding flow', {
      urlStepIndex,
      expectedStepIndex,
      urlStep,
      cookieStep
    });
    
    // Redirect to the expected step
    return cookieStep ? `/onboarding/${cookieStep}` : '/onboarding/business-info';
  }
  
  // Allow backward navigation
  if (urlStepIndex <= expectedStepIndex) {
    return null;
  }
  
  // Default: no redirection needed
  return null;
}

// Check if a user has completed onboarding based on their cookies or session
export function isOnboardingComplete(session) {
  if (!session) return false;

  // If it's a cookies object
  if (session.get) {
    const onboardingStatus = session.get('onboardedStatus')?.value;
    const setupCompleted = session.get('setupCompleted')?.value;
    
    // Only consider onboarding complete if explicitly set to COMPLETE
    return onboardingStatus === 'COMPLETE' || setupCompleted === 'true';
  }
  
  // If it's a session object with attributes
  // Explicit check for "COMPLETE" - any other value (including null, undefined, or "INCOMPLETE") means onboarding is not complete
  return session.attributes?.['custom:onboarding'] === 'COMPLETE';
}

// Get the appropriate onboarding step for redirection
export function getOnboardingRedirectPath(cookies) {
  const onboardingStep = cookies.get('onboardingStep')?.value;
  const onboardingStatus = cookies.get('onboardedStatus')?.value;
  
  // If we have a specific step, use it (unless it's 'dashboard' or 'complete')
  if (onboardingStep && !['dashboard', 'complete'].includes(onboardingStep)) {
    return `/onboarding/${onboardingStep}`;
  }
  
  // Otherwise derive the step from status
  if (onboardingStatus === 'BUSINESS_INFO') {
    return '/onboarding/subscription';
  } else if (onboardingStatus === 'SUBSCRIPTION') {
    return '/onboarding/payment';
  } else if (onboardingStatus === 'PAYMENT') {
    return '/onboarding/setup';
  } else {
    // Default to business-info for new users or any unknown state
    return '/onboarding/business-info';
  }
}

// Determine if a user should be redirected to onboarding
export function shouldRedirectToOnboarding(pathname, cookies) {
  // Public routes, auth routes, and onboarding routes don't need redirection
  if (isPublicRoute(pathname)) return false;
  if (pathname.startsWith('/auth')) return false;
  if (pathname.startsWith('/onboarding')) return false;

  // If not onboarded, user should be redirected
  const isOnboarded = isOnboardingComplete(cookies);
  
  if (!isOnboarded) {
    return getOnboardingRedirectPath(cookies);
  }
  
  return false;
}

// Helper function to check if a route is public
export function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

export function middleware(request) {
  // Get the pathname from the URL
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api/');

  // Log middleware request for debugging
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[Middleware] Processing ${pathname}`, {
      cookies: request.cookies.getAll().map(c => c.name),
      hasAuthToken: !!request.cookies.get('authToken')?.value
    });
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Forward directly to dashboard if on root
  if (pathname === '/') {
    // Check for auth cookie
    const authToken = request.cookies.get('authToken')?.value;
    const idToken = request.cookies.get('idToken')?.value;

    if (authToken || idToken) {
      // Check onboarding status
      const onboardingStatus = request.cookies.get('onboardedStatus')?.value;
      const onboardingStep = request.cookies.get('onboardingStep')?.value;
      const setupCompleted = request.cookies.get('setupCompleted')?.value;
      
      logger.debug('[Middleware] Root path with auth, checking redirection', {
        onboardingStatus,
        onboardingStep,
        setupCompleted
      });

      // If setup is completed or onboarding is complete, go to dashboard
      if (setupCompleted === 'true' || onboardingStatus === 'COMPLETE') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // If user is in onboarding, direct them to the appropriate step
      return NextResponse.redirect(new URL(getOnboardingRedirectPath(request.cookies), request.url));
    }

    // If not authenticated, redirect to sign in
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Check if the user needs to be redirected to onboarding
  const onboardingRedirectPath = shouldRedirectToOnboarding(pathname, request.cookies);
  if (onboardingRedirectPath) {
    logger.debug('[Middleware] Redirecting to onboarding', {
      from: pathname,
      to: onboardingRedirectPath
    });
    return NextResponse.redirect(new URL(onboardingRedirectPath, request.url));
  }
  
  // For protected API routes, verify token
  if (pathname.startsWith('/api/')) {
    // Check for public API routes first
    if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }
    
    // Special handling for onboarding API routes - be more lenient
    if (pathname.startsWith('/api/onboarding/')) {
      // For onboarding routes, add special headers and proceed
      const newResponse = NextResponse.next();
      // Transfer any existing cookies from the request to the response
      request.cookies.getAll().forEach(cookie => {
        newResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      
      // Add special headers for onboarding routes
      if (pathname.includes('business-info') || pathname.includes('state')) {
        logger.debug(`[Middleware] Adding lenient access headers for onboarding API route: ${pathname}`);
        newResponse.headers.set('X-Lenient-Access', 'true');
        newResponse.headers.set('X-Allow-Partial', 'true');
        newResponse.headers.set('X-Onboarding-Route', 'true');
      }
      
      return newResponse;
    }
    
    const authToken = request.cookies.get('authToken')?.value;
    const idToken = request.cookies.get('idToken')?.value;
    if (!authToken && !idToken) {
      // For API routes, return a JSON response
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    
    return NextResponse.next();
  }
  
  // Always pass through for Next.js framework routes
  if (pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }
  
  // Clone the URL for potential redirects
  const url = request.nextUrl.clone();
  
  // Clone headers
  const response = NextResponse.next();
  
  // Handle response based on pathname
  if (pathname === '/dashboard') {
    // Check if user has completed onboarding
    if (!isOnboardingComplete(request.cookies)) {
      logger.debug('[Middleware] User trying to access dashboard but onboarding not complete');
      const redirectPath = getOnboardingRedirectPath(request.cookies);
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  }
  
  // Return the modified response
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|static|.*\\.svg|.*\\.png).*)',
    '/api/:path*'
  ],
};