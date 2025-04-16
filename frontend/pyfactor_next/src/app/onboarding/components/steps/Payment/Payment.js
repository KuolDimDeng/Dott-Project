'use client';

import React, { memo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Image from 'next/image';
import { StepHeader } from '@/app/onboarding/components/shared/StepHeader';
import { StepProgress } from '@/app/onboarding/components/shared/StepProgress';
import { usePaymentForm } from './usePaymentForm';
import { useOnboarding } from '@/hooks/useOnboarding';
import { logger } from '@/utils/logger';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { StepContainer } from '@/app/onboarding/components/StepContainer';
import { PaymentForm } from './PaymentForm';
import { fetchWithCache } from '@/utils/cacheClient';
import { 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';

// Import custom SVG icons to replace MUI icons
const PublicIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
  </svg>
);

const PaymentsIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-9-1c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-6v11c0 1.1-.9 2-2 2H4v-2h17V7h2z" />
  </svg>
);

const InventoryIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.5 14H8c-.28 0-.5-.22-.5-.5v-1c0-.28.22-.5.5-.5h7.5c.28 0 .5.22.5.5v1c0 .28-.22.5-.5.5zm3-3H8c-.28 0-.5-.22-.5-.5v-1c0-.28.22-.5.5-.5h10.5c.28 0 .5.22.5.5v1c0 .28-.22.5-.5.5zm0-3H8c-.28 0-.5-.22-.5-.5v-1c0-.28.22-.5.5-.5h10.5c.28 0 .5.22.5.5v1c0 .28-.22.5-.5.5z" />
  </svg>
);

const SecurityIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
  </svg>
);

const GroupsIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58C.48 14.9 0 15.62 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c.37-.06.74-.1 1.13-.1.99 0 1.93.21 2.78.58.86.32 1.34 1.04 1.34 1.85V18h-4.5v-1.61c0-.83-.23-1.61-.63-2.29zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z" />
  </svg>
);

const CreditCardIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
  </svg>
);

const CheckCircleOutlineIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.59 7.58L10 14.17l-3.59-3.58L5 12l5 5 8-8zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
  </svg>
);

const AccountBalanceIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 10h3v7H4v-7zm6.5 0h3v7h-3v-7zM2 19h20v3H2v-3zm15-9h3v7h-3v-7zm-5-7L2 6v2h20V6L12 3z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
  </svg>
);

// Pricing function
const getPricing = (plan, billingCycle = 'monthly') => {
  if (plan === 'professional') {
    return billingCycle === 'monthly' ? '15' : '150';
  } else if (plan === 'enterprise') {
    return billingCycle === 'monthly' ? '45' : '450';
  }
  return '0';
};

