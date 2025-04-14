///Users/kuoldeng/projectx/frontend/pyfactor_next/src/hooks/useOnboarding.js
'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { getUserPreference, saveUserPreference, PREF_KEYS } from '@/utils/userPreferences';

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
  
  // Load initial state from AppCache and Cognito
  useEffect(() => {
    async function loadData() {
      try {
        // Try to get step and status from AppCache first
        const cachedStep = getCacheValue('onboardingStep');
        if (cachedStep) {
          setStep(cachedStep);
        } else {
          // Fall back to Cognito attributes
          const cognitoStep = await getUserPreference(PREF_KEYS.ONBOARDING_STEP);
          if (cognitoStep) {
            setStep(cognitoStep);
            // Update AppCache for future fast access
            setCacheValue('onboardingStep', cognitoStep);
          }
        }
        
        // Get onboarding status
        const cachedStatus = getCacheValue('onboardedStatus');
        if (cachedStatus) {
          setStatus(cachedStatus);
        } else {
          // Fall back to Cognito attributes
          const cognitoStatus = await getUserPreference(PREF_KEYS.ONBOARDING_STATUS);
          if (cognitoStatus) {
            setStatus(cognitoStatus);
            // Update AppCache for future fast access
            setCacheValue('onboardedStatus', cognitoStatus);
          }
        }
        
        // Load stored business info
        const storedBusinessInfo = getCacheValue('businessInfo');
        if (storedBusinessInfo) {
          setBusinessInfo(storedBusinessInfo);
        }
        
        // Load stored subscription info
        const storedSubscription = getCacheValue('subscriptionInfo');
        if (storedSubscription) {
          setSubscription(storedSubscription);
        }
        
        // Load stored payment info (only non-sensitive data)
        const storedPaymentInfo = getCacheValue('paymentInfo');
        if (storedPaymentInfo) {
          setPaymentInfo(storedPaymentInfo);
        }
      } catch (error) {
        console.error('Error loading onboarding state:', error);
      }
    }
    
    loadData();
  }, []);
  
  // Update business info
  const updateBusinessInfo = useCallback((data) => {
    setBusinessInfo(data);
    
    // Store in AppCache for immediate access
    setCacheValue('businessInfo', data);
    setCacheValue('businessInfoCompleted', 'true');
    
    // Store in Cognito for persistence
    saveUserPreference('custom:businessinfo', JSON.stringify(data))
      .catch(error => console.error('Failed to save business info to Cognito:', error));
  }, []);
  
  // Update subscription info
  const updateSubscription = useCallback((data) => {
    setSubscription(data);
    
    // Store in AppCache for immediate access
    setCacheValue('subscriptionInfo', data);
    setCacheValue('subscriptionCompleted', 'true');
    
    // Store in Cognito for persistence
    saveUserPreference('custom:subscription', JSON.stringify(data))
      .catch(error => console.error('Failed to save subscription info to Cognito:', error));
  }, []);
  
  // Update payment info
  const updatePaymentInfo = useCallback((data) => {
    setPaymentInfo(data);
    
    // Store in AppCache for immediate access (only non-sensitive data)
    setCacheValue('paymentInfo', data);
    setCacheValue('paymentCompleted', 'true');
    
    // Store in Cognito for persistence (only reference data, not actual payment details)
    saveUserPreference('custom:payment_completed', 'true')
      .catch(error => console.error('Failed to save payment status to Cognito:', error));
  }, []);
  
  // Move to next step
  const nextStep = useCallback(() => {
    let nextStep = step;
    
    switch (step) {
      case 'business-info':
        nextStep = 'subscription';
        break;
      case 'subscription':
        nextStep = 'payment';
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
    
    // Store step in AppCache and Cognito
    setCacheValue('onboardingStep', nextStep);
    saveUserPreference(PREF_KEYS.ONBOARDING_STEP, nextStep)
      .catch(error => console.error('Failed to save onboarding step to Cognito:', error));
    
    router.push(`/onboarding/${nextStep}`);
  }, [step, router]);
  
  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    setStatus('complete');
    
    // Update AppCache
    setCacheValue('onboardedStatus', 'complete');
    setCacheValue('setupCompleted', 'true');
    
    // Update Cognito attributes
    try {
      await saveUserPreference(PREF_KEYS.ONBOARDING_STATUS, 'complete');
      await saveUserPreference('custom:setupdone', 'true');
    } catch (error) {
      console.error('Failed to save completion status to Cognito:', error);
    }
    
    // Get tenant ID from AppCache
    const tenantId = getCacheValue('tenantId');
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
  };
}

// Default export for backward compatibility
export default useOnboarding;