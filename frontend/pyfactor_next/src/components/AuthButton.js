'use client';

import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';
import { Button } from '@mui/material';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';
import { fetchAuthSession } from 'aws-amplify/auth';

export default function AuthButton({ variant = 'contained', size = 'medium', fullWidth = false }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

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
    if (!user || loading) {
      return {
        text: t('button_get_started_for_free', 'GET STARTED FOR FREE'),
        action: () => router.push('/auth/signin')
      };
    }

    const onboardingStatus = user?.attributes?.['custom:onboarding'] || 'NOT_STARTED';
    
    if (['BUSINESS_INFO', 'SUBSCRIPTION', 'PAYMENT', 'SETUP'].includes(onboardingStatus)) {
      return {
        text: t('complete_onboarding', 'COMPLETE ONBOARDING'),
        action: async () => {
          // Redirect to the appropriate step based on onboarding status
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

    if (onboardingStatus === 'COMPLETE') {
      return {
        text: t('your_dashboard', 'YOUR DASHBOARD'),
        action: async () => {
          // Update cookies to ensure they match the user attributes before navigation
          await updateCookies('complete', 'COMPLETE', true);
          router.push('/dashboard');
        }
      };
    }

    // Default fallback
    return {
      text: t('button_get_started_for_free', 'GET STARTED FOR FREE'),
      action: () => router.push('/auth/signin')
    };
  };

  const { text, action } = getButtonConfig();

  logger.debug('AuthButton state:', {
    isAuthenticated: !!user,
    onboardingStatus: user?.attributes?.['custom:onboarding'],
    buttonText: text
  });

  return (
    <Button
      variant={variant}
      size={size}
      onClick={action}
      disabled={loading}
      fullWidth={fullWidth}
      sx={{
        minWidth: '200px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}
    >
      {text}
    </Button>
  );
}