'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Setup } from '../components/steps';
import { OnboardingLayout } from '../components/layout';
import { STEP_METADATA } from '../components/registry';
import { persistenceService } from '@/services/persistenceService';
import { logger } from '@/utils/logger';
import { StepValidator } from '../validation/stepValidation';
import { useToast } from '@/components/Toast/ToastProvider';

const SetupPage = () => {
  const [metadata, setMetadata] = useState(STEP_METADATA.SETUP);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const requestId = crypto.randomUUID();

  useEffect(() => {
    const validateAndLoadSetup = async () => {
      try {
        setIsLoading(true);

        // Check session
        if (status !== 'authenticated' || !session?.user?.accessToken) {
          router.replace('/auth/signin?callbackUrl=/onboarding/setup');
          return;
        }
        
        // Check for subscription data
        const subscriptionData = await persistenceService.getData('subscription-data');
        if (!subscriptionData?.isComplete || !subscriptionData?.selectedPlan) {
          logger.warn('Invalid setup access - incomplete subscription:', {
            requestId,
            hasSubscriptionData: !!subscriptionData,
            selectedPlan: subscriptionData?.selectedPlan
          });
          toast.error('Please complete subscription selection first');
          router.replace('/onboarding/subscription');
          return;
        }

        // Get selected plan from subscription data
        const selectedPlan = subscriptionData.selectedPlan;

        // Verify step transition is valid
        const canAccess = await StepValidator.validateStepTransition({
          currentStep: 'subscription',
          requestedStep: 'setup',
          selectedPlan,
          formData: { selectedPlan }
        });

        if (!canAccess.isValid) {
          logger.warn('Invalid setup access - failed validation:', {
            requestId,
            reason: canAccess.reason,
            selectedPlan
          });
          router.replace('/onboarding/subscription');
          return;
        }

        // Professional plan requires payment first
        if (selectedPlan === 'professional') {
          const paymentStatus = await persistenceService.getData('payment-status');
          if (!paymentStatus?.isComplete) {
            logger.warn('Professional plan requires payment:', {
              requestId,
              selectedPlan,
              hasPayment: !!paymentStatus
            });
            router.replace('/onboarding/payment');
            return;
          }
        }

        // Update metadata based on selected plan
        const updatedMetadata = {
          ...STEP_METADATA.SETUP,
          title: `${selectedPlan === 'professional' ? 'Professional' : 'Basic'} Setup`,
          description: selectedPlan === 'professional'
            ? 'Setting up your professional workspace with advanced features'
            : 'Setting up your basic workspace',
          steps: selectedPlan === 'professional' 
            ? STEP_METADATA.SETUP.professionalSteps 
            : STEP_METADATA.SETUP.basicSteps
        };

        setMetadata(updatedMetadata);

        // Save current step with selected plan
        await persistenceService.saveData('onboarding-status', {
          currentStep: 'setup',
          selectedPlan,
          lastUpdated: new Date().toISOString()
        });

        logger.debug('Setup page initialized successfully:', {
          requestId,
          selectedPlan,
          metadata: updatedMetadata
        });

      } catch (error) {
        logger.error('Setup page initialization failed:', {
          requestId,
          error: error.message,
          stack: error.stack
        });
        toast.error('Failed to load setup page');
        router.replace('/onboarding/subscription');
      } finally {
        setIsLoading(false);
      }
    };

    validateAndLoadSetup();
  }, [session, status, searchParams, router, toast]);

  if (isLoading) {
    return (
      <OnboardingLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4">Loading your setup...</p>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout>
      <Setup metadata={metadata} />
    </OnboardingLayout>
  );
};

export default SetupPage;