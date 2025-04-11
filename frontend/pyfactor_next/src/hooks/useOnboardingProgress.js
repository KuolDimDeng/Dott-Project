///Users/kuoldeng/projectx/frontend/pyfactor_next/src/hooks/useOnboardingProgress.js
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { persistenceService } from '@/services/persistenceService';
import { logger } from '@/utils/logger';
import { RoutingManager } from '@/lib/routingManager';
import { axiosInstance } from '@/lib/axiosConfig';

/**
 * Hook for managing onboarding progress
 * Provides functions to track and update onboarding steps in Cognito
 */
export function useOnboardingProgress() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Define step enum values
  const STEPS = {
    NOT_STARTED: 'not_started',
    BUSINESS_INFO: 'business_info',
    SUBSCRIPTION: 'subscription',
    PAYMENT: 'payment',
    SETUP: 'setup',
    COMPLETE: 'complete'
  };

  // Define route mapping
  const ROUTES = {
    [STEPS.NOT_STARTED]: '/onboarding/business-info',
    [STEPS.BUSINESS_INFO]: '/onboarding/subscription',
    [STEPS.SUBSCRIPTION]: '/onboarding/payment',
    [STEPS.PAYMENT]: '/onboarding/setup',
    [STEPS.SETUP]: '/onboarding/complete',
    [STEPS.COMPLETE]: '/dashboard'
  };

  // Get current step from session
  const getCurrentStep = useCallback(() => {
    if (!session?.user) return STEPS.NOT_STARTED;
    
    const onboardingStep = session.user['custom:onboarding'];
    if (!onboardingStep) return STEPS.NOT_STARTED;
    
    // Convert to lowercase and normalize
    const normalizedStep = onboardingStep.toLowerCase();
    
    // Check if it's a valid step
    const isValidStep = Object.values(STEPS).includes(normalizedStep);
    return isValidStep ? normalizedStep : STEPS.NOT_STARTED;
  }, [session, STEPS]);

  // Update onboarding step in Cognito
  const updateOnboardingStep = async (step, additionalAttributes = {}) => {
    try {
      const isProd = process.env.NODE_ENV === 'production';
      logger.debug(`Updating onboarding step to ${step}`);
      
      // Set cookies first as backup
      updateOnboardingCookies(step);
      
      // Update Cognito user attributes directly - this is our primary method
      try {
        // Use direct Amplify import to avoid SSR issues
        const { updateUserAttributes } = await import('aws-amplify/auth');
        
        // Prepare attributes with onboarding status
        const attributes = {
          'custom:onboarding': step,
          'custom:updated_at': new Date().toISOString(),
          ...additionalAttributes
        };
        
        // Update attributes via Amplify - Fixed to use the correct format
        await updateUserAttributes({
          userAttributes: attributes
        });
        logger.debug(`Direct Amplify attribute update successful for ${step}`);
      } catch (amplifyError) {
        logger.error(`Error updating Cognito attributes: ${amplifyError.message || 'Unknown error'}`);
        // Continue trying API method as fallback
      }
      
      // API update as backup - can fail and we'll still proceed
      try {
        // Prepare the same data for API
        const payload = {
          step,
          timestamp: Date.now(),
          attributes: additionalAttributes
        };
        
        // Call API endpoint
        const response = await fetch('/api/onboarding/update-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        // Handle response
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        // Parse response data
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Unknown API error');
        }
      } catch (apiError) {
        logger.error(`API update error: ${apiError.message}`);
        logger.info('API update failed, but cookies are set. Proceeding with navigation.');
        // We'll continue despite API failures since we have cookie fallbacks
      }
      
      return true;
    } catch (error) {
      logger.error(`Error updating onboarding step: ${error.message}`);
      throw new Error('Failed to update onboarding step');
    }
  };

  // Navigate to a step and update Cognito
  const navigateToStep = useCallback(async (step) => {
    const normalizedStep = step.toLowerCase();
    
    if (!Object.values(STEPS).includes(normalizedStep)) {
      logger.error(`Invalid step: ${step}`);
      return false;
    }
    
    const updated = await updateOnboardingStep(normalizedStep);
    
    if (updated) {
      const route = ROUTES[normalizedStep];
      if (route) {
        router.push(route);
        return true;
      }
    }
    
    return false;
  }, [updateOnboardingStep, router, ROUTES, STEPS]);

  // Navigate to next step
  const goToNextStep = useCallback(async () => {
    const currentStep = getCurrentStep();
    
    // Map to next step
    const nextStepMap = {
      [STEPS.NOT_STARTED]: STEPS.BUSINESS_INFO,
      [STEPS.BUSINESS_INFO]: STEPS.SUBSCRIPTION,
      [STEPS.SUBSCRIPTION]: STEPS.PAYMENT,
      [STEPS.PAYMENT]: STEPS.SETUP,
      [STEPS.SETUP]: STEPS.COMPLETE,
      [STEPS.COMPLETE]: STEPS.COMPLETE // No next step after complete
    };
    
    const nextStep = nextStepMap[currentStep] || STEPS.BUSINESS_INFO;
    return navigateToStep(nextStep);
  }, [getCurrentStep, navigateToStep, STEPS]);

  // Check if a step is complete
  const isStepComplete = useCallback((step) => {
    const currentStep = getCurrentStep();
    
    // Define step order for comparison
    const stepOrder = [
      STEPS.NOT_STARTED,
      STEPS.BUSINESS_INFO,
      STEPS.SUBSCRIPTION,
      STEPS.PAYMENT,
      STEPS.SETUP,
      STEPS.COMPLETE
    ];
    
    const currentIndex = stepOrder.indexOf(currentStep);
    const checkIndex = stepOrder.indexOf(step.toLowerCase());
    
    // If current step is after the checked step, then the checked step is complete
    return currentIndex > checkIndex;
  }, [getCurrentStep, STEPS]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    return updateOnboardingStep(STEPS.COMPLETE, {
      'custom:setupdone': 'true',
      'custom:updated_at': new Date().toISOString()
    });
  }, [updateOnboardingStep, STEPS]);

  // Helper function to update cookies with onboarding step
  const updateOnboardingCookies = (step) => {
    if (typeof document === 'undefined') return;
    
    // Normalize step value to lowercase
    const normalizedStep = step.toLowerCase();
    
    // Set expiration date (7 days)
    const expiresDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiry = `; expires=${expiresDate.toUTCString()}; path=/; samesite=lax`;
    
    // Set cookies for onboarding state
    document.cookie = `onboardingStep=${normalizedStep}${expiry}`;
    document.cookie = `onboardedStatus=${normalizedStep}${expiry}`;
    
    // Also store in localStorage as additional backup
    try {
      localStorage.setItem('onboardingStep', normalizedStep);
      localStorage.setItem('onboardingStatus', normalizedStep);
    } catch (e) {
      // Ignore localStorage errors
    }
    
    logger.debug(`Onboarding cookies set to ${normalizedStep}`);
  };

  return {
    STEPS,
    ROUTES,
    getCurrentStep,
    updateOnboardingStep,
    navigateToStep,
    goToNextStep,
    isStepComplete,
    completeOnboarding,
    isUpdating,
    error
  };
}

