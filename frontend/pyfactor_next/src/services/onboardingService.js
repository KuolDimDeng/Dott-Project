///Users/kuoldeng/projectx/frontend/pyfactor_next/src/services/onboardingService.js
import { logger } from '@/utils/logger';

const BASE_URL = '/api/onboarding'

export const onboardingService = {
  async getOnboardingStatus(userId) {
    logger.debug('Fetching onboarding status', { userId });
    
    try {
      const response = await fetch('/api/onboarding/status');
      
      if (!response.ok) {
        const error = await response.json();
        logger.error('Failed to fetch onboarding status:', error);
        throw new Error(error.message || 'Failed to get onboarding status');
      }

      const data = await response.json();
      logger.debug('Onboarding status retrieved', { data });
      return data;
    } catch (error) {
      logger.error('Error in getOnboardingStatus:', error);
      throw error;
    }
  },

  async completeSetup() {
    const response = await fetch(`${BASE_URL}/setup/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to complete setup')
    }
    return response.json()
  },

  async submitBusinessInfo(data) {
    const response = await fetch(`${BASE_URL}/business-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to submit business info')
    }
    return response.json()
  },

  async selectSubscription(planId) {
    const response = await fetch(`${BASE_URL}/subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ planId })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to select subscription')
    }
    return response.json()
  },

  async submitPayment(paymentDetails) {
    const response = await fetch(`${BASE_URL}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentDetails)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to process payment')
    }
    return response.json()
  },

  async getOnboardingStatus() {
    const response = await fetch(`${BASE_URL}/status`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get onboarding status')
    }
    return response.json()
  },

  async updateOnboardingStatus(updates) {
    const response = await fetch(`${BASE_URL}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update onboarding status')
    }
    return response.json()
  },

  async createSetupTask(taskData) {
    const response = await fetch(`${BASE_URL}/setup/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create setup task')
    }
    return response.json()
  },

  async updateSetupTask(taskId, updates) {
    const response = await fetch(`${BASE_URL}/setup/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update setup task')
    }
    return response.json()
  }
}
