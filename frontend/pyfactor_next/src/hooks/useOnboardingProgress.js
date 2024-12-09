// hooks/useOnboardingProgress.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { persistenceService } from '@/services/persistenceService';
import { logger } from '@/utils/logger';

export const useOnboardingProgress = (step, options = {}) => {
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

  // Important: Ensure data structure is maintained
  const formData = useMemo(() => ({
    ...storeFormData,
    ...localFormData
  }), [storeFormData, localFormData]);

  useEffect(() => {
    const loadSavedProgress = async () => {
      try {
        const saved = await persistenceService.loadData(`onboarding_${step}`);
        if (saved?.data) {
          setLocalFormData(saved.data);
          setLastSaved(saved.timestamp);
        }
      } catch (error) {
        logger.error(`Failed to load progress for ${step}:`, error);
      }
    };

    loadSavedProgress();
  }, [step]);

  // Key improvement: Better data handling in saveProgress
  const saveProgress = useCallback(async (data) => {
    if (saving) {
      logger.debug('Save already in progress, skipping');
      return;
    }

    try {
      setSaving(true);
      logger.debug('Saving progress locally:', {
        step,
        data: data
      });

      // First save locally
      await persistenceService.saveData(`onboarding_${step}`, {
        timestamp: Date.now(),
        data: data
      });

      // Create backup
      await persistenceService.saveData(`onboarding_${step}_backup`, {
        timestamp: Date.now(),
        data: data
      });

      setLocalFormData(data);
      setLastSaved(Date.now());

      // Then save to backend with the complete data object
      logger.debug('Saving to backend:', {
        step,
        data: data
      });

      const result = await saveStep(step, data);
      return result;

    } catch (error) {
      logger.error(`Failed to save progress for ${step}:`, error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [step, saving, saveStep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localFormData && !saving) {
        persistenceService.saveData(`onboarding_${step}_cleanup`, {
          timestamp: Date.now(),
          data: localFormData
        }).catch(error => {
          logger.error('Cleanup save failed:', error);
        });
      }
    };
  }, [step, localFormData, saving]);

  return {
    formData,
    localFormData,
    storeFormData,
    lastSaved,
    saving: saving || storeLoading,
    error: storeError,
    saveProgress,
    ...otherStoreProps
  };
};