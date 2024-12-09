// useStep1Form.js
import { useEffect, useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useFormStatePersistence } from '@/hooks/useFormStatePersistence';
import { persistenceService } from '@/services/persistenceService';
import { logger } from '@/utils/logger';

// Form validation schema
const validationSchema = z.object({
    businessName: z.string()
      .min(1, 'Business name is required')
      .max(100, 'Business name cannot exceed 100 characters')
      .trim(),
    industry: z.string()
      .min(1, 'Industry is required')
      .trim(),
    country: z.string()
      .min(2, 'Country is required')
      .trim(),
    legalStructure: z.string()
      .min(1, 'Legal structure is required')
      .trim(),
    dateFounded: z.string()
      .min(1, 'Date founded is required')
      .refine(date => {
        const parsedDate = Date.parse(date);
        const now = Date.now();
        return !isNaN(parsedDate) && parsedDate <= now && parsedDate > new Date('1800-01-01').getTime();
      }, { message: 'Please enter a valid date between 1800 and today' }),
    firstName: z.string()
      .min(1, 'First name is required')
      .max(50, 'First name cannot exceed 50 characters')
      .trim()
      .regex(/^[a-zA-Z\s-']+$/, 'First name can only contain letters, spaces, hyphens and apostrophes'),
    lastName: z.string()
      .min(1, 'Last name is required')
      .max(50, 'Last name cannot exceed 50 characters')
      .trim()
      .regex(/^[a-zA-Z\s-']+$/, 'Last name can only contain letters, spaces, hyphens and apostrophes')
}).required();

// Default form values
export const defaultValues = {
    businessName: '',
    industry: '',
    country: '',
    legalStructure: '',
    dateFounded: new Date().toISOString().split('T')[0],
    firstName: '',
    lastName: ''
  };

  export const useStep1Form = (savedFormData) => {
    const formRef = useRef(null);
    const lastSavedRef = useRef(null);
    const autoSaveTimeoutRef = useRef(null);
    const isSubmittingRef = useRef(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const initialization = {
        isInitializing: !isInitialized,
        isInitialized,
        error: null,
        reset: useCallback(async () => {
            try {
                await resetForm();
                setIsInitialized(true);
            } catch (error) {
                logger.error('Initialization reset failed:', error);
                throw error;
            }
        }, [resetForm])
    };
    // Initialize form with react-hook-form
    const methods = useForm({
      resolver: zodResolver(validationSchema),
      defaultValues: {
        ...defaultValues,
        ...savedFormData
      },
      mode: 'onChange',
      criteriaMode: 'all',
      shouldUnregister: false
    });

    // Add initialization effect
    useEffect(() => {
        const initializeForm = async () => {
            try {
                const draft = await loadLatestDraft();
                if (draft) {
                    methods.reset(draft);
                }
                setIsInitialized(true);
            } catch (error) {
                logger.error('Form initialization failed:', error);
                setIsInitialized(true); // Still set initialized to prevent hanging
            }
        };

        initializeForm();
    }, [loadLatestDraft, methods]);


  
    // Form persistence hooks
    const {
      handleFieldChange,
      loadSavedData
    } = useFormPersistence('step1-form');
  

    const {
        saveDraft: saveFormDraft,
        loadLatestDraft: loadFormDraft
      } = useFormStatePersistence('step1-form', {
        autoSaveInterval: 30000,
        validateBeforeSave: true,
        form: methods,
        onLoadDraft: (draft) => {
          if (draft?.data) {
            logger.info('Loaded form draft:', { 
              timestamp: draft.timestamp,
              fields: Object.keys(draft.data)
            });
            lastSavedRef.current = draft.timestamp;
          }
        },
        onSaveDraft: (draft) => {
          if (draft?.data) {
            logger.info('Saved form draft:', { 
              timestamp: draft.timestamp,
              fields: Object.keys(draft.data)
            });
            lastSavedRef.current = draft.timestamp;
          }
        }
      });

  // Handle field changes with debounce
  const handleChange = useCallback((name, value) => {
    try {
      if (!name || value === undefined) {
        logger.warn('Invalid field change:', { name, value });
        return;
      }

      methods.setValue(name, value, { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
      
      // Debounced field change handler
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        handleFieldChange(name, value, methods);
      }, 500);

    } catch (error) {
      logger.error(`Failed to handle change for field ${name}:`, error);
    }
  }, [methods, handleFieldChange]);

  // Save form draft
  const saveDraft = useCallback(async (data) => {
    try {
      if (!data || Object.keys(data).length === 0) {
        logger.warn('Attempted to save empty form data');
        return null;
      }

      const draft = await saveFormDraft(data);
      lastSavedRef.current = draft?.timestamp;
      return draft;
    } catch (error) {
      logger.error('Failed to save draft:', error);
      throw error;
    }
  }, [saveFormDraft]);

  // Load latest draft
  const loadLatestDraft = useCallback(async () => {
    try {
      const draft = await loadFormDraft();
      if (draft?.data) {
        Object.entries(draft.data).forEach(([key, value]) => {
          methods.setValue(key, value, { 
            shouldValidate: true 
          });
        });
        lastSavedRef.current = draft.timestamp;
      }
      return draft?.data;
    } catch (error) {
      logger.error('Failed to load draft:', error);
      return null;
    }
  }, [loadFormDraft, methods]);

  // Reset form
  const resetForm = useCallback(async () => {
    try {
      methods.reset(defaultFormValues);
      await persistenceService.clearData('step1-form_drafts');
      lastSavedRef.current = null;
    } catch (error) {
      logger.error('Failed to reset form:', error);
    }
  }, [methods]);

  // Validate form
  const validateForm = useCallback(async () => {
    try {
      const isValid = await methods.trigger();
      if (!isValid) {
        const errors = methods.formState.errors;
        logger.warn('Form validation failed:', errors);
      }
      return isValid;
    } catch (error) {
      logger.error('Form validation error:', error);
      return false;
    }
  }, [methods]);

  // Auto-save effect
  useEffect(() => {
    try {
      const subscription = methods.watch((formData) => {
        if (Object.keys(formData).some(key => formData[key])) {
          saveDraft(formData).catch(error => {
            logger.error('Auto-save failed:', error);
          });
        }
      });

      return () => {
        subscription?.unsubscribe?.();
      };
    } catch (error) {
      logger.error('Failed to setup form watch:', error);
    }
  }, [methods, saveDraft]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      try {
        if (methods.formState.isDirty) {
          saveDraft(methods.getValues()).catch(error => {
            logger.error('Form cleanup failed:', error);
          });
        }
      } catch (error) {
        logger.error('Form cleanup error:', error);
      }
    };
  }, [methods, saveDraft]);

  // Add cleanup for debounce timeout
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const hasUnsavedChanges = useCallback(() => {
    return methods.formState.isDirty && !isSubmittingRef.current;
  }, [methods.formState.isDirty]);

  // Get form errors summary
  const getErrorsSummary = useCallback(() => {
    const errors = methods.formState.errors;
    return Object.keys(errors).reduce((acc, key) => {
      acc[key] = errors[key]?.message || 'Invalid field';
      return acc;
    }, {});
  }, [methods.formState.errors]);

  // Add a submit handler
  const handleSubmit = useCallback(async (data) => {
    try {
        if (!isInitialized) {
            throw new Error('Form not initialized');
        }

        isSubmittingRef.current = true;
        
        // Validate form
        const isValid = await validateForm();
        if (!isValid) {
            const errors = getErrorsSummary();
            throw new Error(Object.values(errors)[0] || 'Please fill in all required fields');
        }

        const formData = methods.getValues();
        
        // Format data before submission
        const submissionData = {
            businessName: formData.businessName,
            industry: formData.industry,
            country: formData.country,
            legalStructure: formData.legalStructure,
            dateFounded: formData.dateFounded,
            firstName: formData.firstName,
            lastName: formData.lastName
        };

        return submissionData;
    } catch (error) {
        logger.error('Form submission failed:', error);
        throw error;
    } finally {
        isSubmittingRef.current = false;
    }
}, [methods, validateForm, getErrorsSummary, isInitialized]);
  
  // Add handleSubmit to the return object
  return {
    methods,
    formRef,
    handleChange,
    handleSubmit,
    saveDraft,
    loadLatestDraft,
    validationSchema,
    resetForm,
    validateForm,
    lastSaved: lastSavedRef.current,
    isValid: methods.formState.isValid,
    isDirty: methods.formState.isDirty,
    errors: methods.formState.errors,
    hasUnsavedChanges,
    getErrorsSummary,
    isSubmitting: isSubmittingRef.current,
    initialization, // Add this
    defaultValues // Add this
};
}