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
  '/cookies',
  '/contact',
  '/about',
  '/careers',
  '/press',
  '/blog',
  '/favicon.ico'
];

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth/check-existing-email',
  '/api/onboarding/setup/trigger',
  '/api/onboarding/setup/status',
  '/api/auth/set-cookies',
  '/api/auth/callback',
  '/api/onboarding/redirect'
];

// Onboarding routes with their progression order
const ONBOARDING_ROUTES = [
  '/onboarding/business-info',
  '/onboarding/subscription',
  '/onboarding/payment',
  '/onboarding/setup'
];

// Mapping of onboarding status to allowed paths
const ALLOWED_PATHS = {
  'NOT_STARTED': ['/onboarding/business-info'],
  'BUSINESS_INFO': ['/onboarding/business-info', '/onboarding/subscription'],
  'SUBSCRIPTION': ['/onboarding/business-info', '/onboarding/subscription', '/onboarding/payment', '/dashboard'],
  'PAYMENT': ['/onboarding/business-info', '/onboarding/subscription', '/onboarding/payment', '/onboarding/setup'],
  'SETUP': ['/onboarding/business-info', '/onboarding/subscription', '/onboarding/payment', '/onboarding/setup', '/dashboard'],
  'COMPLETE': ['/dashboard']
};

// Map status to next step
const STATUS_TO_STEP = {
  'NOT_STARTED': '/onboarding/business-info',
  'BUSINESS_INFO': '/onboarding/subscription',
  'SUBSCRIPTION': (cookies) => {
    // Check if user has free plan selected
    const selectedPlan = cookies.get('selectedPlan')?.value;
    // If free plan, skip payment and go to dashboard
    if (selectedPlan === 'free' || cookies.get('freePlanSelected')?.value === 'true') {
      return '/dashboard';
    }
    // Otherwise go to payment
    return '/onboarding/payment';
  },
  'PAYMENT': '/onboarding/setup',
  'SETUP': '/dashboard',
  'COMPLETE': '/dashboard'
};

export function middleware(request) {
  // Get the pathname from the URL
  const pathname = request.nextUrl.pathname;
  const origin = request.nextUrl.origin;
  
  // Check for signin redirect loop - important safeguard
  if (pathname === '/auth/signin' && request.nextUrl.searchParams.has('from')) {
    console.log(`[Middleware] Detected potential redirect loop at signin page with 'from' parameter, bypassing middleware`);
    return NextResponse.next();
  }
  
  // Always pass through for public routes
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Always pass through for API routes
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    // Check for public API routes first
    if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }
    
    // For protected API routes, verify token
    // (simplified; in production, you'd verify the token more thoroughly)
    const authToken = request.cookies.get('authToken')?.value;
    if (!authToken) {
      // For API routes, return a JSON response
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    
    return NextResponse.next();
  }
  
  // Clone the URL for potential redirects
  const url = request.nextUrl.clone();
  
  // Clone headers
  const response = NextResponse.next();
  
  // Step 1: Check if user is authenticated for non-public routes
  // Check for Cognito tokens since authToken might not be set yet
  const idToken = request.cookies.get('CognitoIdentityServiceProvider.1o5v84mrgn4gt87khtr179uc5b.LastAuthUser')?.value;
  const authToken = request.cookies.get('authToken')?.value;
  
  if (!idToken && !authToken) {
    // User is not authenticated, redirect to signin with the intended destination
    console.log(`[Middleware] User not authenticated, redirecting to sign in`);
    url.pathname = '/auth/signin';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }
  
  // Set default onboarding values if authenticated but values missing
  if (idToken && !request.cookies.get('onboardedStatus')?.value) {
    console.log(`[Middleware] Found Cognito tokens but no onboarding status, setting defaults`);
    
    response.cookies.set('onboardedStatus', 'NOT_STARTED', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    response.cookies.set('onboardingStep', 'business-info', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
  }
  
  // Step 4: Handle onboarding routes
  if (pathname.startsWith('/onboarding/') || pathname === '/dashboard') {
    // Get onboarding status
    const onboardedStatus = request.cookies.get('onboardedStatus')?.value || 'NOT_STARTED';
    const onboardingStep = request.cookies.get('onboardingStep')?.value || 'business-info';
    
    console.log(`[Middleware] Onboarding route check: ${pathname}`, {
      status: onboardedStatus,
      step: onboardingStep,
      allCookies: [...request.cookies.getAll()].map(c => `${c.name}=${c.value}`).join('; ')
    });
    
    // Handle completed onboarding
    if (onboardedStatus === 'COMPLETE' && pathname !== '/dashboard') {
      console.log(`[Middleware] User has COMPLETE status, redirecting to dashboard`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // Special case for business-info page - always allow access
    if (pathname === '/onboarding/business-info') {
      console.log(`[Middleware] Allowing access to business-info page`);
      return response;
    }
    
    // Special case for subscription page - explicitly allow if status is BUSINESS_INFO
    if (pathname === '/onboarding/subscription' && onboardedStatus === 'BUSINESS_INFO') {
      console.log('[Middleware] Explicitly allowing access to subscription page with BUSINESS_INFO status');
      return response;
    }
    
    // Simple path validation based on current status
    const allowedPaths = ALLOWED_PATHS[onboardedStatus] || ['/onboarding/business-info'];
    
    if (!allowedPaths.includes(pathname)) {
      // If current path is not allowed, redirect to the appropriate step
      const nextStep = typeof STATUS_TO_STEP[onboardedStatus] === 'function' 
        ? STATUS_TO_STEP[onboardedStatus](request.cookies) 
        : STATUS_TO_STEP[onboardedStatus] || '/onboarding/business-info';
        
      console.log(`[Middleware] Invalid path for status, redirecting:`, {
        currentPath: pathname,
        status: onboardedStatus,
        step: onboardingStep,
        nextStep,
        allowedPaths
      });
      
      return NextResponse.redirect(new URL(nextStep, request.url));
    } else {
      console.log(`[Middleware] Path ${pathname} is allowed for status ${onboardedStatus}`);
    }
  }
  
  // Special case for dashboard - redirect to onboarding if not complete
  if (pathname === '/dashboard') {
    const onboardedStatus = request.cookies.get('onboardedStatus')?.value;
    
    // Allow dashboard access for these statuses
    const allowDashboard = ['SETUP', 'COMPLETE'];
    
    // Also allow dashboard access for free plan users with SUBSCRIPTION status
    const selectedPlan = request.cookies.get('selectedPlan')?.value;
    const isFreePlan = selectedPlan === 'free' || request.cookies.get('freePlanSelected')?.value === 'true';
    
    if (!allowDashboard.includes(onboardedStatus) && !(onboardedStatus === 'SUBSCRIPTION' && isFreePlan)) {
      console.log(`[Middleware] User not ready for dashboard, status: ${onboardedStatus}`);
      
      const nextStep = typeof STATUS_TO_STEP[onboardedStatus] === 'function' 
        ? STATUS_TO_STEP[onboardedStatus](request.cookies) 
        : STATUS_TO_STEP[onboardedStatus] || '/onboarding/business-info';
        
      return NextResponse.redirect(new URL(nextStep, request.url));
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|static|.*\\.svg|.*\\.png).*)',
    '/api/:path*'
  ],
};