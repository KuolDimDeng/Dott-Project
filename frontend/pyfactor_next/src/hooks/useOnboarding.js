'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/auth';
import { logger } from '@/utils/logger';
import {
  validateOnboardingState,
  getBusinessAttributes,
  getSubscriptionAttributes,
  getPaymentAttributes,
  generateBusinessId,
} from '@/utils/userAttributes';

export function useOnboarding() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const { updateAttributes, updateBusinessInfo, updateSubscriptionPlan } =
    useAuth();

  const getCurrentStep = useCallback(() => {
    if (status === 'loading') return 'NOT_STARTED';
    if (!session?.user) return 'NOT_STARTED';
    return session.user.onboarding || 'NOT_STARTED';
  }, [session, status]);

  const isStepCompleted = useCallback(
    (step) => {
      if (status === 'loading' || !session?.user) return false;
      const currentStep = getCurrentStep();
      const steps = [
        'NOT_STARTED',
        'BUSINESS_INFO',
        'SUBSCRIPTION',
        'PAYMENT',
        'SETUP',
        'COMPLETE',
      ];
      const currentIndex = steps.indexOf(currentStep);
      const stepIndex = steps.indexOf(step);
      return currentIndex > stepIndex;
    },
    [session, status, getCurrentStep]
  );

  const submitBusinessInfo = useCallback(
    async (businessData) => {
      try {
        // Generate a new business ID
        const businessId = generateBusinessId();

        // Update business info (this internally calls updateAttributes)
        await updateBusinessInfo(businessId);

        logger.debug('Business info submitted:', {
          businessId,
          businessData,
        });

        await update();
        router.push('/onboarding/subscription');
      } catch (error) {
        logger.error('Failed to submit business info:', error);
        throw error;
      }
    },
    [updateBusinessInfo, updateAttributes, update, router]
  );

  const submitSubscription = useCallback(
    async (plan) => {
      try {
        // Get subscription attributes with proper state
        const attributes = getSubscriptionAttributes(plan);

        // Update subscription
        await updateSubscriptionPlan(plan);
        await updateAttributes(attributes);

        logger.debug('Subscription submitted:', {
          plan,
          attributes,
          timestamp: new Date().toISOString(),
        });

        await update();

        // Route based on plan type
        if (plan === 'free') {
          router.push('/onboarding/setup');
        } else {
          router.push('/onboarding/payment');
        }
      } catch (error) {
        logger.error('Failed to submit subscription:', error);
        throw error;
      }
    },
    [updateSubscriptionPlan, updateAttributes, update, router]
  );

  const completePayment = useCallback(
    async (paymentData) => {
      try {
        // Get payment attributes with proper state
        const attributes = {
          ...getPaymentAttributes(),
          'custom:payment_verified': 'true',
          'custom:payment_id': paymentData.id,
        };

        await updateAttributes(attributes);

        logger.debug('Payment completed:', {
          paymentData,
          attributes,
          timestamp: new Date().toISOString(),
        });

        await update();
        router.push('/onboarding/setup');
      } catch (error) {
        logger.error('Failed to complete payment:', error);
        throw error;
      }
    },
    [updateAttributes, update, router]
  );

  const completeSetup = useCallback(async () => {
    try {
      await updateAttributes({
        'custom:onboarding': 'COMPLETE',
        'custom:setup_completed': 'true',
        'custom:lastlogin': new Date().toISOString(),
      });

      logger.debug('Setup completed');

      await update();
      router.push('/dashboard');
    } catch (error) {
      logger.error('Failed to complete setup:', error);
      throw error;
    }
  }, [updateAttributes, update, router]);

  const getNextStep = useCallback(
    (currentStep) => {
      if (status === 'loading') return null;

      const stepMap = {
        NOT_STARTED: 'BUSINESS_INFO',
        BUSINESS_INFO: 'SUBSCRIPTION',
        SUBSCRIPTION: (plan) => (plan === 'free' ? 'SETUP' : 'PAYMENT'),
        PAYMENT: 'SETUP',
        SETUP: 'COMPLETE',
      };

      const nextStep = stepMap[currentStep];
      if (typeof nextStep === 'function') {
        return nextStep(session?.user?.subscriptionPlan || 'free');
      }
      return nextStep;
    },
    [session, status]
  );

  return {
    currentStep: getCurrentStep(),
    isStepCompleted,
    getNextStep,
    submitBusinessInfo,
    submitSubscription,
    completePayment,
    completeSetup,
    isLoading: status === 'loading',
    user: session?.user,
  };
}

export default useOnboarding;
