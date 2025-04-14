'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
  COGNITO_ATTRIBUTES,
  COOKIE_NAMES, 
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS
} from '@/constants/onboarding';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useNotification } from '@/context/NotificationContext';

// Subscription plans
const PLANS = [
  {
    id: 'free',
    name: 'Basic',
    description: 'Get started with essential features',
    price: { monthly: 'Free', annual: 'Free' },
    features: [
      'Up to 3 projects',
      'Core analytics',
      'Basic support',
      'Community access'
    ],
    popular: false,
    color: 'blue',
    buttonText: 'Get Started Free'
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Perfect for growing businesses',
    price: { monthly: '$29', annual: '$290' },
    features: [
      'Unlimited projects',
      'Advanced analytics',
      'Priority support',
      'API access',
      'Team collaboration'
    ],
    popular: true,
    color: 'indigo',
    buttonText: 'Start Professional'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Advanced features for large teams',
    price: { monthly: '$99', annual: '$990' },
    features: [
      'All Professional features',
      'Dedicated support',
      'Custom integrations',
      'Advanced security',
      'Training sessions',
      'SLA guarantees'
    ],
    popular: false,
    color: 'purple',
    buttonText: 'Start Enterprise'
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
  const { updateOnboardingStep, STEPS } = useOnboardingProgress();
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
  
  // Import required functions
  const updateCognitoAttributes = async (attributes) => {
    try {
      // Make sure we're not trying to update any restricted attributes
      const safeAttributes = { ...attributes };
      
      // Remove any potentially restricted attributes
      const restrictedPrefixes = ['custom:tenant', 'custom:business'];
      Object.keys(safeAttributes).forEach(key => {
        if (restrictedPrefixes.some(prefix => key.startsWith(prefix))) {
          logger.warn(`[SubscriptionForm] Removing restricted attribute from direct update: ${key}`);
          delete safeAttributes[key];
        }
      });
      
      const { updateUserAttributes } = await import('aws-amplify/auth');
      await updateUserAttributes({
        userAttributes: safeAttributes
      });
      return { success: true };
    } catch (error) {
      logger.error('[SubscriptionForm] Error updating Cognito attributes:', error);
      
      if (error.message && error.message.includes('unauthorized attribute')) {
        logger.warn('[SubscriptionForm] Attempted to update restricted attribute, check for: tenant_id, businessid, etc.');
      }
      
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
      
      // Set up the AppCache for the subscription
      if (typeof window !== 'undefined') {
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.subscription = window.__APP_CACHE.subscription || {};
        window.__APP_CACHE.onboarding = window.__APP_CACHE.onboarding || {};
        
        // Store subscription details
        window.__APP_CACHE.subscription.plan = plan.id;
        window.__APP_CACHE.subscription.billingCycle = billingCycle;
        window.__APP_CACHE.subscription.isComplete = true;
        window.__APP_CACHE.subscription.timestamp = new Date().toISOString();
        
        // Update onboarding status
        if (plan.id === 'free' || plan.id === 'basic') {
          window.__APP_CACHE.onboarding.status = 'complete';
          window.__APP_CACHE.onboarding.step = 'complete';
          window.__APP_CACHE.onboarding.completed = true;
        } else {
          window.__APP_CACHE.onboarding.status = 'subscription';
          window.__APP_CACHE.onboarding.step = 'subscription';
        }
      }
      
      // Check for development mode
      const devMode = process.env.NODE_ENV === 'development';
      const bypassAuth = typeof window !== 'undefined' && 
                         window.__APP_CACHE?.debug?.bypassAuth === true;
      
      // Update Cognito attributes FIRST before redirecting
      try {
        setProcessingStatus('Updating your account...');
        
        if (devMode && bypassAuth) {
          logger.debug('[SubscriptionForm] Development mode: skipping Cognito update');
          
          // Store in AppCache
          if (typeof window !== 'undefined') {
            window.__APP_CACHE.cognito = window.__APP_CACHE.cognito || {};
            window.__APP_CACHE.cognito.subplan = plan.id;
            window.__APP_CACHE.cognito.subscriptioninterval = billingCycle;
            window.__APP_CACHE.cognito.onboarding = plan.id === 'free' || plan.id === 'basic' ? 'complete' : 'subscription';
            window.__APP_CACHE.cognito.updated_at = new Date().toISOString();
          }
        } else {
          // Safe attributes that won't cause permission issues
          const safeAttributes = {
            'custom:onboarding': plan.id === 'free' || plan.id === 'basic' ? 'complete' : 'subscription',
            'custom:subplan': plan.id,
            'custom:subscriptioninterval': billingCycle,
            'custom:updated_at': new Date().toISOString()
          };
          
          // For free plans, also set setup as done
          if (plan.id === 'free' || plan.id === 'basic') {
            safeAttributes['custom:setupdone'] = 'true';
          }
          
          // Make sure we're not trying to update any restricted attributes
          const restrictedPrefixes = ['custom:tenant', 'custom:business'];
          Object.keys(safeAttributes).forEach(key => {
            if (restrictedPrefixes.some(prefix => key.startsWith(prefix))) {
              logger.warn(`[SubscriptionForm] Removing restricted attribute from direct update: ${key}`);
              delete safeAttributes[key];
            }
          });
          
          const { updateUserAttributes } = await import('aws-amplify/auth');
          await updateUserAttributes({
            userAttributes: safeAttributes
          });
          logger.debug('[SubscriptionForm] Successfully updated Cognito attributes for subscription');
        }
      } catch (attrError) {
        logger.warn('[SubscriptionForm] Failed to update Cognito attributes:', attrError);
        // Continue anyway - AppCache will serve as backup
      }
      
      // Use the onboarding service to update progress
      try {
        // For free plans, mark as complete immediately
        const stepStatus = plan.id === 'free' || plan.id === 'basic' ? 'complete' : 'subscription';
        await updateOnboardingStep(stepStatus, {
          'custom:subplan': plan.id,
          'custom:subscriptioninterval': billingCycle
        });
        logger.info(`[SubscriptionForm] Updated onboarding progress to ${stepStatus} via API`);
      } catch (progressError) {
        logger.warn('[SubscriptionForm] API progress update error:', progressError);
        // Continue despite error - we have fallbacks
      }
      
      // Store in sessionStorage for transitions
      try {
        // Store basic selection info
        sessionStorage.setItem('selectedPlan', JSON.stringify({
          plan: plan.id,
          name: plan.name,
          price: plan.price[billingCycle],
          billingCycle,
          timestamp: Date.now()
        }));
        
        // For paid plans, also store pendingSubscription format
        if (plan.id !== 'free' && plan.id !== 'basic') {
          sessionStorage.setItem('pendingSubscription', JSON.stringify({
            plan: plan.id,
            billing_interval: billingCycle,
            interval: billingCycle,
            payment_method: 'credit_card',
            timestamp: Date.now(),
            requestId
          }));
        }
      } catch (storageError) {
        logger.warn('[SubscriptionForm] SessionStorage error:', storageError);
        // Continue despite error - AppCache is more important
      }
      
      // Route based on plan type
      if (plan.id === 'free' || plan.id === 'basic') {
        // Handle free plan selection
        setProcessingStatus('Setting up your free account...');
        
        // Set cookies for free plan
        document.cookie = `${COOKIE_NAMES.FREE_PLAN_SELECTED}=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        document.cookie = `${COOKIE_NAMES.ONBOARDING_STEP}=${ONBOARDING_STEPS.COMPLETE}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        document.cookie = `${COOKIE_NAMES.ONBOARDING_STATUS}=${ONBOARDING_STATUS.COMPLETE}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        
        // Redirect directly to dashboard for free plans - avoid intermediate subscription page
        const tenantId = localStorage.getItem('tenantId') || '';
        if (tenantId) {
          window.location.href = `/tenant/${tenantId}/dashboard?newAccount=true&plan=free&freePlan=true&requestId=${requestId}`;
        } else {
          window.location.href = `/dashboard?newAccount=true&plan=free&freePlan=true&requestId=${requestId}`;
        }
      } else {
        // For paid plans
        setProcessingStatus('Preparing payment options...');
        
        // Update cookies for payment step
        document.cookie = `${COOKIE_NAMES.ONBOARDING_STEP}=${ONBOARDING_STEPS.PAYMENT}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        
        // Handle dev mode for paid plans
        if (devMode && bypassAuth) {
          logger.debug('[SubscriptionForm] Development mode: bypassing payment');
          
          // Set complete status in AppCache
          if (typeof window !== 'undefined') {
            window.__APP_CACHE.onboarding.status = 'complete';
            window.__APP_CACHE.onboarding.step = 'complete';
            window.__APP_CACHE.onboarding.completed = true;
          }
          
          // Redirect directly to dashboard
          window.location.href = `/dashboard?newAccount=true&plan=${plan.id}&dev=true&requestId=${requestId}`;
        } else {
          // Go to payment page
          router.push(`/onboarding/payment?plan=${plan.id}&cycle=${billingCycle}&requestId=${requestId}`);
        }
      }
    } catch (e) {
      logger.error('[SubscriptionForm] Error during plan selection:', e);
      setError('An error occurred. Please try again.');
      setProcessingStatus('');
      setSubmitting(false);
    }
  };
  
  const handleFreePlanSelection = async () => {
    logger.debug('[SubscriptionForm] Free plan selected');
    setSelectedPlan('free');
    setBillingCycle('monthly');
    setPlanData({
      plan: 'free',
      billingCycle: 'monthly',
      price: '0'
    });
    
    // Show loading state
    setSubmitting(true);
    
    // Store free plan selection in AppCache
    if (typeof window !== 'undefined') {
      window.__APP_CACHE = window.__APP_CACHE || {};
      window.__APP_CACHE.subscription = window.__APP_CACHE.subscription || {};
      window.__APP_CACHE.onboarding = window.__APP_CACHE.onboarding || {};
      
      // Set subscription details
      window.__APP_CACHE.subscription.plan = 'free';
      window.__APP_CACHE.subscription.billingCycle = 'monthly';
      window.__APP_CACHE.subscription.isComplete = true;
      window.__APP_CACHE.subscription.timestamp = new Date().toISOString();
      
      // Set onboarding as complete
      window.__APP_CACHE.onboarding.status = 'complete';
      window.__APP_CACHE.onboarding.step = 'complete';
      window.__APP_CACHE.onboarding.completed = true;
      window.__APP_CACHE.onboarding.freePlanSelected = true;
    }
    
    // First check for Cognito tenant ID by fetching user attributes
    let tenantId = null;
    try {
      // Try to get user attributes from Cognito first
      const { fetchUserAttributes } = await import('aws-amplify/auth');
      const userAttributes = await fetchUserAttributes();
      
      // Check for tenant ID in Cognito attributes - highest priority
      if (userAttributes['custom:tenant_ID'] && isValidUUID(userAttributes['custom:tenant_ID'])) {
        tenantId = userAttributes['custom:tenant_ID'];
        logger.debug('[SubscriptionForm] Using tenant ID from Cognito attributes:', tenantId);
      } else if (userAttributes['custom:tenantId'] && isValidUUID(userAttributes['custom:tenantId'])) {
        tenantId = userAttributes['custom:tenantId'];
        logger.debug('[SubscriptionForm] Using tenantId from Cognito attributes:', tenantId);
      }
      
      // Update Cognito attributes for free plan
      try {
        const { updateUserAttributes } = await import('aws-amplify/auth');
        await updateUserAttributes({
          userAttributes: {
            'custom:onboarding': 'complete',
            'custom:setupdone': 'true',
            'custom:subplan': 'free',
            'custom:subscriptioninterval': 'monthly',
            'custom:updated_at': new Date().toISOString()
          }
        });
        logger.debug('[SubscriptionForm] Updated Cognito attributes for free plan');
      } catch (updateError) {
        logger.warn('[SubscriptionForm] Failed to update Cognito attributes for free plan:', updateError);
        // Continue anyway as we have the AppCache backup
      }
    } catch (attributeError) {
      logger.warn('[SubscriptionForm] Failed to fetch Cognito attributes:', attributeError);
      // Continue with fallback methods
    }
    
    // If we couldn't get tenant ID from Cognito, try AppCache
    if (!tenantId || !isValidUUID(tenantId)) {
      const appCache = window.__APP_CACHE || {};
      const tenant = appCache.tenant || {};
      tenantId = tenant.id;
      
      if (!tenantId || !isValidUUID(tenantId)) {
        // As a last resort, redirect without tenant ID
        logger.warn('[SubscriptionForm] No valid tenant ID found, redirecting to dashboard without tenant path');
        window.location.href = `/dashboard?newAccount=true&plan=free&freePlan=true`;
        return;
      }
    }
    
    // Redirect with tenant ID if we have it
    window.location.href = `/tenant/${tenantId}/dashboard?newAccount=true&plan=free&freePlan=true`;
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
                <span className="text-3xl font-bold">${plan.price[billingCycle] === '0' ? '0' : plan.price[billingCycle]}</span>
                {plan.price[billingCycle] !== '0' && (
                  <span className="text-gray-500 ml-1">{billingCycle === 'monthly' ? '/month' : '/year'}</span>
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
            Annual (Save 20%)
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
