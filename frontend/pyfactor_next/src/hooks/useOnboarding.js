///Users/kuoldeng/projectx/frontend/pyfactor_next/src/hooks/useOnboarding.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { determineOnboardingStep, setOnboardingCookies } from '@/utils/cookieManager';
import { createTenantForUser, updateUserWithTenantId } from '@/utils/tenantUtils';

/**
 * Hook for managing onboarding state across the application
 * This provides a consistent way to track and update onboarding status
 */
export function useOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState('business-info');
  const [status, setStatus] = useState('pending');
  const [businessInfo, setBusinessInfo] = useState({});
  const [subscription, setSubscription] = useState({});
  const [paymentInfo, setPaymentInfo] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Load initial state from cookies/localStorage
  useEffect(() => {
    try {
      // Load current step from cookie if available
      const onboardingStep = getCookie('onboardingStep');
      if (onboardingStep) {
        setStep(onboardingStep);
      }
      
      // Load status from cookie if available
      const onboardedStatus = getCookie('onboardedStatus');
      if (onboardedStatus) {
        setStatus(onboardedStatus);
      }
      
      // Load stored business info
      const storedBusinessInfo = localStorage.getItem('businessInfo');
      if (storedBusinessInfo) {
        try {
          setBusinessInfo(JSON.parse(storedBusinessInfo));
        } catch (e) {
          console.error('Error parsing stored business info:', e);
        }
      }
      
      // Load stored subscription info
      const storedSubscription = localStorage.getItem('subscriptionInfo');
      if (storedSubscription) {
        try {
          setSubscription(JSON.parse(storedSubscription));
        } catch (e) {
          console.error('Error parsing stored subscription info:', e);
        }
      }
      
      // Load stored payment info (only non-sensitive data)
      const storedPaymentInfo = localStorage.getItem('paymentInfo');
      if (storedPaymentInfo) {
        try {
          setPaymentInfo(JSON.parse(storedPaymentInfo));
        } catch (e) {
          console.error('Error parsing stored payment info:', e);
        }
      }
    } catch (error) {
      console.error('Error loading onboarding state:', error);
    }
  }, []);
  
  // Helper to get a cookie by name
  const getCookie = (name) => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };
  
  // Helper to set a cookie
  const setCookie = (name, value, days = 30) => {
    if (typeof document === 'undefined') return;
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value}; ${expires}; path=/; samesite=lax`;
  };
  
  // Update business info
  const updateBusinessInfo = useCallback((data) => {
    setBusinessInfo(data);
    localStorage.setItem('businessInfo', JSON.stringify(data));
    setCookie('businessInfoCompleted', 'true');
  }, []);
  
  // Update subscription info
  const updateSubscription = useCallback((data) => {
    setSubscription(data);
    localStorage.setItem('subscriptionInfo', JSON.stringify(data));
    setCookie('subscriptionCompleted', 'true');
  }, []);
  
  // Update payment info
  const updatePaymentInfo = useCallback((data) => {
    setPaymentInfo(data);
    localStorage.setItem('paymentInfo', JSON.stringify(data));
    setCookie('paymentCompleted', 'true');
  }, []);
  
  // Helper to ensure tenant exists
  const ensureTenant = useCallback(async (businessId) => {
    try {
      setIsLoading(true);
      
      // Import user attributes and fetch current user data
      const { fetchUserAttributes } = await import('@/config/amplifyUnified');
      const userAttributes = await fetchUserAttributes();
      
      // Create tenant using utility function
      const createdTenantId = await createTenantForUser(businessId, userAttributes);
      
      if (createdTenantId) {
        // Update user attributes with tenant ID
        await updateUserWithTenantId(createdTenantId);
        
        // Set state and redirect
        logger.info('[useOnboarding] Tenant created successfully');
        router.push(`/tenant/${createdTenantId}/dashboard?freePlan=true&newTenant=true`);
        return createdTenantId;
      } else {
        // Failed to create tenant
        logger.warn('[useOnboarding] Failed to create tenant');
        router.push(`/dashboard?freePlan=true&requestTenantCreation=true&businessId=${businessId}`);
        return null;
      }
    } catch (error) {
      logger.error('[useOnboarding] Error creating tenant:', error);
      router.push(`/dashboard?freePlan=true&requestTenantCreation=true&businessId=${businessId}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [router]);
  
  // Navigate to the next step in the onboarding process
  const nextStep = useCallback(async () => {
    let nextStep = step;
    
    switch(step) {
      case 'business-info':
        nextStep = 'subscription';
        break;
      case 'subscription':
        // Check if we have a free plan selected
        if (subscription?.plan === 'free' || localStorage.getItem('freePlanSelected') === 'true') {
          // For free plan, skip payment and go to dashboard
          logger.debug('[useOnboarding] Free plan detected, skipping payment stage');
          
          // Check if we have tenant information already
          const tenantId = localStorage.getItem('tenantId') || getCookie('tenantId');
          const businessId = localStorage.getItem('businessId') || getCookie('businessid');
          
          if (tenantId) {
            logger.debug('[useOnboarding] Tenant ID found, redirecting to tenant dashboard');
            router.push(`/tenant/${tenantId}/dashboard?freePlan=true`);
          } else if (businessId) {
            // Try to create a tenant using the business ID
            logger.debug('[useOnboarding] Business ID found, attempting to create tenant');
            
            // Show loading state while creating tenant
            setIsLoading(true);
            
            try {
              await ensureTenant(businessId);
            } catch (error) {
              logger.error('[useOnboarding] Error in tenant creation:', error);
              router.push(`/dashboard?freePlan=true&requestTenantCreation=true&businessId=${businessId}`);
            } finally {
              setIsLoading(false);
            }
          } else {
            // Fallback to redirect flow that will trigger tenant creation via middleware
            logger.debug('[useOnboarding] No IDs found, redirecting to dashboard for tenant creation');
            router.push('/dashboard?freePlan=true&requestTenantCreation=true');
          }
          return; // Exit early
        } else {
          nextStep = 'payment';
        }
        break;
      case 'payment':
        nextStep = 'setup';
        break;
      case 'setup':
        nextStep = 'complete';
        break;
      default:
        nextStep = 'business-info';
    }
    
    setStep(nextStep);
    setCookie('onboardingStep', nextStep);
    router.push(`/onboarding/${nextStep}`);
  }, [step, router, getCookie, ensureTenant]);
  
  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    setStatus('complete');
    setCookie('onboardedStatus', 'complete');
    setCookie('setupCompleted', 'true');
    
    // If we have a tenant ID, redirect to tenant dashboard
    const tenantId = localStorage.getItem('tenantId') || getCookie('tenantId');
    if (tenantId) {
      router.push(`/tenant/${tenantId}/dashboard?newAccount=true`);
    } else {
      router.push('/dashboard?newAccount=true');
    }
  }, [router]);
  
  return {
    step,
    status,
    businessInfo,
    subscription,
    paymentInfo,
    updateBusinessInfo,
    updateSubscription,
    updatePaymentInfo,
    nextStep,
    completeOnboarding,
    setStep,
    isLoading,
  };
}

// Default export for backward compatibility
export default useOnboarding;