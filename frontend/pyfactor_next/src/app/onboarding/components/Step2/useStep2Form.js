// /src/app/onboarding/components/Step2/useStep2Form.js

import { useEffect, useCallback, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import debounce from 'lodash/debounce';

import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useFormStatePersistence } from '@/hooks/useFormStatePersistence';
import { persistenceService } from '@/services/persistenceService';
import { logger } from '@/utils/logger';

// We define our validation schema with clear error messages and proper validation rules
const validationSchema = z.object({
    selectedPlan: z.enum(['Basic', 'Professional'], {
        required_error: 'Please select a plan',
        invalid_type_error: 'Invalid plan selected'
    }),
    billingCycle: z.enum(['monthly', 'annual'], {
        required_error: 'Please select a billing cycle',
        invalid_type_error: 'Invalid billing cycle selected'
    })
}).refine(data => {
    // We can add custom validation logic here if needed
    // For example, validating specific plan and billing cycle combinations
    return true;
}, {
    message: 'Form validation failed',
    path: ['form']
});

// We define default form values to ensure consistency
const defaultFormValues = {
    selectedPlan: '',
    billingCycle: 'monthly'
};

export const useStep2Form = (savedFormData) => {
    // Initialize state with proper default values
    const [isInitialized, setIsInitialized] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const lastSavedRef = useRef(null);
    const timeoutRef = useRef(null);

    // Initialize form persistence hooks
    const { handleFieldChange, loadSavedData } = useFormPersistence('step2-form');

    const { form: formRef, saveDraft, loadLatestDraft } = 
    useFormStatePersistence('step2-form', {
        autoSaveInterval: 30000,
        validateBeforeSave: true,
        onLoadDraft: (draft) => {
            if (draft) {
                logger.info('Loaded form draft:', {
                    timestamp: draft.timestamp,
                    data: draft.data
                });
            }
        }
    });

    // Initialize form with proper configuration
    const methods = useForm({
        resolver: zodResolver(validationSchema),
        defaultValues: savedFormData || defaultFormValues,
        mode: 'onChange',
        reValidateMode: 'onChange'
    });

    // Create a debounced save function with proper error handling
    const debouncedSave = useCallback(
        debounce(async (data) => {
            if (!data || !Object.keys(data).some(key => Boolean(data[key]))) {
                return;
            }

            try {
                await saveDraft(data);
                lastSavedRef.current = new Date().toISOString();
            } catch (error) {
                logger.error('Failed to save draft:', error);
                
                // Implement backup save mechanism
                try {
                    const backupKey = `step2_form_backup_${Date.now()}`;
                    localStorage.setItem(backupKey, JSON.stringify({
                        data,
                        timestamp: Date.now()
                    }));
                    logger.info('Created backup save:', { backupKey });
                } catch (backupError) {
                    logger.error('Backup save failed:', backupError);
                }
            }
        }, 1000),
        [saveDraft]
    );

    // Implement form reset with proper cleanup
    const resetForm = useCallback(async () => {
        try {
            methods.reset(defaultFormValues);
            await persistenceService.clearData('step2-form_drafts');
            lastSavedRef.current = null;
            logger.info('Form reset completed');
        } catch (error) {
            logger.error('Form reset failed:', error);
        }
    }, [methods]);

    // Create initialization object with proper error handling
    const initialization = {
        isInitializing: !isInitialized,
        isInitialized,
        error: null,
        reset: useCallback(async () => {
            try {
                await Promise.race([
                    resetForm(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Reset timeout')), 3000)
                    )
                ]);
                setIsInitialized(true);
            } catch (error) {
                logger.error('Initialization reset failed:', error);
                throw error;
            }
        }, [resetForm])
    };

    // Handle form field changes with proper validation
    const handleChange = useCallback(async (name, value) => {
        try {
            if (!name || value === undefined) {
                logger.warn('Invalid field update attempt:', { name, value });
                return;
            }

            const validation = validationSchema.shape[name];
            if (validation) {
                const validationResult = await validation.safeParseAsync(value);
                if (!validationResult.success) {
                    logger.warn('Field validation failed:', {
                        field: name,
                        value,
                        errors: validationResult.error
                    });
                    return;
                }
            }

            methods.setValue(name, value, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true
            });
            
            handleFieldChange(name, value, methods);
            lastSavedRef.current = new Date().toISOString();
        } catch (error) {
            logger.error(`Failed to handle change for field ${name}:`, error);
            methods.setValue(name, methods.getValues()[name]);
        }
    }, [methods, handleFieldChange]);

    // Implement form validation with proper error handling
    const validateForm = useCallback(async () => {
        try {
            const formData = methods.getValues();
            
            logger.debug('Starting form validation:', {
                currentValues: formData,
                selectedPlan: formData.selectedPlan,
                billingCycle: formData.billingCycle
            });
    
            // First validate with form methods
            const isValid = await methods.trigger();
            
            if (!isValid) {
                logger.warn('Form validation failed:', {
                    errors: methods.formState.errors,
                    formData
                });
                return false;
            }
    
            // Then validate data structure
            if (!formData.selectedPlan || !formData.billingCycle) {
                logger.error('Invalid form data structure:', formData);
                return false;
            }
    
            return true;
        } catch (error) {
            logger.error('Form validation error:', {
                error,
                formState: methods.formState
            });
            return false;
        }
    }, [methods]);

    // Add initialization effect
    useEffect(() => {
        const initializeForm = async () => {
            try {
                if (!isInitialized) {
                    const draft = await loadLatestDraft();
                    
                    if (draft?.data) {
                        const validationResult = await validationSchema.safeParseAsync(draft.data);
                        
                        if (validationResult.success) {
                            methods.reset(validationResult.data);
                        } else {
                            methods.reset(defaultFormValues);
                            logger.warn('Invalid draft data, using defaults');
                        }
                    }
                    
                    setIsInitialized(true);
                }
            } catch (error) {
                logger.error('Form initialization failed:', error);
                methods.reset(defaultFormValues);
                setIsInitialized(true);
            }
        };

        initializeForm();
    }, [loadLatestDraft, methods, isInitialized]);

    // Add auto-save effect
    useEffect(() => {
        const subscription = methods.watch((formData) => {
            if (Object.keys(formData).some(key => formData[key])) {
                debouncedSave(formData);
            }
        });

        return () => {
            debouncedSave.cancel();
            if (subscription?.unsubscribe) {
                subscription.unsubscribe();
            }
        };
    }, [methods, debouncedSave]);

    // Add cleanup effect
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            if (methods.formState.isDirty && !isSubmitting) {
                saveDraft(methods.getValues()).catch(error => {
                    logger.error('Cleanup save failed:', error);
                    
                    // Attempt local storage fallback
                    try {
                        localStorage.setItem(
                            'step2_form_backup',
                            JSON.stringify(methods.getValues())
                        );
                    } catch (fallbackError) {
                        logger.error('Fallback storage failed:', fallbackError);
                    }
                });
            }
        };
    }, [methods, saveDraft, isSubmitting]);

    // Return the form interface
    return {
        methods,
        handleChange,
        formRef,
        saveDraft,
        loadLatestDraft,
        validationSchema,
        resetForm,
        validateForm,
        initialization,
        isSubmitting,
        setIsSubmitting,
        lastSaved: lastSavedRef.current,
        isDirty: methods.formState.isDirty,
        isValid: methods.formState.isValid,
        errors: methods.formState.errors
    };
};