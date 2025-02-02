// src/app/onboarding/store/onboardingStore.js
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { logger } from '@/utils/logger';
import { APP_CONFIG } from '@/config';
import { 
  validateOnboardingStep,
  handleAuthError,
  generateRequestId
} from '@/lib/authUtils';
import { onboardingApi, makeRequest } from '@/services/api/onboarding';

const STEPS = {
  BUSINESS_INFO: 'business-info',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  SETUP: 'setup',
  COMPLETE: 'complete'
};

const VALID_TIERS = ['free', 'professional'];
const VALID_BILLING_CYCLES = ['monthly', 'annual'];

const initialState = {
  current_step: STEPS.BUSINESS_INFO,
  onboarding_status: STEPS.BUSINESS_INFO,
  formData: {
    selected_plan: null,
    billing_cycle: 'monthly'
  },
  isLoading: false,
  error: null,
  initialized: false
};

const createOnboardingStore = () => {
  return create(
    devtools(
      persist(
        (set, get) => ({
          ...initialState,
          requestId: generateRequestId(),

          setStep: (step) => {
            const requestId = get().requestId;
            
            logger.debug('Setting step:', {
              requestId,
              previousStep: get().current_step,
              newStep: step,
              timestamp: new Date().toISOString()
            });

            if (!Object.values(STEPS).includes(step)) {
              const error = `Invalid step: ${step}`;
              logger.error(error, { requestId });
              set(state => ({ ...state, error }));
              return false;
            }

            set(state => ({ 
              ...state,
              current_step: step,
              onboarding_status: step,
              error: null 
            }));
            return true;
          },

          setTier: (tier) => {
            const requestId = get().requestId;
            
            logger.debug('Setting subscription tier:', {
              requestId,
              previousTier: get().formData.selected_plan,
              newTier: tier
            });

            // Allow null for resetting
            if (tier === null) {
              set(state => ({
                ...state,
                formData: {
                  ...state.formData,
                  selected_plan: null
                },
                error: null
              }));
              return true;
            }

            const normalizedTier = tier.toLowerCase();
            if (!VALID_TIERS.includes(normalizedTier)) {
              const error = `Invalid tier: ${tier}`;
              logger.error(error, { requestId });
              set(state => ({ ...state, error }));
              return false;
            }

            set(state => ({
              ...state,
              formData: {
                ...state.formData,
                selected_plan: normalizedTier
              },
              error: null
            }));
            return true;
          },

          setBillingCycle: (cycle) => {
            const requestId = get().requestId;
            
            logger.debug('Setting billing cycle:', {
              requestId,
              previousCycle: get().formData.billing_cycle,
              newCycle: cycle
            });

            if (!VALID_BILLING_CYCLES.includes(cycle)) {
              const error = `Invalid billing cycle: ${cycle}`;
              logger.error(error, { requestId });
              set(state => ({ ...state, error }));
              return false;
            }

            set(state => ({
              ...state,
              formData: {
                ...state.formData,
                billing_cycle: cycle
              },
              error: null
            }));
            return true;
          },

          synchronizeSession: async (session) => {
            const requestId = get().requestId;
            
            logger.debug('Starting session synchronization:', {
              requestId,
              current_step: get().current_step,
              sessionStatus: session?.user?.onboarding_status
            });

            try {
              set(state => ({ ...state, isLoading: true }));
              const response = await onboardingApi.getStatus(session.user.accessToken);

              if (!response?.success) {
                throw new Error('Failed to get status');
              }

              const { current_step, selected_plan, billing_cycle } = response.data;

              set(state => ({
                ...state,
                current_step,
                onboarding_status: current_step,
                formData: {
                  ...state.formData,
                  selected_plan,
                  billing_cycle: billing_cycle || 'monthly'
                },
                initialized: true,
                error: null,
                isLoading: false
              }));

              logger.debug('State synchronized:', {
                requestId,
                current_step,
                selected_plan,
                billing_cycle
              });

              return true;

            } catch (error) {
              const errorMessage = 'Synchronization failed';
              logger.error(errorMessage, {
                requestId,
                error: error.message,
                stack: error.stack
              });
              
              set(state => ({
                ...state,
                error: errorMessage,
                isLoading: false
              }));
              
              return false;
            }
          },

          validateTransition: async (fromStep, toStep, session) => {
            const state = get();
            const requestId = state.requestId;

            logger.debug('Validating step transition:', {
              requestId,
              fromStep,
              toStep,
              currentStatus: state.onboarding_status,
              selected_plan: state.formData.selected_plan
            });

            try {
              set(state => ({ ...state, isLoading: true }));
              
              const validationResult = await onboardingApi.validateStep(fromStep, toStep, {
                selected_plan: state.formData.selected_plan,
                billing_cycle: state.formData.billing_cycle,
                current_step: fromStep,
                next_step: toStep
              });

              set(state => ({ ...state, isLoading: false }));

              return validationResult?.success || false;

            } catch (error) {
              logger.error('Transition validation failed:', {
                requestId,
                error: error.message,
                fromStep,
                toStep
              });
              
              set(state => ({ 
                ...state, 
                error: 'Transition validation failed',
                isLoading: false
              }));
              
              return false;
            }
          },

          getState: () => ({
            ...get(),
            isValid: !get().error && get().initialized
          }),

          reset: () => {
            logger.debug('Resetting store state:', {
              requestId: get().requestId
            });
            set({
              ...initialState,
              requestId: generateRequestId()
            });
          }
        }),
        {
          name: APP_CONFIG.storage.keys.onboarding,
          version: APP_CONFIG.storage.version,
          getStorage: () => localStorage,
          partialize: (state) => ({
            current_step: state.current_step,
            onboarding_status: state.onboarding_status,
            formData: state.formData,
            initialized: state.initialized
          })
        }
      )
    )
  );
};

export default createOnboardingStore();