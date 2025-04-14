///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/store/onboardingStore.js
'use client';

import { create } from 'zustand';
import { fetchAuthSession, getCurrentUser, updateUserAttributes } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { ONBOARDING_STATES } from '@/utils/userAttributes';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { saveUserPreference, PREF_KEYS } from '@/utils/userPreferences';

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

      // Store in AppCache for development mode if needed
      if (process.env.NODE_ENV === 'development') {
        try {
          // Store each piece of information individually for easier access
          setCacheValue('businessName', info.businessName || '');
          setCacheValue('businessType', info.businessType || '');
          setCacheValue('businessSubtypes', info.businessSubtypes || '');
          setCacheValue('businessId', info.businessId || '');
          setCacheValue('businessCountry', info.country || '');
          setCacheValue('businessState', info.businessState || '');
          setCacheValue('legalStructure', info.legalStructure || '');
          setCacheValue('dateFounded', info.dateFounded || '');
          
          // Also store the complete business info object
          setCacheValue('onboardingBusinessInfo', JSON.stringify(info));
          
          console.log('💾 Saved business info to AppCache for development mode', info);
        } catch (storageError) {
          console.warn('Failed to save business info to AppCache:', storageError);
        }
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

      // Store in AppCache for development mode if needed
      if (process.env.NODE_ENV === 'development') {
        try {
          setCacheValue('subscriptionPlan', subscription.plan || '');
          setCacheValue('subscriptionInterval', subscription.interval || '');
          setCacheValue('onboardingSubscription', JSON.stringify(subscription));
          
          // Store in Cognito attributes for server-side access
          await saveUserPreference('custom:subscriptionPlan', subscription.plan);
          await saveUserPreference('custom:subscriptionInterval', subscription.interval);
          
          console.log('💾 Saved subscription info to AppCache for development mode', subscription);
        } catch (storageError) {
          console.warn('Failed to save subscription info to AppCache:', storageError);
        }
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

      // Store in AppCache for development mode if needed
      if (process.env.NODE_ENV === 'development') {
        try {
          setCacheValue('paymentId', payment.id || '');
          setCacheValue('paymentVerified', 'true');
          setCacheValue('paymentType', payment.paymentMethod?.type || 'credit_card');
          setCacheValue('paymentLast4', payment.paymentMethod?.last4 || '4242');
          setCacheValue('paymentExpiry', payment.paymentMethod?.expiry || '12/25');
          setCacheValue('onboardingPayment', JSON.stringify(payment));
          
          console.log('💾 Saved payment info to AppCache for development mode', payment);
        } catch (storageError) {
          console.warn('Failed to save payment info to AppCache:', storageError);
        }
      }

      // Update user attributes
      await updateUserAttributes({
        userAttributes: {
          'custom:paymentid': payment.id,
          'custom:payverified': 'true',
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
    set({ isLoading: true });
    
    try {
      // Get current session using v6 API
      const { tokens } = await fetchAuthSession();
      if (!tokens?.accessToken) {
        throw new Error('No valid session');
      }
      
      // For development mode, save status in AppCache
      if (process.env.NODE_ENV === 'development') {
        try {
          setCacheValue('setupdone', 'true');
          setCacheValue('onboardingStatus', ONBOARDING_STATES.COMPLETE);
          setCacheValue('onboardingCompletedAt', new Date().toISOString());
          
          // Store in Cognito attributes for persistence
          await saveUserPreference('custom:setupdone', 'true');
          await saveUserPreference('custom:onboarding', ONBOARDING_STATES.COMPLETE);
          await saveUserPreference('custom:onboardingCompletedAt', new Date().toISOString());
          
          console.log('💾 Saved setup completion to AppCache for development mode');
        } catch (storageError) {
          console.warn('Failed to save setup completion to AppCache:', storageError);
        }
      }

      // Update user attributes
      await updateUserAttributes({
        userAttributes: {
          'custom:onboarding': ONBOARDING_STATES.COMPLETE,
          'custom:setupdone': 'true',
          'custom:updated_at': new Date().toISOString(),
          'custom:onboardingCompletedAt': new Date().toISOString()
        }
      });

      // Update store state
      set({
        currentStep: ONBOARDING_STATES.COMPLETE,
        error: null,
        isLoading: false
      });

      logger.debug('[OnboardingStore] Setup completed');
      return true;
    } catch (error) {
      logger.error('[OnboardingStore] Failed to complete setup:', error);
      set({
        error: error.message,
        isLoading: false
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
          verified: attributes['custom:payverified'] === 'true'
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
