///Users/kuoldeng/projectx/frontend/pyfactor_next/src/hooks/useOnboardingProgress.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { persistenceService } from '@/services/persistenceService';
import { logger } from '@/utils/logger';
import { validateUserState } from '@/lib/authUtils';
import { RoutingManager } from '@/lib/routingManager';

export const useOnboardingProgress = (step, options = {}) => {
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

  // Ensure data structure is maintained
  const formData = useMemo(
    () => ({
      ...storeFormData,
      ...localFormData,
      tier: selected_plan // Include tier
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
          const next_step = RoutingManager.getnext_step('subscription', data.selected_plan);
          data.next_step = next_step;
        }

        // Save to backend first
        const result = await saveStep(step, {
          ...data,
          tier: data.selected_plan || selected_plan
        });

        // Then save locally only if backend succeeds
        if (result) {
          await persistenceService.saveData(`onboarding_${step}`, {
            timestamp: Date.now(),
            data: {
              ...data,
              tier: data.selected_plan || selected_plan
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
          tier: selected_plan
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
              tier: selected_plan
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