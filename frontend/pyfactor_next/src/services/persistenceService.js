// src/services/persistenceService.js
import { logger } from '@/utils/logger';

export const STORAGE_KEYS = {
  VERSION: '1.0',
  DEFAULT_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  SUBSCRIPTION_DATA: 'subscription_data',
  TIER_DATA: 'tier_data',
  ONBOARDING_DATA: 'onboarding_data', // Add this
  BUSINESS_INFO_DRAFT: 'business-info-draft' // Add this
};

class PersistenceService {
  async getData(key) {
    try {
      const savedData = localStorage.getItem(key);
      logger.debug('Attempting to get data:', {
        key,
        hasData: !!savedData,
        type: 'persistence_get'
      });

      if (!savedData) {
        logger.debug('No data found for key', { 
          key,
          type: 'persistence_miss'
        });
        return null;
      }

      const parsed = JSON.parse(savedData);
      
      // Add detailed logging
      logger.debug('Retrieved data details:', {
        key,
        version: parsed.version,
        timestamp: new Date(parsed.timestamp).toISOString(),
        isExpired: Date.now() - parsed.timestamp > parsed.expiry,
        hasOnboardingStatus: !!parsed.data?.onboardingStatus,
        type: 'persistence_data'
      });

      // Version check
      if (parsed.version !== STORAGE_KEYS.VERSION) {
        logger.warn('Version mismatch detected', {
          key,
          foundVersion: parsed.version,
          expectedVersion: STORAGE_KEYS.VERSION,
          tier: parsed.data?.tier // Add tier logging
        });
        await this.clearData(key);
        return null;
      }

      // Expiry check
      if (Date.now() - parsed.timestamp > parsed.expiry) {
        logger.debug('Data expired', {
          key,
          timestamp: parsed.timestamp,
          expiry: parsed.expiry,
          tier: parsed.data?.tier // Add tier logging
        });
        await this.clearData(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      logger.error('Data retrieval failed:', {
        key,
        error: error.message,
        type: 'persistence_error'
      });
      return null;
    }
  }

  async saveData(key, data, options = {}) {
    try {
      logger.debug('Attempting to save data:', {
        key,
        hasData: !!data,
        dataType: typeof data,
        onboardingStatus: data?.onboardingStatus,
        type: 'persistence_save'
      });

      // Add validation for onboarding data
      if (key === STORAGE_KEYS.ONBOARDING_DATA) {
        if (!data.onboardingStatus) {
          throw new Error('Missing onboarding status');
        }
      }

      // Add validation for business info draft
      if (key === STORAGE_KEYS.BUSINESS_INFO_DRAFT) {
        logger.debug('Saving business info draft:', {
          hasFormData: !!data.formData,
          lastModified: new Date().toISOString(),
          type: 'business_info_save'
        });
      }

      const storageData = {
        version: STORAGE_KEYS.VERSION,
        timestamp: Date.now(),
        expiry: options.expiry || STORAGE_KEYS.DEFAULT_EXPIRY,
        data,
        metadata: {
          lastModified: new Date().toISOString(),
          ...options.metadata
        }
      };

      localStorage.setItem(key, JSON.stringify(storageData));

      logger.debug('Data successfully saved:', {
        key,
        timestamp: new Date(storageData.timestamp).toISOString(),
        type: 'persistence_success'
      });

      return true;
    } catch (error) {
      logger.error('Failed to save data:', {
        key,
        error: error.message,
        type: 'persistence_error'
      });
      return false;
    }
  }

  // Add method to manage onboarding state
  async getOnboardingState() {
    try {
      const onboardingData = await this.getData(STORAGE_KEYS.ONBOARDING_DATA);
      
      logger.debug('Retrieved onboarding state:', {
        hasData: !!onboardingData,
        status: onboardingData?.onboardingStatus,
        type: 'onboarding_get'
      });
      
      return onboardingData;
    } catch (error) {
      logger.error('Failed to get onboarding state:', {
        error: error.message,
        type: 'onboarding_error'
      });
      return null;
    }
  }

  // Add method to save onboarding state
  async saveOnboardingState(status) {
    try {
      logger.debug('Saving onboarding state:', {
        status,
        type: 'onboarding_save'
      });

      return await this.saveData(STORAGE_KEYS.ONBOARDING_DATA, {
        onboardingStatus: status,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to save onboarding state:', {
        error: error.message,
        status,
        type: 'onboarding_error'
      });
      return false;
    }
  }

  // Add method to get business info draft
  async getBusinessInfoDraft() {
    try {
      const draftData = await this.getData(STORAGE_KEYS.BUSINESS_INFO_DRAFT);
      
      logger.debug('Retrieved business info draft:', {
        hasDraft: !!draftData,
        lastModified: draftData?.metadata?.lastModified,
        type: 'draft_get'
      });
      
      return draftData;
    } catch (error) {
      logger.error('Failed to get business info draft:', {
        error: error.message,
        type: 'draft_error'
      });
      return null;
    }
  }
}

export const persistenceService = new PersistenceService();