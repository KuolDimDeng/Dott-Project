// src/hooks/useFormStatePersistence.js
import { useEffect, useCallback, useRef } from 'react';
import { persistenceService } from '@/services/persistenceService';
import { logger } from '@/utils/logger';
import { useCleanup } from './useCleanup';

const DRAFT_VERSION = '1.0';

export const useFormStatePersistence = (formId, options = {}) => {
  const {
    autoSaveInterval = 30000,
    maxDrafts = 5,
    validateBeforeSave = true,
    onLoadDraft,
    onSaveDraft,
    form: formMethods, // Accept form methods from react-hook-form
  } = options;

  const form = useRef(formMethods);
  const lastSaved = useRef(null);
  const saveInProgress = useRef(false);
  const { addInterval, addEventListener, addCleanupFn } = useCleanup();

  // Update form methods ref when they change
  useEffect(() => {
    form.current = formMethods;
  }, [formMethods]);

  const saveDraft = useCallback(
    async (data) => {
      if (saveInProgress.current) {
        logger.debug('Save already in progress, skipping');
        return null;
      }

      if (!data || Object.keys(data).length === 0) {
        logger.warn('Attempted to save empty form data');
        return null;
      }

      saveInProgress.current = true;

      try {
        const drafts = (await persistenceService.loadData(`${formId}_drafts`)) || [];

        const newDraft = {
          version: DRAFT_VERSION,
          timestamp: Date.now(),
          data,
          formId,
          metadata: {
            lastModified: new Date().toISOString(),
            formId,
            version: DRAFT_VERSION,
          },
        };

        // Filter out old versions of this form's drafts
        const updatedDrafts = [newDraft, ...drafts]
          .filter((draft) => draft.formId === formId && draft.version === DRAFT_VERSION)
          .slice(0, maxDrafts);

        await persistenceService.saveData(`${formId}_drafts`, updatedDrafts);
        lastSaved.current = newDraft.timestamp;

        onSaveDraft?.(newDraft);
        logger.info(`Draft saved for form ${formId}`, { timestamp: newDraft.timestamp });

        return newDraft;
      } catch (error) {
        logger.error(`Failed to save draft for form ${formId}:`, error);
        throw error;
      } finally {
        saveInProgress.current = false;
      }
    },
    [formId, maxDrafts, onSaveDraft]
  );

  const loadLatestDraft = useCallback(async () => {
    try {
      const drafts = await persistenceService.loadData(`${formId}_drafts`);
      if (!drafts?.length) return null;

      // Find latest valid draft
      const latestDraft = drafts
        .filter((draft) => draft.formId === formId && draft.version === DRAFT_VERSION)
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      if (!latestDraft) return null;

      onLoadDraft?.(latestDraft);
      lastSaved.current = latestDraft.timestamp;
      logger.info(`Loaded latest draft for form ${formId}`, { timestamp: latestDraft.timestamp });

      return latestDraft.data;
    } catch (error) {
      logger.error(`Failed to load draft for form ${formId}:`, error);
      return null;
    }
  }, [formId, onLoadDraft]);

  // Setup autosave with debounce
  useEffect(() => {
    let timeoutId;

    const intervalId = addInterval(async () => {
      if (!form.current || saveInProgress.current) return;

      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          const currentValues = form.current.getValues();
          if (!currentValues || Object.keys(currentValues).length === 0) return;

          if (validateBeforeSave) {
            const isValid = await form.current.trigger();
            if (!isValid) {
              logger.debug('Form validation failed, skipping auto-save');
              return;
            }
          }

          await saveDraft(currentValues);
        } catch (error) {
          logger.error('Auto-save failed:', error);
        }
      }, 500); // Debounce auto-save
    }, autoSaveInterval);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [autoSaveInterval, saveDraft, validateBeforeSave, addInterval]);

  // Setup beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = async (e) => {
      if (!form.current?.formState?.isDirty) return;

      try {
        const currentValues = form.current.getValues();
        if (currentValues && Object.keys(currentValues).length > 0) {
          await saveDraft(currentValues);
          e.preventDefault();
          e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
      } catch (error) {
        logger.error('Failed to save form before unload:', error);
      }
    };

    addEventListener(window, 'beforeunload', handleBeforeUnload);
  }, [saveDraft, addEventListener]);

  // Cleanup
  useEffect(() => {
    addCleanupFn(() => {
      form.current = null;
      lastSaved.current = null;
      saveInProgress.current = false;
    });
  }, [addCleanupFn]);

  return {
    form,
    lastSaved: lastSaved.current,
    saveDraft,
    loadLatestDraft,
    isSaving: saveInProgress.current,
  };
};
