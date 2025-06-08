///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/store/onboardingStore.js
'use client';

import { appCache } from '../utils/appCache';
import { create } from 'zustand';
import { appCache } from '../utils/appCache';
import { fetchAuthSession, getCurrentUser, updateUserAttributes } from '@/config/amplifyUnified';
import { appCache } from '../utils/appCache';
import { logger } from '@/utils/logger';
import { appCache } from '../utils/appCache';
import { ONBOARDING_STATES } from '@/utils/userAttributes';
import { setCacheValue } from '@/utils/appCache';

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

      // Store in app cache for development mode if needed
      if (process.env.NODE_ENV === 'development') {
        try {
          // Initialize app cache if needed
          if (typeof window !== 'undefined') {
            appCache.getAll() = appCache.getAll() || {};
            appCache.getAll().onboarding = appCache.getAll().onboarding || {};
            appCache.set('onboarding.businessInfo', {
              businessName: info.businessName || '',
              businessType: info.businessType || '',
              businessSubtypes: info.businessSubtypes || '',
              businessId: info.businessId || '',
              country: info.country || '',
              businessState: info.businessState || '',
              legalStructure: info.legalStructure || '',
              dateFounded: info.dateFounded || '',
              timestamp: Date.now()
            });
          }
          
          console.log('💾 Saved business info to app cache for development mode', info);
        } catch (storageError) {
          console.warn('Failed to save business info to app cache:', storageError);
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

      // Store in app cache for development mode if needed
      if (process.env.NODE_ENV === 'development') {
        try {
          // Initialize app cache if needed
          if (typeof window !== 'undefined') {
            appCache.getAll() = appCache.getAll() || {};
            appCache.getAll().onboarding = appCache.getAll().onboarding || {};
            appCache.set('onboarding.subscription', {
              plan: subscription.plan || '',
              interval: subscription.interval || '',
              timestamp: Date.now(),
              details: subscription
            });
          }
          
          // Set a cookie for server-side access
          document.cookie = `subscriptionPlan=${subscription.plan}; path=/; max-age=86400`;
          document.cookie = `subscriptionInterval=${subscription.interval}; path=/; max-age=86400`;
          
          console.log('💾 Saved subscription info to app cache for development mode', subscription);
        } catch (storageError) {
          console.warn('Failed to save subscription info to app cache:', storageError);
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

      // Store in app cache for development mode if needed
      if (process.env.NODE_ENV === 'development') {
        try {
          // Initialize app cache if needed
          if (typeof window !== 'undefined') {
            appCache.getAll() = appCache.getAll() || {};
            appCache.getAll().onboarding = appCache.getAll().onboarding || {};
            appCache.set('onboarding.payment', {
              id: payment.id || '',
              verified: true,
              paymentMethod: {
                type: payment.paymentMethod?.type || 'credit_card',
                last4: payment.paymentMethod?.last4 || '4242',
                expiry: payment.paymentMethod?.expiry || '12/25'
              },
              timestamp: Date.now(),
              details: payment
            });
          }
          
          console.log('💾 Saved payment info to app cache for development mode', payment);
        } catch (storageError) {
          console.warn('Failed to save payment info to app cache:', storageError);
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
      
      // For development mode, save status in app cache
      if (process.env.NODE_ENV === 'development') {
        try {
          // Initialize app cache if needed
          if (typeof window !== 'undefined') {
            appCache.getAll() = appCache.getAll() || {};
            appCache.getAll().onboarding = appCache.getAll().onboarding || {};
            appCache.set('onboarding.status', ONBOARDING_STATES.COMPLETE);
            appCache.set('onboarding.setupdone', true);
            appCache.set('onboarding.completedAt', new Date().toISOString());
          }
          
          console.log('💾 Saved setup completion to app cache for development mode');
        } catch (storageError) {
          console.warn('Failed to save setup completion to app cache:', storageError);
        }
      }
      
      const requestId = crypto.randomUUID();
      let attributeUpdateSuccess = false;
      
      // Try multiple approaches to ensure attributes are updated
      logger.debug('[OnboardingStore] Starting setup completion', {
        requestId,
        startTime: new Date().toISOString()
      });
      
      // 1. First try: Update user attributes directly
      try {
        await updateUserAttributes({
          userAttributes: {
            'custom:setupdone': 'true',
            'custom:onboarding': 'complete',
            'custom:updated_at': new Date().toISOString(),
            'custom:onboardingCompletedAt': new Date().toISOString()
          }
        });
        
        attributeUpdateSuccess = true;
        logger.debug('[OnboardingStore] Updated attributes directly', { requestId });
      } catch (updateError) {
        logger.error('[OnboardingStore] Direct attribute update failed:', {
          requestId,
          error: updateError.message
        });
        
        // 2. Second try: Call the completion API endpoint
        try {
          const response = await fetch('/api/onboarding/setup/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tokens.accessToken}`,
              'X-Request-ID': requestId
            }
          });
          
          if (response.ok) {
            attributeUpdateSuccess = true;
            logger.debug('[OnboardingStore] Setup completed via API', { requestId });
          } else {
            throw new Error(`API returned status ${response.status}`);
          }
        } catch (apiError) {
          logger.error('[OnboardingStore] API completion failed:', {
            requestId,
            error: apiError.message
          });
          
          // 3. Third try: Use the update-attributes API
          try {
            const attributeResponse = await fetch('/api/user/update-attributes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokens.accessToken}`,
                'X-Request-ID': requestId
              },
              body: JSON.stringify({
                attributes: {
                  'custom:setupdone': 'true',
                  'custom:onboarding': 'complete',
                  'custom:updated_at': new Date().toISOString()
                },
                forceUpdate: true
              })
            });
            
            if (attributeResponse.ok) {
              attributeUpdateSuccess = true;
              logger.debug('[OnboardingStore] Setup completed via attributes API', { requestId });
            } else {
              throw new Error(`Attributes API returned status ${attributeResponse.status}`);
            }
          } catch (attributesApiError) {
            logger.error('[OnboardingStore] All methods failed:', {
              requestId,
              error: attributesApiError.message
            });
          }
        }
      }
      
      // Set AppCache values for immediate status update instead of cookies
      if (attributeUpdateSuccess) {
        setCacheValue('onboardingStep', 'complete');
        setCacheValue('onboardedStatus', 'complete');
        setCacheValue('setupCompleted', true);
        
        // Update store state
        set({
          currentStep: ONBOARDING_STATES.COMPLETE,
          isLoading: false,
          error: null
        });
        
        logger.info('[OnboardingStore] Setup completed successfully', { requestId });
        return true;
      } else {
        throw new Error('Failed to update onboarding status after multiple attempts');
      }
    } catch (error) {
      logger.error('[OnboardingStore] Failed to complete setup:', {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      
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
