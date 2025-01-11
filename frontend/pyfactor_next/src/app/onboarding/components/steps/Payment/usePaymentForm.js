// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Payment/usePaymentForm.js
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast/ToastProvider';
import { loadStripe } from '@stripe/stripe-js';
import { logger } from '@/utils/logger';
import { persistenceService } from '@/services/persistenceService';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { 
  validateUserState, 
  handleAuthError, 
  generateRequestId,
  validateOnboardingStep,
  makeRequest 
} from '@/lib/authUtils';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY)
  : Promise.reject(new Error('Stripe public key not found'));

export const usePaymentForm = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const toast = useToast();
  const { canNavigateToStep } = useOnboarding();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(null);
  const [requestId] = useState(() => generateRequestId());
  const [selectedTier, setSelectedTier] = useState(null);
  const [billingCycle, setBillingCycle] = useState(null);

  const loadSubscriptionData = useCallback(async () => {
    try {
      const data = await persistenceService.getData('subscription-data');
      const tier = await persistenceService.getCurrentTier();
      
      if (!data?.selectedPlan || !data?.billingCycle) {
        throw new Error('Missing subscription data');
      }
      
      // Add step validation
      if (!canNavigateToStep('payment')) {
        logger.warn('Invalid payment page access attempt', {
          tier,
          requestId
        });
        router.replace('/onboarding/subscription');
        return;
      }

      if (tier !== 'professional') {
        logger.warn('Non-professional tier attempting payment access', {
          tier,
          requestId
        });
        router.replace('/onboarding/subscription');
        return;
      }

      setFormData(data);
      setSelectedTier(tier);
      setBillingCycle(data.billingCycle);
    } catch (error) {
      const errorResult = handleAuthError(error);
      logger.error('Failed to load subscription data:', { 
        error: errorResult,
        requestId,
        tier: selectedTier
      });
      router.replace('/onboarding/subscription');
    }
  }, [router, requestId, canNavigateToStep]);

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  const handlePayment = useCallback(async () => {
    try {
      // Add step validation for next step
      if (!canNavigateToStep('setup')) {
        logger.warn('Payment blocked - cannot proceed to setup', {
          requestId,
          currentStep: 'payment',
          nextStep: 'setup'
        });
        throw new Error('Cannot proceed to next step');
      }

      if (selectedTier !== 'professional') {
        throw new Error('Payment is only required for Professional tier');
      }

      if (!formData?.selectedPlan || !formData?.billingCycle) {
        throw new Error('Missing plan or billing cycle selection');
      }

      setCheckoutLoading(true);
      setCheckoutError(null);

      const userState = await validateUserState(session, requestId);
      if (!userState.isValid) {
        throw new Error(userState.reason);
      }


      // Save payment initiation state with tier
      await persistenceService.saveData('payment-initiated', {
        timestamp: Date.now(),
        plan: formData.selectedPlan,
        billingCycle: formData.billingCycle,
        tier: selectedTier
      });

      // Create checkout session with tier information
      const response = await makeRequest(() => ({
        promise: fetch('/api/checkout/create-session/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.user.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            billingCycle: formData.billingCycle,
            plan: formData.selectedPlan,
            tier: selectedTier
          })
        })
      }));

      if (!response?.data?.sessionId) {
        throw new Error('Invalid checkout session response');
      }

      // Initialize Stripe
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Failed to initialize payment system');
      }

      // Redirect to Stripe
      const { error } = await stripe.redirectToCheckout({
        sessionId: response.data.sessionId,
      });

      if (error) {
        throw error;
      }

    } catch (error) {
        const errorResult = handleAuthError(error);
        logger.error('Payment process failed:', { 
          error: errorResult,
          requestId,
          tier: selectedTier
        });
  
        let errorMessage = 'Payment setup failed';
  
        if (error.message.includes('Professional tier')) {
          errorMessage = 'Payment is only required for Professional tier';
        } else if (error.response?.status === 401) {
          errorMessage = 'Please sign in to continue';
        } else if (error.response?.status === 400) {
          errorMessage = error.response.data?.message || 'Invalid payment details';
        } else if (!navigator.onLine) {
          errorMessage = 'Please check your internet connection';
        }
  
        setCheckoutError(errorMessage);
    } finally {
      setCheckoutLoading(false);
    }
  }, [formData, session, requestId, selectedTier, canNavigateToStep]);

  const handlePreviousStep = useCallback(async () => {
    try {
      if (!canNavigateToStep('subscription')) {
        logger.warn('Navigation blocked - cannot return to subscription', {
          requestId,
          currentStep: 'payment'
        });
        return;
      }

      const userState = await validateUserState(session, requestId);
      if (!userState.isValid) {
        throw new Error(userState.reason);
      }

      await router.push('/onboarding/subscription');
    } catch (error) {
      const errorResult = handleAuthError(error);
      logger.error('Navigation failed:', { 
        error: errorResult,
        requestId 
      });
      toast.error(errorResult.message);
    }
  }, [router, toast, session, requestId, canNavigateToStep]);

  return {
    formData,
    checkoutLoading,
    checkoutError,
    handlePayment,
    handlePreviousStep,
    isLoading,
    requestId,
    selectedTier,
    billingCycle
  };
};
