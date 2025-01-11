// src/app/onboarding/hooks/useOnboardingForm.js
import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useFormStatePersistence } from '@/hooks/useFormStatePersistence';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import { OnboardingStateManager } from '/state/OnboardingStateManager';
import { ValidationManager } from '/validation/ValidationManager';
import { generateRequestId } from '@/lib/authUtils';
import { useCleanup } from '@/hooks/useCleanup';
import { 
    validateStep,
    canTransitionToStep, 
    validateTierAccess,
    STEP_PROGRESSION,
    VALIDATION_DIRECTION 
  } from '@/app/onboarding/components/registry';

export const useOnboardingForm = (step, options = {}) => {
  const {
    onLoadDraft,
    onSaveDraft,
    validateBeforeSave = true,
    autoSaveInterval = 30000,
    validationConfig = {}
  } = options;

  // Hooks
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();
  const { addCleanup } = useCleanup();

  // Refs for managers and state
  const managersRef = useRef({
    state: null,
    validation: null
  });

  // Initialize state tracking
  const [formState, setFormState] = useState({
    isInitialized: false,
    isLoading: true,
    error: null,
    lastSaved: null
  });

  // Initialize managers if not already created
  if (!managersRef.current.state) {
    managersRef.current.state = new OnboardingStateManager(`onboarding_${step}`);
    managersRef.current.validation = new ValidationManager();
    
    logger.debug('Managers initialized', {
      step,
      timestamp: Date.now()
    });
  }

  // Form hook configuration
  const methods = useForm({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    ...options.formConfig
  });

  // Setup form persistence
  const {
    saveDraft: saveFormDraft,
    loadLatestDraft,
    formState: persistenceState
  } = useFormStatePersistence(`onboarding_${step}`, {
    stateManager: managersRef.current.state,
    validationManager: managersRef.current.validation,
    form: methods,
    onLoadDraft,
    onSaveDraft,
    autoSaveInterval
  });

  // Handle form field changes
  const handleSubmit = useCallback(async (data) => {
    let toastId;
    
    try {
      setIsLoading(true);
      toastId = toast.loading('Saving your information...');
  
      logger.debug('Starting form submission:', {
        step,
        requestId,
        data
      });
  
      // Validate step transition
      const nextStep = STEP_PROGRESSION[step]?.next[0];
      if (!nextStep) {
        throw new Error('Invalid step configuration');
      }
  
      // Step validation
      const validationResult = validateStep(step, data);
      if (!validationResult.valid) {
        throw new Error(validationResult.message);
      }
  
      // Tier validation if needed
      if (data.selectedPlan) {
        const tierValidation = validateTierAccess(nextStep, data.selectedPlan);
        if (!tierValidation.valid) {
          throw new Error(tierValidation.message);
        }
      }
  
      // Get current session
      const currentSession = await getSession();
      if (!currentSession?.user?.accessToken) {
        throw new Error('Please sign in again to continue');
      }
  
      // Call the API route
      const response = await fetch(`/api/onboarding/${step}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.user.accessToken}`
        },
        body: JSON.stringify({
          ...data,
          requestId
        })
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to save ${step} information`);
      }
  
      const result = await response.json();
      logger.debug(`${step} info saved successfully:`, {
        requestId,
        result
      });
  
      // Clear draft data
      await persistenceService.clearData(`${step}-draft`);
  
      toast.update(toastId, {
        render: 'Information saved successfully',
        type: 'success',
        isLoading: false,
        autoClose: 2000
      });
  
      // Navigate to next step
      logger.debug(`Navigating to ${nextStep}:`, { requestId });
      await router.push(`/onboarding/${nextStep}`);
  
    } catch (error) {
      logger.error('Form submission failed:', { 
        error: error.message,
        step,
        requestId 
      });
  
      if (error.message.includes('sign in')) {
        router.push(`/auth/signin?callbackUrl=/onboarding/${step}`);
        return;
      }
  
      if (toastId) {
        toast.update(toastId, {
          render: error.message,
          type: 'error',
          isLoading: false,
          autoClose: 5000
        });
      }
  
    } finally {
      setIsLoading(false);
    }
  }, [router, toast, requestId, step, persistenceService]);

  const handleFieldChange = useCallback(async (name, value) => {
    try {
      // Update form field
      methods.setValue(name, value, {
        shouldValidate: false,
        shouldDirty: true
      });
  
      // Track change in state manager
      await managersRef.current.state.handleFieldChange(name, value, {
        source: 'user-input',
        timestamp: Date.now()
      });
  
      // Validate field
      if (validateBeforeSave) {
        // First use form validation
        const validationResult = await managersRef.current.validation.validateField(
          name, 
          value,
          methods.getValues()
        );
  
        if (!validationResult.isValid) {
          methods.setError(name, {
            type: 'validation',
            message: validationResult.error
          });
          return;
        }
  
        // Then use step validation if it's a key field
        if (name === 'selectedPlan') {
          const tierValidation = validateTierAccess(step, value);
          if (!tierValidation.valid) {
            methods.setError(name, {
              type: 'validation',
              message: tierValidation.message
            });
          }
        }
      }
  
    } catch (error) {
      logger.error('Field change failed:', {
        step,
        field: name,
        error: error.message
      });
      toast.error('Failed to update field');
    }
  }, [methods, validateBeforeSave, toast, step]);

  // Load saved data on mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedData = await loadLatestDraft();
        if (savedData) {
          methods.reset(savedData);
        }
        
        setFormState(prev => ({
          ...prev,
          isInitialized: true,
          isLoading: false
        }));

      } catch (error) {
        logger.error('Failed to load saved data:', {
          step,
          error: error.message
        });
        
        setFormState(prev => ({
          ...prev,
          error: error.message,
          isLoading: false
        }));
      }
    };

    loadSavedData();
  }, [step, loadLatestDraft, methods]);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = managersRef.current.state.subscribe((state, event) => {
      setFormState(prev => ({
        ...prev,
        lastSaved: state.onboarding.stepData.get(step)?.timestamp || prev.lastSaved
      }));

      if (event.type === 'error') {
        toast.error(event.error.message);
      }
    });

    return unsubscribe;
  }, [step, toast]);

  // Cleanup on unmount
  useEffect(() => {
    addCleanup(() => {
      managersRef.current.state?.cleanup();
      managersRef.current.validation?.cleanup();
      managersRef.current = null;
    });
  }, [addCleanup]);

  // Return memoized API
  return useMemo(() => ({
    // Form methods
    methods,
    handleSubmit,
    handleFieldChange,
    
    // State
    formState: {
      ...formState,
      ...persistenceState,
      isDirty: methods.formState.isDirty,
      isValid: methods.formState.isValid,
      errors: methods.formState.errors
    },

    // Progress
    progress: managersRef.current.state.getProgress(),
    
    // Data management
    saveFormData: saveFormDraft,
    loadFormData: loadLatestDraft,
    
    // Validation
    validateField: managersRef.current.validation.validateField,
    validateForm: managersRef.current.validation.validateForm,
    
    // Utils
    reset: methods.reset,
    getValues: methods.getValues,
    setError: methods.setError,
    clearErrors: methods.clearErrors,
    
    // Managers (for advanced use cases)
    stateManager: managersRef.current.state,
    validationManager: managersRef.current.validation

  }), [
    methods,
    handleSubmit,
    handleFieldChange,
    formState,
    persistenceState,
    saveFormDraft,
    loadLatestDraft
  ]);
};