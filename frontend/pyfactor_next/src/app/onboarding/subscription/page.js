///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/subscription/page.js
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { CircularProgress } from '@/components/ui/TailwindComponents';
import LoadingSpinner from '@/components/LoadingSpinner';
import { fetchAuthSession } from 'aws-amplify/auth';
import { CheckIcon } from '@heroicons/react/24/solid';
// Import standardized constants
import { 
  COGNITO_ATTRIBUTES,
  COOKIE_NAMES, 
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS
} from '@/constants/onboarding';

// Define subscription plans with enhanced features
const PLANS = [
  {
    id: 'free',
    name: 'Basic',
    description: 'Perfect for freelancers and solo entrepreneurs',
    price: {
      monthly: '0',
      annual: '0',
    },
    features: [
      'Income and expense tracking',
      'Invoice creation and management',
      'Basic financial reports',
      'Single user account',
      'Email support'
    ],
    popular: false,
    color: 'blue',
    buttonText: 'Get Started Free'
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Ideal for growing small businesses',
    price: {
      monthly: '15',
      annual: '150',
    },
    features: [
      'All Basic features',
      'Multiple user accounts',
      'Advanced financial reports',
      'Client portal access',
      'Custom invoice templates',
      'Priority email support',
      'Data export capabilities'
    ],
    popular: true,
    color: 'indigo',
    buttonText: 'Choose Professional'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For established businesses with complex needs',
    price: {
      monthly: '45',
      annual: '450',
    },
    features: [
      'All Professional features',
      'Unlimited user accounts',
      'Custom financial dashboards',
      'Dedicated account manager',
      'API integrations',
      'Phone support',
      'Automated workflows',
      'Advanced security features'
    ],
    popular: false,
    color: 'purple',
    buttonText: 'Choose Enterprise'
  },
];

// Simple helper to get cookies
const getCookies = () => {
  if (typeof document === 'undefined') return {};
  
  return document.cookie.split(';').reduce((acc, cookie) => {
    const parts = cookie.trim().split('=');
    if (parts.length > 1) {
      try {
        acc[parts[0]] = decodeURIComponent(parts[1]);
      } catch (e) {
        acc[parts[0]] = parts[1];
      }
    }
    return acc;
  }, {});
};

// Helper function to generate a request ID
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

