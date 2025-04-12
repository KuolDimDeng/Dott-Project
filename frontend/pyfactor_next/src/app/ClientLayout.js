'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '@/utils/logger';
import { isPublicRoute } from '@/lib/authUtils';
import { fetchAuthSession } from 'aws-amplify/auth';
import { refreshUserSession } from '@/utils/refreshUserSession';
import { initializeTenant } from '@/utils/tenantUtils';
import { initializeTenantContext } from '@/utils/tenantContext';
import { setupHubDeduplication } from '@/utils/refreshUserSession';
// These providers are now handled in providers.js
import AuthErrorBoundary from '@/components/ErrorBoundary';
import LoadingFallback from '@/components/ClientOnly/LoadingFallback';
import { setupRenderDebugging } from '@/utils/debugReactRendering';
import dynamic from 'next/dynamic';
import ConfigureAmplify from '@/components/ConfigureAmplify';
import DynamicComponents from '@/components/DynamicComponents';
import tokenRefreshService from '@/utils/tokenRefresh';
// Removed GlobalEventDebugger - was causing input field issues

// Dynamically import the ReactErrorDebugger to avoid SSR issues
const ReactErrorDebugger = dynamic(
  () => import('@/components/Debug/ReactErrorDebugger'),
  {
    ssr: false,
    loading: () => null
  }
);

// Force React to think it's in production mode
if (typeof window !== 'undefined') {
    // Override the development mode warning
    const originalConsoleLog = console.log;
    console.log = function(...args) {
        // Skip React DevTools download message
        if (
            args.length > 0 && 
            typeof args[0] === 'string' && 
            args[0].includes('Download the React DevTools')
        ) {
            return;
        }
        return originalConsoleLog.apply(this, args);
    };

    // Hide React development mode by overriding the env
    Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
        get() {
            return { isDisabled: true };
        }
    });
}

// Helper function to check cookie-based access for onboarding pages
const checkCookieBasedAccess = (pathname) => {
  try {
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
    
    // Special case for free plan - direct them to setup after subscription
    if (pathname.includes('/onboarding/setup') && 
        cookies.selectedPlan === 'free' && 
        cookies.onboardedStatus === 'subscription') {
      logger.debug('[ClientLayout] Free plan detected in cookie check, allowing setup access');
      return true;
    }
    
    // Special case for dashboard access after free plan
    if (pathname === '/dashboard' && 
        cookies.selectedPlan === 'free' && 
        (cookies.onboardedStatus === 'subscription' || cookies.onboardedStatus === 'setup')) {
      logger.debug('[ClientLayout] Free plan detected for dashboard, allowing access');
      return true;
    }
    
    // Check for valid business info when going to subscription page
    if (pathname.includes('/onboarding/subscription') && cookies.businessName) {
      logger.debug('[ClientLayout] Business info found in cookies, allowing subscription access');
      return true;
    }
    
    // Check for verified email access
    if (pathname.includes('/auth/verify') && 
        (cookies.pendingVerification === 'true' || cookies.verificationFlow === 'true')) {
      logger.debug('[ClientLayout] Verification flow detected in cookies, allowing access');
      return true;
    }
    
    return false;
  } catch (error) {
    logger.warn('[ClientLayout] Error in cookie check:', error.message);
    return false;
  }
};

