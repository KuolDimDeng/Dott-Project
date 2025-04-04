'use client';

// In DashboardClientLayout.js
import dynamic from 'next/dynamic';
import React, { useEffect, useState, Suspense, useRef } from 'react';
import { logger } from '@/utils/logger';
import ErrorBoundaryHandler from '@/components/ErrorBoundaryHandler';
import { useRouter } from 'next/navigation';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';

// Use a more direct approach for dynamic imports
const KeyboardFixerLoader = dynamic(
  () => import('./components/forms/fixed/KeyboardEventFixer').then(mod => mod),
  { ssr: false, loading: () => null }
);

const ReactErrorDebugger = dynamic(
  () => import('@/components/Debug/ReactErrorDebugger').then(mod => mod),
  { ssr: false, loading: () => null }
);

// Simplified import for FixInputEvent
const FixInputEvent = dynamic(
  () => import('./fixInputEvent'),
  { 
    ssr: false, 
    loading: () => null,
    // Add error handling for this component
    onError: (err) => {
      console.error('Failed to load FixInputEvent component:', err);
      return null;
    }
  }
);

const RootDiagnostics = dynamic(
  () => import('./RootDiagnostics').then(mod => mod),
  { ssr: false, loading: () => null }
);

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-3 text-center"
    >
      <div className="mb-3 max-w-md p-4 text-red-700 border border-red-200 bg-red-50 rounded-md">
        Something went wrong while loading the dashboard.
      </div>
      <p className="mb-3 max-w-md text-sm text-gray-500">
        {error?.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={() => {
          // Clear any pending schema setup to avoid getting stuck
          try {
            sessionStorage.removeItem('pendingSchemaSetup');
          } catch (e) {
            // Ignore errors
          }
          // Reset the error boundary
          resetErrorBoundary();
        }}
        className="px-4 py-2 mb-2 text-white bg-primary-main hover:bg-primary-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2"
      >
        Try Again
      </button>
      <button
        onClick={() => {
          // Clear session storage and reload
          try {
            sessionStorage.clear();
          } catch (e) {
            // Ignore errors
          }
          window.location.reload();
        }}
        className="px-4 py-2 text-primary-main border border-primary-main hover:bg-primary-main/5 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2"
      >
        Reload Dashboard
      </button>
    </div>
  );
}

