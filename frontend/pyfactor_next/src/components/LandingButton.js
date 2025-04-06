'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { useLandingPageStatus } from '@/hooks/useLandingPageStatus';
import { ONBOARDING_STATES } from '@/utils/userAttributes';
import { fetchAuthSession } from 'aws-amplify/auth';

const BUTTON_CONFIGS = {
  [ONBOARDING_STATES.NOT_STARTED]: {
    text: 'Get Started',
    variant: 'primary',
    route: '/onboarding/business-info'
  },
  [ONBOARDING_STATES.BUSINESS_INFO]: {
    text: 'Continue Setup',
    variant: 'primary',
    route: '/onboarding/subscription'
  },
  [ONBOARDING_STATES.SUBSCRIPTION]: {
    text: 'Continue Setup',
    variant: 'primary',
    route: '/onboarding/payment'
  },
  [ONBOARDING_STATES.PAYMENT]: {
    text: 'Complete Setup',
    variant: 'primary',
    route: '/onboarding/setup'
  },
  [ONBOARDING_STATES.SETUP]: {
    text: 'Finish Setup',
    variant: 'primary',
    route: '/onboarding/complete'
  },
  [ONBOARDING_STATES.COMPLETE]: {
    text: 'Go to Dashboard',
    variant: 'primary',
    route: '/dashboard'
  },
  DEFAULT: {
    text: 'Sign In',
    variant: 'primary',
    route: '/auth/signin'
  }
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export default function LandingButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { isLoading, isAuthenticated, needsOnboarding, onboardingStatus, error } = useLandingPageStatus();

  // Helper function to update cookies
  const updateCookies = async (onboardingStep, onboardedStatus, setupCompleted = false) => {
    try {
      const { tokens } = await fetchAuthSession();
      
      if (tokens?.idToken) {
        logger.debug('[LandingButton] Updating cookies before navigation');
        
        await fetch('/api/auth/set-cookies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: tokens.idToken.toString(),
            accessToken: tokens.accessToken.toString(),
            refreshToken: tokens.refreshToken?.toString(),
            onboardingStep,
            onboardedStatus,
            setupCompleted
          }),
        });
        
        logger.debug('[LandingButton] Successfully updated cookies');
      }
    } catch (error) {
      logger.error('[LandingButton] Failed to update cookies:', error);
      // Continue with navigation even if cookie update fails
    }
  };

  const getButtonConfig = useCallback(() => {
    if (isLoading) {
      return BUTTON_CONFIGS.DEFAULT;
    }

    if (!isAuthenticated) {
      return BUTTON_CONFIGS.DEFAULT;
    }

    if (needsOnboarding) {
      return BUTTON_CONFIGS[onboardingStatus] || BUTTON_CONFIGS[ONBOARDING_STATES.NOT_STARTED];
    }

    return BUTTON_CONFIGS[ONBOARDING_STATES.COMPLETE];
  }, [isLoading, isAuthenticated, needsOnboarding, onboardingStatus]);

  const handleButtonClick = async () => {
    try {
      setLoading(true);
      const config = getButtonConfig();
      
      if (!config) {
        throw new Error('Invalid button configuration');
      }

      // If user is not authenticated, redirect to sign in
      if (!isAuthenticated) {
        logger.debug('[LandingButton] User not authenticated, redirecting to sign in');
        router.push('/auth/signin');
        return;
      }

      // Verify authentication again before proceeding
      const { tokens } = await fetchAuthSession();
      if (!tokens?.idToken) {
        logger.debug('[LandingButton] No valid tokens found during navigation, redirecting to sign in');
        router.push('/auth/signin');
        return;
      }

      // Verify token is not expired
      const tokenPayload = JSON.parse(atob(tokens.idToken.split('.')[1]));
      if (tokenPayload.exp * 1000 < Date.now()) {
        logger.debug('[LandingButton] Token is expired, redirecting to sign in');
        router.push('/auth/signin');
        return;
      }

      // If going to dashboard and onboarding is complete, update cookies first
      if (config.route === '/dashboard' && onboardingStatus === 'COMPLETE') {
        logger.debug('[LandingButton] Going to dashboard with COMPLETE status, updating cookies');
        await updateCookies('complete', 'COMPLETE', true);
      } else if (config.route === '/dashboard') {
        // For any other case going to dashboard, ensure we have the right cookies
        logger.debug('[LandingButton] Going to dashboard, ensuring cookies are set');
        await updateCookies('complete', onboardingStatus || 'COMPLETE', true);
      } else if (config.route.startsWith('/onboarding/')) {
        // Update cookies for onboarding routes
        const step = config.route.replace('/onboarding/', '');
        const status = step.toUpperCase().replace('-', '_');
        await updateCookies(step, status);
      }

      router.push(config.route);
    } catch (error) {
      logger.error('[LandingButton] Navigation failed:', error);

      // Implement retry logic
      if (retryCount < MAX_RETRIES) {
        setRetrying(true);
        setRetryCount(prev => prev + 1);
        
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount)));
        
        setRetrying(false);
        handleButtonClick();
      } else {
        // Reset retry state
        setRetrying(false);
        setRetryCount(0);
        
        // Fallback to sign in
        router.push('/auth/signin');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get current button configuration
  const buttonConfig = getButtonConfig();

  // Always display the same text regardless of loading state
  const displayText = buttonConfig.text;

  if (isLoading) {
    return (
      <button
        className="min-w-[200px] rounded-md bg-primary-main px-6 py-3 text-base font-medium text-white"
      >
        {displayText}
      </button>
    );
  }

  return (
    <button
      className={`min-w-[200px] relative rounded-md px-6 py-3 text-base font-medium ${
        buttonConfig.variant === 'primary' 
          ? 'bg-primary-main text-white hover:bg-primary-dark' 
          : 'border border-primary-main bg-transparent text-primary-main hover:bg-primary-main/5'
      }`}
      onClick={handleButtonClick}
    >
      {displayText}
    </button>
  );
}
