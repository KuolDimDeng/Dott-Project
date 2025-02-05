'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/components/Toast/ToastProvider';
import { useState } from 'react';
import { logger } from '@/utils/logger';
import { updateUserAttributes } from '@/config/amplify';

export function usePaymentForm() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handlePaymentSuccess = async (paymentId) => {
    setIsLoading(true);
    try {
      // Update user attributes in Cognito
      await updateUserAttributes({
        'custom:payment_verified': 'true',
        'custom:payment_id': paymentId,
        'custom:onboarding': 'setup'
      });

      // Update session to reflect new status
      await update();

      logger.debug('Payment verification successful', {
        paymentId,
        timestamp: new Date().toISOString()
      });

      toast.success('Payment verified successfully');
      router.push('/onboarding/setup');
    } catch (error) {
      logger.error('Payment verification failed:', error);
      toast.error(error.message || 'Failed to verify payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    try {
      // Update onboarding status back to subscription
      await updateUserAttributes({
        'custom:onboarding': 'subscription'
      });
      await update();

      router.push('/onboarding/subscription');
    } catch (error) {
      logger.error('Navigation back failed:', error);
      toast.error('Failed to navigate back');
    }
  };

  return {
    handlePaymentSuccess,
    handleBack,
    isLoading,
    user: session?.user
  };
}

export default usePaymentForm;
