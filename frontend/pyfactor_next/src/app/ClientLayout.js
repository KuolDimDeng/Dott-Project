'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '@/utils/logger';
import { isPublicRoute } from '@/lib/authUtils';
import { fetchAuthSession } from 'aws-amplify/auth';
import { refreshUserSession } from '@/utils/refreshUserSession';
import { initializeTenant } from '@/utils/tenantUtils';
import { initializeTenantContext } from '@/utils/tenantContext';
// These providers are now handled in providers.js
import AuthErrorBoundary from '@/components/ErrorBoundary';
import LoadingFallback from '@/components/ClientOnly/LoadingFallback';
import { setupRenderDebugging } from '@/utils/debugReactRendering';
import dynamic from 'next/dynamic';
import ConfigureAmplify from '@/components/ConfigureAmplify';
import DynamicComponents from '@/components/DynamicComponents';
// Removed GlobalEventDebugger - was causing input field issues

// Dynamically import the ReactErrorDebugger to avoid SSR issues
const ReactErrorDebugger = dynamic(
  () => import('@/components/Debug/ReactErrorDebugger'),
  {
    ssr: false,
    loading: () => null
  }
);

// Helper function to check cookie-based access for onboarding pages
const checkCookieBasedAccess = (pathname) => {
  if (typeof document === 'undefined') return false;
  
  // Parse all cookies
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const parts = cookie.trim().split('=');
    if (parts.length > 1) {
      try {
        acc[parts[0].trim()] = decodeURIComponent(parts[1]);
      } catch (e) {
        acc[parts[0].trim()] = parts[1];
      }
    }
    return acc;
  }, {});
  
  // Get onboarding status from cookies
  const onboardingStep = cookies.onboardingStep;
  const onboardedStatus = cookies.onboardedStatus;
  const selectedPlan = cookies.selectedPlan;
  const postSubscriptionAccess = cookies.postSubscriptionAccess;
  
  // Special case for dashboard after subscription
  if (pathname === '/dashboard' && 
      ((selectedPlan === 'free' && onboardedStatus === 'SUBSCRIPTION') || 
       postSubscriptionAccess === 'true')) {
    logger.info('[ClientLayout] Allowing dashboard access after free plan subscription');
    return true;
  }
  
  // Grant access based on cookies and pathname
  if (pathname.includes('business-info')) {
    // Always allow access to business-info
    return true;
  } else if (pathname.includes('subscription')) {
    // Allow access to subscription if business-info is completed
    return onboardingStep === 'subscription' || onboardedStatus === 'BUSINESS_INFO';
  } else if (pathname.includes('payment')) {
    // Allow access to payment if subscription is completed
    return onboardingStep === 'payment' || onboardedStatus === 'SUBSCRIPTION';
  } else if (pathname.includes('setup')) {
    // Allow access to setup if payment is completed
    return onboardingStep === 'setup' || onboardedStatus === 'PAYMENT';
  }
  
  return false;
};

