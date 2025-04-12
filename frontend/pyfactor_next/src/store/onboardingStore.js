import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '@/utils/logger';
import { updateOnboardingStep, validateBusinessInfo } from '@/utils/onboardingUtils';

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

          // Update cookie for cross-page persistence
          try {
            const now = new Date();
            const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            document.cookie = `businessName=${encodeURIComponent(info.businessName || '')}; path=/; expires=${expires.toUTCString()}; samesite=lax`;
            document.cookie = `businessType=${encodeURIComponent(info.businessType || '')}; path=/; expires=${expires.toUTCString()}; samesite=lax`;
          } catch (err) {
            // Silent fail on cookie errors
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
        
        // Mark cookie for free plan fast path
        if (plan === 'free') {
          try {
            const now = new Date();
            const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            document.cookie = `freePlanSelected=true; path=/; expires=${expires.toUTCString()}; samesite=lax`;
          } catch (err) {
            // Silent fail on cookie errors
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
        // Check cookies first for fastest performance
        try {
          if (typeof document !== 'undefined') {
            const getCookie = (name) => {
              const value = `; ${document.cookie}`;
              const parts = value.split(`; ${name}=`);
              if (parts.length === 2) return parts.pop().split(';').shift();
              return null;
            };
            
            // Check if onboarding is complete via cookies
            const setupCompleted = getCookie('setupCompleted') === 'true';
            const onboardingStep = getCookie('onboardingStep');
            
            if (setupCompleted || onboardingStep === 'complete') {
              return true;
            }
          }
        } catch (err) {
          // Silent fail and continue with store check
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