import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/auth';
import { useNotification } from '@/context/NotificationContext';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';
import { logger } from '@/utils/logger';
import { forceRedirect, storeRedirectDebugInfo, safeParseJson } from '@/utils/redirectUtils';
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';
import { setCacheValue } from '@/utils/appCache';
import { retryLoadScript } from '@/utils/networkMonitor';
import { isDevelopingCountry as checkIsDevelopingCountry } from '@/services/countryDetectionService';

const SubscriptionPopup = ({ open, onClose, isOpen }) => {
  // Use either open or isOpen prop for backward compatibility
  const showPopup = open !== undefined ? open : (isOpen !== undefined ? isOpen : false);
  
  const { userData } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  
  // Default to professional plan if user is on free plan
  const [selectedPlan, setSelectedPlan] = useState((userData?.subscription_type === 'free' ? 'professional' : userData?.subscription_type) || 'professional');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [localCurrency, setLocalCurrency] = useState(null);
  const [isDevelopingCountry, setIsDevelopingCountry] = useState(false);
  
  // IMPORTANT - Only load Stripe when the popup is actually shown
  useEffect(() => {
    // Skip if not showing popup or if Stripe is already loaded
    if (!showPopup || stripeLoaded || window.Stripe || document.getElementById('stripe-js')) {
      if (window.Stripe || document.getElementById('stripe-js')) {
        setStripeLoaded(true);
      }
      return;
    }
    
    // Use the enhanced retry script loader
    const stripeUrl = 'https://js.stripe.com/v3/';
    let currentAttempt = 0;
    
    const loadStripe = async () => {
      try {
        currentAttempt++;
        
        // Log the attempt
        logger.info(`[SubscriptionPopup] Loading Stripe script (attempt ${currentAttempt})`);
        
        // Check if Stripe is already loaded before attempting
        if (window.Stripe) {
          logger.debug('[SubscriptionPopup] Stripe already loaded via window.Stripe');
          setStripeLoaded(true);
          return;
        }
        
        // Check if script tag already exists
        const existingScript = document.getElementById('stripe-js') || 
                             document.querySelector('script[src*="stripe.com/v3"]');
        if (existingScript) {
          logger.debug('[SubscriptionPopup] Stripe script tag already exists, waiting for load');
          // Wait a bit for Stripe to initialize
          const checkStripeLoaded = () => {
            if (window.Stripe) {
              logger.debug('[SubscriptionPopup] Stripe loaded after waiting');
              setStripeLoaded(true);
            } else {
              setTimeout(checkStripeLoaded, 100);
            }
          };
          checkStripeLoaded();
          return;
        }
        
        // Only load script if it doesn't exist
        logger.debug('[SubscriptionPopup] Loading Stripe script for the first time');
        await retryLoadScript(stripeUrl, {
          maxRetries: 5,
          baseDelay: 1000,
          maxDelay: 3000
        });
        
        logger.debug('[SubscriptionPopup] Stripe script loaded successfully');
        setStripeLoaded(true);
        setLoadAttempts(currentAttempt);
      } catch (error) {
        logger.error('[SubscriptionPopup] Failed to load Stripe script after multiple attempts:', error);
        
        // Only retry manually if we're under a reasonable threshold
        if (currentAttempt < 3) {
          logger.info(`[SubscriptionPopup] Will attempt to load Stripe again in 2 seconds`);
          setTimeout(loadStripe, 2000);
        } else {
          // Give up and show error to user
          notifyError('Failed to load payment system. Please refresh the page and try again.');
        }
        setLoadAttempts(currentAttempt);
      }
    };
    
    // Only start loading Stripe when the popup is actually visible
    if (showPopup && !stripeLoaded) {
      loadStripe();
    }
    
  }, [showPopup, stripeLoaded, notifyError]); // Removed loadAttempts from dependencies
  
  // Reset selected plan and fetch exchange rates when popup opens
  useEffect(() => {
    if (showPopup) {
      // If user is on free plan, default to professional; otherwise use their current plan
      setSelectedPlan((userData?.subscription_type === 'free' ? 'professional' : userData?.subscription_type) || 'professional');
      setIsSubmitting(false);
      setIsRedirectingToStripe(false);
      
      // Get user's country and check if it's a developing country
      const userCountry = userData?.business_country || userData?.country || userData?.businessCountry;
      if (userCountry) {
        // Check if it's a developing country
        const developing = checkIsDevelopingCountry(userCountry);
        setIsDevelopingCountry(developing);
        
        // Fetch exchange rates for the user's country
        fetchExchangeRate(userCountry);
      }
    }
  }, [showPopup, userData]);
  
  // Function to fetch exchange rate
  const fetchExchangeRate = async (countryCode) => {
    try {
      const response = await fetch(`/api/exchange-rates?country=${countryCode}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExchangeRate(data.rate);
          setLocalCurrency(data.format);
          logger.debug('Exchange rate fetched:', { 
            country: countryCode, 
            rate: data.rate, 
            currency: data.currency 
          });
        }
      }
    } catch (error) {
      logger.error('Failed to fetch exchange rate:', error);
      // Continue without local currency display
    }
  };
  
  // Get plan color using the utility function
  const getPlanColor = (planId) => {
    return getSubscriptionPlanColor(planId);
  };
  
  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
  };
  
  const handleBillingCycleChange = (event) => {
    setBillingCycle(event.target.value);
  };
  
  // Function to calculate price with discount
  const calculateDiscountedPrice = (originalPrice) => {
    if (isDevelopingCountry) {
      return originalPrice * 0.5; // 50% discount
    }
    return originalPrice;
  };
  
  // Function to format price with local currency
  const formatPriceWithCurrency = (usdPrice) => {
    const discountedPrice = calculateDiscountedPrice(usdPrice);
    
    // Always show USD price
    let priceDisplay = `$${discountedPrice}`;
    
    // Add local currency if available
    if (exchangeRate && localCurrency) {
      const localPrice = discountedPrice * exchangeRate;
      const formattedLocal = localCurrency.decimals === 0 
        ? Math.round(localPrice).toLocaleString()
        : localPrice.toFixed(localCurrency.decimals).toLocaleString();
      
      // Add local currency in green, smaller font
      priceDisplay += ` `;
      return (
        <>
          ${discountedPrice}
          <span className="text-green-600 text-sm font-normal ml-1">
            ({localCurrency.symbol}{formattedLocal})
          </span>
        </>
      );
    }
    
    return priceDisplay;
  };

  // Function to create a Stripe checkout session
  const createStripeCheckoutSession = async (planId, billingCycleOption) => {
    try {
      // Get the Stripe price ID based on the selected plan and billing cycle
      const priceId = getPriceIdForPlan(planId, billingCycleOption);
      
      logger.debug('Creating checkout session with:', { planId, billingCycle: billingCycleOption, priceId });
      
      // Get user's country for regional pricing
      const userCountry = userData?.business_country || userData?.country || null;
      
      // Call API to create a Stripe checkout session
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priceId,
          planId,
          billingCycle: billingCycleOption,
          country: userCountry
        })
      });
      
      if (!response.ok) {
        // Safely parse error response
        const errorData = await safeParseJson(response, {
          context: 'StripeCheckout_Error',
          defaultValue: { error: `HTTP error ${response.status}` },
          throwOnHtml: true
        });
        
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      // Safely parse success response
      const sessionData = await safeParseJson(response, {
        context: 'StripeCheckout_Success',
        defaultValue: {},
        throwOnHtml: true
      });
      
      const { sessionId } = sessionData;
      
      if (!sessionId) {
        throw new Error('No session ID returned from server');
      }
      
      logger.debug('Checkout session created:', { sessionId });
      return sessionId;
    } catch (error) {
      logger.error('Error creating Stripe checkout session:', error);
      throw error;
    }
  };

  // Helper function to get the appropriate Stripe price ID
  const getPriceIdForPlan = (planId, cycle) => {
    // Use environment variables for Stripe price IDs, fallback to test IDs
    const priceMap = {
      professional: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_1ODp08C4RUQfzaQv1KdILW1U',
        sixMonth: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_6MONTH || 'price_1ODp08C4RUQfzaQv1SixMnth',
        yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_YEARLY || 'price_1ODp08C4RUQfzaQv1AcXLAC7'
      },
      enterprise: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_1ODp2LC4RUQfzaQv5oMDFy7S',
        sixMonth: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_6MONTH || 'price_1ODp2LC4RUQfzaQv5SixMnth',
        yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY || 'price_1ODp2LC4RUQfzaQv2O9UaBwD'
      }
    };
    
    return priceMap[planId]?.[cycle] || priceMap.professional.monthly;
  };

  // Redirect to Stripe Checkout
  const redirectToStripeCheckout = async (sessionId) => {
    try {
      // Wait for Stripe to be loaded if necessary
      if (!window.Stripe) {
        logger.info('[SubscriptionPopup] Stripe not loaded yet, waiting...');
        
        let attempts = 0;
        while (!window.Stripe && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
          
          // Every 10 attempts, try to reload the script
          if (attempts % 10 === 0 && !window.Stripe) {
            logger.warn(`[SubscriptionPopup] Stripe still not loaded after ${attempts} checks, attempting to reload`);
            try {
              await retryLoadScript('https://js.stripe.com/v3/', {
                maxRetries: 3,
                baseDelay: 500
              });
            } catch (reloadError) {
              logger.error('[SubscriptionPopup] Failed to reload Stripe script:', reloadError);
            }
          }
        }
        
        if (!window.Stripe) {
          throw new Error('Stripe failed to load after multiple attempts');
        }
      }
      
      // Get Stripe public key from environment or use test key
      const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || 'pk_test_51ODoxjC4RUQfzaQvAwu25BEEGxbIWy1S2aFBnpUwPDj11NB5HrxgR1aOLJW5UCEsXfShcbxnjv6fzXmRQO8tFHnK00wTFhG7Rx';
      
      logger.debug('Initializing Stripe with key:', stripePublicKey);
      
      // Initialize Stripe with cookie options to fix partitioned cookie warnings
      const stripe = window.Stripe(stripePublicKey, {
        betas: ['partitioned_cookies_beta_1'],
        cookieOptions: {
          secure: true,
          sameSite: 'none',
          partitioned: true
        }
      });
      
      logger.debug('[SubscriptionPopup] Initialized Stripe with partitioned cookie support');
      
      // Store debug information for redirection
      storeRedirectDebugInfo({
        source: 'subscription_popup',
        destination: 'stripe_checkout',
        sessionId,
        timestamp: new Date().toISOString(),
        planDetails: {
          plan: selectedPlan,
          billingCycle
        }
      });
      
      // Redirect to Stripe Checkout
      logger.debug('Redirecting to checkout with session ID:', sessionId);
      
      try {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        
        if (error) {
          logger.error('Stripe redirect error:', error);
          // If Stripe's redirect fails, use our fallback
          logger.warn('Stripe redirectToCheckout failed, using fallback redirect method');
          const checkoutUrl = `https://checkout.stripe.com/c/pay/${sessionId}`;
          await forceRedirect(checkoutUrl, {
            source: 'subscription_popup_fallback',
            replace: true,
            addNonce: true
          });
          throw new Error(error.message || 'Failed to redirect to Stripe checkout');
        }
      } catch (stripeError) {
        // If Stripe's redirect fails completely, try our force redirect
        logger.error('Complete Stripe redirect failure, using force redirect:', stripeError);
        const checkoutUrl = `https://checkout.stripe.com/c/pay/${sessionId}`;
        await forceRedirect(checkoutUrl, {
          source: 'subscription_popup_emergency',
          replace: true,
          addNonce: true,
          delay: 100 // Small delay to ensure logs are sent
        });
      }
    } catch (error) {
      logger.error('Error redirecting to Stripe:', error);
      
      // Add fallback mechanism when Stripe can't be loaded
      if (!window.Stripe) {
        logger.warn('[SubscriptionPopup] Using emergency redirect to Stripe since Stripe.js failed to load');
        try {
          // Store session ID in local storage for recovery
          localStorage.setItem('stripe_pending_session', sessionId);
          localStorage.setItem('stripe_redirect_time', Date.now());
          
          // Direct redirect to Stripe checkout URL
          const checkoutUrl = `https://checkout.stripe.com/c/pay/${sessionId}`;
          window.location.href = checkoutUrl;
          return;
        } catch (emergencyError) {
          logger.error('[SubscriptionPopup] Emergency redirect failed:', emergencyError);
        }
      }
      
      throw error;
    }
  };
  
  const handleUpgradeConfirm = async () => {
    setIsSubmitting(true);
    
    try {
      // Check if user is from Kenya and should use M-Pesa
      const userCountry = userData?.business_country || userData?.country || userData?.businessCountry;
      const isKenyanUser = userCountry === 'KE';
      
      // For free plan, handle directly (no Stripe)
      if (selectedPlan === 'free') {
        logger.info('Upgrading to free plan');
        
        // First try to store the subscription info in the database
        try {
          const storeSubscriptionResponse = await fetch('/api/auth/store-subscription-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planId: 'free',
              interval: billingCycle,
              status: 'active',
              skipPayment: true,
              businessInfo: {
                businessName: userData?.business_name || '',
                businessType: userData?.business_type || '',
                businessCountry: userData?.business_country || '',
                legalStructure: userData?.legal_structure || ''
              }
            })
          });
          
          if (!storeSubscriptionResponse.ok) {
            logger.warn('Failed to store subscription info:', await storeSubscriptionResponse.text());
          } else {
            logger.info('Successfully stored free plan subscription info');
          }
        } catch (storeError) {
          logger.error('Error storing subscription info:', storeError);
          // Continue anyway, this is non-critical
        }
        
        // Mark onboarding as complete via API
        try {
          const onboardingResponse = await fetch('/api/onboarding/complete-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription_plan: 'free',
              subscription_interval: billingCycle,
              subscription_status: 'active'
            })
          });
          
          if (onboardingResponse.ok) {
            logger.info('Successfully marked onboarding as complete');
          } else {
            logger.warn('Failed to mark onboarding as complete:', await onboardingResponse.text());
          }
        } catch (completeError) {
          logger.error('Error marking onboarding complete:', completeError);
        }
        
        notifySuccess('Successfully upgraded to Free plan');
        onClose();
        return;
      }
      
      // For paid plans, handle payment based on country
      if (selectedPlan === 'professional' || selectedPlan === 'enterprise') {
        // If user is from Kenya, redirect to payment page for M-Pesa option
        if (isKenyanUser) {
          logger.info('Kenyan user detected, redirecting to payment page for M-Pesa option');
          
          // Store selected plan info in sessionStorage for the payment page
          try {
            const subscriptionData = {
              planId: selectedPlan,
              interval: billingCycle,
              timestamp: Date.now(),
              country: userCountry,
              paymentMethod: 'pending' // Will be selected on payment page
            };
            
            sessionStorage.setItem('pendingSubscription', JSON.stringify(subscriptionData));
            
            // Store in AppCache as backup
            setCacheValue('pendingSubscription', {
              ...subscriptionData,
              backup_created: new Date().toISOString()
            });
          } catch (e) {
            logger.warn('Error storing subscription info:', e);
          }
          
          // Redirect to the payment page where they can choose M-Pesa or Card
          window.location.href = '/onboarding/payment';
          return;
        }
        
        // For non-Kenya users, proceed with Stripe
        setIsRedirectingToStripe(true);
        
        // Store selected plan info in sessionStorage for the payment page
        try {
          const subscriptionData = {
            planId: selectedPlan,
            interval: billingCycle,
            timestamp: Date.now(),
          };
          
          sessionStorage.setItem('pendingSubscription', JSON.stringify(subscriptionData));
          
          // Store in AppCache instead of localStorage
          setCacheValue('pendingSubscription', {
            ...subscriptionData,
            backup_created: new Date().toISOString()
          });
          
          // Store subscription intent in backend
          try {
            await fetch('/api/auth/store-subscription-info', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                planId: selectedPlan,
                interval: billingCycle,
                status: 'pending_payment'
              })
            });
            logger.info('Stored subscription intent in backend');
          } catch (storeError) {
            logger.warn('Error storing subscription intent:', storeError);
            // Continue anyway, as we'll update after successful payment
          }
        } catch (e) {
          logger.warn('Error storing subscription info in storage:', e);
        }
        
        try {
          // Create a checkout session
          const sessionId = await createStripeCheckoutSession(selectedPlan, billingCycle);
          
          // Redirect to Stripe checkout
          await redirectToStripeCheckout(sessionId);
          
          // If we get here, something went wrong with the redirect
          logger.error('Redirect didn\'t navigate away as expected');
          setIsRedirectingToStripe(false);
          setIsSubmitting(false);
          notifyError('Failed to redirect to checkout. Please try again.');
        } catch (error) {
          logger.error('Failed to start checkout process:', error);
          notifyError('Failed to start checkout process. Please try again.');
          setIsRedirectingToStripe(false);
          setIsSubmitting(false);
        }
      } else {
        // For downgrades or lateral changes, update in the database
        try {
          await fetch('/api/auth/store-subscription-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planId: selectedPlan,
              interval: billingCycle,
              status: 'active',
              skipPayment: true
            })
          });
          logger.info('Successfully stored updated plan subscription info in database');
        } catch (dbError) {
          logger.warn('Failed to store updated subscription in database:', dbError);
          notifyError('Failed to update subscription. Please try again.');
          setIsSubmitting(false);
          return;
        }
        
        notifySuccess('Subscription updated successfully');
        onClose();
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      notifyError('Failed to update subscription. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  const allPlans = [
    {
      id: 'free',
      name: 'Free Plan',
      price: {
        monthly: 0,
        yearly: 0,
      },
      features: [
        'Basic Code Analysis',
        'Limited API Requests',
        'Community Support',
        'Single User',
      ],
    },
    {
      id: 'professional',
      name: 'Professional',
      price: {
        monthly: 35,
        sixMonth: 175,  // 35 * 5 months (saving 1 month ~17%)
        yearly: 336,    // 35 * 9.6 months (saving 2.4 months = 20% off)
      },
      features: [
        'Up to 3 users',
        'Unlimited storage',
        'All features included',
        'Priority support',
        'Advanced analytics',
        'Multi-location support',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: {
        monthly: 95,
        sixMonth: 475,  // 95 * 5 months (saving 1 month ~17%)
        yearly: 912,    // 95 * 9.6 months (saving 2.4 months = 20% off)
      },
      features: [
        'Unlimited users',
        'Unlimited everything',
        'All features included',
        'Dedicated support',
        'Custom onboarding',
        'AI-powered insights',
        'API access',
      ],
    },
  ];
  
  // Filter out the free plan
  const plans = allPlans.filter(plan => plan.id !== 'free');
  
  // Helper function for plan color classes
  const getPlanColorClasses = (planId) => {
    const colorMap = {
      free: { text: 'text-gray-600', bg: 'bg-gray-600', border: 'border-gray-600' },
      professional: { text: 'text-blue-600', bg: 'bg-blue-600', border: 'border-blue-600' },
      enterprise: { text: 'text-indigo-600', bg: 'bg-indigo-600', border: 'border-indigo-600' }
    };
    
    return colorMap[planId] || colorMap.free;
  };

  return (
    <ErrorBoundary 
      onError={(error, info) => {
        logger.error('Error in SubscriptionPopup component:', error, info);
        notifyError('Something went wrong with the subscription dialog. Please try again later.');
      }}
    >
      <Transition.Root show={showPopup} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-6xl">
                  <div className="flex items-center justify-between px-6 pt-5 pb-4">
                    <Dialog.Title as="h3" className="text-2xl font-semibold leading-6 text-gray-900">
                      Upgrade Your Subscription
                    </Dialog.Title>
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={onClose}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 mb-6">Select a premium plan to unlock advanced features and capabilities.</p>
                    
                    {/* Show discount message for developing countries */}
                    {isDevelopingCountry && (
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                          <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                          <p className="text-green-800 font-medium">
                            50% regional discount applied to all plans
                          </p>
                        </div>
                        <p className="text-green-700 text-sm mt-1">
                          Prices shown include your discount and local currency conversion
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 flex-wrap">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio h-5 w-5 text-blue-600"
                          name="billingCycle"
                          value="monthly"
                          checked={billingCycle === 'monthly'}
                          onChange={handleBillingCycleChange}
                        />
                        <span className="ml-2 text-gray-700">Monthly Billing</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio h-5 w-5 text-blue-600"
                          name="billingCycle"
                          value="sixMonth"
                          checked={billingCycle === 'sixMonth'}
                          onChange={handleBillingCycleChange}
                        />
                        <span className="ml-2 flex items-center text-gray-700">
                          6 Months
                          <span className="ml-2 bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                            SAVE 17%
                          </span>
                        </span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio h-5 w-5 text-blue-600"
                          name="billingCycle"
                          value="yearly"
                          checked={billingCycle === 'yearly'}
                          onChange={handleBillingCycleChange}
                        />
                        <span className="ml-2 flex items-center text-gray-700">
                          Annual Billing
                          <span className="ml-2 bg-green-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                            SAVE 20%
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2">
                      {plans.map((plan) => {
                        const colorClasses = getPlanColorClasses(plan.id);
                        const isSelected = selectedPlan === plan.id;
                        const isCurrentPlan = userData?.subscription_type === plan.id;
                        
                        return (
                          <div 
                            key={plan.id}
                            className={`relative flex flex-col h-full bg-white rounded-xl overflow-visible transition-all duration-300 
                              ${isSelected ? 'transform -translate-y-2 shadow-xl' : 'shadow-md hover:shadow-xl hover:-translate-y-1'} 
                              ${isSelected ? `border-2 ${colorClasses.border}` : 'border border-gray-200'}`}
                          >
                            {/* Popular badge */}
                            {plan.id === 'professional' && (
                              <div className="absolute -top-3 right-6 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md z-10">
                                POPULAR
                              </div>
                            )}
                            
                            {/* Best value badge */}
                            {plan.id === 'enterprise' && (
                              <div className="absolute -top-3 right-6 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md z-10">
                                BEST VALUE
                              </div>
                            )}
                            
                            <div className="flex-grow p-6">
                              <h2 className="text-xl font-semibold mb-2">
                                {plan.name}
                              </h2>
                              <div className={`text-3xl font-bold mb-4 ${colorClasses.text}`}>
                                {formatPriceWithCurrency(plan.price[billingCycle])}
                                <span className="text-sm text-gray-500 font-normal ml-1">
                                  {billingCycle === 'monthly' ? '/month' : 
                                   billingCycle === 'sixMonth' ? '/6 months' : '/year'}
                                </span>
                              </div>
                              {billingCycle !== 'monthly' && (
                                <p className="text-sm text-gray-600 mb-2">
                                  ${billingCycle === 'sixMonth' ? 
                                    Math.round((calculateDiscountedPrice(plan.price[billingCycle]) / 6) * 100) / 100 : 
                                    Math.round((calculateDiscountedPrice(plan.price[billingCycle]) / 12) * 100) / 100}/month
                                </p>
                              )}
                              
                              {/* Plan features */}
                              <ul className="mt-4 space-y-3">
                                {plan.features.map((feature, index) => (
                                  <li key={index} className="flex items-start">
                                    <CheckCircleIcon className={`h-5 w-5 ${colorClasses.text} mr-2 flex-shrink-0 mt-0.5`} />
                                    <span className="text-gray-700">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="p-6 pt-0">
                              <button
                                type="button"
                                onClick={() => handlePlanSelect(plan.id)}
                                disabled={isSubmitting}
                                className={`w-full py-3 px-4 rounded-lg font-medium transition-all focus:outline-none 
                                  ${isSelected 
                                    ? `${colorClasses.bg} text-white shadow-md`
                                    : `bg-white border ${colorClasses.border} ${colorClasses.text}`
                                  }`}
                              >
                                {isSubmitting && isSelected ? (
                                  <div className="flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {isRedirectingToStripe ? 'Preparing...' : 'Processing...'}
                                  </div>
                                ) : (
                                  isCurrentPlan ? 'Current Plan' : 'Select Plan'
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="flex justify-center px-6 py-4 bg-gray-50 rounded-b-xl">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-6 py-3 mr-4 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleUpgradeConfirm}
                      disabled={isSubmitting || selectedPlan === userData?.subscription_type}
                      className={`inline-flex justify-center rounded-md border border-transparent px-6 py-3 text-base font-medium text-white shadow-sm focus:outline-none
                        ${getPlanColorClasses(selectedPlan).bg}
                        ${isSubmitting || selectedPlan === userData?.subscription_type 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-opacity-90'}
                      `}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {isRedirectingToStripe ? 'Preparing Checkout...' : 'Processing...'}
                        </div>
                      ) : (
                        'Confirm Upgrade'
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </ErrorBoundary>
  );
};

export default SubscriptionPopup; 