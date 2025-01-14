// src/middleware.js
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// Constants
const PUBLIC_PATHS = [
  '/',
  '/auth/signin',
  '/auth/error',
  '/auth/verify',
  '/api/auth/session',
  '/api/auth/signin/google',  // Add this
  '/api/auth/csrf',
  '/api/auth/providers',
  '/api/health',
  '/api/public',
  '/onboarding/business-info',
  '/api/onboarding/token-exchange',
  '/api/onboarding/token/verify',
  '/api/onboarding/save-business-info',
  '/api/onboarding/save-subscription-info',
  '/api/auth/update-session',
  '/api/auth/callback',
  '/callback/google',
  '/api/onboarding/setup/status/',
  '/api/onboarding/setup/start/',
  '/api/onboarding/setup/cancel/',
  '/api/onboarding/setup/complete/',
  '/api/onboarding/payment/',
  '/api/onboarding/subscription/',
  '/api/onboarding/tasks/',
  '/api/onboarding/complete/',
  '/api/onboarding/update/',
  '/api/onboarding/setup/'  // Add this

  
  // Keep frontend routes protected
  // Do NOT add:
  // '/onboarding/setup'
  // '/onboarding/payment' 
  // '/dashboard'

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
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Check static assets
  const isStatic = STATIC_PATHS.some(path => pathname.startsWith(path));
  const isAsset = !!pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/i);
  const isAuthRoute = pathname.startsWith('/api/auth/');
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isOnboardingApi = pathname.startsWith('/api/onboarding/');

  logger.debug('Middleware skip check:', {
    requestId,
    timestamp,
    pathname,
    evaluation: {
      isStatic,
      isAsset,
      isAuthRoute,
      isPublicPath,
      isOnboardingApi
    },
    skipped: isStatic || isAsset || isAuthRoute || isPublicPath,
    matchedPattern: isStatic ? 'static' : 
                   isAsset ? 'asset' : 
                   isAuthRoute ? 'auth' : 
                   isPublicPath ? 'public' : null
  });

  if (isStatic || isAsset) return true;
  if (isAuthRoute || isPublicPath) return true;

  return false;
};

