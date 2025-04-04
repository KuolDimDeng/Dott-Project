'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';
import { fetchAuthSession } from 'aws-amplify/auth';

// Helper function to reset previously onboarded status (for testing only)
export const resetPreviouslyOnboarded = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('previouslyOnboarded');
    console.log('Cleared previously onboarded status for testing');
  }
};

export default function AuthButton({ variant = 'primary', size = 'medium', fullWidth = false }) {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [hasPreviouslyCompletedOnboarding, setHasPreviouslyCompletedOnboarding] = useState(false);
  const [loading, setLoading] = useState(sessionLoading);
  
  // Ensure loading doesn't get stuck by using a timeout
  useEffect(() => {
    setLoading(sessionLoading);
    
    // If loading is true, set a timeout to clear it after 3 seconds
    if (sessionLoading) {
      const timeoutId = setTimeout(() => {
        setLoading(false);
      }, 3000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [sessionLoading]);
  
  // Check localStorage on component mount to see if user previously completed onboarding
  useEffect(() => {
    const previouslyOnboarded = localStorage.getItem('previouslyOnboarded') === 'true';
    setHasPreviouslyCompletedOnboarding(previouslyOnboarded);
    
    // If user is authenticated and has completed onboarding, save this info
    if (user?.attributes?.['custom:onboarding']?.toLowerCase() === 'complete') {
      localStorage.setItem('previouslyOnboarded', 'true');
    }
  }, [user]);

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
    if (!user && hasPreviouslyCompletedOnboarding) {
      return {
        text: t('sign_in', 'SIGN IN'),
        action: () => router.push('/auth/signin')
      };
    }
    
    // Case 1: User is not authenticated AND has not completed onboarding before
    // Default for new users or loading state
    return {
      text: t('button_get_started_for_free', 'GET STARTED FOR FREE'),
      action: () => router.push('/auth/signin')
    };
  };

  const { text, action } = getButtonConfig();

  logger.debug('AuthButton state:', {
    isAuthenticated: !!user,
    onboardingStatus: user?.attributes?.['custom:onboarding'],
    previouslyOnboarded: hasPreviouslyCompletedOnboarding,
    buttonText: text
  });

  const sizeClasses = {
    small: 'px-3 py-1 text-xs',
    medium: 'px-4 py-2 text-sm',
    large: 'px-5 py-2.5 text-base'
  };

  const variantClasses = {
    primary: 'bg-primary-main hover:bg-primary-dark text-white',
    secondary: 'bg-secondary-main hover:bg-secondary-dark text-white',
    outlined: 'bg-transparent border border-primary-main text-primary-main hover:bg-primary-main/5',
    text: 'bg-transparent hover:bg-primary-light/10 text-primary-main'
  };

  return (
    <button
      onClick={action}
      disabled={loading}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : 'min-w-[200px]'}
        font-semibold uppercase tracking-wider rounded-md transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-opacity-50
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {loading ? (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : (
        text
      )}
    </button>
  );
}