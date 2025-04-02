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
          logger.debug('[LandingStatus] No valid tokens found, user is not authenticated');
          setStatus({
            isLoading: false,
            isAuthenticated: false,
            needsOnboarding: false,
            onboardingStatus: null,
            error: 'No valid authentication tokens found'
          });
          return;
        }

        // Get current user using v6 API
        const user = await getCurrentUser();
        if (!user) {
          logger.debug('[LandingStatus] No current user found, user is not authenticated');
          setStatus({
            isLoading: false,
            isAuthenticated: false,
            needsOnboarding: false,
            onboardingStatus: null,
            error: 'No current user found'
          });
          return;
        }

        // Verify token is not expired
        const tokenPayload = JSON.parse(atob(tokens.idToken.split('.')[1]));
        if (tokenPayload.exp * 1000 < Date.now()) {
          logger.debug('[LandingStatus] Token is expired, user is not authenticated');
          setStatus({
            isLoading: false,
            isAuthenticated: false,
            needsOnboarding: false,
            onboardingStatus: null,
            error: 'Authentication token expired'
          });
          return;
        }

        // Check onboarding status
        const setupDone = user.attributes?.['custom:setupdone'] === 'TRUE';
        const onboardingStatus = user.attributes?.['custom:onboarding'] || ONBOARDING_STATES.NOT_STARTED;

        // Load onboarding state
        await loadOnboardingState();

        // Only refresh session if token is about to expire (within 5 minutes)
        const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
        if (tokenPayload.exp * 1000 < fiveMinutesFromNow) {
          logger.debug('[LandingStatus] Token about to expire, refreshing session');
          await refreshSession();
        }

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
          onboardingStatus,
          isAuthenticated: true
        });

      } catch (error) {
        logger.error('[LandingStatus] Error checking status:', error);
        // Ensure we set isAuthenticated to false on any error
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
