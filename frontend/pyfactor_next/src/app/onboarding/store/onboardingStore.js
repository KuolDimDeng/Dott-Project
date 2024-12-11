// src/app/onboarding/store/onboardingStore.js
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { APP_CONFIG } from '@/config';

const createOnboardingStore = () => {
  return create(
    devtools(
      persist(
        (set, get) => ({
          // State
          currentStep: APP_CONFIG.onboarding.steps.INITIAL,
          formData: {},
          loading: false,
          error: null,
          initialized: false,
          initializationAttempts: 0,

          // Actions
          initialize: async () => {
            const state = get();

            if (state.loading) {
              logger.warn('Initialization already in progress');
              return;
            }

            try {
              set({ loading: true, error: null });

              const response = await axiosInstance.get(APP_CONFIG.api.endpoints.onboarding.status, {
                timeout: APP_CONFIG.api.timeout,
              });

              if (!response?.data) {
                throw new Error(APP_CONFIG.errors.messages.default);
              }

              set({
                currentStep: response.data.status || APP_CONFIG.onboarding.steps.INITIAL,
                formData: response.data.form_data || {},
                initialized: true,
                loading: false,
                error: null,
              });

              return response.data;
            } catch (error) {
              const errorMsg =
                error.response?.status === 401
                  ? APP_CONFIG.errors.messages.unauthorized
                  : error.response?.status === 404
                    ? APP_CONFIG.errors.messages.default
                    : error.message || APP_CONFIG.errors.messages.initialization_failed;

              logger.error('Store initialization failed:', {
                error: errorMsg,
                status: error.response?.status,
                data: error.response?.data,
              });

              set({
                error: errorMsg,
                loading: false,
                initialized: false,
              });

              throw error;
            }
          },

          validateTransition: (fromStep, toStep) => {
            const validTransitions = APP_CONFIG.onboarding.transitions[fromStep];
            return validTransitions?.includes(toStep) || false;
          },

          saveStep: async (step, data) => {
            const state = get();

            if (state.loading) {
              logger.warn('Save already in progress');
              throw new Error(APP_CONFIG.errors.messages.default);
            }

            if (!get().validateTransition(state.currentStep, step)) {
              logger.error('Invalid step transition', {
                from: state.currentStep,
                to: step,
              });
              throw new Error(APP_CONFIG.errors.messages.transition_error);
            }

            set({ loading: true, error: null });

            try {
              logger.debug(`Saving step ${step}:`, data);

              if (!data || typeof data !== 'object') {
                throw new Error(APP_CONFIG.errors.messages.validation_error);
              }

              let response;

              // Special handling for step4 setup
              if (step === APP_CONFIG.onboarding.steps.SETUP) {
                response = await axiosInstance.post('/api/onboarding/step4/setup/', data);

                // If setup started successfully, return immediately
                if (response.data.status === 'started') {
                  set({
                    formData: { ...state.formData, ...data },
                    currentStep: step,
                    error: null,
                    loading: false,
                  });
                  return response.data;
                }
              } else {
                // Normal step saving
                const endpoint = APP_CONFIG.api.endpoints.onboarding[step];
                response = await axiosInstance.post(endpoint, data);
              }

              set({
                formData: { ...state.formData, ...data },
                currentStep: response.data.next_step || step,
                error: null,
                loading: false,
              });

              return response.data;
            } catch (error) {
              const errorMessage = error.response?.data?.message || error.message;
              logger.error(`Failed to save step ${step}:`, error);

              set({
                error: errorMessage,
                loading: false,
              });

              throw error;
            }
          },

          validateStep: (step) => {
            try {
              const { currentStep, formData } = get();
              const steps = Object.values(APP_CONFIG.onboarding.steps);

              const isValidOrder = steps.indexOf(step) <= steps.indexOf(currentStep);

              const validationRules = {
                [APP_CONFIG.onboarding.steps.INITIAL]: () =>
                  !!formData.businessName && !!formData.industry,
                [APP_CONFIG.onboarding.steps.PLAN]: () => {
                  return (
                    !!formData.selectedPlan &&
                    APP_CONFIG.app.plans.validPlans.includes(formData.selectedPlan) &&
                    !!formData.billingCycle &&
                    APP_CONFIG.app.plans.validBillingCycles.includes(formData.billingCycle)
                  );
                },
                [APP_CONFIG.onboarding.steps.PAYMENT]: () => {
                  if (formData.selectedPlan === APP_CONFIG.app.plans.defaultPlan) return false;
                  return formData.selectedPlan === 'Professional' && !formData.paymentMethod;
                },
                [APP_CONFIG.onboarding.steps.SETUP]: () => {
                  return (
                    formData.selectedPlan === APP_CONFIG.app.plans.defaultPlan ||
                    (formData.selectedPlan === 'Professional' && !!formData.paymentMethod)
                  );
                },
              };

              const stepValidation = validationRules[step];
              return isValidOrder && (!stepValidation || stepValidation());
            } catch (error) {
              logger.error(`Step validation error for ${step}:`, error);
              return false;
            }
          },

          reset: () => {
            logger.debug('Resetting onboarding store');
            set({
              currentStep: APP_CONFIG.onboarding.steps.INITIAL,
              formData: {},
              loading: false,
              error: null,
              initialized: false,
              initializationAttempts: 0,
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
              };
            }
          },
          onRehydrateStorage: () => {
            logger.debug('Store rehydrating...');
            return (state) => {
              logger.debug('Store rehydrated:', state);
            };
          },
        }
      )
    )
  );
};

export default createOnboardingStore();
