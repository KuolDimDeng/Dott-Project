'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '@/utils/logger';
import { isPublicRoute } from '@/lib/authUtils';
import { fetchAuthSession } from 'aws-amplify/auth';
import { refreshUserSession } from '@/utils/refreshUserSession';
import { initializeTenant } from '@/utils/tenantUtils';
// These providers are now handled in providers.js
import AuthErrorBoundary from '@/components/ErrorBoundary';
import LoadingFallback from '@/components/ClientOnly/LoadingFallback';
import { setupRenderDebugging } from '@/utils/debugReactRendering';
import dynamic from 'next/dynamic';
import ConfigureAmplify from '@/components/ConfigureAmplify';
import debounce from 'lodash/debounce';

// Dynamically import the ReactErrorDebugger to avoid SSR issues
const ReactErrorDebugger = dynamic(
  () => import('@/components/Debug/ReactErrorDebugger'),
  {
    ssr: false,
    loading: () => null
  }
);

export default function ClientLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [debugInitialized, setDebugInitialized] = useState(false);
  const sessionCheckCache = useRef(new Map());
  const [isVerifying, setIsVerifying] = useState(true);
  const [tenantInitialized, setTenantInitialized] = useState(false);

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

  // Create stable verifySession function
  const verifySession = useRef(
    debounce(async (pathname, attempt = 1) => {
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

        // Get current session
        const { tokens } = await fetchAuthSession();
        const isValid = !!tokens?.idToken;

        if (isValid && !tenantInitialized) {
          try {
            // Initialize tenant if we have a valid session
            await initializeTenant(tokens.idToken);
            setTenantInitialized(true);
          } catch (error) {
            logger.error('[ClientLayout] Failed to initialize tenant:', error);
            // Don't fail the session check if tenant init fails
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
          const refreshed = await refreshUserSession();
          if (refreshed) {
            return verifySession.current(pathname, attempt + 1);
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
          return verifySession.current(pathname, attempt + 1);
        }
        
        setIsVerifying(false);
        router.replace('/auth/signin');
        return false;
      }
    }, 100)
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
          await verifySession.current(pathname);
        } catch (error) {
          logger.error('[ClientLayout] Error in session verification:', error);
          setIsVerifying(false);
        }
      }
    };

    verify();

    return () => {
      if (verifySession.current?.cancel) {
        verifySession.current.cancel();
      }
    };
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
    <AuthErrorBoundary onError={handleError}>
      <ConfigureAmplify />
      <LoadingFallback>
        {children}
        {/* React Error Debugger disabled */}
      </LoadingFallback>
    </AuthErrorBoundary>
  );
}
