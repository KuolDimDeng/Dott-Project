import { NextResponse } from 'next/server';
import { tenantMiddleware, extractTenantId } from './middleware/tenant-middleware';
import { tenantIsolationMiddleware } from './middleware/tenant-isolation';
import { isValidUUID } from '@/utils/tenantUtils';
import { resetCognitoCircuit, getCognitoCircuitState } from './utils/networkMonitor';

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
 * Main middleware function that combines all middleware layers
 * 
 * @param {Request} request - The incoming request
 * @returns {NextResponse} - The response
 */
export async function middleware(request) {
  const { pathname, search } = request.nextUrl;
  
  // Reset circuit breaker for important paths
  resetCircuitBreakerForCriticalPath(pathname);
  
  // Skip middleware for static files and API routes except for tenant-specific endpoints
  if ((pathname.startsWith('/_next/') || pathname.includes('.')) &&
      !pathname.startsWith('/api/tenant/')) {
    return NextResponse.next();
  }
  
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
  if (pathname.includes('/dashboard') && search.includes('fromSubscription=true')) {
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
      if (search.includes('plan=free')) {
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
  ],
}; 