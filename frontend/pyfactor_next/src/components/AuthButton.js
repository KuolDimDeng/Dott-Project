'use client';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';

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

export default function AuthButton({ size = 'medium', variant = 'primary', theme = 'primary' }) {
  const router = useRouter();
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    onboardingCompleted: false,
    needsOnboarding: true,
    currentStep: 'business_info',
    tenantId: null,
    loading: true
  });
  const { t } = useTranslation('auth');

  // Check Auth0 authentication and onboarding status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check if Auth0 session exists
        const sessionResponse = await fetch('/api/auth/session');
        
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          
          if (sessionData && sessionData.user) {
            // User is authenticated, now check their onboarding status
            try {
              const profileResponse = await fetch('/api/auth/profile');
              
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                
                logger.debug('[AuthButton] Auth status:', {
                  authenticated: true,
                  needsOnboarding: profileData.needsOnboarding,
                  onboardingCompleted: profileData.onboardingCompleted,
                  currentStep: profileData.currentStep
                });
                
                setAuthState({
                  isAuthenticated: true,
                  onboardingCompleted: profileData.onboardingCompleted === true,
                  needsOnboarding: profileData.needsOnboarding !== false,
                  currentStep: profileData.currentStep || 'business_info',
                  tenantId: profileData.tenantId,
                  loading: false
                });
              } else {
                // Authenticated but can't get profile, assume needs onboarding
                setAuthState({
                  isAuthenticated: true,
                  onboardingCompleted: false,
                  needsOnboarding: true,
                  currentStep: 'business_info',
                  tenantId: null,
                  loading: false
                });
              }
            } catch (profileError) {
              logger.warn('[AuthButton] Error fetching profile:', profileError);
              setAuthState({
                isAuthenticated: true,
                onboardingCompleted: false,
                needsOnboarding: true,
                currentStep: 'business_info',
                tenantId: null,
                loading: false
              });
            }
          } else {
            // No user in session - not authenticated
            setAuthState({
              isAuthenticated: false,
              onboardingCompleted: false,
              needsOnboarding: true,
              currentStep: 'business_info',
              tenantId: null,
              loading: false
            });
          }
        } else {
          // Session request failed - not authenticated
          setAuthState({
            isAuthenticated: false,
            onboardingCompleted: false,
            needsOnboarding: true,
            currentStep: 'business_info',
            tenantId: null,
            loading: false
          });
        }
      } catch (error) {
        logger.error('[AuthButton] Error checking auth status:', error);
        setAuthState({
          isAuthenticated: false,
          onboardingCompleted: false,
          needsOnboarding: true,
          currentStep: 'business_info',
          tenantId: null,
          loading: false
        });
      }
    };

    checkAuthStatus();
  }, []);

  const getButtonConfig = () => {
    const { isAuthenticated, onboardingCompleted, needsOnboarding, currentStep, tenantId } = authState;

    // Case 1: User is authenticated AND has completed onboarding
    if (isAuthenticated && onboardingCompleted && tenantId) {
      return {
        text: t('go_to_dashboard', 'DASHBOARD'),
        action: () => {
          router.push(`/${tenantId}/dashboard`);
        }
      };
    }
    
    // Case 2: User is authenticated BUT onboarding not completed
    if (isAuthenticated && needsOnboarding && !onboardingCompleted) {
      return {
        text: t('complete_onboarding', 'COMPLETE ONBOARDING'),
        action: () => {
          // All onboarding steps now go to the simplified form
          router.push('/onboarding');
        }
      };
    }
    
    // Case 3: User is authenticated but we're unsure of status (fallback)
    if (isAuthenticated) {
      return {
        text: t('go_to_dashboard', 'DASHBOARD'),
        action: async () => {
          // **CRITICAL FIX: Always fetch latest profile to get current tenant ID**
          try {
            logger.debug('[AuthButton] Fetching latest profile for dashboard redirect');
            const profileResponse = await fetch('/api/auth/profile');
            
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              
              if (profileData.tenantId) {
                logger.debug('[AuthButton] Got tenant ID from profile:', profileData.tenantId);
                router.push(`/${profileData.tenantId}/dashboard`);
                return;
              }
            }
            
            // If profile fetch fails, try session data
            const sessionResponse = await fetch('/api/auth/session');
            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json();
              
              if (sessionData.user && sessionData.user.tenantId) {
                logger.debug('[AuthButton] Got tenant ID from session:', sessionData.user.tenantId);
                router.push(`/${sessionData.user.tenantId}/dashboard`);
                return;
              }
            }
            
            // **FALLBACK: Redirect to onboarding instead of broken dashboard**
            logger.warn('[AuthButton] No tenant ID found, redirecting to onboarding');
            router.push('/onboarding');
            
          } catch (error) {
            logger.error('[AuthButton] Error fetching tenant ID for dashboard redirect:', error);
            // **LAST RESORT: Redirect to onboarding instead of broken dashboard**
            router.push('/onboarding');
          }
        }
      };
    }
    
    // Case 4: User is not authenticated (default)
    return {
      text: t('get_started_for_free', 'GET STARTED FOR FREE'),
      action: () => {
        router.push('/auth/signin');
      }
    };
  };

  // Get the button configuration
  const { text, action } = getButtonConfig();

  // Handle loading state
  if (authState.loading) {
    return (
      <button
        disabled
        className={`
          px-4 py-2 text-sm font-semibold uppercase tracking-wider rounded-md
          bg-gray-300 text-gray-500 cursor-not-allowed
          min-w-[120px] md:min-w-[200px]
        `}
      >
        LOADING...
      </button>
    );
  }

  const handleButtonClick = () => {
    logger.debug('[AuthButton] Button clicked:', {
      text,
      authState
    });
    action();
  };

  // Tailwind CSS classes
  const sizeClasses = {
    small: 'px-3 py-1 text-xs',
    medium: 'px-4 py-2 text-sm',
    large: 'px-5 py-2.5 text-base'
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    outlined: 'bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50',
    text: 'bg-transparent hover:bg-gray-100 text-blue-600'
  };

  // Theme variations for light/dark modes
  const themeClasses = {
    light: 'bg-blue-600 hover:bg-blue-700 text-white',
    dark: 'bg-white hover:bg-gray-100 text-blue-600',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white'
  };

  const finalTheme = theme || variant;

  return (
    <button
      onClick={handleButtonClick}
      className={`
        ${sizeClasses[size]}
        ${themeClasses[finalTheme] || variantClasses[variant]}
        font-semibold uppercase tracking-wider rounded-md transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50
        min-w-[120px] md:min-w-[200px]
      `}
    >
      {text}
    </button>
  );
}