export default function ClientLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [debugInitialized, setDebugInitialized] = useState(false);
  const sessionCheckCache = useRef(new Map());
  const [isVerifying, setIsVerifying] = useState(true);
  const [tenantInitialized, setTenantInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const refreshLockRef = useRef(false);
  const lastRefreshTimeRef = useRef(0);
  // Store the original console.error to avoid dependencies
  const originalErrorRef = useRef(null);

  // Initialize debugging tools
  useEffect(() => {
    if (typeof window !== 'undefined' && !debugInitialized) {
      try {
        logger.debug('[ClientLayout] Setting up React render debugging');
        
        // Setup render debugging
        setupRenderDebugging();
        
        // Initialize Hub protection
        setupHubDeduplication();
        
        // Add global error handler for "render is not a function" errors
        // but prevent infinite loops by not calling the original handler for certain errors
        originalErrorRef.current = console.error;
        console.error = (...args) => {
          // Check for recursive errors immediately
          const stackDepth = new Error().stack.split('\n').filter(line => 
            line.includes('ClientLayout.js') && line.includes('console.error')
          ).length;
          
          // Hard circuit breaker for deeply nested errors
          if (stackDepth > 2) {
            // Complete circuit break - log once and return
            try {
              logger.error('[ClientLayout] Deep recursion detected in error handler, breaking loop');
              // Force add noredirect to URL and return
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('noredirect', 'true');
                window.history.replaceState({}, '', url.toString());

                // Set global flag to completely disable all redirects
                window.__HARD_CIRCUIT_BREAKER = true;
                
                // Clear all relevant storage
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                  document.cookie.split(";").forEach(cookie => {
                    const name = cookie.split("=")[0].trim();
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
                  });
                } catch (e) {
                  // Silent fail
                }
                
                // Force reload the page with the noredirect parameter
                setTimeout(() => {
                  window.location.href = '/auth/signin?noredirect=true';
                }, 1000);
              }
            } catch (e) {
              // Last resort - just return to break the loop
            }
            return;
          }
          
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
            const isRedirectLoopError = errorString.includes('Detected redirect loop') || 
                                       errorString.includes('Too many redirects') ||
                                       errorString.includes('Maximum call stack size exceeded');
            
            // CIRCUIT BREAKER: Detect and prevent redirect loops
            if (isRedirectLoopError) {
              logger.error('[ClientLayout] Detected redirect loop, forcing stop', {
                errorString,
                pathname
              });
              
              // Store the error information
              if (typeof window !== 'undefined') {
                window.__REDIRECT_LOOP_DETECTED = true;
                window.__LAST_REDIRECT_ERROR = {
                  message: errorString,
                  pathname,
                  timestamp: new Date().toISOString()
                };
                
                // Force add noredirect parameter to current URL to break loops
                try {
                  const url = new URL(window.location.href);
                  if (!url.searchParams.has('noredirect')) {
                    url.searchParams.set('noredirect', 'true');
                    window.history.replaceState({}, '', url.toString());
                    logger.info('[ClientLayout] Added noredirect parameter to URL to break loop');
                  }
                } catch (urlError) {
                  logger.error('[ClientLayout] Failed to modify URL:', urlError);
                }
                
                // Clear redirect-related data in storage
                try {
                  localStorage.removeItem('signin_attempts');
                  localStorage.removeItem('business_auth_errors');
                  localStorage.removeItem('business_info_auth_errors');
                  localStorage.removeItem('redirect_loop_count');
                  sessionStorage.removeItem('signinRedirectTime');
                  sessionStorage.removeItem('lastRedirectPath');
                  sessionStorage.removeItem('loopDetected');
                  logger.info('[ClientLayout] Cleared redirect-related storage items');
                } catch (storageError) {
                  logger.error('[ClientLayout] Failed to clear storage:', storageError);
                }
              }
              
              // Log the error but don't propagate to avoid loops
              return;
            }
            
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
                originalErrorRef.current.apply(console, args);
              } catch (callError) {
                // If applying the original error fails, log safely
                logger.error('[ClientLayout] Failed to call original console.error:', {
                  errorString,
                  callError: callError.message,
                  pathname
                });
                // Fallback to basic console.error
                originalErrorRef.current.call(console, errorString);
              }
            } else {
              // Just log to our logger without calling original console.error
              logger.error('[ClientLayout] Maximum update depth exceeded error detected and suppressed');
            }
          } catch (handlerError) {
            // If our error handler itself fails, log safely and call original
            try {
              logger.error('[ClientLayout] Error in console.error handler:', handlerError);
              originalErrorRef.current.apply(console, args);
            } catch (e) {
              // Last resort fallback
              originalErrorRef.current.call(console, 'Error in error handler');
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
    
    // Cleanup function to restore original console.error
    return () => {
      if (originalErrorRef.current) {
        console.error = originalErrorRef.current;
      }
    };
  }, [debugInitialized, pathname, setDebugInitialized]);

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
        // Check cache first with longer duration
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

        // If hard circuit breaker is active, immediately skip all checks
        if (typeof window !== 'undefined' && window.__HARD_CIRCUIT_BREAKER) {
          logger.warn('[ClientLayout] Hard circuit breaker active, skipping all authentication checks');
          setIsVerifying(false);
          return true;
        }

        // If it's a public route, no need to verify
        if (isPublicRoute(pathname)) {
          logger.debug('[ClientLayout] Public route detected, skipping verification');
          setIsVerifying(false);
          setIsAuthenticated(false);
          return true;
        }
        
        // CIRCUIT BREAKER: Check for redirect loop detection
        if (typeof window !== 'undefined' && window.__REDIRECT_LOOP_DETECTED) {
          logger.warn('[ClientLayout] Redirect loop detected previously, skipping verification');
          setIsVerifying(false);
          return true;
        }
        
        // Check URL for noredirect parameter
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          if (url.searchParams.get('noredirect') === 'true') {
            logger.debug('[ClientLayout] noredirect parameter detected, skipping verification');
            setIsVerifying(false);
            return true;
          }
        }

        // Check for token refresh rate limiting
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
        if (timeSinceLastRefresh < 60000) { // 1 minute cooldown
          logger.warn('[ClientLayout] Token refresh rate limit hit, waiting');
          setIsVerifying(false);
          return false;
        }

        // Standard session check for other routes
        const { tokens } = await fetchAuthSession();
        let isValid = !!tokens?.idToken;

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

        // Cache the result with longer duration
        sessionCheckCache.current.set(cacheKey, isValid);

        // Clear cache after 15 minutes instead of 5
        setTimeout(() => {
          sessionCheckCache.current.delete(cacheKey);
        }, 15 * 60 * 1000);

        if (!isValid && attempt < maxAttempts && !refreshLockRef.current) {
          // Try to refresh session
          try {
            refreshLockRef.current = true;
            const refreshed = await refreshUserSession();
            if (refreshed) {
              // Update last refresh time
              lastRefreshTimeRef.current = Date.now();
              // We'll just set isValid to true and continue without recursion
              logger.debug('[ClientLayout] Session refreshed, continuing with validation');
              isValid = true;
            }
          } catch (refreshError) {
            logger.error('[ClientLayout] Session refresh failed:', refreshError);
          } finally {
            refreshLockRef.current = false;
          }
        }

        if (!isValid) {
          logger.warn('[ClientLayout] Invalid session, redirecting to signin');
          
          // CIRCUIT BREAKER: Check for noredirect parameter before redirecting
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (url.searchParams.get('noredirect') === 'true') {
              logger.warn('[ClientLayout] Redirect prevented by noredirect parameter');
              setIsVerifying(false);
              return false;
            }
            
            // Check if we've redirected too many times
            const redirectCount = parseInt(localStorage.getItem('client_redirect_count') || '0', 10);
            if (redirectCount >= 3) {
              logger.error('[ClientLayout] Too many redirects detected, circuit breaker activated');
              // Force add noredirect parameter to prevent future redirects
              const currentUrl = new URL(window.location.href);
              currentUrl.searchParams.set('noredirect', 'true');
              window.history.replaceState({}, '', currentUrl.toString());
              // Reset counter
              localStorage.setItem('client_redirect_count', '0');
              setIsVerifying(false);
              return false;
            }
            
            // Increment redirect counter
            localStorage.setItem('client_redirect_count', (redirectCount + 1).toString());
            
            // Add from and noredirect parameters to signin URL
            const signInUrl = new URL('/auth/signin', window.location.origin);
            signInUrl.searchParams.set('from', 'client_layout');
            signInUrl.searchParams.set('noredirect', 'true');
            router.replace(signInUrl.toString());
          } else {
            router.replace('/auth/signin');
          }
          
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

  // Initialize verifySession on mount and reset redirect counter on successful auth
  useEffect(() => {
    let mounted = true;
    
    const verify = async () => {
      if (pathname && verifySession.current && mounted) {
        try {
          // Reset redirect counter if on signin page
          if (pathname.includes('signin') && typeof window !== 'undefined') {
            localStorage.setItem('client_redirect_count', '0');
          }
          
          const sessionValid = await verifySession.current(pathname);
          if (mounted) {
            setIsAuthenticated(sessionValid);
            
            // If validation successful, reset redirect counter
            if (sessionValid && typeof window !== 'undefined') {
              localStorage.setItem('client_redirect_count', '0');
            }
          }
        } catch (error) {
          logger.error('[ClientLayout] Error in session verification:', error);
          if (mounted) {
            setIsVerifying(false);
            setIsAuthenticated(false);
          }
        }
      }
    };

    verify();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  // Initialize debug tools in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      try {
        logger.debug('[ClientLayout] Initialized debug tools');
      } catch (error) {
        logger.error('[ClientLayout] Error initializing debug tools:', error);
      }
    }
  }, []);

  // Initialize token refresh service
  useEffect(() => {
    // Start automatic token refresh
    tokenRefreshService.startAutoRefresh();

    // Clean up on unmount
    return () => {
      tokenRefreshService.stopAutoRefresh();
    };
  }, []);

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
