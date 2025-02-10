'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';
import { setupStates, slideShowConfig } from './Setup.types';
import { onboardingApi } from '@/services/api/onboarding';
import { useSetupPolling } from '@/hooks/useSetupPolling';
import { generateRequestId } from '@/lib/authUtils';

const SLIDESHOW_INTERVAL = 5000;

export const useSetupForm = () => {
  const router = useRouter();
  const { data: session, update } = useSession();
  const toast = useToast();
  const {
    progress,
    currentStep,
    status,
    error: setupError,
    isComplete,
    isLoading: isPolling,
  } = useSetupPolling();

  const [state, setState] = useState({
    currentImageIndex: 0,
    isInitializing: true,
    selected_plan: null,
    requestId: generateRequestId(),
  });

  const slideShowIntervalRef = useRef(null);

  const handleSetupError = (error) => {
    logger.error('Setup step failed:', {
      requestId: state.requestId,
      error: error.message,
      stack: error.stack,
      currentStep: session?.user?.onboarding,
    });

    toast.dismiss();
    toast.error(error.message || 'Failed to complete setup');

    if (error.statusCode === 401) {
      router.replace('/auth/signin');
      return;
    }

    if (error.statusCode === 403) {
      router.replace('/onboarding/subscription');
      return;
    }
  };

  useEffect(() => {
    const initializeSetup = async () => {
      if (session?.user?.id && state.isInitializing) {
        logger.info('Initializing setup:', { requestId: state.requestId });

        try {
          let selected_plan = session.user.selected_plan;

          if (!selected_plan) {
            const tierResponse = await onboardingApi.getSubscriptionStatus();
            selected_plan = tierResponse?.data?.plan || 'free';

            await update({
              ...session,
              user: {
                ...session.user,
                selected_plan,
              },
            });
          }

          setState((prev) => ({ ...prev, selected_plan }));

          const response = await onboardingApi.startSetup({
            tier: selected_plan,
            operation: 'create_database',
          });

          if (response?.success) {
            setState((prev) => ({ ...prev, isInitializing: false }));
          }
        } catch (error) {
          handleSetupError(error);
        }
      }
    };

    initializeSetup();
  }, [session?.user?.id, state.isInitializing, update]);

  useEffect(() => {
    if (isComplete) {
      const redirectUrl = `/${state.selected_plan === 'professional' ? 'pro/' : ''}dashboard`;

      logger.info('Setup completion successful:', {
        requestId: state.requestId,
        redirectUrl,
        tier: state.selected_plan,
      });

      const redirectTimer = setTimeout(() => {
        router.replace(redirectUrl);
      }, 1000); // Small delay for cleanup

      return () => clearTimeout(redirectTimer);
    }
  }, [isComplete, state.selected_plan, router]);

  useEffect(() => {
    if (!state.selected_plan) return;

    slideShowIntervalRef.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        currentImageIndex:
          (prev.currentImageIndex + 1) %
          (slideShowConfig.IMAGES[state.selected_plan]?.length || 1),
      }));
    }, SLIDESHOW_INTERVAL);

    return () => {
      if (slideShowIntervalRef.current) {
        clearInterval(slideShowIntervalRef.current);
      }
    };
  }, [state.selected_plan]);

  // Handle setup errors
  useEffect(() => {
    if (setupError) {
      handleSetupError(new Error(setupError));
    }
  }, [setupError]);

  return {
    progress,
    current_step: currentStep,
    isComplete,
    currentImageIndex: state.currentImageIndex,
    isInitializing: state.isInitializing || isPolling,
    requestId: state.requestId,
    selected_plan: state.selected_plan,
    redirectUrl: isComplete
      ? `/${state.selected_plan === 'professional' ? 'pro/' : ''}dashboard`
      : null,
  };
};
