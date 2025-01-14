///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/BusinessInfo/useBusinessInfoForm.js
import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, getSession } from 'next-auth/react';
import { useToast } from '@/components/Toast/ToastProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import debounce from 'lodash/debounce';
import { logger } from '@/utils/logger';
import { businessInfoDefaultValues, businessInfoValidation } from './BusinessInfo.types';
import { 
  validateStep,
  canTransitionToStep, 
  validateTierAccess,
  STEP_PROGRESSION,
  VALIDATION_DIRECTION 
} from '@/app/onboarding/components/registry';

import { 
  validateUserState, 
  handleAuthError, 
  generateRequestId,
  validateOnboardingStep,
  makeRequest 
} from '@/lib/authUtils';
import { persistenceService } from '@/services/persistenceService';

// Validation schema
const validationSchema = z.object({
  businessName: z
    .string()
    .min(1, 'Business name is required')
    .max(100, 'Business name cannot exceed 100 characters'),
  industry: z
    .string()
    .min(1, 'Industry is required'),
  country: z
    .string()
    .min(1, 'Country is required'),
  legalStructure: z
    .string()
    .min(1, 'Legal structure is required'),
  dateFounded: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters')
}).required();

export const useBusinessInfoForm = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [requestId] = useState(() => generateRequestId());
  const lastSavedRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);


  // Initialize form
  const methods = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: businessInfoDefaultValues,
    mode: 'onChange',
    reValidateMode: 'onChange'
  });

   // Log form initialization
   useEffect(() => {
    logger.debug('Form initialized with defaults:', {
      requestId,
      defaultValues: businessInfoDefaultValues,
      currentValues: methods.getValues()
    });
  }, [requestId, methods]);

   // Add form state logging effect
   useEffect(() => {
    logger.debug('Form state updated:', {
      isValid: methods.formState.isValid,
      errors: methods.formState.errors,
      values: methods.getValues()
    });
  }, [methods.formState]);

  // Add loadDraftData here
  const loadDraftData = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      const draft = await persistenceService.getData('business-info-draft');
      if (draft && Object.keys(draft).length > 0) {
        methods.reset(draft);
        logger.debug('Loaded draft data:', {
          requestId,
          timestamp: draft.timestamp
        });
      }
      setIsInitialized(true);
    } catch (error) {
      logger.error('Failed to load draft:', {
        error: error.message,
        requestId
      });
    }
  }, [methods, requestId, isInitialized]);
 

  // Create debounced save function
  const debouncedSave = useCallback(
    debounce(async (data) => {
      try {
        const validationResult = await validateOnboardingStep(
          session, 
          'business-info', 
          data, 
          requestId
        );
        
        if (!validationResult.isValid) {
          throw new Error(validationResult.reason);
        }

        await persistenceService.saveData('business-info-draft', {
          ...validationResult.data,
          timestamp: Date.now()
        });

        lastSavedRef.current = new Date().toISOString();
      } catch (error) {
        const errorResult = handleAuthError(error);
        logger.error('Failed to save draft:', { 
          error: errorResult, 
          requestId 
        });
      }
    }, 1000),
    [session, requestId]
  );

 

  const handleChange = useCallback(async (name, value) => {
    try {
      if (!name || value === undefined) {
        logger.warn('Invalid field update attempt:', { name, value, requestId });
        return;
      }
  
      // Set form value
      methods.setValue(name, value, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
  
      // Save draft
      const currentValues = methods.getValues();
      await persistenceService.saveData('business-info-draft', {
        ...currentValues,
        timestamp: Date.now()
      });
  
      logger.debug('Saved form draft:', {
        field: name,
        requestId
      });
  
    } catch (error) {
      logger.error('Failed to save draft:', {
        error: error.message,
        field: name,
        requestId
      });
    }
  }, [methods, requestId]);
  
// useBusinessInfoForm.js
// In useBusinessInfoForm.js
const handleSubmit = useCallback(async (data) => {
  let toastId;
  const currentSession = await getSession();  // Get fresh session
  
  logger.debug('Starting form submission:', {
    requestId,
    hasData: !!data,
    hasSession: !!currentSession
  });
  
  try {
    setIsLoading(true);
    toastId = toast.loading('Saving your information...');

    // Verify session
    if (!currentSession?.user?.accessToken) {
      throw new Error('Please sign in again to continue');
    }

    const response = await fetch('/api/onboarding/save-business-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentSession.user.accessToken}`,
        'X-Request-ID': requestId
      },
      body: JSON.stringify({
        ...data,
        requestId
      })
    });

    logger.debug('API response received:', {
      requestId,
      status: response.status,
      ok: response.ok
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Please sign in again to continue');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save business information');
    }

    const result = await response.json();
    await persistenceService.clearData('business-info-draft');
    toast.success('Information saved successfully');

    return result;

  } catch (error) {
    logger.error('Form submission error:', {
      requestId,
      error: error.message,
      status: error.response?.status
    });
    throw error;
  } finally {
    setIsLoading(false);
    if (toastId) {
      toast.dismiss(toastId);
    }
  }
}, [requestId, toast]);


// Update cleanup effect
useEffect(() => {
  return () => {
    debouncedSave.cancel();
    
    if (methods.formState.isDirty) {
      const currentValues = methods.getValues();
      persistenceService.saveData('business-info-draft', {
        ...currentValues,
        timestamp: Date.now()
      }).catch(error => {
        logger.error('Cleanup save failed:', {
          error: error.message,
          requestId
        });
      });
    }
  };
}, [methods, debouncedSave, requestId]);

  return {
    methods,
    handleChange,
    handleSubmit,
    isLoading,
    lastSaved: lastSavedRef.current,
    requestId,
    loadDraftData  // Add this
  };

}