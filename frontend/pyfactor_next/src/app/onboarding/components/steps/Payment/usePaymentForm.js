///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Payment/usePaymentForm.js
'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/components/Toast/ToastProvider';
import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { useOnboarding } from '@/hooks/useOnboarding';
import { ONBOARDING_STATES } from '@/app/onboarding/state/OnboardingStateManager';

export function usePaymentForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const { completePayment, updateOnboardingStatus } = useOnboarding();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Check if payment method is credit_card on component mount
  useEffect(() => {
    const paymentMethod = session?.user?.paymentMethod || 'credit_card';
    
    if (paymentMethod !== 'credit_card') {
      logger.info('[usePaymentForm] Redirecting to dashboard for non-credit card payment method:', {
        paymentMethod
      });
      router.push('/dashboard');
    }
  }, [session, router]);

  const handlePaymentSuccess = async (paymentId) => {
    setIsLoading(true);
    try {
      await completePayment({ id: paymentId });
      
      logger.debug('Payment verification successful', {
        paymentId,
        timestamp: new Date().toISOString(),
      });
      
      // Update onboarding status to COMPLETE
      try {
        await updateOnboardingStatus(ONBOARDING_STATES.COMPLETE);
        logger.info('[usePaymentForm] Updated onboarding status to COMPLETE');
      } catch (statusError) {
        logger.error('[usePaymentForm] Failed to update onboarding status, continuing anyway:', {
          error: statusError.message
        });
      }
      
      // Store pending schema setup info in session storage
      sessionStorage.setItem('pendingSchemaSetup', JSON.stringify({
        plan: session?.user?.subscriptionPlan,
        paymentMethod: 'credit_card',
        timestamp: new Date().toISOString(),
        status: 'pending'
      }));
      
      toast.success('Payment verified successfully');
      
      // Redirect to dashboard
      logger.info('[usePaymentForm] Redirecting to dashboard after successful payment');
      setTimeout(() => {
        window.location.replace('/dashboard');
      }, 1000);
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