import { NextResponse } from 'next/server';
// We're having issues with the logger, use console.log instead
// import { logger } from '@/utils/logger';

// Import development tenant middleware functions
import { 
  applyDevTenantMiddleware, 
  extractTenantId 
} from './middleware/dev-tenant-middleware';

// Import tenant validation middleware
import { tenantValidationMiddleware } from './middleware/tenant-validator';

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

// Helper function to check if a path should be excluded from middleware processing
export function isExcludedPath(pathname) {
  // Skip middleware for static files, api routes and other resources
  return pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/) ||
         pathname.includes('/_next/') ||
         pathname.includes('/static/');
}

// Function to check if an API route is public
function isPublicApiRoute(pathname) {
  return PUBLIC_API_ROUTES.some(route => pathname === route);
}

// Check if a user has completed onboarding based on their cookies or session
export function isOnboardingComplete(session) {
  if (!session) return false;

  let onboardingStatusValue = null;
  let setupCompletedValue = null;

  // If it's a cookies object
  if (session.get) {
    onboardingStatusValue = session.get('onboardedStatus')?.value;
    setupCompletedValue = session.get('setupCompleted')?.value;
    
    // Normalize to lowercase for comparison
    const onboardedStatus = onboardingStatusValue?.toLowerCase();
    const setupCompleted = setupCompletedValue?.toLowerCase();
    
    console.log('[Middleware] Checking onboarding completion with cookies:', {
      rawOnboardedStatus: onboardingStatusValue,
      normalizedOnboardedStatus: onboardedStatus,
      rawSetupCompleted: setupCompletedValue,
      normalizedSetupCompleted: setupCompleted,
      isComplete: onboardedStatus === 'complete' || setupCompleted === 'true'
    });
    
    // Check with case-insensitive comparison
    return onboardedStatus === 'complete' || setupCompleted === 'true';
  }
  
  // If it's a session object with attributes
  onboardingStatusValue = session.attributes?.['custom:onboarding'];
  setupCompletedValue = session.attributes?.['custom:setupdone'];
  
  // Normalize to lowercase for consistency
  const onboardingStatus = onboardingStatusValue?.toLowerCase();
  const setupDone = setupCompletedValue?.toLowerCase();
  
  console.log('[Middleware] Checking onboarding completion with session:', {
    rawOnboardingStatus: onboardingStatusValue,
    normalizedOnboardingStatus: onboardingStatus,
    rawSetupDone: setupCompletedValue,
    normalizedSetupDone: setupDone,
    isComplete: onboardingStatus === 'complete' || setupDone === 'true'
  });
  
  // Check with case-insensitive comparison
  return onboardingStatus === 'complete' || setupDone === 'true';
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
  const onboardedStatus = cookies.get('onboardedStatus')?.value?.toLowerCase();
  
  // Map status values to steps (all lowercase for consistency)
  if (onboardedStatus === 'complete') {
    return 'complete';
  } else if (onboardedStatus === 'setup') {
    return 'setup';
  } else if (onboardedStatus === 'payment') {
    return 'payment';
  } else if (onboardedStatus === 'subscription') {
    return 'subscription';
  } else if (onboardedStatus === 'business_info' || onboardedStatus === 'business-info') {
    return 'business-info';
  }
  
  // Check individual completion flags as fallback
  const businessInfoDone = cookies.get('businessInfoCompleted')?.value?.toLowerCase() === 'true';
  const subscriptionDone = cookies.get('subscriptionCompleted')?.value?.toLowerCase() === 'true';
  const paymentDone = cookies.get('paymentCompleted')?.value?.toLowerCase() === 'true';
  const setupDone = cookies.get('setupCompleted')?.value?.toLowerCase() === 'true';
  
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

// Check if we are in development mode and should bypass authentication
function isDevMode(request) {
  // Always return false to disable development mode completely
  return false;
}

// Check if the request is for an API route
function isApiRoute(pathname) {
  return pathname.startsWith('/api/');
}

// Add CORS headers to API responses
function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
  response.headers.set('Access-Control-Allow-Headers', 
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Id-Token');
  return response;
}

// Handle tenant subscription redirect at the middleware level
function handleTenantSubscriptionRedirect(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const searchParams = url.searchParams;
  
  console.log(`[DEBUG] handleTenantSubscriptionRedirect START: ${pathname} | Params: ${searchParams.toString() || 'none'}`);
  
  // Check if we're already on a tenant dashboard page
  const isTenantDashboard = pathname.match(/^\/tenant\/[^\/]+\/dashboard/);
  
  console.log(`[DEBUG] isTenantDashboard=${!!isTenantDashboard}, has direct=${searchParams.has('direct')}`);
  
  // If we're on a tenant dashboard with direct=true, skip any further redirects
  if (isTenantDashboard && searchParams.has('direct')) {
    console.log('[Middleware] Already on tenant dashboard with direct param, skipping redirect');
    console.log(`[DEBUG] handleTenantSubscriptionRedirect END: Skipping as already on tenant dashboard with direct=true`);
    return null;
  }
  
  // For other paths with parameters, we should continue with normal processing 
  // This allows dashboard redirects to work even with query parameters
  if (searchParams.toString() && !isTenantDashboard) {
    console.log('[Middleware] URL has parameters, continuing normal processing:', { 
      pathname, 
      params: searchParams.toString()
    });
  }
  
  // Check if the path matches tenant subscription pattern
  // Pattern: /tenant/[tenantId]/onboarding/subscription
  const tenantSubscriptionRegex = /^\/tenant\/([^\/]+)\/onboarding\/subscription/;
  const match = pathname.match(tenantSubscriptionRegex);
  
  console.log(`[DEBUG] Tenant subscription pattern match: ${!!match}`);
  
  if (match && match[1]) {
    // Log redirect attempt
    console.log('[Middleware] Detected tenant subscription path, redirecting', { 
      pathname, 
      tenantId: match[1],
      hasParams: searchParams.toString() !== ''
    });
    
    // Extract tenant ID from path
    const tenantId = match[1].replace(/_/g, '-');
    
    // Add bypass=true and timestamp to prevent caching issues
    const redirectUrl = `/onboarding/subscription?bypass=true&tid=${encodeURIComponent(tenantId)}&ts=${Date.now()}`;
    
    console.log(`[DEBUG] Redirecting tenant subscription to: ${redirectUrl}`);
    
    // Create redirect response
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));
    
    // Store tenant ID in a cookie for later use
    response.cookies.set('tenantId', tenantId, { 
      path: '/',
      sameSite: 'lax',
      maxAge: 3600 * 24 * 30 // 30 days
    });
    
    console.log(`[DEBUG] handleTenantSubscriptionRedirect END: Redirecting to ${redirectUrl}`);
    return response;
  }
  
  console.log(`[DEBUG] handleTenantSubscriptionRedirect END: No redirect needed for ${pathname}`);
  return null;
}

