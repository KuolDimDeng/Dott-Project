import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '@/utils/logger';
import { updateOnboardingStep, validateBusinessInfo } from '@/utils/onboardingUtils';
import { saveUserPreferences, PREF_KEYS } from '@/utils/userPreferences';
import { setCacheValue, getCacheValue } from @/utils/appCache';

const useOnboardingStore = create(
  persist(
    (set, get) => ({
      // Business info state
      businessInfo: null,
      
      // Subscription state
      selectedPlan: null,
      subscriptionInterval: null,
      
      // Payment state
      paymentMethod: null,
      
      // Row-level security context
      rlsContext: null,
      
      // Loading and error states
      isLoading: false,
      error: null,
      
      // Track which pages have been visited
      visitedPages: {},
      
      // Fast access cached data - optimized for RLS
      cachedUserData: null,
      cachedPermissions: null,
      
      // Actions
      setBusinessInfo: async (info) => {
        try {
          set({ isLoading: true, error: null });
          logger.debug('[OnboardingStore] Validating business info:', info);

          // Validate business info
          const formattedAttributes = await validateBusinessInfo(info);

          // Update onboarding step with business info
          await updateOnboardingStep('business_info', formattedAttributes);

          set({
            businessInfo: info,
            isLoading: false,
            error: null
          });

          logger.debug('[OnboardingStore] Business info updated successfully');

          // Update Cognito attributes and AppCache for cross-page persistence
          try {
            // Store in AppCache for immediate UI feedback
            setCacheValue('business_info', info);
            setCacheValue(PREF_KEYS.BUSINESS_NAME, info.businessName || '');
            setCacheValue(PREF_KEYS.BUSINESS_TYPE, info.businessType || '');
            
            // Update Cognito attributes
            saveUserPreferences({
              [PREF_KEYS.BUSINESS_NAME]: info.businessName || '',
              [PREF_KEYS.BUSINESS_TYPE]: info.businessType || ''
            }).catch(err => {
              logger.warn('[OnboardingStore] Failed to update Cognito business info:', err);
            });
          } catch (err) {
            // Silent fail on storage errors
            logger.warn('[OnboardingStore] Error updating business info in storage:', err);
          }

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
      
      setSubscription: (plan, interval) => {
        logger.debug('[OnboardingStore] Setting subscription', { plan, interval });
        set({ 
          selectedPlan: plan,
          subscriptionInterval: interval
        });
        
        // For free plan fast path, update Cognito and AppCache
        if (plan === 'free') {
          try {
            // Store in AppCache for immediate UI feedback
            setCacheValue('subscription_plan', 'free');
            setCacheValue('free_plan_selected', 'true');
            
            // Update Cognito attributes
            saveUserPreferences({
              [PREF_KEYS.SUBSCRIPTION_PLAN]: 'free'
            }).catch(err => {
              logger.warn('[OnboardingStore] Failed to update Cognito subscription info:', err);
            });
          } catch (err) {
            // Silent fail on storage errors
            logger.warn('[OnboardingStore] Error updating subscription in storage:', err);
          }
        }
      },
      
      setPaymentMethod: (paymentMethod) => {
        logger.debug('[OnboardingStore] Setting payment method');
        set({ paymentMethod });
      },
      
      // Set RLS context for the user
      setRLSContext: (rlsContext) => {
        logger.debug('[OnboardingStore] Setting RLS context');
        set({ rlsContext });
      },
      
      // Mark a page as visited
      markPageVisited: (page) => {
        logger.debug('[OnboardingStore] Marking page visited', { page });
        const visitedPages = get().visitedPages;
        set({ 
          visitedPages: { 
            ...visitedPages, 
            [page]: new Date().toISOString() 
          } 
        });
      },
      
      // Cache user data for faster loading
      cacheUserData: (userData) => {
        logger.debug('[OnboardingStore] Caching user data');
        set({ cachedUserData: userData });
      },
      
      // Cache permissions for faster RLS checks
      cachePermissions: (permissions) => {
        logger.debug('[OnboardingStore] Caching permissions');
        set({ cachedPermissions: permissions });
      },
      
      // Set loading state
      setLoading: (isLoading) => set({ isLoading }),
      
      // Set error state
      setError: (error) => set({ error }),
      
      // Reset entire store
      reset: () => {
        logger.debug('[OnboardingStore] Resetting store');
        set({
          businessInfo: null,
          selectedPlan: null,
          subscriptionInterval: null,
          paymentMethod: null,
          rlsContext: null,
          isLoading: false,
          error: null,
          visitedPages: {},
          cachedUserData: null,
          cachedPermissions: null
        });
      },
      
      // Fast path helper that checks for completion without API calls
      isComplete: () => {
        // Check AppCache first for fastest performance
        try {
          if (typeof window !== 'undefined') {
            // Check if onboarding is complete via AppCache
            const setupCompleted = getCacheValue('user_pref_custom:setupdone') === 'true';
            const onboardingStep = getCacheValue('user_pref_custom:onboarding_step');
            const onboardingStatus = getCacheValue('user_pref_custom:onboarding');
            
            if (setupCompleted || onboardingStep === 'complete' || onboardingStatus === 'COMPLETE') {
              return true;
            }
          }
        } catch (err) {
          // Silent fail and continue with store check
          logger.warn('[OnboardingStore] Error checking completion status from AppCache:', err);
        }
        
        // Then check stored state
        const { businessInfo, selectedPlan, rlsContext } = get();
        
        // For RLS, we consider onboarding complete if we have:
        // 1. Business info
        // 2. Selected plan
        // 3. RLS context (means permissions are set up)
        return !!(businessInfo && selectedPlan && rlsContext);
      }
    }),
    {
      name: 'onboarding-store',
      // Only persist these fields
      partialize: (state) => ({
        businessInfo: state.businessInfo,
        selectedPlan: state.selectedPlan,
        subscriptionInterval: state.subscriptionInterval,
        visitedPages: state.visitedPages
      })
    }
  )
);

export default useOnboardingStore;