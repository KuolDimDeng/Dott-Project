// src/services/persistenceService.js
import { logger } from '@/utils/logger';

export const STORAGE_KEYS = {
  VERSION: '1.0',
  DEFAULT_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  SUBSCRIPTION_DATA: 'subscription_data',
  SELECTED_PLAN: 'selected_plan',
  ONBOARDING_DATA: 'onboarding_data',
  BUSINESS_INFO_DRAFT: 'business-info-draft',
  PAYMENT_DATA: 'payment_data'
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
      
      logger.debug('Retrieved data details:', {
        key,
        version: parsed.version,
        timestamp: new Date(parsed.timestamp).toISOString(),
        isExpired: Date.now() - parsed.timestamp > parsed.expiry,
        hasOnboardingStatus: !!parsed.data?.onboardingStatus,
        selectedPlan: parsed.data?.selectedPlan,
        type: 'persistence_data'
      });

      // Version check
      if (parsed.version !== STORAGE_KEYS.VERSION) {
        logger.warn('Version mismatch detected', {
          key,
          foundVersion: parsed.version,
          expectedVersion: STORAGE_KEYS.VERSION,
          selectedPlan: parsed.data?.selectedPlan
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
          selectedPlan: parsed.data?.selectedPlan
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

  validateSubscriptionData(data) {
    if (!data.selectedPlan) {
      throw new Error('Selected plan is required');
    }
    
    if (!['free', 'professional'].includes(data.selectedPlan)) {
      throw new Error('Invalid plan selected');
    }
    
    if (data.billingCycle && !['monthly', 'annual'].includes(data.billingCycle)) {
      throw new Error('Invalid billing cycle');
    }
    
    return true;
  }

  async saveSubscriptionData(data) {
    try {
      this.validateSubscriptionData(data);
      
      return await this.saveData(
        STORAGE_KEYS.SUBSCRIPTION_DATA,
        data,
        {
          metadata: {
            lastUpdated: new Date().toISOString()
          }
        }
      );
    } catch (error) {
      logger.error('Failed to save subscription data:', {
        error: error.message,
        data: data
      });
      throw error;
    }
  }

  async saveData(key, data, options = {}) {
    try {
      logger.debug('Attempting to save data:', {
        key,
        hasData: !!data,
        dataType: typeof data,
        onboardingStatus: data?.onboardingStatus,
        selectedPlan: data?.selectedPlan,
        type: 'persistence_save'
      });

      // Validation for subscription data
      if (key === STORAGE_KEYS.SUBSCRIPTION_DATA) {
        this.validateSubscriptionData(data);
      }

      // Validation for onboarding data
      if (key === STORAGE_KEYS.ONBOARDING_DATA) {
        if (!data.onboardingStatus) {
          throw new Error('Missing onboarding status');
        }
        if (data.selectedPlan && !['free', 'professional'].includes(data.selectedPlan)) {
          throw new Error('Invalid plan in onboarding data');
        }
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
        selectedPlan: data?.selectedPlan,
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

  async clearData(key) {
    try {
      localStorage.removeItem(key);
      logger.debug('Data cleared successfully:', { key });
      return true;
    } catch (error) {
      logger.error('Failed to clear data:', {
        key,
        error: error.message
      });
      return false;
    }
  }

  async getSelectedPlan() {
    try {
      const subscriptionData = await this.getData(STORAGE_KEYS.SUBSCRIPTION_DATA);
      const selectedPlan = subscriptionData?.selectedPlan;
      
      logger.debug('Retrieved selected plan:', {
        hasData: !!subscriptionData,
        selectedPlan,
        type: 'plan_get'
      });
      
      return selectedPlan;
    } catch (error) {
      logger.error('Failed to get selected plan:', {
        error: error.message,
        type: 'plan_error'
      });
      return null;
    }
  }

  async getOnboardingState() {
    try {
      const onboardingData = await this.getData(STORAGE_KEYS.ONBOARDING_DATA);
      
      logger.debug('Retrieved onboarding state:', {
        hasData: !!onboardingData,
        status: onboardingData?.onboardingStatus,
        selectedPlan: onboardingData?.selectedPlan,
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

  async saveOnboardingState(status, selectedPlan = null) {
    try {
      logger.debug('Saving onboarding state:', {
        status,
        selectedPlan,
        type: 'onboarding_save'
      });

      return await this.saveData(STORAGE_KEYS.ONBOARDING_DATA, {
        onboardingStatus: status,
        selectedPlan,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to save onboarding state:', {
        error: error.message,
        status,
        selectedPlan,
        type: 'onboarding_error'
      });
      return false;
    }
  }

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