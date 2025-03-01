import { create } from 'zustand';
import { logger } from '@/utils/logger';
import { updateOnboardingStep, validateBusinessInfo } from '@/utils/onboardingUtils';

const useOnboardingStore = create((set, get) => ({
  // Business Info State
  businessInfo: null,
  isLoading: false,
  error: null,

  // Actions
  setBusinessInfo: async (info) => {
    try {
      set({ isLoading: true, error: null });
      logger.debug('[OnboardingStore] Validating business info:', info);

      // Validate business info
      const formattedAttributes = await validateBusinessInfo(info);

      // Update onboarding step with business info
      await updateOnboardingStep('BUSINESS_INFO', formattedAttributes);

      set({
        businessInfo: info,
        isLoading: false,
        error: null
      });

      logger.debug('[OnboardingStore] Business info updated successfully');
      return true;
    } catch (error) {
      logger.error('[OnboardingStore] Failed to update business info:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to update business information'
      });
      return false;
    }
  },

  clearBusinessInfo: () => {
    set({
      businessInfo: null,
      isLoading: false,
      error: null
    });
    logger.debug('[OnboardingStore] Business info cleared');
  },

  setError: (error) => {
    set({ error });
    logger.error('[OnboardingStore] Error set:', error);
  },

  clearError: () => {
    set({ error: null });
    logger.debug('[OnboardingStore] Error cleared');
  }
}));

export default useOnboardingStore;