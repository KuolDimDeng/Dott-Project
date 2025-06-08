'use client';

///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Payment/usePaymentForm.js

import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/components/Toast/ToastProvider';
import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { useOnboarding } from '@/hooks/useOnboarding';
import { ONBOARDING_STATES } from '@/app/onboarding/state/OnboardingStateManager';
import { useUser } from '@/hooks/useUser';

export const usePaymentForm = () => {
  const { user } = useUser();
  const { getCurrentStep, moveToNextStep } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const router = useRouter();
  const { data: session } = useSession();
  const { updateOnboardingStatus } = useOnboarding();
  const toast = useToast();

  // Load subscription data from sessionStorage with enhanced logging
  useEffect(() => {
    try {
      // Log all available sessionStorage keys
      const allStorageKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        allStorageKeys.push(sessionStorage.key(i));
      }
      
      logger.debug('[usePaymentForm] SessionStorage state:', { 
        allKeys: allStorageKeys,
        hasSubscriptionKey: sessionStorage.getItem('pendingSubscription') !== null
      });
      
      const pendingSubscription = sessionStorage.getItem('pendingSubscription');
      logger.debug('[usePaymentForm] Raw pendingSubscription:', { 
        raw: pendingSubscription,
        type: typeof pendingSubscription,
        isEmpty: !pendingSubscription,
        length: pendingSubscription?.length || 0
      });
      
      if (pendingSubscription) {
        let data;
        try {
          data = JSON.parse(pendingSubscription);
          logger.debug('[usePaymentForm] Parsed subscription data successfully:', { 
            data,
            properties: Object.keys(data),
            planType: typeof data.plan,
            planValue: data.plan,
            planLowerCase: data.plan?.toLowerCase(),
            isProfessionalOrEnterprise: ['professional', 'enterprise'].includes(data.plan?.toLowerCase())
          });
        } catch (parseError) {
          logger.error('[usePaymentForm] Failed to parse subscription data:', { 
            parseError: parseError.message,
            rawData: pendingSubscription 
          });
          data = null;
        }
        
        if (data) {
          setSubscriptionData(data);
        } else {
          logger.error('[usePaymentForm] Invalid subscription data format');
        }
      } else {
        logger.error('[usePaymentForm] No subscription data found in sessionStorage');
      }
    } catch (err) {
      logger.error('[usePaymentForm] Error loading subscription data:', { 
        error: err.message,
        stack: err.stack
      });
    }
  }, []);
  
  // Extract subscription details - ensure we're using the proper plan
  // Prioritize session storage data over user attributes
  const subscriptionPlan = (subscriptionData && subscriptionData.plan) ? 
                           subscriptionData.plan.toLowerCase() : 
                           (user?.attributes?.['custom:subscription_plan']?.toLowerCase() || 'professional');
                         
  // Check both billing_interval and interval properties since they might be inconsistent
  const billingCycle = subscriptionData?.billing_interval || 
                      subscriptionData?.interval ||
                      user?.attributes?.['custom:billing_cycle'] || 
                      'monthly';
  
  // Log subscription details
  useEffect(() => {
    logger.debug('[usePaymentForm] Using subscription details:', {
      subscriptionPlan,
      billingCycle,
      rawSubscriptionData: subscriptionData,
      fromSessionStorage: !!subscriptionData,
      fromUserAttributes: !!user?.attributes?.['custom:subscription_plan']
    });
  }, [subscriptionPlan, billingCycle, subscriptionData, user]);

  // Flag for payment method check
  const [shouldRedirect, setShouldRedirect] = useState(false);
  
  // Check if payment method is credit_card on component mount - without router
  useEffect(() => {
    const paymentMethod = session?.user?.paymentMethod || 'credit_card';
    
    if (paymentMethod !== 'credit_card') {
      logger.info('[usePaymentForm] Non-credit card payment method detected:', {
        paymentMethod
      });
      setShouldRedirect(true);
    } else {
      setShouldRedirect(false);
    }
  }, [session]);
  
  // Handle redirect in a separate effect
  useEffect(() => {
    if (shouldRedirect) {
      logger.info('[usePaymentForm] Redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [shouldRedirect, router]);

  const handlePaymentSuccess = async (paymentMethodId) => {
    setIsLoading(true);
    try {
      // Use the subscription data from session storage for the payment process
      const plan = subscriptionPlan;
      const interval = billingCycle;
      
      logger.debug('[usePaymentForm] Payment success handler:', {
        plan,
        interval,
        paymentMethodId
      });
      
      logger.debug('[usePaymentForm] Processing payment', {
        paymentId: paymentMethodId,
        timestamp: new Date().toISOString(),
      });
      
      // Call our mock payment processing API
      const response = await fetch('/api/onboarding/payment/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: paymentMethodId,
          plan: plan,
          interval: interval,
          amount: plan === 'professional' ? 1500 : 4500,
          currency: 'usd',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Payment processing failed');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Payment processing failed');
      }
      
      logger.debug('[usePaymentForm] Payment processed successfully', {
        result,
        timestamp: new Date().toISOString(),
      });
      
      // Directly update Cognito attributes to ensure they are properly set
      try {
        // Import updateUserAttributes
        const { updateUserAttributes } = await import('@/config/amplifyUnified');
        
        // Prepare the attributes to update
        const userAttributes = {
          'custom:onboarding': 'payment',
          'custom:updated_at': new Date().toISOString()
        };
        
        logger.debug('[usePaymentForm] Updating user attributes directly', userAttributes);
        
        // Update Cognito attributes
        await updateUserAttributes({
          userAttributes: {
            'custom:onboarding': 'payment',
            'custom:updated_at': new Date().toISOString()
          }
        });
        
        logger.debug('[usePaymentForm] User attributes updated successfully');
      } catch (attrError) {
        logger.error('[usePaymentForm] Failed to update user attributes', {
          error: attrError.message,
          stack: attrError.stack
        });
        // Continue execution even if attribute update fails
      }
      
      // Update onboarding status to COMPLETE
      try {
        if (typeof updateOnboardingStatus === 'function') {
          await updateOnboardingStatus(ONBOARDING_STATES.COMPLETE);
          logger.info('[usePaymentForm] Updated onboarding status to COMPLETE');
        } else {
          logger.warn('[usePaymentForm] updateOnboardingStatus function not available, skipping status update');
          // Try to update cookies directly as a fallback
          const expirationDate = new Date();
          expirationDate.setFullYear(expirationDate.getFullYear() + 1);
          document.cookie = `onboardingStep=payment; path=/; expires=${expirationDate.toUTCString()}`;
          document.cookie = `onboardedStatus=payment; path=/; expires=${expirationDate.toUTCString()}`;
          document.cookie = `subscriptionPlan=${plan.toUpperCase()};path=/;max-age=31536000`;
        }
      } catch (statusError) {
        logger.error('[usePaymentForm] Failed to update onboarding status, continuing anyway:', {
          error: statusError.message
        });
      }
      
      // Store pending schema setup info in session storage
      sessionStorage.setItem('pendingSchemaSetup', JSON.stringify({
        plan: plan,
        paymentMethod: 'credit_card',
        timestamp: new Date().toISOString(),
        status: 'pending'
      }));
      
      toast.success('Payment successful');
      
      // Redirect to dashboard
      logger.info('[usePaymentForm] Redirecting to dashboard after successful payment');
      setTimeout(() => {
        window.location.replace(result.redirect || '/dashboard');
      }, 1000);
    } catch (error) {
      logger.error('[usePaymentForm] Payment verification failed:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    try {
      await router.push('/onboarding/subscription');
    } catch (error) {
      logger.error('Navigation back failed:', error);
      toast.error('Failed to navigate back');
    }
  };

  return {
    handlePaymentSuccess,
    handleBack,
    isLoading,
    user: session?.user,
  };
};

export default usePaymentForm;