'use client';

import { useState, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';
import { useOnboardingPolling } from '@/hooks/useOnboardingPolling';
import { validateToken, refreshSession } from '@/lib/authUtils';
import { logger } from '@/utils/logger';

export const BUTTON_STATES = {
  NO_AUTH: 'no_auth',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ERROR: 'error',
};

const BUTTON_CONFIG = {
  [BUTTON_STATES.NO_AUTH]: {
    text: 'Sign In/Sign Up',
    action: '/auth/signin',
    variant: 'contained',
    color: 'primary',
  },
  [BUTTON_STATES.IN_PROGRESS]: {
    text: 'Complete Business Setup',
    action: '/onboarding',
    variant: 'contained',
    color: 'secondary',
  },
  [BUTTON_STATES.COMPLETED]: {
    text: 'Your Dashboard',
    action: '/dashboard',
    variant: 'contained',
    color: 'success',
  },
  [BUTTON_STATES.ERROR]: {
    text: 'Retry',
    action: '/',
    variant: 'contained',
    color: 'error',
  },
};

/**
 * Configuration for button state transitions and error handling
 */
const CONFIG = Object.freeze({
  /** Time to wait before allowing another retry (ms) */
  RETRY_COOLDOWN: 2000,
  /** Maximum number of consecutive errors before forcing sign in */
  MAX_ERRORS: 3,
  /** Time to show error state before auto-retry (ms) */
  ERROR_DISPLAY_TIME: 3000,
});

/**
 * Custom hook for managing landing page button state and transitions
 */
export function useLandingPageStatus() {
  const { data: session, status: authStatus } = useSession();
  const {
    status: onboardingStatus,
    loading: statusLoading,
    error: statusError,
  } = useOnboardingPolling();
  const router = useRouter();
  const [buttonState, setButtonState] = useState(BUTTON_STATES.NO_AUTH);
  const [retrying, setRetrying] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [lastRetryTime, setLastRetryTime] = useState(0);

  /**
   * Determines the appropriate button state based on current session and onboarding status
   */
  const getButtonState = useCallback(async () => {
    if (!session?.user || authStatus === 'loading') {
      return BUTTON_STATES.NO_AUTH;
    }

    try {
      // Enhanced token validation with time until expiry
      const { isValid, timeUntilExpiry } = await validateToken();

      // Log token status for monitoring
      logger.debug('Button state token check:', {
        isValid,
        timeUntilExpiry: Math.floor(timeUntilExpiry / 1000),
        onboardingStatus,
      });

      if (!isValid) {
        try {
          await refreshSession();
        } catch (refreshError) {
          logger.error(
            'Failed to refresh session during button state check:',
            refreshError
          );
          return BUTTON_STATES.ERROR;
        }
      }

      // Pre-emptively refresh if token is close to expiry (within 10 minutes)
      if (timeUntilExpiry < 10 * 60 * 1000) {
        refreshSession().catch((error) => {
          logger.warn('Pre-emptive token refresh failed:', error);
        });
      }

      if (onboardingStatus === 'COMPLETE') {
        return BUTTON_STATES.COMPLETED;
      }

      // Additional validation for in-progress state
      if (!onboardingStatus || onboardingStatus === 'NOT_STARTED') {
        logger.debug('User in initial onboarding state');
      } else {
        logger.debug('User in onboarding progress:', {
          currentStep: onboardingStatus,
        });
      }

      return BUTTON_STATES.IN_PROGRESS;
    } catch (error) {
      logger.error('Error getting button state:', error, {
        sessionExists: !!session,
        hasUser: !!session?.user,
        authStatus,
        onboardingStatus,
      });
      return BUTTON_STATES.ERROR;
    }
  }, [session, authStatus, onboardingStatus]);

  const getButtonAction = useCallback(async () => {
    const state = await getButtonState();
    if (state === BUTTON_STATES.IN_PROGRESS) {
      if (!onboardingStatus || onboardingStatus === 'NOT_STARTED') {
        return '/onboarding/business-info';
      }
      return `/onboarding/${onboardingStatus.toLowerCase()}`;
    }
    return BUTTON_CONFIG[state].action;
  }, [getButtonState, onboardingStatus]);

  /**
   * Handles button click events with enhanced error recovery
   */
  const handleButtonClick = useCallback(async () => {
    try {
      if (buttonState === BUTTON_STATES.ERROR) {
        // Enforce retry cooldown
        const now = Date.now();
        if (now - lastRetryTime < CONFIG.RETRY_COOLDOWN) {
          logger.debug('Retry attempt too soon, enforcing cooldown');
          return;
        }

        setRetrying(true);
        setLastRetryTime(now);
        logger.debug('Attempting to recover from error state');

        try {
          // Validate current session before attempting refresh
          const { isValid, timeUntilExpiry } = await validateToken();
          if (!isValid || timeUntilExpiry < 10 * 60 * 1000) {
            await refreshSession();
          }

          const newState = await getButtonState();
          setButtonState(newState);

          // Reset error count on successful recovery
          if (newState !== BUTTON_STATES.ERROR) {
            setErrorCount(0);
          } else {
            // Increment error count and redirect if too many errors
            const newErrorCount = errorCount + 1;
            setErrorCount(newErrorCount);

            if (newErrorCount >= CONFIG.MAX_ERRORS) {
              logger.warn(
                `Max errors (${CONFIG.MAX_ERRORS}) reached, redirecting to sign in`
              );
              router.push('/auth/signin');
              return;
            }

            // Auto-retry after delay if not max errors
            setTimeout(() => {
              handleButtonClick();
            }, CONFIG.ERROR_DISPLAY_TIME);
            return;
          }
        } catch (refreshError) {
          logger.error('Recovery attempt failed:', refreshError);
          setErrorCount((prev) => prev + 1);
          if (errorCount >= CONFIG.MAX_ERRORS) {
            router.push('/auth/signin');
          }
          return;
        } finally {
          setRetrying(false);
        }
      }

      // Get and validate the target action
      const action = await getButtonAction();
      if (!action) {
        throw new Error('No valid action determined for button click');
      }

      logger.debug('Navigating to:', {
        action,
        currentState: buttonState,
        errorCount,
        lastRetryTime: new Date(lastRetryTime).toISOString(),
      });

      router.push(action);
    } catch (error) {
      logger.error('Error handling button click:', error, {
        currentState: buttonState,
        isRetrying: retrying,
        errorCount,
      });
      setButtonState(BUTTON_STATES.ERROR);
      setErrorCount((prev) => prev + 1);

      // Auto-retry after delay if not max errors
      if (errorCount < CONFIG.MAX_ERRORS) {
        setTimeout(() => {
          handleButtonClick();
        }, CONFIG.ERROR_DISPLAY_TIME);
      }
    }
  }, [
    buttonState,
    getButtonAction,
    router,
    retrying,
    getButtonState,
    errorCount,
    lastRetryTime,
  ]);

  const currentButtonState = buttonState;
  const currentConfig = {
    ...BUTTON_CONFIG[currentButtonState],
    action: getButtonAction(),
  };

  return {
    buttonConfig: currentConfig,
    loading: statusLoading || authStatus === 'loading' || retrying,
    error: statusError,
    handleButtonClick,
  };
}