export default function DashboardClientLayout({ children }) {
    const [showDebugger, setShowDebugger] = useState(false);
    const router = useRouter();
    
    // Create the ref at component level
    const originalErrorRef = useRef(console.error);
    
    // Force bypassed authentication in development mode - REMOVED FOR PRODUCTION
    
    // Check for authentication errors early
    useEffect(() => {
        const checkAuthentication = async () => {
            try {
                // Try to get the current session
                const authSession = await fetchAuthSession();
                
                // If we don't have valid tokens, redirect to sign in
                if (!authSession?.tokens?.idToken || !authSession?.tokens?.accessToken) {
                    logger.warn('[DashboardLayout] No valid session tokens found');
                    
                    // Clear any stale auth data
                    if (typeof localStorage !== 'undefined') {
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('idToken');
                    }
                    
                    // Redirect to sign-in page with return URL
                    const returnUrl = encodeURIComponent(window.location.pathname);
                    router.replace(`/auth/signin?returnUrl=${returnUrl}&authError=expired`);
                    return;
                }
                
                // Check if token is near expiration (within 5 minutes)
                const expiresAt = authSession.tokens.accessToken.payload.exp * 1000;
                const now = Date.now();
                const timeToExpire = expiresAt - now;
                
                // If token expires in less than 5 minutes, try to refresh
                if (timeToExpire < 5 * 60 * 1000) {
                    logger.warn('[DashboardLayout] Token near expiration, redirecting to sign in');
                    
                    // Clear any stale auth data
                    if (typeof localStorage !== 'undefined') {
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('idToken');
                    }
                    
                    // Sign out first to clear the session
                    try {
                        await signOut();
                        logger.info('[DashboardLayout] Signed out successfully due to expiring token');
                    } catch (signOutError) {
                        logger.error('[DashboardLayout] Error signing out:', signOutError);
                    }
                    
                    // Redirect to sign-in page with return URL
                    const returnUrl = encodeURIComponent(window.location.pathname);
                    router.replace(`/auth/signin?returnUrl=${returnUrl}&auth=expired`);
                    return;
                }
            } catch (error) {
                logger.error('[DashboardLayout] Authentication check failed:', error);
                
                // If there's any auth error, redirect to login
                const returnUrl = encodeURIComponent(window.location.pathname);
                router.replace(`/auth/signin?returnUrl=${returnUrl}&authError=general`);
            }
        };
        
        checkAuthentication();
    }, [router]);
    
    // Check onboarding status on mount
    useEffect(() => {
        const verifyOnboardingComplete = async () => {
            try {
                // Get onboarding status from cookies
                const getCookie = (name) => {
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; ${name}=`);
                    if (parts.length === 2) return parts.pop().split(';').shift();
                    return '';
                };
                
                const onboardingStatus = getCookie('onboardedStatus');
                const onboardingStep = getCookie('onboardingStep');
                
                logger.debug('[DashboardLayout] Verifying onboarding status:', {
                    onboardingStatus,
                    onboardingStep
                });
                
                // First check Cognito attributes via API
                try {
                    const profileResponse = await fetch('/api/user/profile', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        const cognitoOnboarding = profileData.profile.onboardingStatus;
                        const cognitoSetupComplete = profileData.profile.setupComplete;
                        
                        logger.debug('[DashboardLayout] Comparing onboarding status:', {
                            cookieStatus: onboardingStatus,
                            cognitoStatus: cognitoOnboarding,
                            cookieSetupComplete: onboardingStep === 'complete',
                            cognitoSetupComplete
                        });
                        
                        // If cookies indicate completed but Cognito doesn't, update Cognito
                        if ((onboardingStatus === 'complete' || onboardingStep === 'complete') && 
                            (cognitoOnboarding !== 'complete' || !cognitoSetupComplete)) {
                            
                            logger.info('[DashboardLayout] Updating Cognito to match cookies');
                            
                            await fetch('/api/user/update-attributes', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    attributes: {
                                        'custom:onboarding': 'complete',
                                        'custom:setupdone': 'true'
                                    },
                                    forceUpdate: true
                                })
                            });
                        }
                    }
                } catch (apiError) {
                    logger.error('[DashboardLayout] Error checking Cognito:', apiError);
                    // Continue with cookie checks as fallback
                }
                
                // If user is still in business info step, redirect to subscription
                if (onboardingStatus === 'BUSINESS_INFO' || 
                    (onboardingStep === 'subscription' && onboardingStatus !== 'complete')) {
                    logger.warn('[DashboardLayout] User attempted to access dashboard without completing subscription');
                    
                    // Add a timestamp to avoid caching issues
                    const timestamp = Date.now();
                    
                    // Redirect to subscription page
                    router.replace(`/onboarding/subscription?ts=${timestamp}&from=dashboard`);
                }
            } catch (error) {
                logger.error('[DashboardLayout] Error checking onboarding status:', error);
                // Continue rendering dashboard as fallback
            }
        };
        
        verifyOnboardingComplete();
    }, [router]);
    
    // Disable the debugger by default
    useEffect(() => {
        // Force disable the debugger
        setShowDebugger(false);
        localStorage.setItem('enableReactDebugger', 'false');
        
        // Only allow in controlled environments
        const handleKeyDown = (e) => {
            // Only enable in controlled environments
            const isAllowedEnvironment = window.location.hostname === 'localhost' || 
                                       window.location.hostname.includes('dev-');
            
            if (isAllowedEnvironment && e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                setShowDebugger(prev => {
                    const newValue = !prev;
                    localStorage.setItem('enableReactDebugger', newValue.toString());
                    logger.debug(`[DashboardLayout] ${newValue ? 'Enabling' : 'Disabling'} React error debugger`);
                    return newValue;
                });
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    
    // Add error boundary to catch any rendering errors
    useEffect(() => {
        // Store the original error handler in a ref to avoid it being included in dependencies
        originalErrorRef.current = console.error;
        
        // Set up global error handler for React errors
        console.error = (...args) => {
            // Check for memory-related errors
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
            
            if (errorString.includes('out of memory') ||
                errorString.includes('heap') ||
                errorString.includes('allocation failed')) {
                logger.error('[DashboardLayout] Caught memory-related error:', {
                    args,
                    stack: new Error().stack
                });
                
                // Clear any pending schema setup to avoid getting stuck
                try {
                    sessionStorage.removeItem('pendingSchemaSetup');
                } catch (e) {
                    // Ignore errors when clearing session storage
                }
            }
            
            // Call original error handler
            originalErrorRef.current.apply(console, args);
        };
        
        return () => {
            // Restore the original error handler
            console.error = originalErrorRef.current;
        };
    }, []);
    
    // Performance monitoring for input fixes
    useEffect(() => {
        const monitorPerformance = () => {
            // Watch for long tasks that might indicate performance issues
            if ('PerformanceObserver' in window) {
                try {
                    const observer = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        for (const entry of entries) {
                            if (entry.duration > 50) { // Long task threshold (ms)
                                logger.warn('[DashboardLayout] Long task detected:', {
                                    duration: Math.round(entry.duration),
                                    startTime: Math.round(entry.startTime),
                                    name: entry.name
                                });
                                
                                // If we detect very long tasks (> 500ms), disable the keyboard fix temporarily
                                if (entry.duration > 500 && window.toggleInputFix) {
                                    window.toggleInputFix(false);
                                    
                                    // Re-enable after 1 second
                                    setTimeout(() => {
                                        if (window.toggleInputFix) window.toggleInputFix(true);
                                    }, 1000);
                                }
                            }
                        }
                    });
                    
                    observer.observe({ entryTypes: ['longtask'] });
                    return () => observer.disconnect();
                } catch (e) {
                    logger.error('[DashboardLayout] Error setting up performance observer:', e);
                }
            }
        };
        
        monitorPerformance();
    }, []);
    
    // Handle unhandled promise rejections
    useEffect(() => {
        const handleUnhandledRejection = (event) => {
            logger.error('[DashboardLayout] Unhandled promise rejection:', {
                reason: event.reason,
                stack: event.reason?.stack
            });
        };
        
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        
        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);
    
    return (
        <div className="text-gray-900 bg-gray-50 min-h-screen">
            <ErrorBoundaryHandler fallback={<ErrorFallback />}>
                <div className="dashboard-container relative min-h-screen">
                    <Suspense fallback={null}>
                        <FixInputEvent />
                    </Suspense>
                    
                    <Suspense fallback={null}>
                        <KeyboardFixerLoader />
                    </Suspense>
                    
                    <Suspense fallback={null}>
                        <RootDiagnostics />
                    </Suspense>
                    
                    {children}
                    
                    {showDebugger && <ReactErrorDebugger enabled={true} />}
                </div>
            </ErrorBoundaryHandler>
        </div>
    );
} 