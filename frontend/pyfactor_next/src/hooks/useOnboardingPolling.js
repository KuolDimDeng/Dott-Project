'use client';


import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { getOnboardingStatus } from '@/utils/onboardingUtils';
import useOnboardingStore from '@/app/(app)/onboarding/store/onboardingStore';

const POLLING_INTERVAL = 10000; // 10 seconds

export function useOnboardingPolling() {
  const pollingRef = useRef(null);
  const isPollingRef = useRef(false);
  const { loadOnboardingState } = useOnboardingStore();

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      logger.debug('[OnboardingPolling] Polling stopped');
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      isPollingRef.current = false;
    }
  }, []);

  const startPolling = useCallback(() => {
    // Don't start if already polling
    if (isPollingRef.current) {
      logger.debug('[OnboardingPolling] Polling already in progress');
      return;
    }

    logger.debug('[OnboardingPolling] Starting polling');
    isPollingRef.current = true;

    const pollOnboardingStatus = async () => {
      try {
        const { setupDone } = await getOnboardingStatus();
        
        // Stop polling if onboarding is complete
        if (setupDone) {
          logger.debug('[OnboardingPolling] Onboarding complete, stopping polling');
          stopPolling();
          return;
        }

        // Update onboarding state
        await loadOnboardingState();
      } catch (error) {
        logger.error('[OnboardingPolling] Error polling status:', error);
      }
    };

    // Initial poll
    pollOnboardingStatus();

    // Set up interval
    pollingRef.current = setInterval(pollOnboardingStatus, POLLING_INTERVAL);
  }, [loadOnboardingState, stopPolling]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isPollingRef.current) {
        stopPolling();
      }
    };
  }, [stopPolling]);

  return {
    startPolling,
    stopPolling
  };
}
