// src/hooks/useFormPersistence.js
import { useCallback } from 'react';
import { logger } from '@/utils/logger';
import { persistenceService } from '@/services/persistenceService';

export const useFormPersistence = (formKey) => {
  const handleFieldChange = useCallback((name, value, methods) => {
    try {
      const formData = methods.getValues();
      persistenceService.saveData(`${formKey}_fields`, {
        ...formData,
        [name]: value
      });
    } catch (error) {
      logger.error(`Failed to persist field ${name}:`, error);
    }
  }, [formKey]);

  const loadSavedData = useCallback(() => {
    try {
      return persistenceService.loadData(`${formKey}_fields`);
    } catch (error) {
      logger.error('Failed to load saved data:', error);
      return null;
    }
  }, [formKey]);

  return {
    handleFieldChange,
    loadSavedData
  };
};