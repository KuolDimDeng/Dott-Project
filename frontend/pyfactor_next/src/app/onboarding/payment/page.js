'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { Payment } from '../components/steps';
import { STEP_METADATA, STEP_NAMES } from '../components/registry';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useEnhancedOnboarding } from '@/hooks/useEnhancedOnboarding';
import { ExclamationTriangleIcon, ArrowPathIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const PaymentFallback = () => (
  <div className="flex justify-center items-center min-h-[60vh]">
    <div className="flex flex-col items-center">
      <LoadingSpinner size="large" />
      <p className="mt-4 text-gray-600 font-medium">Preparing your payment details...</p>
    </div>
  </div>
);

const PaymentContent = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { updateOnboardingStatus } = useOnboarding();
  const { verifyState, updateState, isLoading: isStateLoading, error: stateError } = useEnhancedOnboarding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);

  // Use a more direct approach with higher priority before API calls
  useEffect(() => {
    // Early check for free or basic plan
    const checkPlanImmediate = () => {
      if (!session?.user) return false;
      
      // Extract plan type from Cognito attributes
      const subplan = session.user['custom:subplan']?.toLowerCase();
      console.log('[Payment] Plan check - User plan:', subplan);
      
      if (subplan === 'free' || subplan === 'basic') {
        console.log('[Payment] Free/Basic plan detected, immediately redirecting to dashboard');
        // Use replace instead of window.location for a cleaner redirect
        router.replace('/dashboard?freePlan=true&immediate=true');
        return true;
      }
      return false;
    };
    
    if (checkPlanImmediate()) {
      // Prevent further initialization
      return;
    }
  }, [session, router]);

  // Initialize on page load to verify state and set current step
  useEffect(() => {
    const initPage = async () => {
      try {
        // Check for free or basic plan in Cognito attributes first
        const subplan = session?.user?.['custom:subplan']?.toLowerCase();
        if (subplan === 'free' || subplan === 'basic') {
          logger.info('[Payment] Basic/Free plan detected in user attributes, redirecting to dashboard');
          router.replace('/dashboard?freePlan=true');
          return;
        }
        
        // Verify the current state with the enhanced hook
        const stateVerification = await verifyState('payment');
        
        if (!stateVerification.isValid) {
          logger.warn('[Payment] Invalid state, redirecting to:', stateVerification.redirectUrl);
          router.replace(stateVerification.redirectUrl);
          return;
        }
        
        // Set the current step to 'payment'
        await updateState('payment', {});
        logger.debug('[Payment] State verification successful and step updated');
      } catch (err) {
        logger.error('[Payment] Error during initialization:', err);
        // On error, check if we should redirect
        const subplan = session?.user?.['custom:subplan']?.toLowerCase();
        if (subplan === 'free' || subplan === 'basic') {
          // Redirect to dashboard as fallback
          router.replace('/dashboard?freePlan=true&fallback=true');
        }
      }
    };
    
    initPage();
  }, [verifyState, updateState, router, session]);

  // Immediate redirect for free plan that shouldn't be on payment page
  useEffect(() => {
    const checkFreePlan = () => {
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
          try {
            acc[key] = decodeURIComponent(value);
          } catch (e) {
            acc[key] = value;
          }
        }
        return acc;
      }, {});
      
      // Check for custom:subplan in cognito user data
      const subplan = session?.user?.['custom:subplan']?.toLowerCase();
      
      if (cookies.selectedPlan === 'free' || 
          cookies.selectedPlan === 'basic' || 
          cookies.freePlanSelected === 'true' ||
          subplan === 'free' ||
          subplan === 'basic') {
        logger.warn('[Payment] Free/Basic plan detected - redirecting to dashboard');
        window.location.replace('/dashboard?freePlan=true');
        return true;
      }
      return false;
    };
    
    if (!checkFreePlan()) {
      // Continue loading the page
    }
  }, [session]);

  // Load and validate subscription data
  useEffect(() => {
    const loadPaymentInfo = async () => {
      try {
        // Get subscription data from session storage
        const pendingSubscription = sessionStorage.getItem('pendingSubscription');
        if (!pendingSubscription) {
          setError('No subscription data found. Please select a plan first.');
          setLoading(false);
          return;
        }
        
        const parsedData = JSON.parse(pendingSubscription);
        logger.debug('[Payment] Loaded subscription data:', parsedData);
        
        // Validate plan type
        const planLowerCase = parsedData.plan?.toLowerCase();
        const isPaidPlan = ['professional', 'enterprise'].includes(planLowerCase);
        
        if (!isPaidPlan) {
          logger.warn('[Payment] Non-paid plan detected:', planLowerCase);
          setError('Payment is only required for Professional and Enterprise plans');
          setLoading(false);
          return;
        }
        
        // Store validated subscription data
        setSubscriptionData(parsedData);
        setLoading(false);
      } catch (e) {
        logger.error('[Payment] Error loading payment info:', e);
        setError('An error occurred while loading payment information');
        setLoading(false);
      }
    };

    loadPaymentInfo();
  }, []);

  // Handle authentication status
  useEffect(() => {
    if (status === 'unauthenticated') {
      logger.warn('[Payment] Unauthenticated access - redirecting to sign in');
      router.replace('/auth/signin');
    }
  }, [status, router]);

  // Loading states
  if (status === 'loading' || isStateLoading) {
    return <PaymentFallback />;
  }

  // Authentication check
  if (status === 'unauthenticated') {
    return <PaymentFallback />;
  }
  
  // Show loading state with progress indicator
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-8 bg-white rounded-xl shadow-sm">
        <div className="flex flex-col items-center py-10">
          <div className="w-16 h-16 mb-6 text-blue-500">
            <ArrowPathIcon className="w-full h-full animate-spin text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Preparing Your Payment</h2>
          <p className="text-gray-500 text-center max-w-md">
            We're setting up your payment details for your selected subscription plan.
          </p>
          <div className="mt-8 w-full max-w-md">
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show error state with action buttons
  if (error || stateError) {
    const errorMessage = error || stateError;
    
    return (
      <div className="max-w-3xl mx-auto mt-8 p-8 bg-white rounded-xl shadow-sm">
        <div className="flex flex-col items-center py-6">
          <div className="w-16 h-16 mb-6 text-amber-500">
            <ExclamationTriangleIcon className="w-full h-full" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Payment Setup Issue</h2>
          <p className="text-gray-500 text-center max-w-md mb-6">
            {errorMessage}
          </p>
          
          <div className="flex gap-4 mt-4">
            <button 
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              onClick={() => router.push('/onboarding/subscription')}
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Return to Plans
            </button>
            
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 transition-colors"
              onClick={() => window.location.reload()}
            >
              <ArrowPathIcon className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
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
