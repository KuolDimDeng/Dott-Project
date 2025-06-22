'use client';

// Removed appCache import - using backend single source of truth


import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import LoadingSpinner from '@/components/LoadingSpinner';
import { refreshSessionData } from '@/utils/sessionRefresh';
import { 
  COGNITO_ATTRIBUTES,
  COOKIE_NAMES, 
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS
} from '@/constants/onboarding';
// Removed useOnboardingProgress - backend handles all progress updates
import { useNotification } from '@/context/NotificationContext';

// Subscription plans
const PLANS = [
  {
    id: 'free',
    name: 'Basic',
    description: 'Perfect for small businesses just getting started',
    price: { monthly: '0', annual: '0' },
    features: [
      'Income and expense tracking',
      'Invoice creation & reminders',
      'Accept Stripe & PayPal payments',
      'Basic inventory tracking',
      '1 user limit',
      '3GB storage limit'
    ],
    popular: false,
    color: 'blue',
    buttonText: 'Start for Free'
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Everything growing businesses need to thrive',
    price: { monthly: '15', annual: '144' },
    features: [
      'All Basic features',
      'Up to 3 users',
      'Unlimited storage',
      'Priority support',
      'Advanced payment solutions',
      'Inventory alerts & forecasting'
    ],
    popular: true,
    color: 'indigo',
    buttonText: 'Choose Professional'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited scale for ambitious organizations',
    price: { monthly: '45', annual: '432' },
    features: [
      'All Professional features',
      'Unlimited users',
      'Custom onboarding',
      'Dedicated support',
      'Advanced integrations',
      'Enterprise security'
    ],
    popular: false,
    color: 'purple',
    buttonText: 'Choose Enterprise'
  }
];

// Simple check icon for feature lists
const CheckIcon = (props) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    {...props}
  >
    <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z" />
  </svg>
);

// Helper function to generate a request ID for tracking
const generateRequestId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    // Fallback for browsers without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