// Main middleware function
export async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const cookies = request.cookies;
  
  // Add detailed debug logging
  console.log(`[DEBUG] Middleware START: ${pathname} | Params: ${url.searchParams.toString() || 'none'}`);
  
  // HIGHEST PRIORITY - Skip all middleware for tenant dashboard with direct=true
  // This helps prevent any processing of the tenant dashboard URL once it has direct=true
  if (pathname.match(/^\/tenant\/[^\/]+\/dashboard/) && url.searchParams.has('direct')) {
    console.log(`[DEBUG] FORCE PROCEEDING for tenant dashboard with direct=true: ${pathname}`);
    return NextResponse.next();
  }
  
  // HIGHEST PRIORITY - Check for auth with no tenant ID 
  // This prevents the redirect loops that occur when a user is authenticated but has no tenant ID
  if (
    !request.cookies.get('tenantId')?.value && 
    !request.cookies.get('businessid')?.value &&
    request.cookies.get('CognitoIdentityServiceProvider.1o5v84mrgn4gt87khtr179uc5b.LastAuthUser')?.value
  ) {
    console.log(`[DEBUG] EMERGENCY FIX: Detected authenticated user with no tenant ID`);
    
    // Create a response that will continue to the destination
    const response = NextResponse.next();
    
    // Set a fallback tenant ID
    const fallbackTenantId = "519f65a2-5995-5aeb-b8b9-454405cc552d";
    response.cookies.set('tenantId', fallbackTenantId, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });
    
    console.log(`[DEBUG] Set fallback tenant ID: ${fallbackTenantId}`);
    
    // If we're on the dashboard, redirect to tenant-specific dashboard
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      const tenantDashboardUrl = new URL(`/tenant/${fallbackTenantId}/dashboard`, request.url);
      // Add all query parameters 
      url.searchParams.forEach((value, key) => {
        tenantDashboardUrl.searchParams.set(key, value);
      });
      tenantDashboardUrl.searchParams.set('direct', 'true');
      tenantDashboardUrl.searchParams.set('emergency_redirect', 'true');
      
      console.log(`[DEBUG] Emergency redirecting to: ${tenantDashboardUrl.toString()}`);
      return NextResponse.redirect(tenantDashboardUrl);
    }
    
    return response;
  }
  
  // TEMPORARY FIX: Prevent redirect loops for deleted tenant
  if (request.cookies.get('tenantId')?.value === 'e53b800b-c4e1-5fd1-abc6-ba3a785c0102' ||
      request.cookies.get('businessid')?.value === 'e53b800b-c4e1-5fd1-abc6-ba3a785c0102') {
    console.log('[Middleware] Detected deleted tenant ID, redirecting to reset page');
    
    // Clear the problematic cookies
    const response = NextResponse.redirect(new URL('/api/auth/signout', request.url));
    response.cookies.delete('tenantId');
    response.cookies.delete('businessid');
    return response;
  }
  
  // Skip middleware for excluded paths
  if (isExcludedPath(pathname)) {
    console.log(`[DEBUG] Skipping middleware for excluded path: ${pathname}`);
    return NextResponse.next();
  }
  
  // Debug log the cookies
  const tenantIdCookie = request.cookies.get('tenantId')?.value;
  const businessIdCookie = request.cookies.get('businessid')?.value;
  const effectiveTenantId = tenantIdCookie || businessIdCookie;
  console.log(`[DEBUG] Cookies: tenantId=${tenantIdCookie || 'none'}, businessId=${businessIdCookie || 'none'}, effective=${effectiveTenantId || 'none'}`);
  
  // Handle tenant subscription redirect if applicable
  console.log(`[DEBUG] Checking for tenant subscription redirect: ${pathname}`);
  const tenantRedirectResponse = handleTenantSubscriptionRedirect(request);
  if (tenantRedirectResponse) {
    console.log(`[DEBUG] Tenant subscription redirect applied to: ${pathname}`);
    return tenantRedirectResponse;
  }
  
  // Apply development tenant middleware if in dev mode
  if (isDevMode(request)) {
    console.log(`[DEBUG] Checking dev tenant middleware: ${pathname}`);
    const devTenantResponse = applyDevTenantMiddleware(request);
    if (devTenantResponse) {
      console.log(`[DEBUG] Dev tenant middleware applied to: ${pathname}`);
      return devTenantResponse;
    }
  }
  
  // Add CORS headers for API routes
  if (isApiRoute(pathname)) {
    console.log(`[DEBUG] Adding CORS headers to API route: ${pathname}`);
    const response = NextResponse.next();
    addCorsHeaders(response);
    return response;
  }
  
  // Check tenant validation first - if there's a tenant in the URL,
  // validate that the user has access to it
  console.log(`[DEBUG] Running tenant validation for: ${pathname}`);
  const tenantResponse = await tenantValidationMiddleware(request);
  if (tenantResponse) {
    console.log(`[DEBUG] Tenant validation redirected: ${pathname} → ${tenantResponse.headers.get('location') || 'unknown'}`);
    return tenantResponse;
  }
  
  // Continue with the rest of the middleware logic
  
  // Create a new response or use the original
  const response = NextResponse.next();
  
  // Add security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Skip tenant processing for public routes and assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // Static files like .js, .css, etc.
  ) {
    console.log(`[DEBUG] Skipping tenant processing for: ${pathname}`);
    return response;
  }
  
  // Extract tenant ID from URL path for tenant-specific routes
  const tenantMatch = pathname.match(/^\/tenant\/([^\/]+)/);
  let tenantId = tenantMatch ? tenantMatch[1] : null;
  
  // If no tenant in URL, try to get from cookies
  if (!tenantId) {
    const tenantCookie = request.cookies.get('tenantId');
    if (tenantCookie) {
      tenantId = tenantCookie.value;
    }
  }
  
  console.log(`[DEBUG] Tenant ID from URL or cookie: ${tenantId || 'none'}`);
  
  // Handle API routes - add tenant headers if available
  if (pathname.startsWith('/api') && tenantId) {
    // For API routes, set tenant headers
    response.headers.set('x-tenant-id', tenantId);
    
    // Convert to schema name format for database queries
    const schemaName = `tenant_${tenantId.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    response.headers.set('x-schema-name', schemaName);
    
    // For backward compatibility
    response.headers.set('x-business-id', tenantId);
    
    console.log(`[DEBUG] Set tenant headers for API: tenant=${tenantId}, schema=${schemaName}`);
  }
  
  // DASHBOARD REDIRECT CHECK #1
  // Early tenant detection - redirect to tenant-specific URL immediately
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    // Get tenant ID from cookies or localStorage
    const tenantIdCookie = request.cookies.get('tenantId')?.value;
    const businessIdCookie = request.cookies.get('businessid')?.value;
    const tenantId = tenantIdCookie || businessIdCookie;
    
    console.log(`[DEBUG] Dashboard early redirect check:`, {
      path: pathname, 
      params: url.searchParams.toString(),
      tenantId,
      hasDirect: url.searchParams.has('direct'),
      directValue: url.searchParams.get('direct'),
      isValid: tenantId && tenantId !== 'undefined' && tenantId !== 'null'
    });
    
    // Always redirect if there's a valid tenant ID, regardless of query parameters
    // Only check for direct=true to prevent redirect loops
    if (tenantId && tenantId !== 'undefined' && tenantId !== 'null' && !url.searchParams.has('direct')) {
      console.log(`[Middleware] Forcing redirect to tenant-specific dashboard: ${tenantId}`);
      
      // Construct tenant-specific URL
      const tenantDashboardUrl = new URL(`/tenant/${tenantId}/dashboard`, request.url);
      
      // Preserve any query parameters
      url.searchParams.forEach((value, key) => {
        if (key !== 'direct') { // don't copy direct param if exists
          tenantDashboardUrl.searchParams.set(key, value);
        }
      });
      
      // Add a flag to prevent redirect loops
      tenantDashboardUrl.searchParams.set('direct', 'true');
      
      // Add debug flag to track source of redirect
      tenantDashboardUrl.searchParams.set('from', 'middleware_dashboard');
      
      console.log(`[DEBUG] Redirecting to: ${tenantDashboardUrl.toString()}`);
      
      // Redirect immediately, before any page content is loaded
      return NextResponse.redirect(tenantDashboardUrl);
    } else {
      console.log(`[DEBUG] Not redirecting dashboard - conditions not met:`, {
        validTenant: Boolean(tenantId && tenantId !== 'undefined' && tenantId !== 'null'),
        hasDirect: url.searchParams.has('direct')
      });
    }
  }
  
  // ROOT REDIRECT CHECK
  // Redirect root page to tenant dashboard if tenant ID exists
  if (pathname === '/' || pathname === '') {
    // Check if user has a tenant ID
    const tenantIdCookie = request.cookies.get('tenantId')?.value;
    const businessIdCookie = request.cookies.get('businessid')?.value;
    const tenantId = tenantIdCookie || businessIdCookie;
    
    console.log(`[DEBUG] Root path redirect check:`, {
      path: pathname,
      params: url.searchParams.toString(),
      tenantId,
      hasDirect: url.searchParams.has('direct'),
      hasNoRedirect: url.searchParams.has('noredirect')
    });
    
    // Only redirect if there's a valid tenant ID and we're not in a redirect loop
    if (tenantId && tenantId !== 'undefined' && tenantId !== 'null' && 
        !url.searchParams.has('direct') && !url.searchParams.has('noredirect')) {
      console.log(`[Middleware] Redirecting root page to tenant dashboard: ${tenantId}`);
      
      // Construct tenant-specific URL
      const tenantDashboardUrl = new URL(`/tenant/${tenantId}/dashboard`, request.url);
      
      // Preserve existing query parameters
      url.searchParams.forEach((value, key) => {
        tenantDashboardUrl.searchParams.set(key, value);
      });
      
      // Add flags to prevent redirect loops
      tenantDashboardUrl.searchParams.set('direct', 'true');
      tenantDashboardUrl.searchParams.set('from', 'root');
      
      console.log(`[DEBUG] Redirecting root to: ${tenantDashboardUrl.toString()}`);
      
      return NextResponse.redirect(tenantDashboardUrl);
    } else {
      console.log(`[DEBUG] Not redirecting root - conditions not met:`, {
        validTenant: Boolean(tenantId && tenantId !== 'undefined' && tenantId !== 'null'),
        hasDirect: url.searchParams.has('direct'),
        hasNoRedirect: url.searchParams.has('noredirect')
      });
    }
  }
  
  // TENANT DASHBOARD CHECK
  // Handle tenant dashboard pages - add direct flag if needed
  if (pathname.match(/^\/tenant\/[^\/]+\/dashboard/)) {
    console.log(`[DEBUG] Tenant dashboard check:`, {
      path: pathname,
      params: url.searchParams.toString(),
      hasDirect: url.searchParams.has('direct'),
      directValue: url.searchParams.get('direct')
    });
    
    // Add direct=true flag if it's not there and we have a valid tenant ID pattern in the URL
    // This helps prevent redirects for users who arrive directly at the tenant dashboard URL
    if (!url.searchParams.has('direct')) {
      console.log(`[DEBUG] Adding direct=true flag to tenant dashboard URL`);
      const response = NextResponse.next();
      
      // Create a URL with the direct flag
      const newUrl = new URL(request.url);
      newUrl.searchParams.set('direct', 'true');
      
      // Rewrite the URL to include the direct flag without actually redirecting
      return NextResponse.rewrite(newUrl);
    } else {
      console.log(`[DEBUG] Tenant dashboard already has direct flag, proceeding normally`);
    }
    
    return NextResponse.next();
  }
  
  // FINAL CATCHALL CHECK
  // This is the final check - if we're still on /dashboard after all other rules,
  // check one more time if we need to redirect to tenant-specific URL
  if ((pathname === '/dashboard' || pathname === '/dashboard/')) {
      
    console.log(`[DEBUG] Final catchall dashboard check:`, {
      path: pathname,
      params: url.searchParams.toString()
    });
      
    // Get tenant ID from cookies or localStorage
    const tenantIdCookie = request.cookies.get('tenantId')?.value;
    const businessIdCookie = request.cookies.get('businessid')?.value;
    const tenantId = tenantIdCookie || businessIdCookie || "519f65a2-5995-5aeb-b8b9-454405cc552d";
    
    // Always redirect to tenant-specific dashboard with the tenant ID
    // This is the very last chance to break out of redirect loops
    console.log(`[Middleware] FINAL EMERGENCY REDIRECT to tenant dashboard: ${tenantId}`);
    
    // Construct tenant-specific URL with all original parameters
    const tenantDashboardUrl = new URL(`/tenant/${tenantId}/dashboard`, request.url);
    
    // Copy all query parameters except those that might cause loops
    url.searchParams.forEach((value, key) => {
      if (!['direct', 'from', 'final_redirect'].includes(key)) {
        tenantDashboardUrl.searchParams.set(key, value);
      }
    });
    
    // Add flags to identify this redirect and prevent loops
    tenantDashboardUrl.searchParams.set('direct', 'true');
    tenantDashboardUrl.searchParams.set('final_redirect', 'true');
    tenantDashboardUrl.searchParams.set('from', 'absolute_final_check');
    
    console.log(`[DEBUG] Final emergency redirect to: ${tenantDashboardUrl.toString()}`);
    
    // Set tenant ID cookie in the response
    const response = NextResponse.redirect(tenantDashboardUrl, 307); // 307 = temporary redirect with same method
    response.cookies.set('tenantId', tenantId, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });
    
    return response;
  }
  
  // Special handling for business-info page to ensure tenant ID is set
  if (pathname.includes('/onboarding/business-info') || pathname.includes('/business-info')) {
    console.log(`[DEBUG] Special handling for business-info page`);
    
    // Get tenant ID from cookies
    const tenantIdCookie = request.cookies.get('tenantId')?.value;
    const businessIdCookie = request.cookies.get('businessid')?.value;
    
    // Check if user has Cognito auth but no tenant ID
    const hasCognitoAuth = !!request.cookies.get('CognitoIdentityServiceProvider.1o5v84mrgn4gt87khtr179uc5b.LastAuthUser')?.value;
    const hasTenantId = !!(tenantIdCookie || businessIdCookie);
    
    // If user has auth but no tenant ID, set a fallback
    if (hasCognitoAuth && !hasTenantId) {
      console.log(`[DEBUG] Business-info page: User has auth but no tenant ID, setting fallback`);
      
      // Set fallback tenant ID
      const fallbackTenantId = "519f65a2-5995-5aeb-b8b9-454405cc552d";
      const response = NextResponse.next();
      
      // Set tenant ID cookie
      response.cookies.set('tenantId', fallbackTenantId, {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });
      
      console.log(`[DEBUG] Set fallback tenant ID for business-info page: ${fallbackTenantId}`);
      return response;
    }
  }
  
  console.log(`[DEBUG] Middleware END: ${pathname} | No redirect applied`);
  return response;
}

/**
 * Configuration for which routes should trigger the middleware
 */
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match all page routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};