const PaymentComponent = ({ metadata }) => {
  const { handlePaymentSuccess, handleBack, isLoading, user } =
    usePaymentForm();
  const { currentStep, isStepCompleted, getOnboardingState } = useOnboarding();
  const { user: userData, setUserAttributes } = useUser();
  const router = useRouter();
  
  // Get the updateOnboardingStatus function from the hook
  const { updateOnboardingStatus } = useOnboarding();
  
  // Log onboarding status on mount and update step if needed
  useEffect(() => {
    try {
      const onboardingState = getOnboardingState ? getOnboardingState() : 'unknown';
      const onboardingStepCookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith('onboardingStep='));
      const onboardingStatusCookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith('onboardedStatus='));
      
      // If current step is not 'payment', try to update it
      if (currentStep !== 'payment' && updateOnboardingStatus) {
        logger.debug('[Payment Component] Attempting to update step to payment from component');
        try {
          updateOnboardingStatus('PAYMENT');
        } catch (updateErr) {
          logger.error('[Payment Component] Failed to update step from component:', { error: updateErr.message });
        }
      }
      
      logger.debug('[Payment Component] Onboarding status check:', {
        currentStep,
        onboardingState,
        cookies: {
          onboardingStep: onboardingStepCookie ? onboardingStepCookie.split('=')[1] : 'not found',
          onboardedStatus: onboardingStatusCookie ? onboardingStatusCookie.split('=')[1] : 'not found', 
        },
        completedSteps: {
          businessInfo: isStepCompleted('businessinfo'),
          subscription: isStepCompleted('subscription'),
          payment: isStepCompleted('payment'),
          setup: isStepCompleted('setup'),
        }
      });
    } catch (err) {
      logger.error('[Payment Component] Error logging onboarding state:', { error: err.message });
    }
  }, [currentStep, isStepCompleted, getOnboardingState, updateOnboardingStatus]);
  
  // Checkout state
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Add handleRetry function
  const handleRetry = () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    
    // Reload subscription data or clear error state
    try {
      const pendingSubscription = sessionStorage.getItem('pendingSubscription');
      if (pendingSubscription) {
        const data = JSON.parse(pendingSubscription);
        logger.debug('[Payment Component] Reloaded subscription data on retry', { data });
        setSubscriptionData(data);
      }
    } catch (e) {
      logger.error('[Payment Component] Error reloading data on retry:', { error: e.message });
    } finally {
      setTimeout(() => {
        setCheckoutLoading(false);
      }, 500); // Small delay for UI feedback
    }
  };
  
  // Load subscription data from sessionStorage - no router calls
  useEffect(() => {
    try {
      const pendingSubscription = sessionStorage.getItem('pendingSubscription');
      if (pendingSubscription) {
        const data = JSON.parse(pendingSubscription);
        logger.debug('[Payment Component] Loaded subscription data:', { data });
        
        // Validate the subscription plan
        const plan = data.plan?.toLowerCase();
        if (!plan || !['professional', 'enterprise'].includes(plan)) {
          logger.error('[Payment Component] Invalid subscription plan:', { 
            plan,
            fullData: data
          });
          setCheckoutError('Invalid subscription plan. Payment is only required for Professional and Enterprise tiers.');
          return;
        }
        
        setSubscriptionData(data);
      } else {
        logger.error('[Payment Component] No pending subscription found in sessionStorage');
        setCheckoutError('No subscription data found. Please select a plan first.');
      }
    } catch (e) {
      logger.error('[Payment Component] Error loading subscription data:', { error: e.message });
      setCheckoutError('Error loading subscription data');
    } finally {
      setCheckoutLoading(false);
    }
  }, []);
  
  // If not a paid plan, set error flag
  useEffect(() => {
    if (!checkoutLoading && subscriptionData && subscriptionData.plan) {
      const normalizedPlan = subscriptionData.plan.toLowerCase();
      if (normalizedPlan !== 'professional' && normalizedPlan !== 'enterprise') {
        logger.error('[Payment Component] Not a paid plan:', { normalizedPlan });
        setCheckoutError('Invalid subscription plan. Payment is only required for Professional and Enterprise tiers.');
      }
    }
  }, [checkoutLoading, subscriptionData]);
  
  // If not credit card payment method, set flag for redirection
  useEffect(() => {
    if (!checkoutLoading && subscriptionData && subscriptionData.payment_method && subscriptionData.payment_method !== 'credit_card') {
      logger.debug('[Payment Component] Non-credit card payment method selected, setting redirect flag:', { 
        paymentMethod: subscriptionData.payment_method 
      });
      setCheckoutError('Non-credit card payment method selected');
    }
  }, [checkoutLoading, subscriptionData]);
  
  // Centralized redirect handler for all redirection scenarios
  useEffect(() => {
    if (checkoutError && !checkoutLoading) {
      if (checkoutError.includes('Invalid subscription plan') || 
          checkoutError.includes('No subscription data found')) {
        router.replace('/onboarding/subscription');
      } else if (checkoutError.includes('Non-credit card payment method')) {
        router.replace('/dashboard');
      }
    }
  }, [checkoutError, checkoutLoading, router]);
  
  // Get subscription details from stored data or user data - ensure we're using the proper plan
  // Prioritize session storage data over user attributes, with fallbacks
  const subscriptionPlan = (() => {
    // First try to get plan from subscription data 
    if (subscriptionData && typeof subscriptionData === 'object' && subscriptionData.plan) {
      const plan = String(subscriptionData.plan).toLowerCase();
      if (['professional', 'enterprise'].includes(plan)) {
        return plan;
      }
    }
    
    // Then try to get from user attributes
    const attrPlan = userData?.attributes?.['custom:subscription_plan']?.toLowerCase();
    if (attrPlan && ['professional', 'enterprise'].includes(attrPlan)) {
      return attrPlan;
    }
    
    // Default to professional if no valid plan found
    return 'professional';
  })();
  
  // Check both billing_interval and interval properties since they might be inconsistent
  const billingCycle = (() => {
    // Try various paths to get billing cycle with proper validation
    if (subscriptionData && typeof subscriptionData === 'object') {
      if (subscriptionData.billing_interval && ['monthly', 'annual'].includes(subscriptionData.billing_interval)) {
        return subscriptionData.billing_interval;
      }
      if (subscriptionData.interval && ['monthly', 'annual'].includes(subscriptionData.interval)) {
        return subscriptionData.interval;
      }
    }
    
    // Try from user attributes
    const attrCycle = userData?.attributes?.['custom:billing_cycle']?.toLowerCase();
    if (attrCycle && ['monthly', 'annual'].includes(attrCycle)) {
      return attrCycle;
    }
    
    // Default to monthly
    return 'monthly';
  })();
  
  const paymentMethod = subscriptionData?.payment_method || 'credit_card';
  
  // Debug subscription info
  useEffect(() => {
    logger.debug('[Payment Component] Using subscription details:', {
      subscriptionPlan,
      billingCycle,
      paymentMethod,
      fromSessionStorage: !!subscriptionData,
      rawSubscriptionData: subscriptionData,
      fromUserAttributes: !!userData?.attributes?.['custom:subscription_plan']
    });
  }, [subscriptionPlan, billingCycle, paymentMethod, subscriptionData, userData]);
  
  const steps = [
    {
      label: 'Business Info',
      current: false,
      completed: isStepCompleted('businessinfo'),
    },
    {
      label: 'Subscription',
      current: false,
      completed: isStepCompleted('subscription'),
    },
    ...(subscriptionPlan === 'professional' || subscriptionPlan === 'enterprise'
      ? [
          {
            label: 'Payment',
            current: currentStep === 'payment',
            completed: isStepCompleted('payment'),
          },
        ]
      : []),
    {
      label: 'Setup',
      current: currentStep === 'setup',
      completed: isStepCompleted('setup'),
    },
  ];

  const handlePaymentSubmit = async () => {
    setProcessingPayment(true);
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      // Here you would typically integrate with your payment provider (e.g., Stripe)
      // For now, we'll simulate a successful payment
      const paymentId = `pay_${Date.now()}`;
      
      // Store setup info for dashboard
      sessionStorage.setItem('pendingSchemaSetup', JSON.stringify({
        plan: subscriptionPlan,
        paymentMethod: 'credit_card',
        timestamp: new Date().toISOString(),
        status: 'pending'
      }));
      
      await handlePaymentSuccess(paymentId);
      
      // Success message
      logger.info('[Payment] Payment successful, redirecting to dashboard');
      
      // Redirect will be handled by usePaymentForm
    } catch (error) {
      logger.error('Payment submission failed:', error);
      setCheckoutError(error.message || 'Failed to process payment');
      setProcessingPayment(false);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Get region-specific payment methods
  const getRegionalPaymentMethods = () => {
    // Africa
    if (['GH', 'KE', 'NG', 'ZA', 'TZ', 'UG', 'RW'].includes(userData?.businessCountry || 'US')) {
      return (
        <>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 my-2 mr-2">
            <PaymentsIcon />
            <span className="ml-1">Mobile Money Support</span>
          </span>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Includes M-Pesa, MTN, Airtel Money, and other local options
            {subscriptionPlan === 'enterprise' && ' with preferential rates'}
          </p>
        </>
      );
    }
    // North America
    else if (['US', 'CA'].includes(userData?.businessCountry || 'US')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 my-2">
          <PaymentsIcon />
          <span className="ml-1">{subscriptionPlan === 'enterprise' ? "Advanced Invoice Factoring" : "Invoice Factoring Available"}</span>
        </span>
      );
    }
    return null;
  };

  // Get plan-specific features
  const getPlanFeatures = () => {
    if (subscriptionPlan === 'professional') {
      return (
        <ul className="pl-5 mb-4">
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Up to 3 users</p>
          </li>
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Advanced inventory management with forecasting</p>
          </li>
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Global payments with reduced transaction fees</p>
          </li>
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">15 GB of storage</p>
          </li>
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Advanced reporting and analytics</p>
          </li>
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">AI-powered business insights</p>
          </li>
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Priority support</p>
          </li>
        </ul>
      );
    } else if (subscriptionPlan === 'enterprise') {
      return (
        <ul className="pl-5 mb-4">
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Unlimited users</p>
          </li>
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Everything in Professional plan</p>
          </li>
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Preferential transaction fees</p>
          </li>
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Unlimited storage</p>
          </li>
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Custom roles & permissions</p>
          </li>
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Dedicated account manager</p>
          </li>
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Advanced security features</p>
          </li>
        </ul>
      );
    }
    return null;
  };

  // Get plan-specific add-ons
  const getPlanAddOns = () => {
    if (subscriptionPlan === 'professional') {
      return (
        <ul className="pl-5 mb-4">
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Payroll & Tax processing</p>
          </li>
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">HR & CRM modules</p>
          </li>
        </ul>
      );
    } else if (subscriptionPlan === 'enterprise') {
      return (
        <ul className="pl-5 mb-4">
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Full Payroll & Tax processing included</p>
          </li>
          <li className="mb-3 relative pl-6 text-gray-600 dark:text-gray-300 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">
            <p className="text-sm">Integrated HR & CRM modules</p>
          </li>
        </ul>
      );
    }
    return null;
  };

  // Get plan-specific icons
  const getPlanChips = () => {
    const chips = [
      <span
        key="global"
        className="inline-flex items-center m-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-500 text-blue-700 bg-white dark:bg-gray-800 dark:text-blue-300"
      >
        <PublicIcon />
        <span className="ml-1">Global Business Solution</span>
      </span>,
      <span
        key="inventory"
        className="inline-flex items-center m-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-500 text-blue-700 bg-white dark:bg-gray-800 dark:text-blue-300"
      >
        <InventoryIcon />
        <span className="ml-1">Advanced Inventory</span>
      </span>
    ];
    
    if (subscriptionPlan === 'enterprise') {
      chips.push(
        <span
          key="security"
          className="inline-flex items-center m-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-500 text-blue-700 bg-white dark:bg-gray-800 dark:text-blue-300"
        >
          <SecurityIcon />
          <span className="ml-1">Enhanced Security</span>
        </span>,
        <span
          key="teams"
          className="inline-flex items-center m-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-500 text-blue-700 bg-white dark:bg-gray-800 dark:text-blue-300"
        >
          <GroupsIcon />
          <span className="ml-1">Unlimited Users</span>
        </span>
      );
    }
    
    return chips;
  };

  // Verify tier and step access with enhanced logging
  logger.debug('[Payment Component] Verifying payment access:', {
    subscriptionPlanCheck: {
      subscriptionPlan,
      isValidPlan: subscriptionPlan === 'professional' || subscriptionPlan === 'enterprise',
      rawSubscriptionData: subscriptionData,
    },
    stepCheck: {
      currentStep,
      isValidStep: currentStep === 'payment',
    },
    userData: {
      hasUserData: !!userData,
      userAttrs: userData?.attributes || {},
    },
    sessionPlan: subscriptionData?.plan || 'none',
  });
  
  // Only check plan type, not step since the step might be in transition
  if (subscriptionPlan !== 'professional' && subscriptionPlan !== 'enterprise') {
    logger.warn('[Payment Component] Invalid payment page access - wrong plan:', {
      subscriptionPlan,
      currentStep,
      reason: `Invalid plan: ${subscriptionPlan}`,
      userDataExists: !!userData,
      sessionStorageData: JSON.parse(sessionStorage.getItem('pendingSubscription') || 'null'),
    });

    return (
      <div className="max-w-lg mx-auto px-4">
        <div className="mt-4 mb-3 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg shadow-md">
          Payment is only available for Professional and Enterprise tiers
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md mb-4">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Plan Selection Issue
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You selected the <strong>{subscriptionPlan}</strong> plan, which doesn't require payment. 
            Please return to plan selection and choose either Professional or Enterprise tier if you'd like to proceed with payment.
          </p>
          
          <button
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleBack}
            disabled={isLoading || checkoutLoading}
          >
            Back to Plan Selection
          </button>
        </div>
      </div>
    );
  }

  // Verify payment method is credit_card
  if (paymentMethod !== 'credit_card') {
    return (
      <div className="max-w-lg mx-auto px-4">
        <div className="mt-4 bg-blue-100 dark:bg-blue-900 border border-blue-400 text-blue-700 dark:text-blue-200 px-4 py-3 rounded-lg shadow-md flex items-center">
          <span>Redirecting to dashboard...</span>
          <div className="ml-3 animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <StepContainer title={metadata.title} description={metadata.description}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 mb-6 text-blue-500 animate-spin">
            <ArrowPathIcon className="w-full h-full" />
          </div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">Processing your payment</h2>
          <p className="text-gray-500 text-center max-w-md">
            Please wait while we confirm your subscription details...
          </p>
        </div>
      </StepContainer>
    );
  }

  // Show success state
  if (processingPayment) {
    return (
      <StepContainer title={metadata.title} description={metadata.description}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 mb-6 text-green-500">
            <CheckCircleIcon className="w-full h-full" />
          </div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">Payment Successful!</h2>
          <p className="text-gray-500 text-center max-w-md">
            Your {subscriptionData?.plan} plan is now active. Redirecting you to complete your setup...
          </p>
          <div className="mt-6">
            <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse"></div>
            </div>
          </div>
        </div>
      </StepContainer>
    );
  }

  // Show error state
  if (checkoutError) {
    return (
      <StepContainer title={metadata.title} description={metadata.description}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 mb-6 text-red-500">
            <ExclamationCircleIcon className="w-full h-full" />
          </div>
          <h2 className="text-xl font-medium text-gray-800 mb-3">Payment Error</h2>
          <p className="text-gray-500 text-center max-w-md mb-6">
            {checkoutError}
          </p>
          <div className="flex space-x-4">
            <button 
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              onClick={() => router.push('/onboarding/subscription')}
            >
              Back to Plans
            </button>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              onClick={handleRetry}
            >
              Try Again
            </button>
          </div>
        </div>
      </StepContainer>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <StepProgress steps={steps} />

      <div className="flex flex-col items-center justify-center p-6 w-full">
        <div className="text-center mb-8 w-full">
          <Image
            src="/static/images/Pyfactor.png"
            alt="Dott Logo"
            width={150}
            height={50}
            priority
          />
          <StepHeader
            title={metadata.title}
            description={metadata.description}
            current_step={3}
            totalSteps={subscriptionPlan === 'free' ? 3 : 4}
            stepName="Payment"
          />
        </div>

        <div className="w-full mb-8 rounded-2xl overflow-hidden shadow-lg bg-white dark:bg-gray-800 transition-all duration-300">
          <div className={`p-6 relative ${
            subscriptionPlan === 'professional' 
              ? 'before:content-[""] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-blue-600 before:to-blue-400'
              : 'before:content-[""] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-purple-700 before:to-purple-400'
          }`}>
            <div className="mb-8 flex flex-col items-center">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                {subscriptionPlan === 'professional' ? 'Professional' : 'Enterprise'} Plan
              </h2>
              <span className="px-4 py-1 mb-2 bg-blue-600 text-white text-sm font-medium rounded-full">
                {billingCycle === 'monthly' ? 'Monthly Billing' : 'Annual Billing'}
              </span>
              {billingCycle === 'annual' && (
                <span className="px-3 py-0.5 text-xs font-semibold text-green-700 border border-green-500 rounded-full dark:text-green-400 dark:border-green-400">
                  Save 17%
                </span>
              )}
            </div>
            
            <hr className="mb-6 border-gray-200 dark:border-gray-700" />
            
            <div className="mb-6 flex flex-col items-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 animate-fadeIn">
              <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Payment Method
              </h3>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                <CreditCardIcon />
                <span className="ml-1">Credit/Debit Card</span>
              </span>
            </div>

            <div className="flex justify-center mb-6 flex-wrap">
              {getPlanChips()}
            </div>

            {getRegionalPaymentMethods()}

            <div className="mb-8 mt-6">
              <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                Your {subscriptionPlan === 'professional' ? 'Professional' : 'Enterprise'} plan includes:
              </h3>
              {getPlanFeatures()}
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                {subscriptionPlan === 'professional' 
                  ? 'Available add-ons at discounted rates:' 
                  : 'Included add-ons:'}
              </h3>
              {getPlanAddOns()}
            </div>

            <hr className="mb-6 mt-6 border-gray-200 dark:border-gray-700" />

            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                ${getPricing(subscriptionPlan, billingCycle)}{' '}
                <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                  {billingCycle === 'monthly' ? '/month' : '/year'}
                </span>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {billingCycle === 'monthly' ? 'Monthly subscription' : 'Annual subscription'}
              </p>
              {billingCycle === 'annual' && (
                <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                  You save ${subscriptionPlan === 'professional' 
                    ? ((15 * 12) - 150) 
                    : ((45 * 12) - 450)} per year
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap justify-center mt-4 animate-fadeIn">
              <span className="inline-flex items-center m-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600">
                <LockIcon />
                <span className="ml-1">Secure Payment</span>
              </span>
              <span className="inline-flex items-center m-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600">
                <CheckCircleOutlineIcon />
                <span className="ml-1">Cancel Anytime</span>
              </span>
              <span className="inline-flex items-center m-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600">
                <AccountBalanceIcon />
                <span className="ml-1">Invoice Available</span>
              </span>
            </div>
          </div>
          
          <div className="p-6">
            <PaymentForm 
              subscriptionData={subscriptionData}
              onSuccess={handlePaymentSubmit}
              onError={setCheckoutError}
              paymentMethod={paymentMethod}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

PaymentComponent.propTypes = {
  metadata: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    next_step: PropTypes.string,
    prevStep: PropTypes.string,
  }).isRequired,
};

const Payment = memo(PaymentComponent);

export default Payment;