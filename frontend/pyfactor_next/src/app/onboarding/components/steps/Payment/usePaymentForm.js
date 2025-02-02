// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Payment/usePaymentForm.js
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast/ToastProvider';
import { loadStripe } from '@stripe/stripe-js';
import { logger } from '@/utils/logger';
import { persistenceService } from '@/services/persistenceService';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { canNavigateToStep } from '@/app/onboarding/constants/onboardingConstants'; // Import directly from constants

import { 
  validateUserState, 
  handleAuthError, 
  generateRequestId,
  validateOnboardingStep,
  makeAuthRequest,
} from '@/lib/authUtils';
import { onboardingApi } from '@/services/api/onboarding';

// Initialize Stripe with the public key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);

export const usePaymentForm = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const toast = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(null);
  const [requestId] = useState(() => generateRequestId());
  const [selected_plan, setselected_plan] = useState(null);
  const [billingCycle, setBillingCycle] = useState(null);

  const loadSubscriptionData = useCallback(async () => {
    try {
      const data = await persistenceService.getData('subscription-data');
      const tier = await persistenceService.getCurrentTier();
      
      if (!data?.selected_plan || !data?.billingCycle) {
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
      setselected_plan(tier);
      setBillingCycle(data.billingCycle);
    } catch (error) {
      const errorResult = handleAuthError(error);
      logger.error('Failed to load subscription data:', { 
        error: errorResult,
        requestId,
        tier: selected_plan
      });
      router.replace('/onboarding/subscription');
    }
  }, [router, requestId, canNavigateToStep]);

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  const handlePayment = useCallback(async () => {
    try {
      if (!canNavigateToStep('setup')) {
        logger.warn('Payment submission blocked - cannot proceed to setup', {
          requestId,
          current_step: 'payment',
          next_step: 'setup'
        });
        return;
      }

      setCheckoutLoading(true);
      setCheckoutError(null);

      const userState = await validateUserState(session, requestId);
      if (!userState.isValid) {
        throw new Error(userState.reason);
      }

      // Start database setup first
      const setupResponse = await onboardingApi.startSetup({
        request_id: requestId
      });

      if (!setupResponse?.success) {
        throw new Error('Failed to start database setup');
      }

      // Connect to WebSocket for monitoring setup progress
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/ws/onboarding/${session.user.id}/`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'setup_complete') {
          ws.close();
          await handleStripeCheckout();
        } else if (data.type === 'setup_error') {
          ws.close();
          setCheckoutError(data.error || 'Database setup failed');
          setCheckoutLoading(false);
        }
      };

      ws.onerror = (error) => {
        ws.close();
        setCheckoutError('WebSocket connection failed');
        setCheckoutLoading(false);
      };

    } catch (error) {
      const errorResult = handleAuthError(error);
      logger.error('Payment process failed:', { 
        error: errorResult,
        requestId,
        tier: selected_plan
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
      setCheckoutLoading(false);
    }
  }, [formData, session, requestId, selected_plan, canNavigateToStep]);

  const handleStripeCheckout = async () => {
    try {
      // Save payment initiation state
      await persistenceService.saveData('payment-initiated', {
        timestamp: Date.now(),
        plan: formData.selected_plan,
        billingCycle: formData.billingCycle,
        tier: selected_plan
      });

      // Create checkout session
      const response = await makeAuthRequest(() => ({
        promise: fetch('/api/checkout/create-session/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.user.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            billingCycle: formData.billingCycle,
            plan: formData.selected_plan,
            tier: selected_plan
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
      logger.error('Stripe checkout failed:', {
        requestId,
        error: error.message
      });
      setCheckoutError(error.message);
      setCheckoutLoading(false);
    }
  };

  const handlePreviousStep = useCallback(async () => {
    try {
      if (!canNavigateToStep('subscription')) {
        logger.warn('Navigation blocked - cannot return to subscription', {
          requestId,
          current_step: 'payment'
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
    selected_plan,
    billingCycle
  };
};
