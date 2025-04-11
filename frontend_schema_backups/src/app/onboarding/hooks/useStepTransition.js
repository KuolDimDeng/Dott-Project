///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/hooks/useStepTransition.js
'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useOnboardingStore from '../store/onboardingStore';
import { ONBOARDING_STATES, STEP_ROUTES, STEP_ORDER } from '@/utils/userAttributes';
import { logger } from '@/utils/logger';

export function useStepTransition() {
  const router = useRouter();
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const lastCompletedStep = useOnboardingStore((state) => state.lastCompletedStep);
  const setCurrentStep = useOnboardingStore((state) => state.setCurrentStep);
  const setLastCompletedStep = useOnboardingStore((state) => state.setLastCompletedStep);

  const canProceed = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    const lastCompletedIndex = STEP_ORDER.indexOf(lastCompletedStep);

    // Can proceed if current step is completed
    return currentStep && currentIndex <= lastCompletedIndex;
  }, [currentStep, lastCompletedStep]);

  const validateStep = useCallback((targetStep) => {
    try {
      const currentIndex = STEP_ORDER.indexOf(currentStep);
      const targetIndex = STEP_ORDER.indexOf(targetStep);
      const lastCompletedIndex = STEP_ORDER.indexOf(lastCompletedStep);

      // Validate step exists
      if (targetIndex === -1) {
        throw new Error('Invalid step');
      }

      // Allow moving backward
      if (targetIndex < currentIndex) {
        return true;
      }

      // Allow moving to next step only if current is completed
      if (targetIndex === currentIndex + 1 && currentIndex <= lastCompletedIndex) {
        return true;
      }

      // Don't allow skipping steps
      return false;
    } catch (error) {
      logger.error('[useStepTransition] Step validation failed:', error);
      return false;
    }
  }, [currentStep, lastCompletedStep]);

  const goToStep = useCallback(async (step) => {
    try {
      if (!validateStep(step)) {
        logger.warn('[useStepTransition] Invalid step transition:', {
          from: currentStep,
          to: step
        });
        return false;
      }

      const targetRoute = STEP_ROUTES[step];
      if (!targetRoute) {
        throw new Error('Invalid step route');
      }

      logger.debug('[useStepTransition] Transitioning to step:', {
        step,
        route: targetRoute
      });

      setCurrentStep(step);
      router.push(targetRoute);
      return true;
    } catch (error) {
      logger.error('[useStepTransition] Failed to transition:', error);
      return false;
    }
  }, [currentStep, validateStep, setCurrentStep, router]);

  const goToNext = useCallback(async () => {
    try {
      const currentIndex = STEP_ORDER.indexOf(currentStep);
      if (currentIndex === -1) {
        throw new Error('Invalid current step');
      }

      const nextStep = STEP_ORDER[currentIndex + 1];
      if (!nextStep) {
        logger.warn('[useStepTransition] No next step available');
        return false;
      }

      return await goToStep(nextStep);
    } catch (error) {
      logger.error('[useStepTransition] Failed to go to next step:', error);
      return false;
    }
  }, [currentStep, goToStep]);

  const completeStep = useCallback(async (step = currentStep) => {
    try {
      const stepIndex = STEP_ORDER.indexOf(step);
      if (stepIndex === -1) {
        throw new Error('Invalid step to complete');
      }

      logger.debug('[useStepTransition] Completing step:', step);
      setLastCompletedStep(step);
      return true;
    } catch (error) {
      logger.error('[useStepTransition] Failed to complete step:', error);
      return false;
    }
  }, [currentStep, setLastCompletedStep]);

  return {
    currentStep,
    lastCompletedStep,
    canProceed,
    goToStep,
    goToNext,
    completeStep,
    validateStep,
  };
}
