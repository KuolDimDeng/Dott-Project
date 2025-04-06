'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';
import { fetchAuthSession } from 'aws-amplify/auth';

// Helper function to get a cookie by name
const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + '=')) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
};

// Helper function to reset previously onboarded status (for testing only)
export const resetPreviouslyOnboarded = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('previouslyOnboarded');
    console.log('Cleared previously onboarded status for testing');
  }
};

export default function AuthButton({ theme = 'light' }) {
  const router = useRouter();
  const { user, loading, error } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [previouslyOnboarded, setPreviouslyOnboarded] = useState(false);
  const [buttonText, setButtonText] = useState("GET STARTED FOR FREE");
  const { t } = useTranslation('auth');

  // Check if cookies indicate a previous onboarding
  useEffect(() => {
    try {
      // Only check once on component mount
      const onboardedStatus = getCookie('onboardedStatus');
      const onboardingComplete = getCookie('onboardingComplete');
      const setupCompleted = getCookie('setupCompleted');
      
      const isPreviouslyOnboarded = onboardedStatus === 'complete' || 
                                   onboardingComplete === 'true' || 
                                   setupCompleted === 'true';
                                   
      setPreviouslyOnboarded(isPreviouslyOnboarded);
      
      // Always log authentication state for debugging
      logger.debug('[AuthButton state]:', { 
        isAuthenticated: !!user, 
        previouslyOnboarded: isPreviouslyOnboarded,
        buttonText
      });
    } catch (e) {
      logger.error('[AuthButton] Error checking cookies:', e);
    }
  }, []);

  // Update authentication state when session changes - debounce the updates
  useEffect(() => {
    if (!loading) {
      // Consider authenticated if we have a user or valid session
      const hasValidSession = !!user || document.cookie.includes('hasSession=true');
      
      // Avoid constant re-rendering
      if (isAuthenticated !== hasValidSession) {
        setIsAuthenticated(hasValidSession);
      }
    }
  }, [user, loading]);

  // Update button text only when authentication status actually changes
  useEffect(() => {
    let newButtonText = "GET STARTED FOR FREE";
    
    if (isAuthenticated) {
      if (previouslyOnboarded) {
        newButtonText = "GO TO DASHBOARD";
      } else {
        newButtonText = "CONTINUE ONBOARDING";
      }
    } else {
      newButtonText = "GET STARTED FOR FREE";
    }
    
    // Only update if text needs to change
    if (buttonText !== newButtonText) {
      setButtonText(newButtonText);
    }
  }, [isAuthenticated, previouslyOnboarded]);

  // Handle the button click based on authentication state
  const handleButtonClick = () => {
    if (isAuthenticated) {
      // If authenticated, direct to dashboard or continue onboarding
      if (previouslyOnboarded) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding/business-info');
      }
    } else {
      // If not authenticated, direct to signup
      router.push('/auth/signup');
    }
  };

  // Helper function to update cookies
  const updateCookies = async (onboardingStep, onboardedStatus, setupCompleted = false) => {
    try {
      const { tokens } = await fetchAuthSession();
      
      if (tokens?.idToken) {
        logger.debug('[AuthButton] Updating cookies before navigation');
        
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
        
        logger.debug('[AuthButton] Successfully updated cookies');
      }
    } catch (error) {
      logger.error('[AuthButton] Failed to update cookies:', error);
      // Continue with navigation even if cookie update fails
    }
  };

  const getButtonConfig = () => {
    // Case 4: User is authenticated AND has completed onboarding
    if (user && user.attributes?.['custom:onboarding']?.toLowerCase() === 'complete') {
      return {
        text: t('your_dashboard', 'YOUR DASHBOARD'),
        action: async () => {
          await updateCookies('complete', 'complete', true);
          router.push('/dashboard');
        }
      };
    }
    
    // Case 2: User is authenticated BUT onboarding not completed
    if (user && ['BUSINESS_INFO', 'SUBSCRIPTION', 'PAYMENT', 'SETUP'].includes(user.attributes?.['custom:onboarding'])) {
      return {
        text: t('complete_onboarding', 'COMPLETE ONBOARDING'),
        action: async () => {
          // Redirect to the appropriate step based on onboarding status
          const onboardingStatus = user.attributes?.['custom:onboarding'];
          switch(onboardingStatus) {
            case 'BUSINESS_INFO':
              await updateCookies('business-info', 'BUSINESS_INFO');
              router.push('/onboarding/business-info');
              break;
            case 'SUBSCRIPTION':
              await updateCookies('subscription', 'SUBSCRIPTION');
              router.push('/onboarding/subscription');
              break;
            case 'PAYMENT':
              await updateCookies('payment', 'PAYMENT');
              router.push('/onboarding/payment');
              break;
            case 'SETUP':
              await updateCookies('setup', 'SETUP');
              router.push('/onboarding/setup');
              break;
            default:
              router.push('/onboarding');
          }
        }
      };
    }
    
    // Case 3: User is NOT authenticated but has previously completed onboarding
    if (!user && previouslyOnboarded) {
      return {
        text: t('sign_in', 'SIGN IN'),
        action: () => router.push('/auth/signin')
      };
    }
    
    // Case 1: User is not authenticated AND has not completed onboarding before
    // Default for new users or loading state
    return {
      text: t('button_get_started_for_free', 'GET STARTED FOR FREE'),
      action: () => router.push('/auth/signup')
    };
  };

  const { text, action } = getButtonConfig();

  // Use the already determined buttonText to avoid flickering
  const displayText = buttonText;

  logger.debug('AuthButton state:', {
    isAuthenticated: !!user,
    onboardingStatus: user?.attributes?.['custom:onboarding'],
    previouslyOnboarded: previouslyOnboarded,
    buttonText: displayText
  });

  const sizeClasses = {
    small: 'px-3 py-1 text-xs',
    medium: 'px-4 py-2 text-sm',
    large: 'px-5 py-2.5 text-base',
    light: 'px-4 py-2 text-sm'
  };

  const variantClasses = {
    primary: 'bg-primary-main hover:bg-primary-dark text-white',
    secondary: 'bg-secondary-main hover:bg-secondary-dark text-white',
    outlined: 'bg-transparent border border-primary-main text-primary-main hover:bg-primary-main/5',
    text: 'bg-transparent hover:bg-primary-light/10 text-primary-main',
    light: 'bg-blue-600 hover:bg-blue-700 text-white'
  };

  return (
    <button
      onClick={handleButtonClick}
      className={`
        ${sizeClasses[theme]}
        ${variantClasses[theme]}
        ${theme === 'fullWidth' ? 'w-full' : 'min-w-[200px]'}
        font-semibold uppercase tracking-wider rounded-md transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-opacity-50
      `}
    >
      {displayText}
    </button>
  );
}