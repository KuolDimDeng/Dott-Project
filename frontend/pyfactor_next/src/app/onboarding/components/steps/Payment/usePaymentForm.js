'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/components/Toast/ToastProvider';
import { useState } from 'react';
import { logger } from '@/utils/logger';
import { useOnboarding } from '@/hooks/useOnboarding';

export function usePaymentForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const { completePayment } = useOnboarding();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handlePaymentSuccess = async (paymentId) => {
    setIsLoading(true);
    try {
      await completePayment({ id: paymentId });
      logger.debug('Payment verification successful', {
        paymentId,
        timestamp: new Date().toISOString(),
      });
      toast.success('Payment verified successfully');
    } catch (error) {
      logger.error('Payment verification failed:', error);
      toast.error(error.message || 'Failed to verify payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    try {
      await router.push('/onboarding/subscription');
    } catch (error) {
      logger.error('Navigation back failed:', error);
      toast.error('Failed to navigate back');
    }
  };

  return {
    handlePaymentSuccess,
    handleBack,
    isLoading,
    user: session?.user,
  };
}

export default usePaymentForm;
