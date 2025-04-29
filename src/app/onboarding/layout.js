'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { refreshUserSession } from '@/utils/refreshUserSession';
import { getStoredTokens } from '@/utils/tokenStorage';
import { logger } from '@/utils/logger';

const ONBOARDING_STEPS = {
  'business-info': { title: 'Business Info', description: 'Enter your business details', step: 1 },
  'subscription': { title: 'Choose Plan', description: 'Select a subscription plan', step: 2 },
  'payment': { title: 'Payment Details', description: 'Enter your payment information', step: 3 },
  'setup': { title: 'Setup', description: 'Final setup and configuration', step: 4 },
  'complete': { title: 'Complete', description: 'Onboarding complete', step: 5 }
};

export default function OnboardingLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); 
  const [refreshError, setRefreshError] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

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
        
        // Regular auth check from original implementation
        const hasAuthToken = getStoredTokens().idToken || getStoredTokens().accessToken;
        
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
  }, [router, pathname]);

  return (
    <div className="flex flex-col min-h-screen md:flex-row bg-gray-50" data-component="onboarding-layout">
      {children}
    </div>
  );
}
