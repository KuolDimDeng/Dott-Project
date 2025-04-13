import { NextResponse } from 'next/server';
import { tenantMiddleware, extractTenantId } from './middleware/tenant-middleware';
import { isValidUUID } from '@/utils/tenantUtils';

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