import { NextResponse } from 'next/server';
import { tenantMiddleware, extractTenantId } from './middleware/tenant-middleware';
import { isValidUUID } from '@/utils/tenantUtils';

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
 * Main middleware function that combines all middleware layers
 * 
 * @param {Request} request - The incoming request
 * @returns {NextResponse} - The response
 */
export function middleware(request) {
  const { pathname } = new URL(request.url);
  
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
  
  // Apply tenant middleware (ensure tenant ID is in URL for required routes)
  return tenantMiddleware(request);
}
  
// Configure which paths the middleware applies to
export const config = {
  matcher: [
    // Match all paths except for static resources
    '/((?!_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
}; 