export const useOnboardingProgressOld = (step, options = {}) => {
  const { data: session } = useSession();
  const router = useRouter();
  const {
    formData: storeFormData,
    loading: storeLoading,
    error: storeError,
    saveStep,
    ...otherStoreProps
  } = useOnboarding();

  const [localFormData, setLocalFormData] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [selected_plan, setselected_plan] = useState(null);

  // Implement a fallback validateUserState function since it's not exported from authUtils
  const validateUserState = async (session) => {
    try {
      // Basic session validation
      if (!session || !session.user) {
        logger.warn('No valid session found during validation');
        return {
          isValid: false,
          error: 'No valid session',
          redirectTo: '/auth/signin'
        };
      }

      // Check if user has necessary attributes
      if (!session.user.email) {
        logger.warn('User missing email attribute');
        return {
          isValid: false,
          error: 'Missing required user attributes',
          redirectTo: '/auth/verify-email'
        };
      }

      // Consider the session valid if basic checks pass
      return {
        isValid: true
      };
    } catch (error) {
      logger.error('Error validating user state:', error);
      return {
        isValid: false,
        error: 'Validation error',
        redirectTo: '/auth/signin'
      };
    }
  };

  // Ensure data structure is maintained
  const formData = useMemo(
    () => ({
      ...storeFormData,
      ...localFormData,
      tier: selected_plan, // Include tier
    }),
    [storeFormData, localFormData, selected_plan]
  );

  // Load saved progress and tier
  useEffect(() => {
    const loadSavedProgress = async () => {
      try {
        if (!session?.user) return;

        const saved = await persistenceService.loadData(`onboarding_${step}`);
        if (saved?.data) {
          setLocalFormData(saved.data);
          setLastSaved(saved.timestamp);

          // Set tier if it exists
          if (saved.data.selected_plan) {
            setselected_plan(saved.data.selected_plan);
          }
        }

        // Also check for separate tier data
        const tierData = await persistenceService.getCurrentTier();
        if (tierData) {
          setselected_plan(tierData);
        }
      } catch (error) {
        logger.error(`Failed to load progress for ${step}:`, error);
      }
    };

    loadSavedProgress();
  }, [step, session]);

  // Save progress with validation and tier handling
  const saveProgress = useCallback(
    async (data) => {
      if (saving) {
        logger.debug('Save already in progress, skipping');
        return;
      }

      if (!session?.user) {
        logger.warn('No session available for save');
        router.replace('/auth/signin');
        return;
      }

      try {
        setSaving(true);
        setValidationError(null);

        // Validate user state before saving
        const validationResult = await validateUserState(session);
        if (!validationResult.isValid) {
          logger.warn('Validation failed during save:', validationResult);
          setValidationError(validationResult);
          router.replace(validationResult.redirectTo);
          return;
        }

        // Handle tier selection for subscription step
        if (step === 'subscription' && data.selected_plan) {
          setselected_plan(data.selected_plan);

          // Get next step based on tier
          const next_step = RoutingManager.getnext_step(
            'subscription',
            data.selected_plan
          );
          data.next_step = next_step;
        }

        // Save to backend first
        const result = await saveStep(step, {
          ...data,
          tier: data.selected_plan || selected_plan,
        });

        // Then save locally only if backend succeeds
        if (result) {
          await persistenceService.saveData(`onboarding_${step}`, {
            timestamp: Date.now(),
            data: {
              ...data,
              tier: data.selected_plan || selected_plan,
            },
          });

          setLocalFormData(data);
          setLastSaved(Date.now());

          // If next step is provided in response, use it
          if (result.next_step) {
            router.push(`/onboarding/${result.next_step}`);
          }
        }

        return result;
      } catch (error) {
        logger.error(`Failed to save progress for ${step}:`, error, {
          tier: selected_plan,
        });
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [step, saving, saveStep, session, router, selected_plan]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localFormData && !saving) {
        persistenceService
          .saveData(`onboarding_${step}_cleanup`, {
            timestamp: Date.now(),
            data: {
              ...localFormData,
              tier: selected_plan,
            },
          })
          .catch((error) => {
            logger.error('Cleanup save failed:', error);
          });
      }
    };
  }, [step, localFormData, saving, selected_plan]);

  return {
    formData,
    localFormData,
    storeFormData,
    lastSaved,
    saving: saving || storeLoading,
    error: storeError || validationError,
    saveProgress,
    validationError,
    selected_plan,
    ...otherStoreProps,
  };
};
