///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/BusinessInfo/useBusinessInfoForm.js
import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/components/Toast/ToastProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import debounce from 'lodash/debounce';
import { logger } from '@/utils/logger';
import { useStepTransition } from '@/app/onboarding/hooks/useStepTransition';
import { onboardingApi, makeRequest } from '@/services/api/onboarding';
import { persistenceService } from '@/services/persistenceService';
import { generateRequestId } from '@/lib/authUtils';

import { StepValidator } from '@/app/onboarding/validation/stepValidation';
import { validateStepData, canAccessStep } from '@/config/steps'; // Add this import

const validationSchema = z.object({
  business_name: z
    .string()
    .min(1, 'Business name is required')
    .max(200, 'Business name cannot exceed 200 characters'),
  business_type: z.string().min(1, 'Business type is required'),
  country: z.string().min(1, 'Country is required'),
  legal_structure: z.string().min(1, 'Legal structure is required'),
  date_founded: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .refine(
      (val) => new Date(val) <= new Date(),
      'Date cannot be in the future'
    ),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name cannot exceed 100 characters'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name cannot exceed 100 characters'),
});

export const useBusinessInfoForm = () => {
  const router = useRouter();
  const { data: session, update } = useSession(); // Add update here
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const requestId = useRef(generateRequestId()).current;
  const lastSavedRef = useRef(null);
  const { transition, isTransitioning } = useStepTransition();

  const methods = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      business_name: '',
      business_type: '',
      country: '',
      legal_structure: '',
      date_founded: new Date().toISOString().split('T')[0],
      first_name: '',
      last_name: '',
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    const initializeForm = async () => {
      try {
        const draft = await persistenceService.getData('business-info-draft');
        const defaultData = {
          date_founded: new Date().toISOString().split('T')[0],
          business_name: '',
          business_type: '',
          country: '',
          legal_structure: '',
          first_name: session?.user?.first_name || '',
          last_name: session?.user?.last_name || '',
        };

        // Reset form with either draft or default data
        await methods.reset(
          draft?.formData
            ? {
                ...defaultData,
                ...draft.formData,
              }
            : defaultData
        );

        setIsInitialized(true);

        logger.debug('Form initialized:', {
          requestId,
          hasData: !!draft,
          isValid: methods.formState.isValid,
        });
      } catch (error) {
        logger.error('Form initialization failed:', {
          requestId,
          error: error.message,
        });
        setIsInitialized(true); // Still set initialized
      }
    };

    if (session?.user) {
      initializeForm();
    }
  }, [methods, session, requestId]);

  const handleSubmit = useCallback(
    async (event) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }

      const operationId = generateRequestId();
      let toastId;

      try {
        setIsLoading(true);
        toastId = toast.loading('Saving your information...');

        const formData = methods.getValues();

        logger.debug('Business info submission - initial state:', {
          operationId,
          currentStatus: session?.user?.onboarding,
          formData,
        });

        // Save business info
        const saveResponse = await onboardingApi.saveBusinessInfo({
          ...formData,
          operation_id: operationId,
        });

        if (!saveResponse?.success) {
          throw new Error('Failed to save information');
        }

        // Update onboarding status
        const statusResponse = await onboardingApi.updateStatus({
          current_step: 'business-info',
          next_step: 'subscription',
          form_data: formData,
          operation_id: operationId,
        });

        if (!statusResponse?.success) {
          throw new Error('Failed to update status');
        }

        // Update user attributes in Cognito and refresh session
        await update();

        logger.debug('Session update completed:', {
          operationId,
          newStatus: 'subscription',
        });

        // Clear draft data
        await persistenceService.clearData('business-info-draft');

        if (toastId) {
          toast.dismiss(toastId);
          toast.success('Information saved successfully');
        }

        // Navigate to next step
        await router.replace('/onboarding/subscription');

        return { success: true };
      } catch (error) {
        logger.error('Form submission failed:', {
          operationId,
          error: error.message,
          stack: error.stack,
        });

        if (toastId) {
          toast.dismiss(toastId);
          toast.error(error.message || 'Failed to save information');
        }
        return { success: false, error };
      } finally {
        setIsLoading(false);
      }
    },
    [methods, session, router, toast, update]
  );

  const debouncedSave = useCallback(
    debounce(async (data) => {
      try {
        if (!data) return;

        await persistenceService.saveData('business-info-draft', {
          formData: data,
          timestamp: Date.now(),
        });

        lastSavedRef.current = new Date().toISOString();

        logger.debug('Draft saved:', {
          requestId,
          timestamp: lastSavedRef.current,
        });
      } catch (error) {
        logger.error('Failed to save draft:', {
          error: error.message,
          requestId,
        });
      }
    }, 1000),
    [requestId]
  );

  useEffect(() => {
    const subscription = methods.watch((value) => {
      if (isInitialized && value) {
        debouncedSave(value);
      }
    });

    return () => subscription.unsubscribe();
  }, [methods, debouncedSave, isInitialized]);

  return {
    methods,
    handleSubmit,
    isLoading,
    isTransitioning,
    isInitialized,
    setIsInitialized,
    lastSaved: lastSavedRef.current,
  };
};
