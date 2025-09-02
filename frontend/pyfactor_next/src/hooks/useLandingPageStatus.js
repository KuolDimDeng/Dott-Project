'use client';


import { useState, useEffect } from 'react';
// Auth0 authentication is handled via useSession hook
import { logger } from '@/utils/logger';
import { useSession } from '@/hooks/useSession-v2';
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
  
  // Add a timeout to prevent loading state from getting stuck
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (status.isLoading) {
        logger.warn('[LandingStatus] Loading timeout reached, forcing state to not loading');
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: prev.error || 'Loading timeout reached'
        }));
      }
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(loadingTimeout);
  }, [status.isLoading]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        logger.debug('[LandingStatus] Checking authentication status...');
        
        // Get current session using v6 API
        const session = null; // Removed Amplify - using Auth0
        const tokens = null; // Placeholder for Auth0 tokens
        
        if (!tokens?.idToken) {
          logger.debug('[LandingStatus] No valid tokens found, user is not authenticated');
          setStatus({
            isLoading: false,
            isAuthenticated: false,
            needsOnboarding: false,
            onboardingStatus: null,
            error: null // Don't set an error for unauthenticated users on landing page
          });
          return;
        }

        // Get current user using v6 API - wrap in try/catch to handle errors gracefully
        try {
          const user = await getCurrentUser();
          if (!user) {
            logger.debug('[LandingStatus] No current user found, user is not authenticated');
            setStatus({
              isLoading: false,
              isAuthenticated: false,
              needsOnboarding: false,
              onboardingStatus: null,
              error: null // Don't set an error for unauthenticated users
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
              error: null // Don't set an error for expired tokens on landing page
            });
            return;
          }

          // Check onboarding status
          const setupDone = (user.attributes?.['custom:setupdone'] || '').toLowerCase() === 'true';
          const onboardingStatus = user.attributes?.['custom:onboarding'] || ONBOARDING_STATES.NOT_STARTED;

          // Load onboarding state - wrap in try/catch to handle errors
          try {
            await loadOnboardingState();
          } catch (err) {
            logger.warn('[LandingStatus] Failed to load onboarding state:', err);
            // Continue even if this fails - don't block the landing page
          }

          // Only refresh session if token is about to expire (within 5 minutes)
          const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
          if (tokenPayload.exp * 1000 < fiveMinutesFromNow) {
            logger.debug('[LandingStatus] Token about to expire, refreshing session');
            try {
              await refreshSession();
            } catch (err) {
              logger.warn('[LandingStatus] Failed to refresh session:', err);
              // Continue even if refresh fails
            }
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
        } catch (userError) {
          // Handle user fetch errors - this shouldn't block the landing page
          logger.warn('[LandingStatus] Error getting current user:', userError);
          setStatus({
            isLoading: false,
            isAuthenticated: false,
            needsOnboarding: false,
            onboardingStatus: null,
            error: null // Don't set an error for landing page
          });
        }
      } catch (error) {
        logger.error('[LandingStatus] Error checking status:', error);
        // Ensure we set isAuthenticated to false on any error, but don't block landing page
        setStatus({
          isLoading: false,
          isAuthenticated: false,
          needsOnboarding: false,
          onboardingStatus: null,
          error: null // Don't set an error for landing page
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
