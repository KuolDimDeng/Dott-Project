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

// Main middleware function
export async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const cookies = request.cookies;
  
  // Skip middleware for excluded paths
  if (isExcludedPath(pathname)) {
    return NextResponse.next();
  }
  
  // Apply development tenant middleware if in dev mode
  if (isDevMode(request)) {
    const devTenantResponse = applyDevTenantMiddleware(request);
    if (devTenantResponse) {
      return devTenantResponse;
    }
  }
  
  // Add CORS headers for API routes
  if (isApiRoute(pathname)) {
    const response = NextResponse.next();
    addCorsHeaders(response);
    return response;
  }
  
  // Check tenant validation first - if there's a tenant in the URL,
  // validate that the user has access to it
  const tenantResponse = await tenantValidationMiddleware(request);
  if (tenantResponse) {
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
  
  // Handle API routes - add tenant headers if available
  if (pathname.startsWith('/api') && tenantId) {
    // For API routes, set tenant headers
    response.headers.set('x-tenant-id', tenantId);
    
    // Convert to schema name format for database queries
    const schemaName = `tenant_${tenantId.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    response.headers.set('x-schema-name', schemaName);
    
    // For backward compatibility
    response.headers.set('x-business-id', tenantId);
  }
  
  // For non-API routes that should have tenant context but don't
  // Redirect to tenant-specific route if we have a tenant ID from cookie
  if (
    !pathname.startsWith('/api') && 
    !pathname.startsWith('/tenant/') && 
    !pathname.startsWith('/auth') && 
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/register') &&
    tenantId && 
    pathname !== '/'
  ) {
    // Redirect to tenant-specific route
    return NextResponse.redirect(
      new URL(`/tenant/${tenantId}${pathname}`, request.url)
    );
  }
  
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