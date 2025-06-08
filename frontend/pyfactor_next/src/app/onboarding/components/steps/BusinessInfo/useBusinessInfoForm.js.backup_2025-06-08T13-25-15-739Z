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
  // Add the new businessState field
  business_state: z.string().min(1, 'State/Region is required'),
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
      business_state: '', // Added this field
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

        // Validate session first
        const { tokens } = await fetchAuthSession();
        if (!tokens?.idToken) {
          throw new Error('Your session has expired. Please sign in again.');
        }

        logger.debug('Business info submission - initial state:', {
          operationId,
          currentStatus: session?.user?.onboarding,
          formData,
        });

        // Validate form data
        const validationResult = await methods.trigger();
        if (!validationResult) {
          throw new Error('Please check all required fields and try again');
        }

        // Save business info
        const saveResponse = await onboardingApi.submitBusinessInfo({
          ...formData,
          operation_id: operationId,
        });

        if (!saveResponse?.success) {
          const errorData = saveResponse?.error || {};
          logger.error('Business info save failed:', {
            operationId,
            error: errorData,
            response: saveResponse
          });
          
          // Handle specific error cases
          if (errorData.code === 'authentication_error') {
            throw new Error('Your session has expired. Please sign in again.');
          } else if (errorData.tenant_error) {
            throw new Error('There was an issue with your account configuration. Please contact support.');
          } else if (errorData.code === 'unknown_error') {
            throw new Error('An unexpected error occurred. Our team has been notified.');
          }
          
          throw new Error(errorData.error || 'Failed to save business information');
        }

        // Update onboarding status
        const statusResponse = await onboardingApi.updateStatus({
          current_step: 'business-info',
          next_step: 'subscription',
          form_data: formData,
          operation_id: operationId,
        });

        if (!statusResponse?.success) {
          const errorData = statusResponse?.error || {};
          logger.error('Status update failed:', {
            operationId,
            error: errorData,
            response: statusResponse
          });

          // Handle specific error cases
          if (errorData.code === 'authentication_error') {
            throw new Error('Your session has expired. Please sign in again.');
          } else if (errorData.tenant_error) {
            throw new Error('There was an issue with your account configuration. Please contact support.');
          }
          
          throw new Error(errorData.error || 'Failed to update status');
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
          error: {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            data: error.data,
            stack: error.stack,
            name: error.name,
            code: error.code
          },
          formData: methods.getValues()
        });

        if (toastId) {
          toast.dismiss(toastId);
          
          // Handle specific error cases
          if (error.message.includes('session has expired')) {
            toast.error('Your session has expired. Please sign in again.');
            await signOut();
            router.push('/auth/signin');
          } else if (error.status === 500) {
            toast.error('An unexpected error occurred. Our team has been notified.');
          } else if (error.data?.tenant_error) {
            toast.error('There was an issue with your account configuration. Please contact support.');
          } else {
            toast.error(error.message || 'Failed to save information');
          }
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
