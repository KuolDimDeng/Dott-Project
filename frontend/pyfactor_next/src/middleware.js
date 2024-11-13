// src/middleware.js
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { APP_CONFIG } from '@/config';
import { logger } from '@/utils/logger';

// Helper function for path matching - improved to handle exact matches
const matchesPattern = (pathname, patterns) => {
  if (!patterns) return false;
  
  // Convert single string to array
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];
  
  return patternArray.some(pattern => {
    // Handle exact matches (like root '/')
    if (pattern === pathname) return true;
    // Handle prefix matches
    return pathname.startsWith(pattern);
  });
};

// Improved public access check
const isPublicAccess = (pathname) => {
  // Always allow root path
  if (pathname === '/') return true;

  // Check all public path patterns
  const publicPatterns = [
    ...APP_CONFIG.routes.public,           // Public routes like '/', '/about'
    APP_CONFIG.routes.auth.paths,          // Auth paths
    ...APP_CONFIG.routes.static,           // Static files
    '/api/auth'                            // Auth API routes
  ].flat();

  return matchesPattern(pathname, publicPatterns);
};

// Security headers
const SECURITY_HEADERS = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
    'accelerometer=()',
    'autoplay=()',
    'payment=()',
    'usb=()'
  ].join(', '),
  'X-XSS-Protection': '1; mode=block'
};

// Token expiration check
const isTokenExpired = (token) => {
  if (!token?.exp) return true;
  const gracePeriod = APP_CONFIG.auth.tokenGracePeriod || 0;
  const expiry = new Date(token.exp * 1000);
  return (expiry.getTime() + gracePeriod) < Date.now();
};

// Main middleware
export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl;
    const response = NextResponse.next();

    try {
      // Apply security headers
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Check for public access first
      if (isPublicAccess(pathname)) {
        logger.debug('Public access granted for:', pathname);
        return response;
      }

      // Handle protected routes
      const token = req.nextauth?.token;
      
      // Check token existence
      if (!token) {
        logger.warn('No authentication token found for:', pathname);
        return handleUnauthorized(req);
      }

      // Check token expiration
      if (isTokenExpired(token)) {
        logger.warn('Token expired for:', pathname);
        return handleUnauthorized(req, { reason: 'token_expired' });
      }

      // Handle onboarding routes
      if (matchesPattern(pathname, APP_CONFIG.routes.onboarding.paths)) {
        const onboardingStatus = token.onboardingStatus;
        if (onboardingStatus === 'complete') {
          logger.info('Redirecting completed onboarding to dashboard');
          return NextResponse.redirect(new URL('/dashboard', req.url));
        }
      }

      logger.debug('Access granted for:', pathname);
      return response;

    } catch (error) {
      logger.error('Middleware error:', {
        path: pathname,
        error: error.message,
        stack: error.stack
      });
      return NextResponse.redirect(new URL(APP_CONFIG.routes.auth.error, req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        try {
          // Allow public routes without token check
          if (isPublicAccess(req.nextUrl.pathname)) {
            return true;
          }
          
          // Check token for protected routes
          return !!token && !isTokenExpired(token);
        } catch (error) {
          logger.error('Authorization check error:', error);
          return false;
        }
      },
    },
    // Specify auth pages
    pages: {
      signIn: APP_CONFIG.routes.auth.signIn,
      error: APP_CONFIG.routes.auth.error,
    }
  }
);

// Handle unauthorized access
const handleUnauthorized = (req, options = {}) => {
  try {
    const returnTo = options.returnTo || req.url;
    const signInPath = options.signInPath || APP_CONFIG.routes.auth.signIn;
    
    const callbackUrl = encodeURIComponent(returnTo);
    const signInUrl = new URL(`${signInPath}?callbackUrl=${callbackUrl}`, req.url);
    
    logger.info('Redirecting unauthorized access to:', signInUrl.toString());
    return NextResponse.redirect(signInUrl);
  } catch (error) {
    logger.error('Error handling unauthorized access:', error);
    return NextResponse.redirect(new URL(APP_CONFIG.routes.auth.error, req.url));
  }
};

// Matcher configuration
export const config = {
  matcher: [
    // Match all paths except:
    '/((?!_next/static|_next/image|favicon.ico|public/|api/auth/).*)',
  ],
};

// Error types
export const MIDDLEWARE_ERRORS = {
  TOKEN_EXPIRED: 'token_expired',
  UNAUTHORIZED: 'unauthorized',
  INVALID_TOKEN: 'invalid_token',
  SERVER_ERROR: 'server_error'
};