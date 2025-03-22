'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '@/utils/logger';
import { isPublicRoute } from '@/lib/authUtils';
// These providers are now handled in providers.js
import AuthErrorBoundary from '@/components/ErrorBoundary';
import LoadingFallback from '@/components/ClientOnly/LoadingFallback';
import { setupRenderDebugging } from '@/utils/debugReactRendering';
import dynamic from 'next/dynamic';
import ConfigureAmplify from '@/components/ConfigureAmplify';

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

  useEffect(() => {
    const verifySession = async (attempt = 1, maxAttempts = 3) => {
      logger.debug('[ClientLayout] Verifying session:', {
        attempt,
        maxAttempts,
        pathname
      });

      // CRITICAL: Skip all checks for verify-email routes
      if (pathname === '/auth/verify-email' || pathname.startsWith('/auth/verify-email')) {
        logger.debug(`[ClientLayout] BYPASSING ALL CHECKS for verify-email route: ${pathname}`);
        return;
      }

      // Skip session check for public routes
      if (isPublicRoute(pathname)) {
        logger.debug(`[ClientLayout] Skipping session check for public route: ${pathname}`);
        return;
      }
      
      // Double-check for root path
      if (pathname === '/' || pathname === '') {
        logger.debug(`[ClientLayout] Root path detected, skipping session check`);
        return;
      }
      
      logger.debug(`[ClientLayout] Route ${pathname} is not public, checking session`);

      try {
        // Check if we have a session
        const response = await fetch('/api/session');
        if (!response.ok) {
          logger.debug(`[ClientLayout] Session check failed: ${response.status}`);
          if (attempt < maxAttempts) {
            setTimeout(() => verifySession(attempt + 1, maxAttempts), 1000);
            return;
          }
          
          // CRITICAL: Never redirect from verify-email routes
          if (pathname === '/auth/verify-email' || pathname.startsWith('/auth/verify-email')) {
            logger.debug(`[ClientLayout] NEVER redirecting from verify-email route: ${pathname}`);
            return;
          }
          
          // Never redirect from root path
          if (pathname === '/' || pathname === '') {
            logger.debug(`[ClientLayout] Not redirecting from root path`);
            return;
          }
          
          if (!isPublicRoute(pathname)) {
            logger.debug(`[ClientLayout] Redirecting to sign-in page from ${pathname}`);
            router.push('/auth/signin');
          } else {
            logger.debug(`[ClientLayout] Not redirecting from ${pathname} because it's a public route`);
          }
          return;
        }
        
        logger.debug('[ClientLayout] Session check successful');
      } catch (error) {
        logger.error('[ClientLayout] Error verifying session:', error);
        if (attempt < maxAttempts) {
          setTimeout(() => verifySession(attempt + 1, maxAttempts), 1000);
        }
      }

      // Render content
      logger.debug('[ClientLayout] Rendering providers and content');
    };

    verifySession();
  }, [pathname, router]);

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
