///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/store/onboardingStore.js
'use client';

import { create } from 'zustand';
import { fetchAuthSession, getCurrentUser, updateUserAttributes } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { ONBOARDING_STATES } from '@/utils/userAttributes';

// Create the store
const useOnboardingStore = create((set, get) => ({
  currentStep: ONBOARDING_STATES.NOT_STARTED,
  isLoading: false,
  error: null,
  businessInfo: null,
  subscription: null,
  payment: null,
  setupInfo: null,

  setStep: async (step) => {
    try {
      if (!Object.values(ONBOARDING_STATES).includes(step)) {
        throw new Error(`Invalid onboarding step: ${step}`);
      }

      // Get current session using v6 API
      const { tokens } = await fetchAuthSession();
      if (!tokens?.accessToken) {
        throw new Error('No valid session');
      }

      // Update user attributes with new step
      await updateUserAttributes({
        userAttributes: {
          'custom:onboarding': step,
          'custom:updated_at': new Date().toISOString()
        }
      });

      // Update store state
      set({
        currentStep: step,
        error: null
      });

      logger.debug('[OnboardingStore] Step updated:', { step });
      return true;
    } catch (error) {
      logger.error('[OnboardingStore] Failed to update step:', error);
      set({
        error: error.message
      });
      return false;
    }
  },

  setBusinessInfo: async (info) => {
    try {
      // Get current session using v6 API
      const { tokens } = await fetchAuthSession();
      if (!tokens?.accessToken) {
        throw new Error('No valid session');
      }

      // Update user attributes
      await updateUserAttributes({
        userAttributes: {
          'custom:businessname': info.businessName,
          'custom:businesstype': info.businessType,
          'custom:businesssubtypes': info.businessSubtypes || '',
          'custom:businessid': info.businessId,
          'custom:businesscountry': info.country,
          'custom:businessstate': info.businessState,
          'custom:legalstructure': info.legalStructure,
          'custom:datefounded': info.dateFounded,
          'custom:onboarding': ONBOARDING_STATES.SUBSCRIPTION,
          'custom:updated_at': new Date().toISOString()
        }
      });

      // Update store state with next step
      set({
        businessInfo: info,
        currentStep: ONBOARDING_STATES.SUBSCRIPTION,
        error: null
      });

      logger.debug('[OnboardingStore] Business info updated');
      return true;
    } catch (error) {
      logger.error('[OnboardingStore] Failed to update business info:', error);
      set({
        error: error.message
      });
      return false;
    }
  },

  setSubscription: async (subscription) => {
    try {
      // Get current session using v6 API
      const { tokens } = await fetchAuthSession();
      if (!tokens?.accessToken) {
        throw new Error('No valid session');
      }

      // Update user attributes
      const attributes = {
        'custom:subplan': subscription.plan,
        'custom:subscriptioninterval': subscription.interval,
        'custom:updated_at': new Date().toISOString()
      };

      // For free plan, move directly to setup
      if (subscription.plan === 'free') {
        attributes['custom:onboarding'] = ONBOARDING_STATES.SETUP;
      } else {
        attributes['custom:onboarding'] = ONBOARDING_STATES.PAYMENT;
      }

      await updateUserAttributes({
        userAttributes: attributes
      });

      // Update store state
      set({
        subscription,
        currentStep: subscription.plan === 'free' ? ONBOARDING_STATES.SETUP : ONBOARDING_STATES.PAYMENT,
        error: null
      });

      logger.debug('[OnboardingStore] Subscription updated');
      return true;
    } catch (error) {
      logger.error('[OnboardingStore] Failed to update subscription:', error);
      set({
        error: error.message
      });
      return false;
    }
  },

  setPayment: async (payment) => {
    try {
      // Get current session using v6 API
      const { tokens } = await fetchAuthSession();
      if (!tokens?.accessToken) {
        throw new Error('No valid session');
      }

      // Update user attributes
      await updateUserAttributes({
        userAttributes: {
          'custom:paymentid': payment.id,
          'custom:payverified': 'TRUE',
          'custom:onboarding': ONBOARDING_STATES.PAYMENT,
          'custom:updated_at': new Date().toISOString()
        }
      });

      // Update store state
      set({
        payment,
        currentStep: ONBOARDING_STATES.PAYMENT,
        error: null
      });

      logger.debug('[OnboardingStore] Payment updated');
      return true;
    } catch (error) {
      logger.error('[OnboardingStore] Failed to update payment:', error);
      set({
        error: error.message
      });
      return false;
    }
  },

  completeSetup: async () => {
    try {
      // Get current session using v6 API
      const { tokens } = await fetchAuthSession();
      if (!tokens?.accessToken) {
        throw new Error('No valid session');
      }

      // Update user attributes
      await updateUserAttributes({
        userAttributes: {
          'custom:setupdone': 'TRUE',
          'custom:onboarding': ONBOARDING_STATES.COMPLETE,
          'custom:updated_at': new Date().toISOString()
        }
      });

      // Update store state
      set({
        currentStep: ONBOARDING_STATES.COMPLETE,
        error: null
      });

      logger.debug('[OnboardingStore] Setup completed');
      return true;
    } catch (error) {
      logger.error('[OnboardingStore] Failed to complete setup:', error);
      set({
        error: error.message
      });
      return false;
    }
  },

  loadOnboardingState: async () => {
    try {
      set({ isLoading: true });

      // Get current user using v6 API
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('No current user');
      }

      // Get user attributes
      const attributes = user.attributes || {};
      
      // Update store state based on attributes
      set({
        currentStep: attributes['custom:onboarding'] || ONBOARDING_STATES.NOT_STARTED,
        businessInfo: attributes['custom:businessname'] ? {
          businessName: attributes['custom:businessname'],
          businessType: attributes['custom:businesstype'],
          businessSubtypes: attributes['custom:businesssubtypes'] || '',
          businessId: attributes['custom:businessid'],
          country: attributes['custom:businesscountry'],
          businessState: attributes['custom:businessstate'] || '',
          legalStructure: attributes['custom:legalstructure'],
          dateFounded: attributes['custom:datefounded']
        } : null,
        subscription: attributes['custom:subplan'] ? {
          plan: attributes['custom:subplan'],
          interval: attributes['custom:subscriptioninterval']
        } : null,
        payment: attributes['custom:paymentid'] ? {
          id: attributes['custom:paymentid'],
          verified: attributes['custom:payverified'] === 'TRUE'
        } : null,
        isLoading: false,
        error: null
      });

      logger.debug('[OnboardingStore] State loaded');
      return true;
    } catch (error) {
      logger.error('[OnboardingStore] Failed to load state:', error);
      set({
        isLoading: false,
        error: error.message
      });
      return false;
    }
  }
}));

// Export the store hook
export default useOnboardingStore;
