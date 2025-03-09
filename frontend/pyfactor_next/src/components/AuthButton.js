'use client';

import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';
import { Button } from '@mui/material';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';

export default function AuthButton({ variant = 'contained', size = 'medium', fullWidth = false }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

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
        action: () => {
          // Redirect to the appropriate step based on onboarding status
          switch(onboardingStatus) {
            case 'BUSINESS_INFO':
              router.push('/onboarding/business-info');
              break;
            case 'SUBSCRIPTION':
              router.push('/onboarding/subscription');
              break;
            case 'PAYMENT':
              router.push('/onboarding/payment');
              break;
            case 'SETUP':
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
        action: () => router.push('/dashboard')
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