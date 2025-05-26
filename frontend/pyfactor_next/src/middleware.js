import { NextResponse } from 'next/server';
import { tenantMiddleware, extractTenantId } from './middleware/tenant-middleware';
import { tenantIsolationMiddleware } from './middleware/tenant-isolation';
import { isValidUUID } from '@/utils/tenantUtils';
import { resetCognitoCircuit, getCognitoCircuitState } from './utils/networkMonitor';
import { logger } from '@/utils/logger';

// Public routes that should never require authentication
const PUBLIC_ROUTES = [
  '/',
  '/index',
  '/home',
  '/about',
  '/privacy',
  '/terms',
  '/auth/signin',
  '/auth/signup',
  '/api/public',
  '/api/health',  // Allow health checks without auth
  '/api/log',     // Allow logging without auth
  '/api/me',      // Allow user status checks without auth
  '/static',      // Allow access to static files
  '/favicon.ico', // Allow favicon access 
  '/robots.txt'   // Allow robots.txt access
];

/**
 * Check if a path is public
 * @param {string} path - Path to check
 * @returns {boolean} - True if path is public
 */
function isPublicPath(path) {
  // Handle root path specially
  if (path === '/' || path === '' || path === '/index.html') {
    return true;
  }
  
  return PUBLIC_ROUTES.some(route => 
    path === route || 
    (path.startsWith(route + '/') && route !== '/')
  );
}

/**
 * Reset circuit breaker for critical paths
 * @param {string} pathname - Current URL pathname
 * @returns {boolean} - Whether the circuit breaker was reset
 */
function resetCircuitBreakerForCriticalPath(pathname) {
  if (pathname.includes('/auth/') || pathname === '/' || pathname.includes('/dashboard')) {
    const currentState = getCognitoCircuitState();
    if (currentState !== 'CLOSED') {
      resetCognitoCircuit('CLOSED');
      console.info('[Middleware] Reset circuit breaker for critical path:', pathname);
      return true;
    }
  }
  return false;
}

/**
 * Middleware to handle authentication and token passing
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and non-API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    !pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }
  
  // For API routes that require authentication
  const protectedApiRoutes = [
    '/api/user/profile',
    '/api/tenant/current',
    '/api/user/update-attributes'
  ];
  
  const isProtectedRoute = protectedApiRoutes.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute) {
    // Get tokens from cookies
    const idToken = request.cookies.get('idToken')?.value;
    const accessToken = request.cookies.get('accessToken')?.value;
    
    // If no tokens in cookies, check Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!idToken && !accessToken && !authHeader) {
      logger.warn(`[Middleware] No authentication tokens found for ${pathname}`);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Create a new request with proper headers
    const requestHeaders = new Headers(request.headers);
    
    // Add tokens to headers for API routes to use
    if (idToken) {
      requestHeaders.set('X-Id-Token', idToken);
    }
    if (accessToken) {
      requestHeaders.set('X-Access-Token', accessToken);
    }
    
    // Create new request with updated headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    
    return response;
  }
  
  // Reset circuit breaker for important paths
  resetCircuitBreakerForCriticalPath(pathname);
  
  // Skip middleware for public routes
  if (isPublicPath(pathname)) {
    console.debug(`[Middleware] Skipping middleware for public path: ${pathname}`);
    return NextResponse.next();
  }
  
  // Redirect /onboarding directly to /onboarding/business-info
  if (pathname === '/onboarding') {
    console.debug('[Middleware] Redirecting from /onboarding to /onboarding/business-info');
    return NextResponse.redirect(new URL('/onboarding/business-info', request.url));
  }
  
  // Check if navigating from subscription to dashboard
  if (pathname.includes('/dashboard') && request.nextUrl.search.includes('fromSubscription=true')) {
    // Extract the tenant ID from the URL path - format is /{tenantId}/dashboard
    const tenantIdMatch = pathname.match(/\/([^\/]+)\/dashboard/);
    const tenantId = tenantIdMatch ? tenantIdMatch[1] : null;
    
    // Get authentication cookies and tokens
    const authToken = request.cookies.get('authToken')?.value;
    const idToken = request.cookies.get('idToken')?.value;
    const refreshToken = request.cookies.get('refreshToken')?.value;
    
    // Create a response that allows the dashboard access
    const response = NextResponse.next();
    
    // If we have tenant ID but missing auth tokens, add emergency token headers
    if (tenantId && (!authToken || !idToken)) {
      // Set emergency headers for backend verification
      response.headers.set('X-Emergency-Access', 'true');
      response.headers.set('X-Tenant-ID', tenantId);
      if (request.nextUrl.search.includes('plan=free')) {
        response.headers.set('X-Subscription-Type', 'free');
      }
      
      // Add cookies to maintain session
      if (!authToken && request.cookies.get('authSessionId')?.value) {
        response.cookies.set('authToken', request.cookies.get('authSessionId').value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24, // 1 day
          path: '/',
        });
      }
    }
    
    return response;
  }
  
  // Extract tenant information to determine if isolation check is needed
  const tenantInfo = extractTenantId(request);
  
  // If this is a tenant-specific route with a valid tenant ID, enforce tenant isolation
  if (tenantInfo.found && tenantInfo.isValid && 
      pathname.match(/^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i)) {
    console.debug(`[Middleware] Applying tenant isolation for tenant: ${tenantInfo.tenantId}`);
    
    // Apply RLS and tenant isolation
    return tenantIsolationMiddleware(request);
  }
  
  // Apply tenant middleware (ensure tenant ID is in URL for required routes)
  return tenantMiddleware(request);
}

export const config = {
  matcher: [
    // Apply to dashboard routes
    '/:tenantId/dashboard',
    '/:tenantId/dashboard/:path*',
    // Don't run on API routes, static files, etc.
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/api/:path*'
  ],
}; 