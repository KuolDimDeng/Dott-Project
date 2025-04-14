import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '@/utils/logger';
import { updateOnboardingStep, validateBusinessInfo } from '@/utils/onboardingUtils';
import { setCognitoUserAttribute, getCognitoUserAttributes } from '@/utils/cognitoUtils';
import { setInAppCache, getFromAppCache } from '@/utils/appCacheUtils';

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
          await updateOnboardingStep('BUSINESS_INFO', formattedAttributes);

          set({
            businessInfo: info,
            isLoading: false,
            error: null
          });

          logger.debug('[OnboardingStore] Business info updated successfully');

          // Store business info in Cognito custom attributes
          try {
            await setCognitoUserAttribute('custom:businessName', info.businessName || '');
            await setCognitoUserAttribute('custom:businessType', info.businessType || '');
          } catch (err) {
            logger.warn('[OnboardingStore] Failed to update Cognito attributes:', err);
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
      
      setSubscription: async (plan, interval) => {
        logger.debug('[OnboardingStore] Setting subscription', { plan, interval });
        set({ 
          selectedPlan: plan,
          subscriptionInterval: interval
        });
        
        // Store plan selection in Cognito attribute
        if (plan === 'free') {
          try {
            await setCognitoUserAttribute('custom:plan', 'free');
            await setInAppCache('freePlanSelected', 'true');
          } catch (err) {
            logger.warn('[OnboardingStore] Failed to update Cognito attributes:', err);
          }
        } else {
          try {
            await setCognitoUserAttribute('custom:plan', plan);
            await setCognitoUserAttribute('custom:subscriptionInterval', interval);
          } catch (err) {
            logger.warn('[OnboardingStore] Failed to update Cognito attributes:', err);
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
      isComplete: async () => {
        // Check Cognito attributes first for fastest performance
        try {
          const attributes = await getCognitoUserAttributes();
          
          if (attributes) {
            const setupCompleted = attributes['custom:setupCompleted'] === 'true';
            const onboardingStep = attributes['custom:onboardingStep'];
            
            if (setupCompleted || onboardingStep === 'complete') {
              return true;
            }
          }
        } catch (err) {
          // Silent fail and continue with store check
          logger.warn('[OnboardingStore] Failed to get Cognito attributes:', err);
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