const validateToken = async (token) => {
  logger.debug('Token validation started:', {
    hasToken: !!token,
    hasAccessToken: !!token?.accessToken
  });

  if (!token?.accessToken) {
    logger.debug('Token validation failed - missing access token');
    return false;
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding/token/verify/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.accessToken}`
      },
      credentials: 'include'

    });

    const isValid = response.ok;
    
    logger.debug('Token validation complete:', {
      isValid,
      status: response.status
    });

    return isValid;

  } catch (error) {
    logger.error('Token validation error:', error);
    return false;
  }
};

// handleOnboardingRoute function
// handleOnboardingRoute function
const handleOnboardingRoute = async (req, token) => {
  const { pathname } = req.nextUrl;
  const requestId = crypto.randomUUID();

  // Get selectedPlan from multiple possible sources
  const selectedPlan = token?.selectedPlan || token?.formData?.selectedPlan;


  logger.debug('Handling onboarding route:', {
    requestId,
    pathname,
    selectedPlan,
    onboardingStatus: token?.onboardingStatus,
    tokenState: {
      hasSelectedPlan: !!selectedPlan,
      currentStatus: token?.onboardingStatus
    }
  });

  // Allow business-info access
  if (pathname === '/onboarding/business-info') {
    return NextResponse.next();
  }

  // Handle setup access for free plan
  if (pathname === '/onboarding/setup') {
    if (selectedPlan === 'free') {
      logger.debug('Allowing setup access for free plan:', {
        selectedPlan,
        currentStep: token?.currentStep
      });
      return NextResponse.next();
    }
  

    // Allow setup access for professional plan after payment
    if (selectedPlan === 'professional' && token?.onboardingStatus === 'payment') {
      logger.debug('Allowing setup access for professional plan:', {
        requestId,
        selectedPlan,
        onboardingStatus: token?.onboardingStatus
      });
      return NextResponse.next();
    }

    logger.debug('Setup access denied:', {
      requestId,
      selectedPlan,
      onboardingStatus: token?.onboardingStatus,
      reason: 'Invalid plan or status'
    });
    return NextResponse.redirect(new URL('/onboarding/subscription', req.url));
  }

  // Handle payment access
  if (pathname === '/onboarding/payment') {
    if (selectedPlan === 'professional' && token?.onboardingStatus === 'subscription') {
      logger.debug('Allowing payment access for professional plan:', {
        requestId,
        selectedPlan,
        onboardingStatus: token?.onboardingStatus
      });
      return NextResponse.next();
    }
    
    logger.debug('Payment access denied:', {
      requestId,
      selectedPlan,
      onboardingStatus: token?.onboardingStatus
    });
    return NextResponse.redirect(new URL('/onboarding/subscription', req.url));
  }

  // Validate token for other routes
  if (!token?.accessToken) {
    logger.debug('No access token found:', { requestId, pathname });
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  const isValid = await validateToken(token);
  if (!isValid) {
    logger.debug('Invalid token:', { requestId, pathname });
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  return NextResponse.next();
};

// Main middleware function
export default withAuth(
  async function middleware(req) {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const { pathname } = req.nextUrl;
    
    try {
      const token = req.nextauth?.token;

      logger.debug('Middleware execution started:', {
        requestId,
        timestamp,
        pathname,
        hasToken: !!token,
        tokenState: token ? {
          onboardingStatus: token.onboardingStatus,
          currentStep: token.currentStep,
          hasAccessToken: !!token.accessToken
        } : null
      });

      // Special handling for business-info access
      if (pathname === '/onboarding/business-info') {
        const hasValidToken = token?.accessToken && await validateToken(token);
        
        logger.debug('Business info page access:', {
          requestId,
          pathname,
          hasToken: !!token,
          hasAccessToken: !!token?.accessToken,
          hasValidToken
        });
      
        return hasValidToken ? 
          NextResponse.next() : 
          NextResponse.redirect(new URL('/auth/signin', req.url));
      }

      // Handle public routes
      if (shouldSkipMiddleware(pathname)) {
        logger.debug('Middleware skipped:', {
          requestId,
          pathname,
          reason: 'Public route'
        });
        return NextResponse.next();
      }

      // Allow OAuth callbacks
      if (pathname.includes('/api/auth/callback') || pathname.includes('/callback/google')) {
        logger.debug('OAuth callback allowed:', {
          requestId,
          pathname
        });
        return NextResponse.next();
      }

      // Handle onboarding routes
      if (pathname.startsWith('/onboarding/')) {
        try {
          logger.debug('Handling onboarding route:', {
            requestId,
            timestamp,
            pathname,
            tokenStatus: token?.onboardingStatus,
            currentStep: pathname.split('/').pop()
          });
          return handleOnboardingRoute(req, token);
        } catch (error) {
          logger.error('Onboarding route handling failed:', {
            requestId,
            error: {
              message: error.message,
              stack: error.stack
            },
            context: {
              pathname,
              hasToken: !!token,
              onboardingStatus: token?.onboardingStatus
            }
          });
          return NextResponse.redirect(new URL('/auth/error', req.url));
        }
      }

      // Handle protected routes
      const tokenValidation = await validateToken(token); // Add await here
      if (!tokenValidation) {
        const signInUrl = `/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`;
        logger.debug('Protected route access denied:', {
          requestId,
          timestamp,
          context: {
            from: pathname,
            to: signInUrl,
            reason: 'Invalid or expired token',
            tokenState: {
              exists: !!token,
              hasAccessToken: !!token?.accessToken,
              hasExpiry: !!token?.accessTokenExpires
            }
          }
        });
        return NextResponse.redirect(new URL(signInUrl, req.url));
      }

      logger.debug('Protected route access granted:', {
        requestId,
        timestamp,
        pathname,
        finalState: {
          onboardingStatus: token.onboardingStatus,
          currentStep: token.currentStep,
          completedSteps: token.completedSteps
        }
      });
      return NextResponse.next();

    } catch (error) {
      logger.error('Middleware execution failed:', {
        requestId,
        timestamp,
        error: {
          message: error.message,
          stack: error.stack,
          type: error.constructor.name
        },
        context: {
          pathname,
          url: req.url,
          method: req.method
        }
      });

      // Handle different error types
      if (error.message.includes('token')) {
        return NextResponse.redirect(new URL('/auth/signin', req.url));
      }
      
      if (error.message.includes('onboarding')) {
        return NextResponse.redirect(new URL('/onboarding/business-info', req.url));
      }

      // Default error handling
      return NextResponse.redirect(new URL('/auth/error', req.url));
    }
  },
  {
    callbacks: {
      authorized: async ({ token, req }) => {
        const requestId = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const pathname = req.nextUrl.pathname;
        
        try {
          logger.debug('Authorization callback initiated:', {
            requestId,
            timestamp,
            context: {
              pathname,
              hasToken: !!token,
              tokenState: {
                hasAccessToken: !!token?.accessToken,
                hasRefreshToken: !!token?.refreshToken,
                onboardingStatus: token?.onboardingStatus,
                currentStep: token?.currentStep
              }
            }
          });
    
          // Always allow public paths and auth-related paths
          if (shouldSkipMiddleware(pathname)) {
            logger.debug('Authorization skipped:', {
              requestId,
              timestamp,
              pathname,
              reason: 'Public path'
            });
            return true;
          }
    
          // Handle business-info page specially
          if (pathname === '/onboarding/business-info') {
            const hasValidToken = token?.accessToken ? await validateToken(token) : false;
            
            ogger.debug('Business info page access check:', {
              hasToken: !!token,
              hasAccessToken: !!token?.accessToken,
              hasValidToken
            });
    
            if (!hasValidToken) {
              return NextResponse.redirect(new URL('/auth/signin', req.url));
            }
            
            return NextResponse.next();
          }
    
          // For all other protected routes
          if (!token?.accessToken) {
            logger.debug('Authorization failed - missing token:', {
              requestId,
              pathname
            });
            return false;
          }
    
          const isValid = await validateToken(token);
          
          logger.debug('Authorization completed:', {
            requestId,
            timestamp,
            result: {
              pathname,
              isValid,
              onboardingStatus: token?.onboardingStatus,
              hasValidToken: !!token?.accessToken && isValid
            }
          });
    
          return isValid;
    
        } catch (error) {
          logger.error('Authorization callback failed:', {
            requestId,
            timestamp,
            error: {
              message: error.message,
              type: error.constructor.name
            },
            context: {
              pathname,
              hasToken: !!token,
              hasAccessToken: !!token?.accessToken
            }
          });
          return false;
        }
      }
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error'
    }
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.json).*)',
    '/onboarding/:path*'
  ]
};