'use client';

import { useEffect } from 'react';
import { useSession } from '@/hooks/useSession';

/**
 * Enhanced session hook that syncs localStorage with session data
 * and ensures profile API gets accurate data
 */
export function useEnhancedSession() {
  const { user, isLoading, checkSession } = useSession();

  useEffect(() => {
    // Override fetch to include localStorage data in headers
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const [url, config = {}] = args;
      
      // Only add headers for profile API
      if (typeof url === 'string' && url.includes('/api/auth/profile')) {
        const onboardingCompleted = localStorage.getItem('onboarding_completed');
        const tenantId = localStorage.getItem('tenant_id');
        
        if (onboardingCompleted || tenantId) {
          config.headers = config.headers || {};
          if (onboardingCompleted) {
            config.headers['x-onboarding-completed'] = onboardingCompleted;
          }
          if (tenantId) {
            config.headers['x-tenant-id'] = tenantId;
          }
          console.log('[useEnhancedSession] Adding localStorage headers to profile request', {
            onboardingCompleted,
            tenantId
          });
        }
      }
      
      return originalFetch.apply(this, [url, config]);
    };

    // Cleanup on unmount
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Also sync session data to localStorage when it changes
  useEffect(() => {
    if (user && !isLoading) {
      // Update localStorage when session data indicates onboarding is complete
      if (user.onboardingCompleted === true || user.needsOnboarding === false) {
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('needs_onboarding', 'false');
      }
      
      if (user.tenantId) {
        localStorage.setItem('tenant_id', user.tenantId);
      }
      
      if (user.businessName) {
        localStorage.setItem('business_name', user.businessName);
      }
      
      if (user.subscriptionPlan) {
        localStorage.setItem('subscription_plan', user.subscriptionPlan);
      }
    }
  }, [user, isLoading]);

  return {
    user,
    isLoading,
    checkSession,
    // Additional helper to force clear onboarding from localStorage
    clearOnboardingData: () => {
      localStorage.removeItem('onboarding_completed');
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('subscription_plan');
      localStorage.removeItem('business_name');
      localStorage.removeItem('needs_onboarding');
    }
  };
}