// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Subscription/useSubscriptionForm.js
import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast/ToastProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { logger } from '@/utils/logger';
import { subscriptionDefaultValues } from './Subscription.types';
import { persistenceService } from '@/services/persistenceService';
import { RoutingManager } from '@/lib/routingManager';


import { 
  validateUserState, 
  handleAuthError, 
  generateRequestId,
  validateOnboardingStep,
  makeRequest 
} from '@/lib/authUtils';

const validationSchema = z.object({
    selectedPlan: z.enum(['free', 'professional'], {
      required_error: 'Please select a plan',
      invalid_type_error: 'Invalid plan selected',
    }),
    billingCycle: z.enum(['monthly', 'annual'], {
      required_error: 'Please select a billing cycle',
      invalid_type_error: 'Invalid billing cycle selected',
    }),
  });


export const useSubscriptionForm = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestId] = useState(() => generateRequestId());

  const methods = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: subscriptionDefaultValues,
    mode: 'onChange',
    reValidateMode: 'onChange'
  });

  const handleChange = useCallback(async (name, value) => {
    try {
      if (!name || value === undefined) {
        logger.warn('Invalid field update attempt:', { name, value, requestId });
        return;
      }

      const userState = await validateUserState(session, requestId);
      if (!userState.isValid) {
        throw new Error(userState.reason);
      }

      methods.setValue(name, value, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });

      await persistenceService.saveData('subscription-draft', {
        ...methods.getValues(),
        timestamp: Date.now()
      });

    } catch (error) {
      const errorResult = handleAuthError(error);
      logger.error('Failed to handle change:', { 
        error: errorResult, 
        field: name,
        requestId 
      });
      toast.error(errorResult.message);
    }
  }, [methods, session, toast, requestId]);

  const handleSubscriptionSelect = useCallback(async (tier) => {
    let toastId;
  
    try {
      if (isSubmitting) return;
      setIsSubmitting(true);
      toastId = toast.loading('Saving your selection...');
  
      const subscriptionData = {
        selectedPlan: tier.type,
        billingCycle: methods.getValues('billingCycle') || 'monthly'
      };
  
      // Save subscription info
      const response = await fetch('/api/onboarding/save-subscription-info', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        },
        body: JSON.stringify(subscriptionData)
      });
  
      if (!response.ok) {
        throw new Error('Failed to save subscription selection');
      }
  
      const responseData = await response.json();
  
      // Update session with new status
      const sessionResponse = await fetch('/api/auth/update-session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          onboardingStatus: responseData.data.onboardingStatus,
          currentStep: responseData.data.currentStep,
          completedSteps: responseData.data.completedSteps,
          selectedPlan: tier.type,
          billingCycle: subscriptionData.billingCycle
        })
      });
  
      if (!sessionResponse.ok) {
        throw new Error('Failed to update session');
      }
  
      // Clear draft data
      await persistenceService.saveData('subscription-draft', {
        formData: {},
        metadata: {
          lastModified: new Date().toISOString(),
          hasFormData: false,
          processed: true,
          step: responseData.data.currentStep,
          completedAt: new Date().toISOString()
        }
      });
  
      toast.success('Plan selected successfully');
  
      // Wait briefly for session update
      await new Promise(resolve => setTimeout(resolve, 500));
  
      // Force page reload and navigation
      window.location.href = responseData.redirectTo;
  
    } catch (error) {
      logger.error('Subscription selection failed:', { 
        error: error.message,
        requestId,
        tier: tier?.type
      });
      toast.error('Failed to save subscription selection. Please try again.');
  
    } finally {
      if (toastId) {
        toast.dismiss(toastId);
      }
      setIsSubmitting(false);
    }
  }, [methods, isSubmitting, toast, requestId]);

const handlePreviousStep = useCallback(async () => {
  try {
    const userState = await validateUserState(session, requestId);
    if (!userState.isValid) {
      throw new Error(userState.reason);
    }

    if (methods.formState.isDirty) {
      const currentData = methods.getValues();
      await persistenceService.saveData('subscription-draft', {
        ...currentData,
        timestamp: Date.now(),
        tier: currentData.selectedPlan // Save tier with draft
      });
    }

    // Use RoutingManager for previous step navigation
    await router.push(RoutingManager.ROUTES.ONBOARDING.BUSINESS_INFO);

} catch (error) {
    const errorResult = handleAuthError(error);
    logger.error('Navigation failed:', { 
      error: errorResult,
      requestId 
    });
    toast.error(errorResult.message);
  }
}, [methods, router, toast, session, requestId]);

useEffect(() => {
  const loadDraft = async () => {
    try {
      const draft = await persistenceService.getData('subscription-draft');
      if (draft?.timestamp) {
        const validationResult = await validateOnboardingStep(
          session,
          'subscription',
          {
            ...draft,
            tier: draft.selectedPlan // Include tier in validation
          },
          requestId
        );

        if (validationResult.isValid) {
          methods.reset(validationResult.data);
        }
      }
    } catch (error) {
      const errorResult = handleAuthError(error);
      logger.error('Failed to load draft:', { 
        error: errorResult,
        requestId 
      });
    }
  };

  loadDraft();
}, [methods, session, requestId]);

  return {
    methods,
    handleChange,
    handleSubscriptionSelect,
    handlePreviousStep,
    isLoading,
    isSubmitting,
    requestId
  };
};