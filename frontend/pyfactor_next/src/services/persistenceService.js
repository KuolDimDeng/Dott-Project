// src/services/persistenceService.js
import { logger } from '@/utils/logger';

const STORAGE_KEYS = {
  ONBOARDING: 'onboarding_data',
  PROGRESS: 'onboarding_progress',
  VERSION: '1.0',
};

export const persistenceService = {
  saveData: async (key, data) => {
    try {
      const storageData = {
        version: STORAGE_KEYS.VERSION,
        timestamp: Date.now(),
        data,
      };
      localStorage.setItem(key, JSON.stringify(storageData));
      logger.debug(`Data persisted for ${key}`, storageData);
    } catch (error) {
      logger.error(`Failed to persist data for ${key}:`, error);
      throw error;
    }
  },

  loadData: async (key) => {
    try {
      const savedData = localStorage.getItem(key);
      if (!savedData) return null;

      const parsed = JSON.parse(savedData);
      if (parsed.version !== STORAGE_KEYS.VERSION) {
        logger.warn(`Version mismatch for ${key}, clearing data`);
        localStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      logger.error(`Failed to load data for ${key}:`, error);
      return null;
    }
  },

  clearData: async (key) => {
    try {
      if (key instanceof RegExp) {
        // Handle regex pattern matching for keys
        const keys = this.getAllKeys();
        keys.forEach((storageKey) => {
          if (key.test(storageKey)) {
            localStorage.removeItem(storageKey);
            logger.debug(`Cleared data for ${storageKey}`);
          }
        });
      } else {
        localStorage.removeItem(key);
        logger.debug(`Cleared data for ${key}`);
      }
    } catch (error) {
      logger.error(`Failed to clear data for ${key}:`, error);
      throw error;
    }
  },

  getAllKeys: () => {
    try {
      return Object.keys(localStorage).filter(
        (key) =>
          key.startsWith('step') ||
          key.includes('_draft') ||
          key === STORAGE_KEYS.ONBOARDING ||
          key === STORAGE_KEYS.PROGRESS
      );
    } catch (error) {
      logger.error('Failed to get storage keys:', error);
      return [];
    }
  },

  // Optional: Add methods to handle data expiry
  isExpired: (timestamp) => {
    const ONE_DAY = 24 * 60 * 60 * 1000;
    return Date.now() - timestamp > ONE_DAY;
  },

  // Optional: Add method to clean all expired data
  cleanExpiredData: async () => {
    try {
      const keys = persistenceService.getAllKeys();
      for (const key of keys) {
        const data = await persistenceService.loadData(key);
        if (data?.timestamp && persistenceService.isExpired(data.timestamp)) {
          await persistenceService.clearData(key);
          logger.debug(`Cleaned expired data for ${key}`);
        }
      }
    } catch (error) {
      logger.error('Failed to clean expired data:', error);
    }
  },
};
