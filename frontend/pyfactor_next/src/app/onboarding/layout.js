///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/layout.js
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import { ONBOARDING_STEPS } from '@/config/steps';
import Image from 'next/image';
import StepIcon from './components/StepIcon';
import StepConnector from './components/StepConnector';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useCookies } from 'react-cookie';
import { refreshUserSession } from '@/utils/refreshUserSession';

// Define CSS for transition animations
const pageTransitionStyles = `
  @keyframes fadeTransition {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  
  .page-transition {
    animation: fadeTransition 0.4s ease-out;
  }
  
  .progress-bar-transition {
    transition: width 0.5s ease-in-out;
  }
`;

// Get current step based on pathname
const getCurrentStep = (pathname) => {
  if (!pathname) return 'business-info';
  
  if (pathname.includes('/business-info')) {
    return 'business-info';
  } else if (pathname.includes('/subscription')) {
    return 'subscription';
  } else if (pathname.includes('/payment')) {
    return 'payment';
  } else if (pathname.includes('/setup')) {
    return 'setup';
  } else if (pathname.includes('/complete')) {
    return 'complete';
  }
  
  return 'business-info'; // Default to first step
};

export default function OnboardingLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cookies] = useCookies();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); 
  const [refreshError, setRefreshError] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [currentStep, setCurrentStep] = useState('');
  const [fadeIn, setFadeIn] = useState(false);

  // Check for circuit breaker parameters
  const noRedirect = searchParams.get('noredirect') === 'true';
  const noLoop = searchParams.get('noloop') === 'true';
  const fromParam = searchParams.get('from');

  // Format onboarding steps for stepper
  const steps = useMemo(() => {
    return Object.entries(ONBOARDING_STEPS)
      .filter(([key]) => key !== 'complete')
      .map(([key, config]) => ({
        key,
        label: config.title,
        description: config.description,
        step: config.step
      }))
      .sort((a, b) => a.step - b.step);
  }, []);

  // Function to handle token refresh
  const handleTokenRefresh = async () => {
    try {
      setIsRefreshing(true);
      logger.debug('[OnboardingLayout] Attempting to refresh user session');
      
      // First try the standard refresh
      const result = await refreshUserSession();
      
      if (result && result.tokens) {
        logger.debug('[OnboardingLayout] Session refreshed successfully');
        setRefreshError(false);
        return true;
      }
      
      // If standard refresh fails, try fallback to sessionStorage tokens
      logger.warn('[OnboardingLayout] Standard session refresh failed, trying fallback');
      
      // Use tokens from sessionStorage if available
      const idToken = sessionStorage.getItem('idToken');
      const accessToken = sessionStorage.getItem('accessToken');
      
      if (idToken) {
        // Manually construct a result
        logger.debug('[OnboardingLayout] Using fallback tokens from sessionStorage');
        
        // Set tokens in APP_CACHE for other components to use
        if (typeof window !== 'undefined') {
          window.__APP_CACHE = window.__APP_CACHE || {};
          window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
          window.__APP_CACHE.auth.idToken = idToken;
          window.__APP_CACHE.auth.token = idToken;
          
          if (accessToken) {
            window.__APP_CACHE.auth.accessToken = accessToken;
          }
          
          window.__APP_CACHE.auth.hasSession = true;
          window.__APP_CACHE.auth.provider = 'cognito';
        }
        
        setRefreshError(false);
        return true;
      }
      
      logger.warn('[OnboardingLayout] Failed to refresh session, tokens not returned');
      setRefreshError(true);
      return false;
    } catch (error) {
      logger.error('[OnboardingLayout] Error refreshing session:', error);
      setRefreshError(true);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Set current step based on pathname
    setCurrentStep(getCurrentStep(pathname));
    
    // Trigger fade-in animation when content changes
    setFadeIn(false);
    setTimeout(() => setFadeIn(true), 50);
  }, [pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      // Check if the route should be treated as public (all onboarding routes are public)
      // This prevents infinite sign-in redirect loops
      if (pathname.startsWith('/onboarding')) {
        logger.debug('[OnboardingLayout] Onboarding route is public, skipping strict auth check');
        
        // Still try to refresh but don't block on failure
        handleTokenRefresh().catch(e => {
          logger.warn('[OnboardingLayout] Optional token refresh failed:', e);
        });
        
        setIsLoading(false);
        return;
      }
      
      // Skip any checks if circuit breaker parameters are present
      if (noRedirect || noLoop) {
        logger.debug('[OnboardingLayout] Circuit breaker active, skipping navigation checks');
        setIsLoading(false);
        return;
      }
      
      // Skip redirect checks if coming from a known source to prevent loops
      if (fromParam === 'middleware' || fromParam === 'signin') {
        logger.debug('[OnboardingLayout] Request from known source, skipping navigation checks');
        setIsLoading(false);
        return;
      }

      // Development mode bypass - prioritize this check before others
      if (process.env.NODE_ENV === 'development') {
        // Initialize app cache if needed
        if (typeof window !== 'undefined') {
          if (!window.__APP_CACHE) window.__APP_CACHE = {};
          if (!window.__APP_CACHE.auth) window.__APP_CACHE.auth = {};
        }
        
        // Check for bypass flags in app cache or localStorage
        const bypassAuth = 
          (window.__APP_CACHE?.auth?.bypassValidation === true) || 
          localStorage.getItem('bypassAuthValidation') === 'true';
          
        const authSuccess = 
          (window.__APP_CACHE?.auth?.success === true) || 
          localStorage.getItem('authSuccess') === 'true';
        
        if (bypassAuth && authSuccess) {
          logger.debug('[OnboardingLayout] Development mode: auth validation bypassed');
          setIsLoading(false);
          return;
        }
      }

      // Simple auth check - check for tokens and refresh if needed
      const hasAuthToken = document.cookie.includes('authToken=') || document.cookie.includes('idToken=');
      
      // Check for bypass validation in app cache first, fall back to localStorage
      const bypassAuthValidation = 
        (window.__APP_CACHE?.auth?.bypassValidation === true) || 
        localStorage.getItem('bypassAuthValidation') === 'true';
      
      if (!hasAuthToken && !bypassAuthValidation) {
        logger.debug('[OnboardingLayout] No auth tokens found, attempting refresh');
        const refreshSuccessful = await handleTokenRefresh();
        
        if (!refreshSuccessful) {
          logger.debug('[OnboardingLayout] Refresh failed, redirecting to signin');
          router.push('/auth/signin?from=onboarding&noredirect=true');
          return;
        }
      }

      // If refresh was successful or tokens exist, continue with onboarding
      // Prefetch next step for faster transitions
      const activeStepIndex = steps.findIndex(step => step.key === currentStep);
      if (activeStepIndex >= 0 && activeStepIndex < steps.length - 1) {
        const nextStep = steps[activeStepIndex + 1];
        try {
          router.prefetch(`/onboarding/${nextStep.key}`);
        } catch (err) {
          // Silently fail prefetch errors
        }
      }

      setIsLoading(false);
    };

    checkAuth();

    // Set up periodic token refresh every 5 minutes
    const refreshInterval = setInterval(() => {
      handleTokenRefresh().catch(err => {
        logger.error('[OnboardingLayout] Interval refresh error:', err);
      });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, [currentStep, noRedirect, noLoop, fromParam, router, steps, pathname]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Token refresh error state
  if (refreshError && !noRedirect) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <div className="mb-4 text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="mb-2 text-2xl font-bold">Session Expired</h2>
        <p className="mb-6 text-gray-600">Your session has expired. Please sign in again to continue the onboarding process.</p>
        <button
          onClick={() => router.push('/auth/signin?from=onboarding&session_expired=true')}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none"
        >
          Sign In Again
        </button>
      </div>
    );
  }

  // Calculate active step index
  const activeStepIndex = steps.findIndex(step => step.key === currentStep);
  
  // Calculate progress percentage
  const progressPercentage = Math.round(((activeStepIndex + 1) / steps.length) * 100);

  // Helper to get progress text
  const getProgressText = () => {
    return `Step ${activeStepIndex + 1} of ${steps.length}`;
  };

  // Get content for the sidebar
  const getSidebarContent = () => {
    switch(currentStep) {
      case 'business-info':
        return {
          title: "Let's set up your business profile",
          subtitle: "Tell us about your business to customize your experience"
        };
      case 'subscription':
        return {
          title: "Choose the right plan for your needs",
          subtitle: "Select the subscription that works best for your business"
        };
      case 'payment':
        return {
          title: "Complete your payment",
          subtitle: "Secure payment to activate your subscription"
        };
      case 'setup':
        return {
          title: "Setting up your account",
          subtitle: "We're preparing everything for you"
        };
      default:
        return {
          title: "Welcome to Pyfactor",
          subtitle: "Let's get started with your onboarding"
        };
    }
  };

  const sidebarContent = getSidebarContent();

  return (
    <>
      {/* Add transition styles */}
      <style jsx global>{pageTransitionStyles}</style>
      
      <ToastProvider>
        <div className="flex flex-col min-h-screen md:flex-row bg-gray-50">
          {/* Session refresh overlay */}
          {isRefreshing && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-gray-700">Refreshing your session...</p>
              </div>
            </div>
          )}
          
          {/* Brand sidebar - only visible on tablet and above */}
          <div className="hidden md:flex md:w-5/12 lg:w-4/12 xl:w-5/12 bg-gradient-to-b from-blue-600 to-blue-800 text-white flex-col">
            <div className="p-8 lg:p-12 flex flex-col h-full">
              {/* Logo */}
              <div className="mb-12">
                <Image
                  src="/static/images/Pyfactor.png"
                  alt="Pyfactor Logo"
                  width={150}
                  height={50}
                  className="h-12 w-auto"
                  onError={(e) => {
                    e.target.src = '/static/images/PyfactorLandingpage.png';
                  }}
                />
              </div>
              
              {/* Step counter and content */}
              <div className="mt-auto flex-grow flex flex-col justify-center">
                <div className="text-sm font-medium text-blue-200 mb-3">{getProgressText()}</div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-4">{sidebarContent.title}</h1>
                <p className="text-xl text-blue-100">{sidebarContent.subtitle}</p>
                
                {/* Enhanced progress indicator */}
                <div className="mt-8 mb-8">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                        {getProgressText()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-blue-200">
                        {progressPercentage}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-700">
                    <div 
                      style={{ width: `${progressPercentage}%` }} 
                      className="progress-bar-transition shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-300"
                    ></div>
                  </div>
                </div>
                
                {/* Testimonial */}
                <div className="mt-8 bg-blue-700 bg-opacity-50 p-6 rounded-lg border border-blue-400 border-opacity-20">
                  <p className="italic text-blue-100 mb-4">
                    "Pyfactor streamlined our accounting processes and saved us countless hours. The onboarding was simple and the team was incredibly helpful."
                  </p>
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-blue-800 font-bold mr-3">
                      JS
                    </div>
                    <div>
                      <p className="font-medium">Jane Smith</p>
                      <p className="text-sm text-blue-200">CEO, Smith Consulting</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-grow md:overflow-auto">
            {/* Mobile header with logo and step indicator */}
            <header className="md:hidden bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <Image
                  src="/static/images/Pyfactor.png"
                  alt="Pyfactor Logo"
                  width={120}
                  height={40}
                  className="h-8 w-auto"
                />
                <div className="text-sm font-medium text-gray-600">
                  {getProgressText()}
                </div>
              </div>
              
              {/* Mobile progress bar */}
              <div className="mt-2">
                <div className="overflow-hidden h-1 text-xs flex rounded bg-gray-200">
                  <div 
                    style={{ width: `${progressPercentage}%` }} 
                    className="progress-bar-transition shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"
                  ></div>
                </div>
              </div>
            </header>

            {/* Main content with animation */}
            <main className={`p-4 md:p-8 lg:p-12 ${fadeIn ? 'page-transition' : 'opacity-0'}`}>
              {children}
            </main>

            {/* Footer */}
            <footer className="py-4 px-6 border-t border-gray-200 mt-auto">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div>© {new Date().getFullYear()} Pyfactor</div>
                <div className="flex space-x-4">
                  <a href="#" className="hover:text-gray-700">Terms</a>
                  <a href="#" className="hover:text-gray-700">Privacy</a>
                  <a href="#" className="hover:text-gray-700">Support</a>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </ToastProvider>
    </>
  );
}