// Helper function to get cookies
const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// Helper function to validate UUID
const isValidUUID = (uuid) => {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Subscription form component
export default function SubscriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Removed useOnboardingProgress - backend handles progress updates
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [processingStatus, setProcessingStatus] = useState('');
  const [planData, setPlanData] = useState({
    plan: null,
    billingCycle: 'monthly',
    price: '0'
  });
  const { notifyInfo } = useNotification();
  
  // Handle URL params and stored data on mount
  useEffect(() => {
    try {
      // Log initialization
      logger.debug('[SubscriptionForm] Component mounted');
      
      // Check for plan in URL
      const planParam = searchParams.get('plan');
      if (planParam && PLANS.some(p => p.id === planParam)) {
        setSelectedPlan(planParam);
        logger.debug('[SubscriptionForm] Plan set from URL:', planParam);
      }
      
      // Check billing cycle in URL
      const cycleParam = searchParams.get('cycle');
      if (cycleParam && ['monthly', 'annual'].includes(cycleParam)) {
        setBillingCycle(cycleParam);
      }
      
      // Check existing selection in storage
      try {
        // Only override if params didn't set it already
        if (!planParam) {
          const storedPlan = sessionStorage.getItem('selectedPlan');
          if (storedPlan) {
            try {
              const planData = JSON.parse(storedPlan);
              if (planData.plan && PLANS.some(p => p.id === planData.plan)) {
                setSelectedPlan(planData.plan);
                logger.debug('[SubscriptionForm] Plan restored from storage:', planData.plan);
              }
              
              if (planData.billingCycle) {
                setBillingCycle(planData.billingCycle);
              }
            } catch (parseError) {
              // If it's not JSON, try direct value
              if (PLANS.some(p => p.id === storedPlan)) {
                setSelectedPlan(storedPlan);
              }
            }
          }
        }
      } catch (e) {
        logger.error('[SubscriptionForm] Error retrieving stored plan:', e);
      }
    } catch (e) {
      logger.error('[SubscriptionForm] Initialization error:', e);
    }
  }, [searchParams]);
  
  // Handle plan selection
  const handleSelectPlan = (planId) => {
    logger.debug('[SubscriptionForm] Plan selected:', planId);
    setSelectedPlan(planId);
  };
  
  // Toggle billing cycle
  const toggleBillingCycle = () => {
    const newCycle = billingCycle === 'monthly' ? 'annual' : 'monthly';
    logger.debug('[SubscriptionForm] Billing cycle changed to:', newCycle);
    setBillingCycle(newCycle);
  };
  
  // Calculate annual savings percentage
  const getAnnualSavings = (plan) => {
    if (!plan.price.annual || !plan.price.monthly) return 0;
    
    // Extract numbers from price strings
    const annualPrice = parseFloat(plan.price.annual.replace(/[^0-9.]/g, ''));
    const monthlyPrice = parseFloat(plan.price.monthly.replace(/[^0-9.]/g, ''));
    
    if (!annualPrice || !monthlyPrice) return 0;
    
    // Calculate savings (monthly * 12 - annual) / (monthly * 12) * 100
    const monthlyCost = monthlyPrice * 12;
    const savings = ((monthlyCost - annualPrice) / monthlyCost) * 100;
    return Math.round(savings);
  };
  
  // Format price for display
  const getPriceText = (plan) => {
    return plan.price[billingCycle];
  };
  
  // Auth0 user metadata update function (simplified)
  const updateUserMetadata = async (metadata) => {
    try {
      logger.info('[SubscriptionForm] Storing subscription metadata locally');
      // Store in session storage for now - will be handled by backend API
      if (typeof window !== 'undefined') {
        const currentData = JSON.parse(sessionStorage.getItem('auth0_user_metadata') || '{}');
        const updatedData = { ...currentData, ...metadata };
        sessionStorage.setItem('auth0_user_metadata', JSON.stringify(updatedData));
      }
      return { success: true };
    } catch (error) {
      logger.error('[SubscriptionForm] Error storing user metadata:', error);
      return { success: false, error };
    }
  };
  
  // Handle continue button click
  const handleContinue = async () => {
    if (!selectedPlan) {
      setError('Please select a plan to continue.');
      return;
    }
    
    const requestId = generateRequestId();
    logger.debug(`[SubscriptionForm] Handling plan selection for ${selectedPlan}/${billingCycle}`, { requestId });
    
    try {
      // Clear any previous errors
      setError('');
      setSubmitting(true);
      setProcessingStatus('Processing your selection...');
      
      // Get the selected plan data
      const plan = PLANS.find(p => p.id === selectedPlan);
      if (!plan) {
        throw new Error('Selected plan not found');
      }
      
      // Store subscription selection for payment flow (no onboarding status)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('selectedPlan', JSON.stringify({
          plan: plan.id,
          name: plan.name,
          price: plan.price[billingCycle],
          billingCycle,
          timestamp: Date.now()
        }));
      }
      
      // Remove development mode bypass - all plans use backend completion
      
      // Update Cognito attributes FIRST before redirecting
      try {
        setProcessingStatus('Updating your account...');
        
        // Backend handles all user attribute updates - no local Cognito updates needed
        logger.debug('[SubscriptionForm] Skipping local attribute updates - backend will handle');
      } catch (attrError) {
        logger.warn('[SubscriptionForm] Failed to update Cognito attributes:', attrError);
        // Continue anyway - AppCache will serve as backup
      }
      
      // Backend handles onboarding progress updates automatically
      logger.info(`[SubscriptionForm] Subscription selected: ${plan.id}, backend will handle progress`);
      
      // Store minimal selection info for payment flow (paid plans only)
      if (plan.id !== 'free' && plan.id !== 'basic') {
        try {
          sessionStorage.setItem('pendingSubscription', JSON.stringify({
            plan: plan.id,
            billing_interval: billingCycle,
            interval: billingCycle,
            payment_method: 'credit_card',
            timestamp: Date.now(),
            requestId
          }));
        } catch (storageError) {
          logger.warn('[SubscriptionForm] SessionStorage error:', storageError);
        }
      }
      
      // ALL plans must complete onboarding through backend API
      if (plan.id === 'free' || plan.id === 'basic') {
        // Handle free plan - call backend completion API
        setProcessingStatus('Completing your free account setup...');
        
        try {
          // Call backend to complete onboarding for free plan
          const completionResponse = await fetch('/api/onboarding/complete-all', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              subscriptionPlan: plan.id,
              billingCycle: billingCycle,
              planType: 'free',
              requestId,
              timestamp: new Date().toISOString()
            })
          });
          
          const completionResult = await completionResponse.json();
          
          if (completionResponse.ok && completionResult.success) {
            logger.info('[SubscriptionForm] Free plan onboarding completed via backend');
            
            // Refresh session data if required
            if (completionResult.sessionRefreshRequired) {
              logger.info('[SubscriptionForm] Refreshing session data...');
              await refreshSessionData();
            }
            
            // Backend handles all session updates - redirect to dashboard
            const tenantId = completionResult.tenant_id || completionResult.tenantId;
            if (tenantId) {
              window.location.href = `/${tenantId}/dashboard?newAccount=true&plan=free&requestId=${requestId}`;
            } else {
              window.location.href = `/dashboard?newAccount=true&plan=free&requestId=${requestId}`;
            }
          } else {
            throw new Error(completionResult.error || 'Failed to complete free plan setup');
          }
        } catch (completionError) {
          logger.error('[SubscriptionForm] Error completing free plan onboarding:', completionError);
          setError('Failed to complete account setup. Please try again.');
          setSubmitting(false);
          return;
        }
      } else {
        // For paid plans - go to payment page (completion happens after payment)
        setProcessingStatus('Preparing payment options...');
        router.push(`/onboarding/payment?plan=${plan.id}&cycle=${billingCycle}&requestId=${requestId}`);
      }
    } catch (e) {
      logger.error('[SubscriptionForm] Error during plan selection:', e);
      setError('An error occurred. Please try again.');
      setProcessingStatus('');
      setSubmitting(false);
    }
  };
  
  // Simplified free plan selection - uses same backend completion flow
  const handleFreePlanSelection = async () => {
    logger.debug('[SubscriptionForm] Free plan selected via card click');
    setSelectedPlan('free');
    setBillingCycle('monthly');
    setPlanData({
      plan: 'free',
      billingCycle: 'monthly',
      price: '0'
    });
    
    // Trigger the main continue handler which now calls backend for all plans
    await handleContinue();
  };
  
  // Handle plan card click
  const handlePlanCardClick = (planId) => {
    logger.debug('[SubscriptionForm] Plan selected:', planId);
    
    // For free plan, use the dedicated handler
    if (planId === 'free') {
      handleFreePlanSelection();
      return;
    }
    
    setSelectedPlan(planId);
    const newData = {
      ...planData,
      plan: planId
    };
    setPlanData(newData);
  };
  
  // If submitting, show a simple loading state
  if (submitting) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-lg">{processingStatus || 'Processing your selection...'}</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Headline */}
      <h2 className="text-2xl font-bold text-center mb-6">Select Your Preferred Subscription Plan</h2>
      
      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              billingCycle === 'monthly' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-700 hover:text-gray-900'
            } transition-all duration-200`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              billingCycle === 'annual' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-700 hover:text-gray-900'
            } transition-all duration-200`}
          >
            Annual Billing
            {billingCycle === 'annual' && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Save 20%
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-800">
          {error}
        </div>
      )}
      
      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className={`relative rounded-lg overflow-hidden border ${
              selectedPlan === plan.id 
                ? 'border-blue-600 ring-2 ring-blue-600' 
                : 'border-gray-200 hover:border-blue-300'
            } transition-all shadow-sm hover:shadow-md`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                Most Popular
              </div>
            )}
            
            <div 
              className="p-6 cursor-pointer h-full flex flex-col"
              onClick={() => handlePlanCardClick(plan.id)}
            >
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
              
              <div className="mb-6">
                {plan.price[billingCycle] === '0' ? (
                  <span className="text-3xl font-bold">FREE</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold">${plan.price[billingCycle]}</span>
                    <span className="text-gray-500 ml-1">/{billingCycle === 'monthly' ? 'mo' : 'year'}</span>
                    {billingCycle === 'annual' && (
                      <div className="text-sm text-green-600 mt-1">Save 20%</div>
                    )}
                  </>
                )}
              </div>
              
              <ul className="mb-6 space-y-2 flex-grow">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                type="button"
                className={`w-full py-2 px-4 rounded-md ${
                  selectedPlan === plan.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                } transition-colors mt-auto`}
                onClick={() => handlePlanCardClick(plan.id)}
              >
                {selectedPlan === plan.id ? 'Selected' : plan.buttonText || 'Select Plan'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 p-2 rounded-lg inline-flex">
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              billingCycle === 'monthly'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              billingCycle === 'annual'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setBillingCycle('annual')}
          >
            Annual (save 20%)
          </button>
        </div>
      </div>
      
      {selectedPlan && selectedPlan !== 'free' && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleContinue}
            disabled={submitting}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors disabled:bg-blue-300"
          >
            {submitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Processing...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
