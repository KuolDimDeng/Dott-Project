// src/services/persistenceService.js
import { appCache } from '../utils/appCache';
import { logger } from '@/utils/logger';

export const STORAGE_KEYS = {
  VERSION: '1.0',
  DEFAULT_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  SUBSCRIPTION_DATA: 'subscription-data',  // Changed to match your lookup key
  SELECTED_PLAN: 'selected-plan',
  ONBOARDING_DATA: 'onboarding-data',
  BUSINESS_INFO_DRAFT: 'business-info-draft',
  PAYMENT_DATA: 'payment-data',
};

// Initialize global app cache
if (typeof window !== 'undefined') {
  if (!appCache.getAll()) appCache.init();
  window.__PERSISTENCE_STORE = window.__PERSISTENCE_STORE || {};
}

class PersistenceService {
  async getData(key) {
    try {
        // Initialize global cache if needed
        if (typeof window === 'undefined') {
            logger.debug('Window object not available (server-side rendering)');
            return null;
        }
        
        if (!window.__PERSISTENCE_STORE) {
            window.__PERSISTENCE_STORE = {};
        }
        
        const savedData = window.__PERSISTENCE_STORE[key];
        
        if (!savedData) {
            logger.debug('No data found for key:', {
                key,
                type: 'persistence_miss'
            });
            return null;
        }

        const parsed = typeof savedData === 'string' ? JSON.parse(savedData) : savedData;
        
        // Add specific logging for subscription data
        if (key === STORAGE_KEYS.SUBSCRIPTION_DATA) {
            logger.debug('Retrieved subscription data:', {
                selected_plan: parsed.data?.selected_plan,
                timestamp: new Date(parsed.timestamp).toISOString()
            });
        }

        if (Date.now() - parsed.timestamp > parsed.expiry) {
            await this.clearData(key);
            return null;
        }

        return parsed.data;

    } catch (error) {
        logger.error('Data retrieval failed:', {
            key,
            error: error.message
        });
        return null;
    }
}

    // Enhanced validation for subscription data
    validateSubscriptionData(data) {
      const errors = [];
      
      // Only check for selected_plan for consistency
      if (!data.selected_plan) {
          errors.push('selected_plan is required');
      }

      // Validate plan type
      if (data.selected_plan && !['free', 'professional'].includes(data.selected_plan)) {
          errors.push(`Invalid plan type: ${data.selected_plan}`);
      }

      // Validate billing cycle if present
      if (data.billing_cycle && !['monthly', 'annual'].includes(data.billing_cycle)) {
          errors.push(`Invalid billing cycle: ${data.billing_cycle}`);
      }

      if (errors.length > 0) {
          throw new Error(errors.join('; '));
      }

      return true;
  }

  // Improved subscription data saving
  async saveSubscriptionData(data) {
    try {
        this.validateSubscriptionData(data);

        // Simplified data structure
        const normalizedData = {
            selected_plan: data.selected_plan,
            billing_cycle: data.billing_cycle || 'monthly',
            timestamp: Date.now(),
            metadata: {
                lastUpdated: new Date().toISOString(),
                ...data.metadata
            }
        };

        const saved = await this.saveData(STORAGE_KEYS.SUBSCRIPTION_DATA, normalizedData);

        logger.debug('Subscription data saved:', {
            requestId: crypto.randomUUID(),
            selected_plan: normalizedData.selected_plan,
            success: saved
        });

        return saved;

    } catch (error) {
        logger.error('Failed to save subscription data:', {
            error: error.message,
            data
        });
        throw error;
    }
}
  // Enhanced general data saving
  async saveData(key, data, options = {}) {
    const requestId = crypto.randomUUID();

    try {
      logger.debug('Saving data:', {
        requestId,
        key,
        hasData: !!data,
        dataType: typeof data,
        selected_plan: data?.selected_plan,
        type: 'persistence_save'
      });

      // Special handling for subscription data
      if (key === STORAGE_KEYS.SUBSCRIPTION_DATA) {
        this.validateSubscriptionData(data);
      }

      const storageData = {
        version: STORAGE_KEYS.VERSION,
        timestamp: Date.now(),
        expiry: options.expiry || STORAGE_KEYS.DEFAULT_EXPIRY,
        data,
        metadata: {
          lastModified: new Date().toISOString(),
          requestId,
          ...options.metadata
        }
      };

      // Save to global store
      if (typeof window !== 'undefined') {
        if (!window.__PERSISTENCE_STORE) {
          window.__PERSISTENCE_STORE = {};
        }
        window.__PERSISTENCE_STORE[key] = storageData;
      }

      logger.debug('Data saved successfully:', {
        requestId,
        key,
        timestamp: new Date(storageData.timestamp).toISOString(),
        selected_plan: data?.selected_plan,
        type: 'persistence_success'
      });

      return true;

    } catch (error) {
      logger.error('Save operation failed:', {
        requestId,
        key,
        error: error.message,
        type: 'persistence_error'
      });
      return false;
    }
  }
  async clearData(key) {
    try {
      // Clear from global store
      if (typeof window !== 'undefined' && window.__PERSISTENCE_STORE) {
        delete window.__PERSISTENCE_STORE[key];
      }
      
      logger.debug('Data cleared successfully:', { key });
      return true;
    } catch (error) {
      logger.error('Failed to clear data:', {
        key,
        error: error.message,
      });
      return false;
    }
  }

  async getselected_plan() {
    try {
      const subscriptionData = await this.getData(STORAGE_KEYS.SUBSCRIPTION_DATA);
      const selected_plan = subscriptionData?.selected_plan;

      logger.debug('Retrieved selected plan:', {
        hasData: !!subscriptionData,
        selected_plan,
        type: 'plan_get',
      });

      return selected_plan;
    } catch (error) {
      logger.error('Failed to get selected plan:', {
        error: error.message,
        type: 'plan_error',
      });
      return null;
    }
  }
}

export const persistenceService = new PersistenceService();
