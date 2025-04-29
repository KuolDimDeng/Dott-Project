/**
 * Middleware for handling database connections
 * Ensures that payroll-related API routes always use AWS RDS
 */

import { NextResponse } from 'next/server';
import { createServerLogger } from '@/utils/serverLogger';

const logger = createServerLogger('db-middleware');

/**
 * Match function to check if a route is related to payroll
 * @param {string} pathname - The route path
 * @returns {boolean} True if payroll-related, false otherwise
 */
function isPayrollRoute(pathname) {
  return (
    pathname.includes('/api/payroll') ||
    pathname.includes('/api/banking') ||
    pathname.includes('/api/hr/employees')
  );
}

/**
 * Middleware function to handle request for AWS RDS database
 * @param {Request} request - The incoming request
 * @returns {NextResponse} Modified response or passes through
 */
export function middleware(request) {
  const { pathname } = new URL(request.url);
  
  // Only apply to API routes
  if (!pathname.includes('/api/')) {
    return NextResponse.next();
  }
  
  // Get request headers
  const requestHeaders = new Headers(request.headers);
  
  // Always use AWS RDS for payroll routes
  if (isPayrollRoute(pathname)) {
    logger.info(`Ensuring AWS RDS for route: ${pathname}`);
    
    // Set RDS-specific headers
    requestHeaders.set('X-Data-Source', 'AWS_RDS');
    requestHeaders.set('X-Database-Only', 'true');
    requestHeaders.set('X-Use-Mock-Data', 'false');
    
    // For payroll routes, add special header
    if (pathname.includes('/api/payroll')) {
      requestHeaders.set('X-Payroll-RDS', 'true');
    }
    
    // Return modified request
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  return NextResponse.next();
}

/**
 * Define which routes this middleware applies to
 */
export const config = {
  matcher: [
    // Apply to all API routes
    '/api/:path*',
  ],
}; 