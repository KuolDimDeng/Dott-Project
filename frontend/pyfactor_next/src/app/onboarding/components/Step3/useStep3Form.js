// /src/app/onboarding/components/Step3/useStep3Form.js
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { persistenceService } from '@/services/persistenceService';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY)
  : Promise.reject(new Error('Stripe public key not found'));

export const useStep3Form = (formData) => {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const handlePayment = async () => {
    try {
      if (!formData?.selectedPlan || !formData?.billingCycle) {
        throw new Error('Missing plan or billing cycle selection');
      }

      setCheckoutLoading(true);
      setCheckoutError(null);

      // Save payment initiation state
      await persistenceService.saveData('step3-payment-initiated', {
        timestamp: Date.now(),
        plan: formData.selectedPlan,
        billingCycle: formData.billingCycle
      });

      // Create checkout session
      const response = await axiosInstance.post('/api/checkout/create-session/', {
        billingCycle: formData.billingCycle,
        plan: formData.selectedPlan,
      });

      if (!response.data?.sessionId) {
        throw new Error('Invalid checkout session response');
      }

      // Initialize Stripe
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Failed to initialize payment system');
      }

      // Redirect to Stripe
      const { error } = await stripe.redirectToCheckout({
        sessionId: response.data.sessionId
      });

      if (error) {
        throw error;
      }

    } catch (error) {
      logger.error('Payment process failed:', {
        error,
        formData,
        timestamp: new Date().toISOString()
      });

      let errorMessage = 'Payment setup failed';

      if (error.response?.status === 401) {
        errorMessage = 'Please sign in to continue';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Invalid payment details';
      } else if (!navigator.onLine) {
        errorMessage = 'Please check your internet connection';
      }

      setCheckoutError(errorMessage);

      await persistenceService.saveData('step3-payment-error', {
        timestamp: Date.now(),
        error: errorMessage,
        details: error.message
      });

    } finally {
      setCheckoutLoading(false);
    }
  };

  return {
    checkoutLoading,
    checkoutError,
    handlePayment,
    setCheckoutError
  };
};