export default function ClientLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [debugInitialized, setDebugInitialized] = useState(false);
  const sessionCheckCache = useRef(new Map());
  const [isVerifying, setIsVerifying] = useState(true);
  const [tenantInitialized, setTenantInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize debugging tools
  useEffect(() => {
    if (typeof window !== 'undefined' && !debugInitialized) {
      try {
        logger.debug('[ClientLayout] Setting up React render debugging');
        
        // Setup render debugging
        setupRenderDebugging();
        
        // Add global error handler for "render is not a function" errors
        // but prevent infinite loops by not calling the original handler for certain errors
        const originalError = console.error;
        console.error = (...args) => {
          try {
            // Safely convert args to string for pattern matching
            let errorString = '';
            try {
              errorString = args
                .map(arg => 
                  typeof arg === 'string' ? arg : 
                  (arg instanceof Error ? arg.message : 
                  JSON.stringify(arg))
                )
                .join(' ');
            } catch (e) {
              errorString = 'Error converting error to string';
            }
            
            // Check for specific error patterns that might cause infinite loops
            const isMaxUpdateDepthError = errorString.includes('Maximum update depth exceeded');
            const isRenderNotFunctionError = errorString.includes('render is not a function');
            const isReactAxiosNetworkError = errorString.includes('AxiosConfig') && errorString.includes('Response error');
            
            // Create safer args for logging
            const safeArgs = args.map(arg => {
              if (typeof arg === 'object' && arg !== null) {
                try {
                  // Create a shallow copy without circular references
                  return { 
                    ...Object.keys(arg).reduce((acc, key) => {
                      try {
                        const value = arg[key];
                        // Only include primitive values and simple objects
                        if (typeof value !== 'function' && 
                            typeof value !== 'symbol' && 
                            !(value instanceof Element)) {
                          acc[key] = value;
                        }
                      } catch (e) {
                        // Skip properties that can't be accessed
                      }
                      return acc;
                    }, {})
                  };
                } catch (e) {
                  return '[Complex Object]';
                }
              }
              return arg;
            });
            
            if (isRenderNotFunctionError) {
              logger.error('[ClientLayout] Caught "render is not a function" error:', {
                errorString,
                stack: new Error().stack,
                pathname
              });
              
              // Add to window for debugging
              window.__LAST_RENDER_ERROR = {
                message: errorString,
                stack: new Error().stack,
                timestamp: new Date().toISOString(),
                pathname
              };
              
              // Try to identify the component causing the error
              try {
                const stackLines = new Error().stack.split('\n');
                const componentLine = stackLines.find(line =>
                  line.includes('/components/') ||
                  line.includes('/app/') ||
                  line.includes('createElement')
                );
                
                if (componentLine) {
                  logger.error('[ClientLayout] Potential component causing error:', componentLine);
                  window.__LAST_RENDER_ERROR.componentLine = componentLine;
                }
              } catch (e) {
                logger.error('[ClientLayout] Error analyzing stack:', e);
              }
            }
            
            // Handle Axios errors specially
            if (isReactAxiosNetworkError) {
              logger.warn('[ClientLayout] Caught Axios network error - logging safely');
              // Let the original error handler show it, but also log it safely
            }
            
            // Handle Django Resolver404 errors specially
            const isUrlResolverError = errorString && (
              errorString.includes('Resolver404') || 
              errorString.includes('endpoint not found') ||
              errorString.includes('URL pattern not found')
            );
            
            if (isUrlResolverError) {
              logger.warn('[ClientLayout] Caught URL resolver error - this might indicate a tenant schema issue', {
                errorString
              });
              
              // If it's a tenant schema issue, don't log it to the console to reduce noise
              // Instead, we'll handle it in the component
              if (errorString.includes('tenant schema')) {
                return; // Skip console.error to reduce noise
              }
            }
            
            // Only call original error handler if it's not a max update depth error
            // This prevents infinite loops
            if (!isMaxUpdateDepthError) {
              try {
                originalError.apply(console, args);
              } catch (callError) {
                // If applying the original error fails, log safely
                logger.error('[ClientLayout] Failed to call original console.error:', {
                  errorString,
                  callError: callError.message,
                  pathname
                });
                // Fallback to basic console.error
                originalError.call(console, errorString);
              }
            } else {
              // Just log to our logger without calling original console.error
              logger.error('[ClientLayout] Maximum update depth exceeded error detected and suppressed');
            }
          } catch (handlerError) {
            // If our error handler itself fails, log safely and call original
            try {
              logger.error('[ClientLayout] Error in console.error handler:', handlerError);
              originalError.apply(console, args);
            } catch (e) {
              // Last resort fallback
              originalError.call(console, 'Error in error handler');
            }
          }
        };
        
        setDebugInitialized(true);
        logger.debug('[ClientLayout] Debug initialization complete');
      } catch (error) {
        logger.error('[ClientLayout] Error initializing debug tools:', {
          message: error.message,
          stack: error.stack
        });
      }
    }
  }, [debugInitialized, pathname]);

  useEffect(() => {
    logger.debug('[ClientLayout] Component mounted, starting session check');
    
    // Add global access to router for debugging
    if (typeof window !== 'undefined') {
      window.__NEXT_ROUTER = router;
      window.__CURRENT_PATHNAME = pathname;
    }
  }, [router, pathname]);

  // Create stable verifySession function - no debounce to avoid promise issues
  const verifySession = useRef(
    async (pathname, attempt = 1) => {
      const maxAttempts = 3;
      
      try {
        // Check cache first
        const cacheKey = `${pathname}-${attempt}`;
        if (sessionCheckCache.current.has(cacheKey)) {
          const cachedResult = sessionCheckCache.current.get(cacheKey);
          setIsVerifying(false);
          return cachedResult;
        }

        logger.debug('[ClientLayout] Verifying session:', {
          attempt,
          maxAttempts,
          pathname
        });

        // If it's a public route, no need to verify
        if (isPublicRoute(pathname)) {
          setIsVerifying(false);
          return true;
        }
        
        // Special case for dashboard after free plan subscription
        if (pathname === '/dashboard') {
          // Check cookies to see if this is a post-subscription dashboard access
          if (typeof window !== 'undefined') {
            const cookies = document.cookie.split(';').reduce((acc, cookie) => {
              const parts = cookie.trim().split('=');
              if (parts.length > 1) {
                try {
                  acc[parts[0].trim()] = decodeURIComponent(parts[1]);
                } catch (e) {
                  acc[parts[0].trim()] = parts[1];
                }
              }
              return acc;
            }, {});
            
            // Check for free plan subscription flow
            if (cookies.selectedPlan === 'free' && 
                (cookies.onboardedStatus === 'SUBSCRIPTION' || cookies.onboardedStatus === 'SETUP') && 
                (cookies.onboardingStep === 'SETUP' || cookies.postSubscriptionAccess === 'true')) {
              logger.info('[ClientLayout] Dashboard access from free plan subscription flow, allowing access');
              sessionCheckCache.current.set(cacheKey, true);
              setIsVerifying(false);
              setIsAuthenticated(true);
              return true;
            }
          }
        }
        
        // Special handling for onboarding routes - allow access if in onboarding flow
        if (pathname.startsWith('/onboarding/') || pathname === '/auth/verify-email' || pathname.startsWith('/auth/verify-email')) {
          logger.debug('[ClientLayout] Onboarding or verification route detected, using lenient session check');
          
          // Check for cookie-based access first
          if (typeof window !== 'undefined') {
            const hasCookieAccess = checkCookieBasedAccess(pathname);
            if (hasCookieAccess) {
              logger.debug('[ClientLayout] Cookie-based access granted for:', pathname);
              sessionCheckCache.current.set(cacheKey, true);
              setIsVerifying(false);
              return true;
            }
          }
          
          // Always let subscription page through
          if (pathname.includes('subscription')) {
            logger.debug('[ClientLayout] Allowing access to subscription page');
            sessionCheckCache.current.set(cacheKey, true);
            setIsVerifying(false);
            return true;
          }
          
          try {
            // Try to get session but don't redirect if it fails
            const { tokens } = await fetchAuthSession();
            const isValid = !!tokens?.idToken;
            
            if (isValid) {
              // Initialize tenant if needed but don't fail if it doesn't work
              if (!tenantInitialized) {
                try {
                  await initializeTenantContext();
                  setTenantInitialized(true);
                } catch (e) {
                  logger.warn('[ClientLayout] Tenant init failed for onboarding route, but continuing:', e.message);
                }
              }
              
              // Cache the successful result
              sessionCheckCache.current.set(cacheKey, true);
              setIsVerifying(false);
              return true;
            } else {
              // If pathname is business-info or subscription, allow to proceed anyway
              if (pathname.includes('business-info') || pathname.includes('subscription')) {
                logger.debug(`[ClientLayout] Allowing access to ${pathname} despite session issues`);
                sessionCheckCache.current.set(cacheKey, true);
                setIsVerifying(false);
                return true;
              }
            }
          } catch (e) {
            logger.warn('[ClientLayout] Session check error in onboarding route:', e.message);
            
            // For business-info or subscription page, don't redirect to sign-in
            if (pathname.includes('business-info') || pathname.includes('subscription')) {
              logger.debug(`[ClientLayout] Allowing access to ${pathname} despite session error`);
              sessionCheckCache.current.set(cacheKey, true);
              setIsVerifying(false);
              return true;
            }
          }
        }

        // Standard session check for other routes
        const { tokens } = await fetchAuthSession();
        let isValid = !!tokens?.idToken; // Use let instead of const so we can update it

        if (isValid && !tenantInitialized) {
          try {
            // Initialize tenant if we have a valid session
            await initializeTenantContext();
            setTenantInitialized(true);
            logger.info('[ClientLayout] Tenant context initialized successfully');
          } catch (error) {
            logger.error('[ClientLayout] Failed to initialize tenant context:', error);
            // Fallback to old initialization method
            try {
              await initializeTenant(tokens.idToken);
              setTenantInitialized(true);
              logger.info('[ClientLayout] Fallback tenant initialization successful');
            } catch (fallbackError) {
              logger.error('[ClientLayout] Fallback tenant initialization also failed:', fallbackError);
              // Don't fail the session check if tenant init fails
            }
          }
        }

        // Cache the result
        sessionCheckCache.current.set(cacheKey, isValid);

        // Clear cache after 5 minutes
        setTimeout(() => {
          sessionCheckCache.current.delete(cacheKey);
        }, 5 * 60 * 1000);

        if (!isValid && attempt < maxAttempts) {
          // Try to refresh session
          try {
            const refreshed = await refreshUserSession();
            if (refreshed) {
              // We'll just set isValid to true and continue without recursion
              logger.debug('[ClientLayout] Session refreshed, continuing with validation');
              isValid = true;
            }
          } catch (refreshError) {
            logger.warn('[ClientLayout] Error refreshing session:', refreshError.message);
          }
        }

        if (!isValid) {
          logger.warn('[ClientLayout] Invalid session, redirecting to signin');
          router.replace('/auth/signin');
          setIsVerifying(false);
          return false;
        }

        logger.debug('[ClientLayout] Session check successful');
        setIsVerifying(false);
        return true;
      } catch (error) {
        logger.error('[ClientLayout] Session verification failed:', {
          error: error.message,
          attempt,
          pathname
        });
        
        if (attempt < maxAttempts) {
          // No need to retry recursively as it causes issues
          logger.debug('[ClientLayout] Session verification failed, not retrying to avoid loops');
          setIsVerifying(false);
          router.replace('/auth/signin');
          return false;
        }
        
        setIsVerifying(false);
        router.replace('/auth/signin');
        return false;
      }
    }
  );

  // Reset tenant initialization when pathname changes
  useEffect(() => {
    if (!isPublicRoute(pathname)) {
      setTenantInitialized(false);
    }
  }, [pathname]);

  // Initialize verifySession on mount
  useEffect(() => {
    const verify = async () => {
      if (pathname && verifySession.current) {
        try {
          const sessionValid = await verifySession.current(pathname);
          setIsAuthenticated(sessionValid);
        } catch (error) {
          logger.error('[ClientLayout] Error in session verification:', error);
          setIsVerifying(false);
          setIsAuthenticated(false);
        }
      }
    };

    verify();

    // No need to cancel since we're not using debounce anymore
    return () => {};
  }, [pathname]);

  // Show loading state while verifying
  if (isVerifying && !isPublicRoute(pathname)) {
    return <LoadingFallback />;
  }

  // Enhanced error boundary with detailed logging
  const handleError = (error, errorInfo) => {
    logger.error('[ClientLayout] Error caught by error boundary:', {
      error,
      componentStack: errorInfo.componentStack,
      pathname
    });
    
    // Add to window for debugging
    if (typeof window !== 'undefined') {
      window.__LAST_ERROR_BOUNDARY_ERROR = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        pathname
      };
    }
  };

  return (
    <>
      {/* GlobalEventDebugger removed to fix input field issues */}
      <AuthErrorBoundary onError={handleError}>
        <ConfigureAmplify />
        <LoadingFallback>
          {children}
          <DynamicComponents isAuthenticated={isAuthenticated} />
          {/* React Error Debugger disabled */}
        </LoadingFallback>
      </AuthErrorBoundary>
    </>
  );
}
