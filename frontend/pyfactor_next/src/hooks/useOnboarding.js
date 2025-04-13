///Users/kuoldeng/projectx/frontend/pyfactor_next/src/hooks/useOnboarding.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';
import { toast } from 'react-hot-toast';
import { logger } from '@/utils/logger';
import { tenantApi } from '@/utils/api';
import { getTenantIdFromCognito } from '@/utils/tenantUtils';

/**
 * Custom hook to manage onboarding state and functions
 * Uses Cognito user attributes for storage instead of localStorage/cookies
 */
export function useOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState('business-info');
  const [status, setStatus] = useState('not_started');
  const [businessInfo, setBusinessInfo] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial state from Cognito
  useEffect(() => {
    async function loadFromCognito() {
      try {
        setIsLoading(true);
        const userAttributes = await fetchUserAttributes();
        
        // Set onboarding status from attributes
        const onboardingStatus = userAttributes['custom:onboarding'] || 'not_started';
        setStatus(onboardingStatus);
        
        // Set current step based on completion status
        if (userAttributes['custom:business_info_done'] !== 'TRUE') {
          setStep('business-info');
        } else if (userAttributes['custom:subscription_done'] !== 'TRUE') {
          setStep('subscription');
        } else if (userAttributes['custom:payment_done'] !== 'TRUE') {
          setStep('payment');
        } else {
          setStep('complete');
        }
        
        // Load business info from attributes if available
        if (userAttributes['custom:businessname'] || userAttributes['custom:businesstype']) {
          setBusinessInfo({
            name: userAttributes['custom:businessname'] || '',
            type: userAttributes['custom:businesstype'] || '',
            // Add other business info fields as needed
          });
        }
        
        // Load subscription info from attributes if available
        if (userAttributes['custom:subscription']) {
          try {
            const subscriptionData = JSON.parse(userAttributes['custom:subscription']);
            setSubscription(subscriptionData);
          } catch (e) {
            logger.error('Failed to parse subscription data from Cognito', e);
          }
        }
        
        // Load payment info if available (might be limited due to security concerns)
        if (userAttributes['custom:payment_done'] === 'TRUE') {
          setPaymentInfo({ completed: true });
        }
        
      } catch (error) {
        logger.error('Failed to load onboarding data from Cognito', error);
        toast.error('Failed to load your onboarding progress');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadFromCognito();
  }, []);

  // Update business info in Cognito
  const updateBusinessInfo = useCallback(async (info) => {
    try {
      setIsLoading(true);
      
      // Update Cognito attributes with business info
      await updateUserAttributes({
        userAttributes: {
          'custom:businessname': info.name || '',
          'custom:businesstype': info.type || '',
          'custom:business_info_done': 'TRUE',
          'custom:onboarding': 'in_progress'
        }
      });
      
      setBusinessInfo(info);
      setStatus('in_progress');
      setStep('subscription');
      return true;
    } catch (error) {
      logger.error('Failed to update business info in Cognito', error);
      toast.error('Failed to save business information');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update subscription info in Cognito
  const updateSubscription = useCallback(async (info) => {
    try {
      setIsLoading(true);
      
      // Store subscription data as JSON string in Cognito
      await updateUserAttributes({
        userAttributes: {
          'custom:subscription': JSON.stringify(info),
          'custom:subscription_done': 'TRUE',
          'custom:onboarding': 'in_progress'
        }
      });
      
      setSubscription(info);
      setStep('payment');
      return true;
    } catch (error) {
      logger.error('Failed to update subscription info in Cognito', error);
      toast.error('Failed to save subscription information');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update payment info in Cognito
  const updatePaymentInfo = useCallback(async (info) => {
    try {
      setIsLoading(true);
      
      // Update payment completion status in Cognito
      // Note: We don't store actual payment details in Cognito for security
      await updateUserAttributes({
        userAttributes: {
          'custom:payment_done': 'TRUE',
          'custom:onboarding': 'complete'
        }
      });
      
      setPaymentInfo(info);
      setStatus('complete');
      return true;
    } catch (error) {
      logger.error('Failed to update payment info in Cognito', error);
      toast.error('Failed to process payment information');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Move to the next step in onboarding
  const nextStep = useCallback(() => {
    if (step === 'business-info') setStep('subscription');
    else if (step === 'subscription') setStep('payment');
    else if (step === 'payment') setStep('complete');
  }, [step]);

  // Complete the onboarding process
  const completeOnboarding = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get tenant ID from Cognito
      const tenantId = await getTenantIdFromCognito();
      
      if (!tenantId) {
        throw new Error('No tenant ID found in Cognito attributes');
      }
      
      // Mark onboarding as complete in Cognito
      await updateUserAttributes({
        userAttributes: {
          'custom:setupdone': 'TRUE',
          'custom:onboarding': 'complete'
        }
      });
      
      // Redirect to dashboard with tenant ID
      router.push(`/dashboard/${tenantId}`);
      return true;
    } catch (error) {
      logger.error('Failed to complete onboarding', error);
      toast.error('Failed to complete onboarding process');
      return false;
    } finally {
      setIsLoading(false);
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