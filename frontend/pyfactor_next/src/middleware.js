// src/middleware.js
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// Constants
// Add to PUBLIC_PATHS
const PUBLIC_PATHS = [
  // Existing paths
  '/',
  '/auth/signin',
  '/auth/error',
  '/auth/verify',
  '/api/auth/session',
  '/api/auth/callback/google',
  '/api/auth/callback',
  '/api/health',
  '/api/public',
  
  // Add these onboarding routes
  '/onboarding/business-info',
  '/onboarding/subscription',
  '/api/onboarding/save-business-info',
  '/api/onboarding/subscription',
  '/api/onboarding/save-subscription-info',
  '/api/auth/update-session'
];

const STATIC_PATHS = [
  '/_next',
  '/static',
  '/images',
  '/favicon.ico',
  '/robots.txt',
  '/manifest.json'
];

// Helper to check if route should skip middleware
const shouldSkipMiddleware = (pathname) => {

  // Add explicit handling for onboarding transitions
  if (pathname === '/onboarding/subscription') {
    logger.debug('Allowing direct subscription access');
    return true;
  }

  if (pathname.startsWith('/onboarding/')) {
    logger.debug('Checking onboarding path access:', { pathname });
    return true;
  }


  // Always allow these onboarding paths
  if (['/onboarding/business-info', '/onboarding/subscription'].includes(pathname)) {
    logger.debug('Skipping middleware for onboarding path:', { pathname });
    return true;
  }

  // Check business-info first
  if (pathname === '/onboarding/business-info') {
    return true;
  }
  
  // Skip OAuth callbacks
  if (pathname.includes('/api/auth/callback') || 
      pathname.includes('/callback/google') ||
      pathname.includes('oauth')) {
    return true;
  }
  // Skip static files and assets
  if (STATIC_PATHS.some(path => pathname.startsWith(path))) return true;
  
  // Skip file extensions
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/i)) return true;
  
  // Skip all auth API routes
  if (pathname.startsWith('/api/auth/')) return true;
  
  // Skip other public paths
  return PUBLIC_PATHS.includes(pathname);
};

// Helper to validate token
const validateToken = (token) => {
  if (!token?.accessToken) return false;
  if (!token?.accessTokenExpires) return false;
  if (Date.now() >= token.accessTokenExpires) return false;
  return true;
};

// Helper to get redirect URL
const getRedirectUrl = (pathname, baseUrl) => {
  if (!pathname) return '/auth/signin';
  const callbackUrl = encodeURIComponent(pathname);
  return `/auth/signin?callbackUrl=${callbackUrl}`;
};

// Helper to handle onboarding routes
const handleOnboardingRoute = (req, token) => {
  const { pathname } = req.nextUrl;

   // Allow direct access to business-info and subscription during transition
   if (['/onboarding/business-info', '/onboarding/subscription'].includes(pathname)) {
    logger.debug('Direct access allowed to onboarding step:', {
      pathname,
      tokenStatus: token?.onboardingStatus
    });
    return NextResponse.next();
  }

  logger.debug('Middleware navigation check:', {
    pathname,
    token: {
      onboardingStatus: token?.onboardingStatus,
      currentStep: token?.currentStep,
      completedSteps: token?.completedSteps
    },
    isAuthenticated: !!token?.accessToken
  });

  // Allow direct access to business-info and subscription
  if (pathname === '/onboarding/business-info' || pathname === '/onboarding/subscription') {
    logger.debug('Direct access allowed to onboarding step:', {
      pathname,
      tokenStatus: token?.onboardingStatus
    });
    return NextResponse.next();
  }
  
  // Allow access with valid token
  if (validateToken(token)) {
    logger.debug('Valid token for onboarding route:', {
      pathname,
      currentStep: token?.currentStep,
      onboardingStatus: token?.onboardingStatus
    });
    return NextResponse.next();
  }

  // Redirect to signin for invalid token
  logger.debug('Invalid token for onboarding route:', {
    pathname,
    hasToken: !!token,
    tokenExpiry: token?.accessTokenExpires
  });
  
  return NextResponse.redirect(
    new URL(getRedirectUrl(pathname, req.url), req.url)
  );
};

// Helper to handle auth routes
const handleAuthRoute = (req, token) => {
  const { pathname } = req.nextUrl;

  // Always allow access to signin page
  if (pathname === '/auth/signin') {
    // Redirect authenticated users away from signin
    if (validateToken(token)) {
      const onboardingStatus = token.onboardingStatus || 'business-info';
      return NextResponse.redirect(
        new URL(`/onboarding/${onboardingStatus}`, req.url)
      );
    }
    return NextResponse.next();
  }

  // Allow access to other auth routes
  return NextResponse.next();
};

const validateOnboardingAccess = (pathname, token) => {
  // Add transition state logging
  logger.debug('Validating onboarding access:', {
    pathname,
    token: {
      onboardingStatus: token?.onboardingStatus,
      currentStep: token?.currentStep,
      completedSteps: token?.completedSteps,
      allowedStepNumber: token?.allowedStepNumber
    }
  });

  // Allow access during transition states
  if (pathname === '/onboarding/subscription' && 
      (token?.onboardingStatus === 'subscription' || 
       token?.onboardingStatus === 'business-info')) {
    return true;
  }

  return false;
};

// Main middleware function
export default withAuth(
  async function middleware(req) {
    const requestId = crypto.randomUUID();
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    logger.debug('Middleware request:', {
      requestId,
      pathname,
      tokenStatus: {
        onboardingStatus: token?.onboardingStatus,
        currentStep: token?.currentStep,
        hasToken: !!token?.accessToken
      }
    });

     // Add the new logging statement here
     logger.debug('Middleware validation:', {
      pathname,
      isBusinessInfo: pathname === '/onboarding/business-info',
      isSubscription: pathname === '/onboarding/subscription',
      token: {
        onboardingStatus: token?.onboardingStatus,
        currentStep: token?.currentStep
      }
    })

    // Skip middleware for certain paths
    if (shouldSkipMiddleware(pathname)) {
      logger.debug('Skipping middleware:', { requestId, pathname });
      return NextResponse.next();
    }

    // Handle onboarding routes
    if (pathname.startsWith('/onboarding/')) {
      if (validateOnboardingAccess(pathname, token)) {
        logger.debug('Onboarding access granted:', { pathname });
        return NextResponse.next();
      }
    }

    // Handle auth routes
    if (pathname.startsWith('/auth/')) {
      return handleAuthRoute(req, token);
    }

    // Handle onboarding routes
    if (pathname.startsWith('/onboarding/')) {
      return handleOnboardingRoute(req, token);
    }

    // Default protected route handling
    if (!validateToken(token)) {
      logger.debug('Protected route - redirecting to signin:', {
        requestId,
        pathname
      });
      return NextResponse.redirect(
        new URL(getRedirectUrl(pathname, req.url), req.url)
      );
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        logger.debug('Authorization check:', {
          pathname,
          hasToken: !!token,
          isPublic: shouldSkipMiddleware(pathname),
          tokenDetails: token ? {
            onboardingStatus: token.onboardingStatus,
            currentStep: token.currentStep,
            isValid: validateToken(token)
          } : null
        });
    
        // Don't require auth for public routes
        if (shouldSkipMiddleware(pathname)) {
          return true;
        }
        return validateToken(token);
      }
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error'
    }
  }
);

// Matcher configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. _next/static (static files)
     * 2. _next/image (image optimization files)
     * 3. favicon.ico (favicon file)
     * 4. public folder
     * 5. public API routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|api/public/).*)',
    '/onboarding/:path*'
  ]
};