export default function SubscriptionPage() {
  const router = useRouter();
  const [businessData, setBusinessData] = useState({
    businessName: '',
    businessType: ''
  });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  // Initialize on page load
  useEffect(() => {
    const initializeSubscription = async () => {
      try {
        // Debug cookie state
        const cookieData = {
          businessName: getCookies().businessName || '',
          businessType: getCookies().businessType || '',
          onboardingStep: getCookies().onboardingStep || '',
          onboardedStatus: getCookies().onboardedStatus || '',
          hasIdToken: !!localStorage.getItem('idToken'),
          hasAccessToken: !!localStorage.getItem('accessToken')
        };
        
        logger.debug('[SubscriptionPage] Initializing with cookies:', cookieData);
        
        // Verify we have business info either in cookies or state
        if (!businessData.businessName && cookieData.businessName) {
          setBusinessData(prev => ({
            ...prev,
            businessName: cookieData.businessName,
            businessType: cookieData.businessType
          }));
        }
        
        // Try to get authentication session
        let session = null;
        try {
          session = await fetchAuthSession();
          // If this succeeds, we have valid tokens
        } catch (authError) {
          logger.warn('[SubscriptionPage] Auth session error:', authError);
          // Continue despite auth error - we'll use cookies
        }
        
        // Check for free plan selection in URL
        const params = new URLSearchParams(window.location.search);
        if (params.get('plan') === 'free') {
          selectFreePlan();
        }
        
        setLoading(false);
      } catch (error) {
        logger.error('[SubscriptionPage] Initialization error:', error);
        setMessage('Failed to initialize subscription page. Please try again.');
        setLoading(false);
      }
    };
    
    const selectFreePlan = () => {
      // For RLS implementation, set all required flags/cookies for direct to dashboard
      setSelectedPlan('free');
      
      // Set loading state while we prepare
      setSubmitting(true);
      
      // Set cookies for RLS configuration - mark everything as complete
      const expiresDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
      document.cookie = `setupSkipDatabaseCreation=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `setupUseRLS=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `skipSchemaCreation=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `${COOKIE_NAMES.FREE_PLAN_SELECTED}=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `${COOKIE_NAMES.ONBOARDING_STEP}=${ONBOARDING_STEPS.COMPLETE}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `${COOKIE_NAMES.ONBOARDING_STATUS}=${ONBOARDING_STATUS.COMPLETE}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `${COOKIE_NAMES.SETUP_COMPLETED}=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      
      // Store in localStorage as well
      try {
        localStorage.setItem('setupSkipDatabaseCreation', 'true');
        localStorage.setItem('setupUseRLS', 'true');
        localStorage.setItem('skipSchemaCreation', 'true');
        localStorage.setItem(STORAGE_KEYS.ONBOARDING_STATUS, ONBOARDING_STATUS.COMPLETE);
        localStorage.setItem(STORAGE_KEYS.SETUP_COMPLETED, 'true');
        localStorage.setItem('setupTimestamp', Date.now().toString());
      } catch (e) {
        // Ignore localStorage errors
      }
      
      // Trigger background setup via a fire-and-forget API call
      try {
        // Generate a unique request ID
        const requestId = generateRequestId();
        
        // Create URL with parameters for tracking
        const url = `/api/onboarding/background-setup?plan=free&timestamp=${Date.now()}&requestId=${requestId}&background=true`;
        
        // Use fetch with no-cors to avoid waiting for response
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Background-Setup': 'true',
            'X-Request-ID': requestId
          },
          // Don't wait for response with keepalive
          keepalive: true,
          // Add basic body data
          body: JSON.stringify({
            plan: 'free',
            timestamp: Date.now(),
            requestId
          })
        }).catch(() => {
          // Ignore errors - this is background processing
        });
      } catch (error) {
        // Ignore errors in background setup
        console.log('Background setup triggered');
      }
      
      // Go directly to dashboard immediately
      window.location.href = '/dashboard?newAccount=true&setupBackground=true';
    };

    // Start initialization
    initializeSubscription();
  }, []);
  
  // Handle plan selection
  const handleSelectPlan = async (plan) => {
    logger.debug('[SubscriptionPage] Plan selected:', {
      planId: plan.id,
      planName: plan.name,
      billingCycle
    });

    setSelectedPlan(plan);
    setSubmitting(true);
    setMessage(`Processing ${plan.name} plan selection...`);
    
    try {
      // For free plan, handle directly
      if (plan.id === 'free') {
        // Free plan doesn't need payment, go directly to dashboard
        const expiresDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
        
        // Set cookies about plan selection
        document.cookie = `selectedPlan=${plan.id}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        document.cookie = `billingCycle=${billingCycle}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        document.cookie = `${COOKIE_NAMES.FREE_PLAN_SELECTED}=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        document.cookie = `${COOKIE_NAMES.ONBOARDING_STEP}=${ONBOARDING_STEPS.COMPLETE}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        document.cookie = `${COOKIE_NAMES.ONBOARDING_STATUS}=${ONBOARDING_STATUS.COMPLETE}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        document.cookie = `${COOKIE_NAMES.SETUP_COMPLETED}=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        
        // Update Cognito user attributes to mark onboarding as complete
        try {
          logger.info('[SubscriptionPage] Updating Cognito attributes for free plan');
          const userAttributes = {
            [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: ONBOARDING_STATUS.COMPLETE,
            [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'true',
            [COGNITO_ATTRIBUTES.SUBSCRIPTION_PLAN]: 'free',
            'custom:billingCycle': billingCycle,
          };
          
          // Don't wait for the attribute update to complete
          (async () => {
            try {
              const { updateUserAttributes } = await import('@/config/amplifyUnified');
              await updateUserAttributes(userAttributes);
              logger.info('[SubscriptionPage] Cognito attributes updated successfully');
            } catch (updateError) {
              logger.warn('[SubscriptionPage] Failed to update Cognito attributes:', updateError);
            }
          })();
        } catch (attrError) {
          logger.warn('[SubscriptionPage] Error preparing attribute update:', attrError);
        }
        
        // Go directly to dashboard
        window.location.href = '/dashboard?newAccount=true&plan=free';
        return;
      }
      
      // Store selected plan in session storage
      if (typeof window !== 'undefined') {
        try {
          // Store in selectedPlan as before
          sessionStorage.setItem('selectedPlan', JSON.stringify({
            id: plan.id,
            name: plan.name,
            price: plan.price[billingCycle],
            billingCycle,
            timestamp: new Date().toISOString()
          }));
          
          // CRITICAL FIX: Also store in pendingSubscription with required fields
          // This is what the payment page looks for
          sessionStorage.setItem('pendingSubscription', JSON.stringify({
            plan: plan.id,
            billing_interval: billingCycle,
            interval: billingCycle, // Include both for compatibility
            payment_method: 'credit_card', // Default to credit card
            timestamp: new Date().toISOString()
          }));
          
        } catch (e) {
          // Allow error to proceed - cookies are more important
          logger.warn('[SubscriptionPage] Error saving to sessionStorage:', e);
        }
      }
      
      // Set cookies about plan selection
      const expiresDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
      document.cookie = `selectedPlan=${plan.id}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `billingCycle=${billingCycle}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `${COOKIE_NAMES.ONBOARDING_STEP}=${ONBOARDING_STEPS.PAYMENT}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      
      // Redirect to payment page
      window.location.href = '/onboarding/payment';
    } catch (error) {
      logger.error('[SubscriptionPage] Plan selection error:', error);
      setMessage('An error occurred. Please try again.');
      setSubmitting(false);
    }
  };
  
  // Determine pricing text based on billing cycle
  const getPriceText = (plan) => {
    const price = plan.price[billingCycle];
    if (price === '0') {
      return 'Free';
    }
    
    const priceNum = parseInt(price, 10);
    return billingCycle === 'monthly' 
      ? `$${priceNum}/month`
      : `$${priceNum}/year`;
  };
  
  // Get savings percentage for annual billing
  const getAnnualSavings = (plan) => {
    const monthlyPrice = parseInt(plan.price.monthly, 10);
    const annualPrice = parseInt(plan.price.annual, 10);
    
    if (monthlyPrice === 0 || annualPrice === 0) return 0;
    
    const monthlyCostForYear = monthlyPrice * 12;
    const savings = monthlyCostForYear - annualPrice;
    const percentage = Math.round((savings / monthlyCostForYear) * 100);
    
    return percentage;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 md:hidden">Choose your subscription plan</h1>
        <p className="mt-2 text-gray-600 md:hidden">Select the plan that best fits your business needs</p>
      </div>
      
      {/* Business info card */}
      {businessData.businessName && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-2 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-600">
                <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
                <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 0 0 6.62 21h10.757a3 3 0 0 0 2.995-2.824L20.913 9H3.087zM12 10.5a.75.75 0 0 1 .75.75v4.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72v-4.94a.75.75 0 0 1 .75-.75z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-blue-800">Business Profile</h3>
              <p className="text-sm text-blue-600">Setting up subscription for <span className="font-semibold">{businessData.businessName}</span></p>
            </div>
          </div>
        </div>
      )}
      
      {/* Billing toggle */}
      <div className="flex justify-center mb-10">
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
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
              billingCycle === 'annual' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-700 hover:text-gray-900'
            } transition-all duration-200`}
          >
            Annual Billing
            <span className="ml-1.5 bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded">Save 20%</span>
          </button>
        </div>
      </div>
      
      {/* Plans cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const priceText = getPriceText(plan);
          const savings = billingCycle === 'annual' ? getAnnualSavings(plan) : 0;
          
          return (
            <div 
              key={plan.id}
              className={`relative bg-white rounded-xl shadow-md overflow-hidden border-2 transition-all duration-300 ${
                isSelected 
                  ? `border-${plan.color}-500 ring-2 ring-${plan.color}-500 ring-opacity-50` 
                  : plan.popular 
                    ? `border-${plan.color}-200 hover:border-${plan.color}-400`
                    : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className={`absolute top-0 right-0 bg-${plan.color}-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg`}>
                  MOST POPULAR
                </div>
              )}
              
              <div className="p-6">
                <h3 className={`text-lg font-semibold text-${plan.color}-700 mb-1`}>{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                
                <div className="mt-4 mb-6">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">{priceText}</span>
                    {plan.price[billingCycle] !== '0' && (
                      <span className="ml-1 text-gray-500 text-sm">
                        {billingCycle === 'monthly' ? 'per month' : 'per year'}
                      </span>
                    )}
                  </div>
                  
                  {/* Show savings for annual billing */}
                  {billingCycle === 'annual' && savings > 0 && (
                    <p className="mt-2 text-sm text-green-600">
                      Save {savings}% with annual billing
                    </p>
                  )}
                </div>
                
                <div className="mt-6 mb-8">
                  <h4 className="text-sm font-medium text-gray-800 mb-4">Includes:</h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex">
                        <CheckIcon className={`h-5 w-5 flex-shrink-0 text-${plan.color}-500`} aria-hidden="true" />
                        <span className="ml-3 text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={submitting}
                  className={`w-full py-3 px-4 text-center font-medium rounded-lg transition-colors duration-200 ${
                    plan.popular
                      ? `bg-${plan.color}-600 text-white hover:bg-${plan.color}-700`
                      : `border border-${plan.color}-600 text-${plan.color}-700 hover:bg-${plan.color}-50`
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {submitting && selectedPlan === plan.id ? (
                    <div className="flex items-center justify-center">
                      <CircularProgress size="sm" color="inherit" className="mr-2" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    plan.buttonText
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Guarantee text */}
      <div className="text-center mt-10 text-sm text-gray-500">
        <p>All plans include a 14-day free trial. No credit card required for Basic plan.</p>
        <p className="mt-1">Need a custom solution? <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">Contact sales</a></p>
      </div>
    </div>
  );
}
