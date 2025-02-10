import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

class OnboardingAPI {
  async getSetupProgress() {
    try {
      const response = await axiosInstance.get('/api/onboarding/setup/status');
      return response;
    } catch (error) {
      logger.error('Failed to fetch setup progress:', error);
      throw error;
    }
  }

  async startSetup(data) {
    try {
      const response = await axiosInstance.post(
        '/api/onboarding/setup/start',
        data
      );
      return response;
    } catch (error) {
      logger.error('Failed to start setup:', error);
      throw error;
    }
  }

  async completeSetup(data) {
    try {
      const response = await axiosInstance.post(
        '/api/onboarding/setup/complete',
        data
      );
      return response;
    } catch (error) {
      logger.error('Failed to complete setup:', error);
      throw error;
    }
  }

  async validateSubscriptionAccess() {
    try {
      const response = await axiosInstance.get(
        '/api/onboarding/subscription/validate'
      );
      return response;
    } catch (error) {
      logger.error('Failed to validate subscription:', error);
      throw error;
    }
  }

  async getSubscriptionStatus() {
    try {
      const response = await axiosInstance.get(
        '/api/onboarding/subscription/status'
      );
      return response;
    } catch (error) {
      logger.error('Failed to get subscription status:', error);
      throw error;
    }
  }
}

export const onboardingApi = new OnboardingAPI();
