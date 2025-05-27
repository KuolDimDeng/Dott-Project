'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '@/utils/logger';
import { isPublicRoute } from '@/lib/authUtils';
import { fetchAuthSession  } from '@/config/amplifyUnified';
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
import MigrationComponent from '@/components/MigrationComponent';
import { getUserPreference, PREF_KEYS } from '@/utils/userPreferences';
import AuthTokenManager from '@/components/AuthTokenManager';
import { tokenService } from '@/services/tokenService';
import { setupAmplifyResilience } from '@/config/amplifyConfig';
import { initNetworkResilience } from '@/utils/networkMonitor';
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

// Helper function to check preference-based access for onboarding pages
const checkPreferenceBasedAccess = async (pathname) => {
  try {
    // Get user preferences from Cognito (via AppCache or direct)
    const selectedPlan = await getUserPreference(PREF_KEYS.SUBSCRIPTION_PLAN, '');
    const onboardedStatus = await getUserPreference(PREF_KEYS.ONBOARDING_STATUS, '');
    const businessName = await getUserPreference(PREF_KEYS.BUSINESS_NAME, '');
    const pendingVerification = await getUserPreference('custom:pendingVerification', 'false');
    const verificationFlow = await getUserPreference('custom:verificationFlow', 'false');
    
    logger.debug('[ClientLayout] Checking preference-based access with Cognito attributes:', {
      pathname,
      selectedPlan,
      onboardedStatus,
      hasBusiness: !!businessName
    });
    
    // Special case for free plan - direct them to setup after subscription
    if (pathname.includes('/onboarding/setup') && 
        selectedPlan === 'free' && 
        onboardedStatus === 'subscription') {
      logger.debug('[ClientLayout] Free plan detected in preference check, allowing setup access');
      return true;
    }
    
    // Special case for dashboard access after free plan
    if (pathname === '/dashboard' && 
        selectedPlan === 'free' && 
        (onboardedStatus === 'subscription' || onboardedStatus === 'setup')) {
      logger.debug('[ClientLayout] Free plan detected for dashboard, allowing access');
      return true;
    }
    
    // Check for valid business info when going to subscription page
    if (pathname.includes('/onboarding/subscription') && businessName) {
      logger.debug('[ClientLayout] Business info found in preferences, allowing subscription access');
      return true;
    }
    
    // Check for verified email access
    if (pathname.includes('/auth/verify') && 
        (pendingVerification === 'true' || verificationFlow === 'true')) {
      logger.debug('[ClientLayout] Verification flow detected in preferences, allowing access');
      return true;
    }
    
    return false;
  } catch (error) {
    logger.warn('[ClientLayout] Error in preference check:', error.message);
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
        
        // Initialize Amplify resilience for network issues
        setupAmplifyResilience();
        
        // Initialize enhanced network resilience features
        initNetworkResilience();
        
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
                  if (typeof window !== 'undefined') {
                    if (window.__APP_CACHE) {
                      window.__APP_CACHE = {}; // Reset entire app cache
                    }
                    sessionStorage.clear();
                    // No longer clearing cookies as they're not used for authentication
                  }
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
                  if (typeof window !== 'undefined') {
                    window.__APP_CACHE = window.__APP_CACHE || {};
                    window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
                    
                    delete window.__APP_CACHE.auth.signin_attempts;
                    delete window.__APP_CACHE.auth.business_auth_errors;
                    delete window.__APP_CACHE.auth.business_info_auth_errors;
                    delete window.__APP_CACHE.auth.redirect_loop_count;
                  }
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

  // Verify session with improved token handling
  useEffect(() => {
    async function verifyWithTokenService() {
      if (isPublicRoute(pathname)) {
        logger.debug('[ClientLayout] Public route detected, skipping auth check');
        setIsVerifying(false);
        return;
      }
      
      try {
        // Use token service instead of direct Amplify call
        await tokenService.getTokens();
        setIsAuthenticated(true);
        
        // Initialize tenant after authentication
        if (!tenantInitialized) {
          try {
            await initializeTenant();
            await initializeTenantContext();
            setTenantInitialized(true);
          } catch (tenantError) {
            logger.error('[ClientLayout] Error initializing tenant:', tenantError);
          }
        }
      } catch (error) {
        logger.error('[ClientLayout] Auth verification error:', error);
        
        // Redirect to sign-in for auth errors
        if (!pathname.startsWith('/auth/')) {
          router.push('/auth/signin?session=expired');
        }
      } finally {
        setIsVerifying(false);
      }
    }
    
    verifyWithTokenService();
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

  // Wrap the children with AuthTokenManager
  if (isVerifying) {
    return <LoadingFallback />;
  }

  return (
    <AuthErrorBoundary onError={handleError}>
      <ConfigureAmplify>
        <AuthTokenManager>
          <DynamicComponents>
            <MigrationComponent />
            {process.env.NODE_ENV === 'development' && <ReactErrorDebugger />}
            {children}
          </DynamicComponents>
        </AuthTokenManager>
      </ConfigureAmplify>
    </AuthErrorBoundary>
  );
}
