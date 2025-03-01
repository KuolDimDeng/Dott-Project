'use client';

import { useState, useEffect } from 'react';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { useSession } from '@/hooks/useSession';
import { useOnboardingPolling } from '@/hooks/useOnboardingPolling';
import useOnboardingStore from '@/app/onboarding/store/onboardingStore';
import { ONBOARDING_STATES } from '@/utils/userAttributes';

export function useLandingPageStatus() {
  const [status, setStatus] = useState({
    isLoading: true,
    isAuthenticated: false,
    needsOnboarding: false,
    onboardingStatus: null,
    error: null
  });

  const { refreshSession } = useSession();
  const { startPolling, stopPolling } = useOnboardingPolling();
  const { loadOnboardingState } = useOnboardingStore();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Get current session using v6 API
        const { tokens } = await fetchAuthSession();
        
        if (!tokens?.idToken) {
          setStatus({
            isLoading: false,
            isAuthenticated: false,
            needsOnboarding: false,
            onboardingStatus: null,
            error: null
          });
          return;
        }

        // Get current user using v6 API
        const user = await getCurrentUser();
        if (!user) {
          throw new Error('No current user found');
        }

        // Check onboarding status
        const setupDone = user.attributes?.['custom:setupdone'] === 'TRUE';
        const onboardingStatus = user.attributes?.['custom:onboarding'] || ONBOARDING_STATES.NOT_STARTED;

        // Load onboarding state
        await loadOnboardingState();

        // Refresh session to ensure tokens are up to date
        await refreshSession();

        // Start polling if user is in onboarding
        if (!setupDone) {
          startPolling();
        } else {
          stopPolling();
        }

        setStatus({
          isLoading: false,
          isAuthenticated: true,
          needsOnboarding: !setupDone,
          onboardingStatus,
          error: null
        });

        logger.debug('[LandingStatus] Status updated:', {
          setupDone,
          onboardingStatus
        });

      } catch (error) {
        logger.error('[LandingStatus] Error checking status:', error);
        setStatus({
          isLoading: false,
          isAuthenticated: false,
          needsOnboarding: false,
          onboardingStatus: null,
          error: error.message
        });
      }
    };

    checkStatus();

    // Cleanup polling on unmount
    return () => {
      stopPolling();
    };
  }, [refreshSession, startPolling, stopPolling, loadOnboardingState]);

  return status;
}
