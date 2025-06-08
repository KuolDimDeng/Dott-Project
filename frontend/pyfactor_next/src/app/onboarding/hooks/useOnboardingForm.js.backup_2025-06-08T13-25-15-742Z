'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/components/Toast/ToastProvider';
import { useCallback, useState } from 'react';
import { logger } from '@/utils/logger';
import { updateUserAttributes } from '@/config/amplifyUnified';

export function useOnboardingForm(step) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (data) => {
    setIsSubmitting(true);
    try {
      // Update user attributes in Cognito
      const attributes = {
        ...Object.keys(data).reduce((acc, key) => ({
          ...acc,
          [`custom:${key}`]: data[key]
        }), {}),
        'custom:onboarding': step
      };

      await updateUserAttributes(attributes);
      await update();

      logger.debug('Form submitted successfully:', {
        step,
        timestamp: new Date().toISOString()
      });

      toast.success('Information saved successfully');

      // Get next step based on current step and plan
      const stepMap = {
        'business-info': 'subscription',
        'subscription': (plan) => plan === 'free' ? 'setup' : 'payment',
        'payment': 'setup',
        'setup': 'complete'
      };

      const nextStep = stepMap[step];
      const nextRoute = typeof nextStep === 'function' 
        ? nextStep(session?.user?.['custom:selected_plan'])
        : nextStep;

      if (nextRoute === 'complete') {
        router.push('/dashboard');
      } else {
        router.push(`/onboarding/${nextRoute}`);
      }

    } catch (error) {
      logger.error('Form submission failed:', {
        step,
        error: error.message
      });
      toast.error(error.message || 'Failed to save information');
    } finally {
      setIsSubmitting(false);
    }
  }, [step, router, update, session, toast]);

  const handleBack = useCallback(async () => {
    try {
      // Map current step to previous step
      const stepMap = {
        'subscription': 'business-info',
        'payment': 'subscription',
        'setup': 'subscription'
      };

      const previousStep = stepMap[step];
      if (!previousStep) {
        throw new Error('Cannot determine previous step');
      }

      // Update onboarding status
      await updateUserAttributes({
        'custom:onboarding': previousStep
      });
      await update();

      router.push(`/onboarding/${previousStep}`);
    } catch (error) {
      logger.error('Navigation back failed:', error);
      toast.error('Failed to navigate back');
    }
  }, [step, router, update, toast]);

  return {
    handleSubmit,
    handleBack,
    isSubmitting,
    currentUser: session?.user
  };
}

export default useOnboardingForm;
