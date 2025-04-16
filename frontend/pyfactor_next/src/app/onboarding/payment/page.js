'use client';

import { useState, useEffect, useTransition, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useUser } from '@/hooks/useUser';
import { useOnboarding } from '@/hooks/useOnboarding';
import { STEP_NAMES, STEP_METADATA } from '@/app/onboarding/config/steps';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { 
  ArrowPathIcon, 
  ExclamationTriangleIcon, 
  ArrowLongLeftIcon 
} from '@heroicons/react/24/outline';
import Payment from '@/app/onboarding/components/steps/Payment/Payment';
import { fetchWithCache } from '@/utils/cacheClient';
import { logger } from '@/utils/logger';

// Fallback component for loading state
const PaymentFallback = () => {
  return (
    <div className="w-full h-full flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center">
        <div className="animate-spin h-12 w-12 text-blue-600 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </div>
        <h2 className="text-xl font-medium text-gray-700">Preparing payment details...</h2>
        <p className="text-gray-500 mt-2">This will only take a moment</p>
      </div>
    </div>
  );
};

const PaymentContent = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { data: session, status: sessionStatus } = useSession();
  const { 
    user, 
    status: userStatus,
    updateUserCache,
    getUserFromCache
  } = useUser();
  const { getCurrentStep, getOnboardingState } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [error, setError] = useState(null);

  // Check if we need to redirect based on subscription plan
  useEffect(() => {
    if (!loading && !isPending) {
      const cachedUser = getUserFromCache();
      const userPlan = cachedUser?.subscription?.plan?.toLowerCase() 
        || user?.attributes?.['custom:subscription_plan']?.toLowerCase()
        || 'starter';
      
      // Only Professional and Enterprise plans need payment
      if (userPlan !== 'professional' && userPlan !== 'enterprise') {
        logger.info('[PaymentPage] Free plan detected, redirecting to setup', { plan: userPlan });
        startTransition(() => {
          router.replace('/onboarding/setup');
        });
      }
    }
  }, [loading, isPending, user, router, getUserFromCache]);

  // Load subscription data from cache
  useEffect(() => {
    async function loadSubscriptionData() {
      try {
        setLoading(true);
        
        // Try to get from AppSync cache first
        const cachedSubscription = await fetchWithCache('subscription', null, {
          bypassCache: false
        });
        
        if (cachedSubscription) {
          logger.debug('[PaymentPage] Loaded subscription from cache', { data: cachedSubscription });
          setSubscriptionData(cachedSubscription);
          setLoading(false);
          return;
        }
        
        // Fallback to session storage if needed (for migration purposes)
        if (!cachedSubscription && typeof window !== 'undefined') {
          const pendingSubscription = sessionStorage.getItem('pendingSubscription');
          if (pendingSubscription) {
            try {
              const parsedData = JSON.parse(pendingSubscription);
              logger.debug('[PaymentPage] Loaded subscription from sessionStorage', { data: parsedData });
              
              // Store in AppSync cache for future use
              await fetchWithCache('subscription', parsedData, {
                bypassCache: true
              });
              
              setSubscriptionData(parsedData);
              
              // Clear from sessionStorage after migrating to cache
              sessionStorage.removeItem('pendingSubscription');
            } catch (parseError) {
              logger.error('[PaymentPage] Failed to parse subscription data:', { error: parseError.message || String(parseError) });
              // Create a fallback plan since we couldn't parse the existing one
              const fallbackPlan = {
                plan: 'professional',
                billing_interval: 'monthly',
                payment_method: 'credit_card',
                created_at: new Date().toISOString()
              };
              setSubscriptionData(fallbackPlan);
              
              // Try to store the fallback in cache
              try {
                await fetchWithCache('subscription', fallbackPlan, { bypassCache: true });
              } catch (cacheError) {
                logger.error('[PaymentPage] Failed to store fallback plan in cache:', { error: cacheError.message || String(cacheError) });
              }
            }
          } else {
            logger.warn('[PaymentPage] No subscription data found in sessionStorage - redirecting to subscription page');
            router.replace('/onboarding/subscription');
          }
        }
      } catch (err) {
        logger.error('[PaymentPage] Error loading subscription data:', { error: err?.message || String(err) || 'Unknown error' });
        const errorMessage = err?.message || 'Failed to load subscription data. Please try again.';
        setError(new Error(errorMessage));
        
        // Let's handle this gracefully by redirecting back to subscription selection
        setTimeout(() => {
          router.replace('/onboarding/subscription');
        }, 1500);
      } finally {
        setLoading(false);
      }
    }

    loadSubscriptionData();
  }, [router]);

  if (loading || isPending) {
    return <PaymentFallback />;
  }

  return (
    <ErrorBoundary
      fallback={(error) => (
        <div className="max-w-3xl mx-auto mt-8 p-8 bg-white rounded-xl shadow-sm">
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 mb-6 text-red-500">
              <ExclamationTriangleIcon className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold text-red-600 mb-3">Payment Component Error</h2>
            <p className="text-gray-600 text-center max-w-md mb-6">
              {error.message || "An unexpected error occurred while loading the payment form"}
            </p>
            
            <button
              onClick={() => router.refresh()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      )}
    >
      <Payment 
        metadata={STEP_METADATA[STEP_NAMES.PAYMENT]} 
        subscriptionData={subscriptionData} 
      />
    </ErrorBoundary>
  );
};

const PaymentPage = () => {
  return (
    <Suspense fallback={<PaymentFallback />}>
      <PaymentContent />
    </Suspense>
  );
};

export default PaymentPage;
