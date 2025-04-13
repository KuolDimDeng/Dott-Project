import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/auth';
import { useNotification } from '@/context/NotificationContext';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';
import { logger } from '@/utils/logger';
import { forceRedirect, storeRedirectDebugInfo, safeParseJson } from '@/utils/redirectUtils';
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';

const SubscriptionPopup = ({ open, onClose, isOpen }) => {
  // Use either open or isOpen prop for backward compatibility
  const showPopup = open !== undefined ? open : (isOpen !== undefined ? isOpen : false);
  
  const { userData, updateUserAttributes } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  
  // Default to professional plan if user is on free plan
  const [selectedPlan, setSelectedPlan] = useState((userData?.subscription_type === 'free' ? 'professional' : userData?.subscription_type) || 'professional');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  
  // Load Stripe script when component mounts
  useEffect(() => {
    // Skip if already loaded
    if (window.Stripe || document.getElementById('stripe-js')) {
      setStripeLoaded(true);
      return;
    }
    
    const script = document.createElement('script');
    script.id = 'stripe-js';
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    
    script.onload = () => {
      logger.debug('Stripe script loaded successfully');
      setStripeLoaded(true);
    };
    
    script.onerror = () => {
      logger.error('Failed to load Stripe script');
      // Try again after a brief delay
      setTimeout(() => {
        if (!window.Stripe) {
          document.body.removeChild(script);
          document.body.appendChild(script);
        }
      }, 1000);
    };
    
    document.body.appendChild(script);
    
    return () => {
      // Cleanup only if component unmounts during loading
      if (document.body.contains(script) && !window.Stripe) {
        document.body.removeChild(script);
      }
    };
  }, []);
  
  // Reset selected plan when popup opens
  useEffect(() => {
    if (showPopup) {
      // If user is on free plan, default to professional; otherwise use their current plan
      setSelectedPlan((userData?.subscription_type === 'free' ? 'professional' : userData?.subscription_type) || 'professional');
      setIsSubmitting(false);
      setIsRedirectingToStripe(false);
    }
  }, [showPopup, userData]);
  
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

  // Function to create a Stripe checkout session
  const createStripeCheckoutSession = async (planId, billingCycleOption) => {
    try {
      // Get the Stripe price ID based on the selected plan and billing cycle
      const priceId = getPriceIdForPlan(planId, billingCycleOption);
      
      logger.debug('Creating checkout session with:', { planId, billingCycle: billingCycleOption, priceId });
      
      // Call API to create a Stripe checkout session
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priceId,
          planId,
          billingCycle: billingCycleOption 
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
    // Using Stripe test price IDs - these should be changed to your actual IDs in production
    const priceMap = {
      professional: {
        monthly: 'price_1ODp08C4RUQfzaQv1KdILW1U', // Monthly Professional Plan (Test ID)
        yearly: 'price_1ODp08C4RUQfzaQv1AcXLAC7'   // Annual Professional Plan (Test ID)
      },
      enterprise: {
        monthly: 'price_1ODp2LC4RUQfzaQv5oMDFy7S', // Monthly Enterprise Plan (Test ID)
        yearly: 'price_1ODp2LC4RUQfzaQv2O9UaBwD'   // Annual Enterprise Plan (Test ID)
      }
    };
    
    return priceMap[planId]?.[cycle] || priceMap.professional.monthly;
  };

  // Redirect to Stripe Checkout
  const redirectToStripeCheckout = async (sessionId) => {
    try {
      // Wait for Stripe to be loaded if necessary
      if (!window.Stripe) {
        let attempts = 0;
        while (!window.Stripe && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!window.Stripe) {
          throw new Error('Stripe failed to load after multiple attempts');
        }
      }
      
      // Get Stripe public key from environment or use test key
      const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || 'pk_test_51ODoxjC4RUQfzaQvAwu25BEEGxbIWy1S2aFBnpUwPDj11NB5HrxgR1aOLJW5UCEsXfShcbxnjv6fzXmRQO8tFHnK00wTFhG7Rx';
      
      logger.debug('Initializing Stripe with key:', stripePublicKey);
      const stripe = window.Stripe(stripePublicKey);
      
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
      throw error;
    }
  };
  
  const handleUpgradeConfirm = async () => {
    setIsSubmitting(true);
    
    try {
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
        
        // Use our robust function to mark onboarding as complete
        try {
          // Import the completeOnboarding function
          const { completeOnboarding } = await import('@/utils/completeOnboarding');
          
          // Call the function and wait for it to complete
          const success = await completeOnboarding();
          
          if (success) {
            logger.info('Successfully marked onboarding as complete');
          } else {
            logger.warn('Failed to mark onboarding as complete via dedicated function');
            
            // Fallback: Try direct update as last resort - include ALL business and subscription data
            try {
              const { updateUserAttributes } = await import('@/config/amplifyUnified');
              await updateUserAttributes({
                userAttributes: {
                  // Onboarding status
                  'custom:onboarding': 'complete',
                  'custom:setupdone': 'true',
                  'custom:updated_at': new Date().toISOString(),
                  
                  // Subscription info
                  'custom:subplan': 'free',
                  'custom:subscriptioninterval': billingCycle,
                  'custom:subscriptionstatus': 'active',
                  
                  // Business info - preserve existing data
                  'custom:businessname': userData?.business_name || '',
                  'custom:businesstype': userData?.business_type || '',
                  'custom:businesscountry': userData?.business_country || '',
                  'custom:legalstructure': userData?.legal_structure || '',
                  'custom:businessid': userData?.business_id || '',
                  
                  // Timestamps
                  'custom:onboardingCompletedAt': new Date().toISOString(),
                  'custom:subscriptionUpdatedAt': new Date().toISOString()
                }
              });
              logger.info('Successfully updated attributes via direct update');
            } catch (directError) {
              logger.error('All attempts to update Cognito attributes failed:', directError);
            }
          }
        } catch (completeError) {
          logger.error('Error importing or calling completeOnboarding:', completeError);
        }
        
        notifySuccess('Successfully upgraded to Free plan');
        onClose();
        return;
      }
      
      // For paid plans, create a checkout session and redirect to Stripe
      if (selectedPlan === 'professional' || selectedPlan === 'enterprise') {
        setIsRedirectingToStripe(true);
        
        // Store selected plan info in sessionStorage for the payment page
        try {
          const subscriptionData = {
            plan: selectedPlan,
            billing_interval: billingCycle,
            interval: billingCycle,
            payment_method: 'credit_card',
            timestamp: new Date().toISOString(),
            // Include business info for database storage after payment
            businessInfo: {
              businessName: userData?.business_name || '',
              businessType: userData?.business_type || '',
              businessCountry: userData?.business_country || '',
              legalStructure: userData?.legal_structure || '',
              businessId: userData?.business_id || ''
            }
          };
          
          sessionStorage.setItem('pendingSubscription', JSON.stringify(subscriptionData));
          
          // Also store in localStorage as backup
          localStorage.setItem('pendingSubscription_backup', JSON.stringify({
            ...subscriptionData,
            backup_created: new Date().toISOString()
          }));
          
          // Update Cognito with subscription plan information (intent to pay)
          try {
            await updateUserAttributes({
              userAttributes: {
                'custom:subplan': selectedPlan,
                'custom:subscriptioninterval': billingCycle,
                'custom:subscriptionstatus': 'pending_payment',
                'custom:updated_at': new Date().toISOString()
              }
            });
            logger.info('Updated Cognito with subscription intent information');
          } catch (attributeError) {
            logger.warn('Error updating Cognito with subscription intent:', attributeError);
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
        // For downgrades or lateral changes, just update the attribute
        await updateUserAttributes({
          userAttributes: {
            'custom:subscription_type': selectedPlan,
            'custom:subscriptioninterval': billingCycle,
            'custom:updated_at': new Date().toISOString()
          }
        });
        
        // Also update in the database
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
          // Non-critical error, continue
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
        monthly: 29,
        yearly: 299,
      },
      features: [
        'Advanced Code Analysis',
        'Unlimited API Requests',
        'Priority Support',
        'Up to 5 Users',
        'Custom Integrations',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: {
        monthly: 99,
        yearly: 999,
      },
      features: [
        'Premium Code Analysis',
        'Unlimited Everything',
        'Dedicated Support',
        'Unlimited Users',
        'Custom Integrations',
        'Enterprise Security',
        'Custom Reporting',
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
                    <div className="flex items-center space-x-4">
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
                          value="yearly"
                          checked={billingCycle === 'yearly'}
                          onChange={handleBillingCycleChange}
                        />
                        <span className="ml-2 flex items-center text-gray-700">
                          Annual Billing
                          <span className="ml-2 bg-green-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                            SAVE 15%
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
                              <p className={`text-3xl font-bold mb-4 ${colorClasses.text}`}>
                                ${plan.price[billingCycle]}
                                <span className="text-sm text-gray-500 font-normal ml-1">
                                  {billingCycle === 'monthly' ? '/month' : '/year'}
                                </span>
                              </p>
                              
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