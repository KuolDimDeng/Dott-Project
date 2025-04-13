///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/subscription/page.js
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { CircularProgress } from '@/components/ui/TailwindComponents';
import LoadingSpinner from '@/components/LoadingSpinner';
import { fetchAuthSession } from 'aws-amplify/auth';
import { CheckIcon } from '@heroicons/react/24/solid';
// Import standardized constants
import { 
  COGNITO_ATTRIBUTES,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS
} from '@/constants/onboarding';
import SubscriptionForm from '@/components/Onboarding/SubscriptionForm';
import { 
  getTenantIdFromCognito, 
  updateTenantIdInCognito,
  getOrCreateTenantId 
} from '@/utils/tenantUtils';
import { 
  getBusinessInfo, 
  updateSubscriptionInfo, 
  completeOnboarding 
} from '@/utils/onboardingUtils';
import { 
  getBusinessName, 
  getBusinessType,
  updateUserAttributes
} from '@/utils/authCookieReplacer';
// Import the new redirect utility functions
import { getRedirectParams, storeRedirectDebugInfo } from '@/utils/redirectUtils';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
// Import the NotificationProvider
import { NotificationProvider } from '@/context/NotificationContext';

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

// Helper to get business info from Cognito
const getBusinessInfoFromCognito = async () => {
  try {
    // Get business info from Cognito attributes
    const businessInfo = await getBusinessInfo();
    
    return {
      businessInfo: {
        businessName: businessInfo.businessName || 'Your Business',
        businessType: businessInfo.businessType || 'Other'
      },
      source: 'cognito'
    };
  } catch (e) {
    logger.error('[SubscriptionPage] Error getting business info from Cognito:', e);
    
    // Return default business info
    return {
      businessInfo: { 
        businessName: 'Your Business', 
        businessType: 'Other' 
      },
      source: 'default'
    };
  }
};

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateOnboardingStep, STEPS } = useOnboardingProgress();
  const [businessData, setBusinessData] = useState({
    businessName: '',
    businessType: ''
  });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [loadedParams, setLoadedParams] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);
  
  // Add an effect to prevent double rendering
  useEffect(() => {
    // Check if we've already marked free plan as complete in Cognito
    const checkFreePlanStatus = async () => {
      try {
        const { fetchUserAttributes } = await import('aws-amplify/auth');
        const attributes = await fetchUserAttributes();
        
        // Check if user has already completed onboarding with free plan
        if (attributes['custom:onboarding'] === 'complete' && 
            attributes['custom:subplan'] === 'free') {
          
          // Get tenant ID from Cognito
          const tenantId = await getTenantIdFromCognito();
          
          if (tenantId) {
            logger.info('[SubscriptionPage] User already completed with free plan, redirecting to dashboard');
            router.push(`/${tenantId}/dashboard`);
            return true;
          }
        }
        
        return false;
      } catch (error) {
        logger.error('[SubscriptionPage] Error checking free plan status:', error);
        return false;
      }
    };
    
    // Run the check
    checkFreePlanStatus();
    
    // Set has rendered to prevent duplicate initialization
    if (!hasRendered) {
      setHasRendered(true);
    }
  }, [router, hasRendered]);
  
  useEffect(() => {
    const initializeSubscription = async () => {
      if (initialized) return;
      
      try {
        // Get business info from Cognito
        const { businessInfo } = await getBusinessInfoFromCognito();
        setBusinessData(businessInfo);
        
        // Check for tenant ID in URL
        const tenantIdFromUrl = searchParams.get('tenantId');
        if (tenantIdFromUrl) {
          // Store in Cognito
          await updateTenantIdInCognito(tenantIdFromUrl);
          logger.info('[SubscriptionPage] Stored tenant ID from URL in Cognito:', tenantIdFromUrl);
        }
        
        // Set loading to false once initialization is complete
        setLoading(false);
        setInitialized(true);
        
        // Update onboarding step in Cognito
        await updateOnboardingStep(STEPS.SUBSCRIPTION);
        
      } catch (error) {
        logger.error('[SubscriptionPage] Error initializing subscription page:', error);
        setLoading(false);
        setInitialized(true);
      }
    };
    
    initializeSubscription();
  }, [initialized, searchParams, updateOnboardingStep, STEPS.SUBSCRIPTION]);
  
  const handleFreePlanSelection = async () => {
    const requestId = generateRequestId();
    
    try {
      setSubmitting(true);
      setMessage('Setting up your account with the free plan...');
      
      // First, ensure the user has a tenant ID
      const tenantId = await getOrCreateTenantId();
      if (!tenantId) {
        throw new Error('Failed to get or create tenant ID');
      }
      
      // Update subscription in Cognito
      await updateSubscriptionInfo({
        plan: 'free',
        interval: billingCycle,
        price: '0'
      });
      
      // Mark onboarding as complete since free plan doesn't need payment
      await completeOnboarding();
      
      logger.info(`[SubscriptionPage:${requestId}] Free plan setup completed, redirecting to dashboard`);
      
      // Redirect to the dashboard
      router.push(`/${tenantId}/dashboard`);
    } catch (error) {
      logger.error(`[SubscriptionPage:${requestId}] Error setting up free plan:`, error);
      setMessage('There was an error setting up your account. Please try again.');
      setSubmitting(false);
    }
  };
  
  const handlePaidPlanSelection = async (planId) => {
    const requestId = generateRequestId();
    
    try {
      setSubmitting(true);
      setMessage(`Preparing ${planId} plan subscription...`);
      
      // Make sure we have a tenant ID
      const tenantId = await getOrCreateTenantId();
      if (!tenantId) {
        throw new Error('Failed to get or create tenant ID');
      }
      
      // Update subscription info in Cognito but don't mark as complete yet
      await updateSubscriptionInfo({
        plan: planId,
        interval: billingCycle,
        price: PLANS.find(p => p.id === planId)?.price[billingCycle] || '0'
      });
      
      // For paid plans, redirect to payment page
      logger.info(`[SubscriptionPage:${requestId}] Redirecting to payment page for ${planId} plan`);
      router.push(`/onboarding/payment?plan=${planId}&cycle=${billingCycle}`);
    } catch (error) {
      logger.error(`[SubscriptionPage:${requestId}] Error setting up ${planId} plan:`, error);
      setMessage('There was an error preparing your subscription. Please try again.');
      setSubmitting(false);
    }
  };
  
  const handlePlanSelection = async (planId) => {
    setSelectedPlan(planId);
    
    if (planId === 'free') {
      await handleFreePlanSelection();
    } else {
      await handlePaidPlanSelection(planId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading subscription options..." />
      </div>
    );
  }

  return (
    <NotificationProvider>
      <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
        <div className="mx-auto max-w-screen-md text-center mb-8 lg:mb-12">
          <h1 className="mb-4 text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white">Choose Your Plan</h1>
          <p className="mb-5 font-light text-gray-500 sm:text-xl dark:text-gray-400">
            Select the plan that best fits your business needs
          </p>
          
          {/* Billing toggle */}
          <div className="flex items-center justify-center mt-6 mb-8">
            <span className={`mr-3 text-sm font-medium ${billingCycle === 'monthly' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
              Monthly
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                value=""
                className="sr-only peer"
                checked={billingCycle === 'annual'}
                onChange={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
            <span className={`ml-3 text-sm font-medium ${billingCycle === 'annual' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
              Annual
              <span className="ml-1 text-xs text-green-500">
                (Save 16%)
              </span>
            </span>
          </div>
        </div>

        {submitting ? (
          <div className="flex flex-col items-center justify-center p-10 rounded-lg bg-white dark:bg-gray-800 shadow">
            <CircularProgress size={60} />
            <p className="mt-4 text-lg text-center">{message}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`flex flex-col p-6 mx-auto max-w-lg text-center rounded-lg border shadow ${
                  plan.popular
                    ? 'border-blue-600 dark:border-blue-500 relative'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-tr-lg rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                <h3 className="mb-4 text-2xl font-semibold">{plan.name}</h3>
                <p className="font-light text-gray-500 sm:text-lg dark:text-gray-400">
                  {plan.description}
                </p>
                <div className="flex justify-center items-baseline my-8">
                  <span className="mr-2 text-5xl font-extrabold">
                    ${billingCycle === 'monthly' ? plan.price.monthly : plan.price.annual}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                <ul role="list" className="mb-8 space-y-4 text-left">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <CheckIcon className="h-5 w-5 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePlanSelection(plan.id)}
                  className={`${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white'
                      : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                  } py-3 px-5 rounded-lg font-medium text-center mt-auto`}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </NotificationProvider>
  );
}
