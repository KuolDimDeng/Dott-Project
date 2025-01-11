// src/app/onboarding/store/onboardingStore.js
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { logger } from '@/utils/logger';
import { APP_CONFIG } from '@/config';
import { 
  validateUserState, 
  validateOnboardingStep,
  handleAuthError,
  makeRequest,
  generateRequestId,
  AUTH_ERRORS 
} from '@/lib/authUtils';

const createOnboardingStore = () => {
  return create(
    devtools(
      persist(
        (set, get) => ({
          // Add tier state
          selectedTier: null,
          billingCycle: null,

          // Update State
          currentStep: APP_CONFIG.onboarding.steps.INITIAL,
          formData: {},
          loading: false,
          error: null,
          initialized: false,
          initializationAttempts: 0,
          requestId: generateRequestId(),

          // Add tier actions
          setTier: (tier) => {
            if (!['free', 'professional'].includes(tier)) {
              logger.error('Invalid tier selected', { tier });
              throw new Error('Invalid subscription tier');
            }
            set({ selectedTier: tier });
          },

          setBillingCycle: (cycle) => {
            if (!['monthly', 'annual'].includes(cycle)) {
              logger.error('Invalid billing cycle', { cycle });
              throw new Error('Invalid billing cycle');
            }
            set({ billingCycle: cycle });
          },

          // Update initialize to handle tier
          initialize: async (session) => {
            const state = get();
            const requestId = state.requestId;

            if (state.loading) {
              logger.warn('Initialization already in progress', { requestId });
              return;
            }

            try {
              set({ loading: true, error: null });

              const userState = await validateUserState(session, requestId);
              if (!userState.isValid) {
                throw new Error(userState.reason);
              }

              const response = await makeRequest(() => ({
                promise: fetch(APP_CONFIG.api.endpoints.onboarding.status, {
                  headers: {
                    'Authorization': `Bearer ${session.user.accessToken}`
                  },
                  timeout: APP_CONFIG.api.timeout
                })
              }));

              if (!response?.data) {
                throw new Error(AUTH_ERRORS.VALIDATION_FAILED);
              }

              // Include tier in state
              set({
                currentStep: response.data.status || APP_CONFIG.onboarding.steps.INITIAL,
                formData: response.data.form_data || {},
                selectedTier: response.data.tier || null,
                billingCycle: response.data.billing_cycle || null,
                initialized: true,
                loading: false,
                error: null,
              });

              return response.data;
            } catch (error) {
              const errorResult = handleAuthError(error);
              
              logger.error('Store initialization failed:', {
                error: errorResult,
                requestId,
                status: error.response?.status,
              });

              set({
                error: errorResult.message,
                loading: false,
                initialized: false,
              });

              throw errorResult;
            }
          },

          validateTransition: async (fromStep, toStep, session) => {
            const state = get();
            const requestId = state.requestId;

            try {
              const stepValidation = await validateOnboardingStep(
                session,
                toStep,
                state.formData[toStep],
                requestId
              );

              return stepValidation.isValid;
            } catch (error) {
              logger.error('Transition validation failed:', {
                error,
                requestId,
                fromStep,
                toStep
              });
              return false;
            }
          },

          saveStep: async (step, data, session) => {
            const state = get();
            const requestId = state.requestId;
            const currentTier = state.selectedTier;

            if (state.loading) {
              logger.warn('Save already in progress', { requestId });
              throw new Error(AUTH_ERRORS.VALIDATION_FAILED);
            }

            // Add tier validation for payment step
            if (step === 'payment' && currentTier !== 'professional') {
              logger.error('Payment step not allowed for free tier', {
                requestId,
                tier: currentTier
              });
              throw new Error('Payment step not allowed for free tier');
            }

            // Rest of saveStep logic with tier context...
            try {
              const validationResult = await validateOnboardingStep(
                session,
                step,
                { ...data, tier: currentTier },
                requestId
              );

              if (!validationResult.isValid) {
                throw new Error(validationResult.reason);
              }

              const endpoint = APP_CONFIG.api.endpoints.onboarding[step];
              const response = await makeRequest(() => ({
                promise: fetch(endpoint, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session.user.accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(validationResult.data)
                })
              }));

              set({
                formData: { ...state.formData, [step]: validationResult.data },
                currentStep: response.data.next_step || step,
                error: null,
                loading: false,
              });

              return response.data;
            } catch (error) {
              const errorResult = handleAuthError(error);
              
              logger.error(`Failed to save step ${step}:`, {
                error: errorResult,
                requestId
              });

              set({
                error: errorResult.message,
                loading: false,
              });

              throw errorResult;
            }
          },

          // Update validateStep to include tier
          validateStep: async (step, session) => {
            const state = get();
            const requestId = state.requestId;
            const currentTier = state.selectedTier;

            try {
              const validationResult = await validateOnboardingStep(
                session,
                step,
                { ...state.formData[step], tier: currentTier },
                requestId
              );

              return validationResult.isValid;
            } catch (error) {
              logger.error(`Step validation error for ${step}:`, {
                error,
                requestId,
                tier: currentTier
              });
              return false;
            }
          },

          reset: () => {
            logger.debug('Resetting onboarding store');
            set({
              currentStep: APP_CONFIG.onboarding.steps.INITIAL,
              formData: {},
              selectedTier: null,
              billingCycle: null,
              loading: false,
              error: null,
              initialized: false,
              initializationAttempts: 0,
              requestId: generateRequestId(),
            });
          },
        }),
        {
          name: APP_CONFIG.storage.keys.onboarding,
          version: APP_CONFIG.storage.version,
          getStorage: () => {
            try {
              return localStorage;
            } catch {
              return undefined;
            }
          },
          serialize: (state) =>
            JSON.stringify({
              currentStep: state.currentStep,
              formData: state.formData,
              selectedTier: state.selectedTier,
              billingCycle: state.billingCycle,
              initialized: false,
            }),
          deserialize: (str) => {
            try {
              const parsed = JSON.parse(str);
              return {
                ...parsed,
                loading: false,
                error: null,
                initialized: false,
                initializationAttempts: 0,
                requestId: generateRequestId(),
              };
            } catch (error) {
              logger.error('Store deserialization failed:', error);
              return {
                currentStep: APP_CONFIG.onboarding.steps.INITIAL,
                formData: {},
                loading: false,
                error: null,
                initialized: false,
                initializationAttempts: 0,
                requestId: generateRequestId(),
              };
            }
          },
          onRehydrateStorage: () => {
            logger.debug('Store rehydrating...');
            return (state) => {
              logger.debug('Store rehydrated:', { state });
            };
          },
        }
      )
    )
  );
};

export default createOnboardingStore();