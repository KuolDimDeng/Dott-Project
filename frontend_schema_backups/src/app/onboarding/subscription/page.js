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
  COOKIE_NAMES, 
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS
} from '@/constants/onboarding';
import SubscriptionForm from '@/components/Onboarding/SubscriptionForm';
import { storeTenantId } from '@/utils/tenantUtils';
// Import the new redirect utility functions
import { getRedirectParams, storeRedirectDebugInfo } from '@/utils/redirectUtils';

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

// Helper to get business info from multiple sources
const getBusinessInfoFromSources = async () => {
  const sources = {};
  
  // Try AppCache first (fastest)
  if (typeof window !== 'undefined' && window.__APP_CACHE) {
    const businessNameCache = window.__APP_CACHE['user_pref_custom:businessname']?.value;
    const businessTypeCache = window.__APP_CACHE['user_pref_custom:businesstype']?.value;
    
    if (businessNameCache) {
      sources.appCache = {
        businessName: businessNameCache,
        businessType: businessTypeCache || 'Other'
      };
    }
  }
  
  // Try Cognito attributes next (most authoritative)
  try {
    const response = await fetch('/api/auth/user-attributes');
    if (response.ok) {
      const userData = await response.json();
      if (userData.attributes && userData.attributes['custom:businessname']) {
        sources.cognito = {
          businessName: userData.attributes['custom:businessname'],
          businessType: userData.attributes['custom:businesstype'] || 'Other'
        };
      }
    }
  } catch (e) {
    logger.warn('[getBusinessInfo] Error fetching Cognito attributes:', e);
  }
  
  // Combine sources, prioritizing Cognito over AppCache
  return {
    // Return the business info from the first available source
    businessInfo: sources.cognito || sources.appCache || { 
      businessName: 'Your Business', 
      businessType: 'Other' 
    },
    // Return all sources for debugging
    sources
  };
};

// Get user attributes from Cognito
const getUserAttributes = async () => {
  try {
    const response = await fetch('/api/auth/user-attributes');
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    logger.warn('[getUserAttributes] Error fetching attributes:', e);
  }
  return { attributes: {} };
};

// Update user attributes in Cognito
const updateUserAttributes = async (attributes) => {
  try {
    const response = await fetch('/api/auth/update-attributes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ attributes })
    });
    return response.ok;
  } catch (e) {
    logger.error('[updateUserAttributes] Error updating attributes:', e);
    return false;
  }
};

// Update AppCache value
const updateAppCache = (key, value) => {
  if (typeof window !== 'undefined' && window.__APP_CACHE) {
    window.__APP_CACHE[key] = {
      value,
      timestamp: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      ttl: 7 * 24 * 60 * 60 * 1000
    };
  }
};

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  
  // Initialize on page load
  useEffect(() => {
    const initializeSubscription = async () => {
      try {
        // Check for URL parameters first
        const params = new URLSearchParams(window.location.search);
        const fromTenant = params.get('from')?.includes('tenant');
        const tenantIdFromUrl = params.get('tid');
        
        if (fromTenant && tenantIdFromUrl) {
          logger.info('[SubscriptionPage] Detected redirect from tenant page', {
            tenantId: tenantIdFromUrl,
            from: params.get('from')
          });
          
          // Store the tenant ID in Cognito and AppCache
          try {
            // Save to Cognito
            await updateUserAttributes({
              'custom:tenant_ID': tenantIdFromUrl,
              'custom:businessid': tenantIdFromUrl
            });
            
            // Update AppCache
            updateAppCache('user_pref_custom:tenant_ID', tenantIdFromUrl);
            updateAppCache('user_pref_custom:businessid', tenantIdFromUrl);
          } catch (e) {
            // Ignore storage errors
            logger.warn('[SubscriptionPage] Failed to store tenant ID from URL', e);
          }
        }
        
        // Check for development mode bypass
        const devMode = process.env.NODE_ENV === 'development';
        const bypassAuth = window.__APP_CACHE?.['bypass_auth_validation']?.value === 'true';
        
        if (devMode && bypassAuth) {
          logger.debug('[SubscriptionPage] Development mode: bypassing auth checks');
          
          // Get business name from AppCache in dev mode
          const businessName = window.__APP_CACHE?.['user_pref_custom:businessname']?.value || 'Development Business';
          const businessType = window.__APP_CACHE?.['user_pref_custom:businesstype']?.value || 'Other';
          
          setBusinessData({
            businessName,
            businessType
          });
          
          setLoading(false);
          return;
        }
        
        // Get business info from all possible sources
        const { businessInfo, sources } = await getBusinessInfoFromSources();
        logger.debug('[SubscriptionPage] Found business info from sources:', sources);
        
        // Only update state if we have a business name
        if (businessInfo && businessInfo.businessName) {
          setBusinessData(businessInfo);
        }
        
        // Debug state
        const userData = await getUserAttributes();
        logger.debug('[SubscriptionPage] Initializing with user attributes:', userData.attributes);
        
        // Try to get authentication session
        let session = null;
        try {
          session = await fetchAuthSession();
          // If this succeeds, we have valid tokens
        } catch (authError) {
          logger.warn('[SubscriptionPage] Auth session error:', authError);
          // Continue despite auth error - we'll use Cognito attributes
        }
        
        // Check for free plan selection in URL
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
    
    const selectFreePlan = async () => {
      // For RLS implementation, set all required flags for direct to dashboard
      setSelectedPlan('free');
      
      // Set loading state while we prepare
      setSubmitting(true);
      
      // Update Cognito attributes
      const attributes = {
        'custom:subscription_plan': 'free',
        'custom:onboarding_step': ONBOARDING_STEPS.COMPLETE,
        'custom:onboarding': ONBOARDING_STATUS.COMPLETE,
        'custom:setup_completed': 'true',
        'custom:free_plan_selected': 'true',
        'custom:skip_database_creation': 'true',
        'custom:use_rls': 'true',
        'custom:skip_schema_creation': 'true'
      };
      
      try {
        await updateUserAttributes(attributes);
        
        // Update AppCache for faster access
        Object.entries(attributes).forEach(([key, value]) => {
          updateAppCache(`user_pref_${key}`, value);
        });
        
        logger.info('[SubscriptionPage] Free plan selected, redirecting to dashboard');
        
        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      } catch (error) {
        logger.error('[SubscriptionPage] Error saving free plan selection:', error);
        setMessage('Failed to select free plan. Please try again.');
        setSubmitting(false);
      }
    };
    
    // Run initialization
    initializeSubscription();
  }, [router]);
  
  // Process URL parameters when redirected from tenant page
  useEffect(() => {
    // Use the new utility functions to get redirect parameters
    const { tenantId, bypass, source } = getRedirectParams();
    
    console.log('[SUBSCRIPTION PAGE] Loaded with parameters:', {
      bypass,
      tid: tenantId,
      source
    });
    
    // Process tenant ID if present
    if (tenantId) {
      try {
        // Store tenant ID 
        storeTenantId(tenantId);
        
        // Use the new utility function to store debug info
        storeRedirectDebugInfo({
          source: bypass ? 'bypass' : source || 'direct',
          tenantId,
          timestamp: new Date().toISOString(),
          page: 'subscription'
        });
        
        console.log('[SUBSCRIPTION PAGE] Stored tenant ID:', tenantId);
      } catch (e) {
        console.error('[SUBSCRIPTION PAGE] Error storing tenant data:', e);
      }
    }
    
    // Short delay before showing content
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  }, [searchParams]);
  
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
      // Set cookies and localStorage for development mode
      const devMode = process.env.NODE_ENV === 'development';
      const bypassAuth = localStorage.getItem('bypassAuthValidation') === 'true';
      
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
        
        // Handle development mode bypass
        if (devMode && bypassAuth) {
          logger.debug('[SubscriptionPage] Development mode: bypassing Cognito attributes update');
          
          // Store in localStorage for development
          localStorage.setItem('custom:subscription_plan', 'free');
          localStorage.setItem('custom:billingCycle', billingCycle);
          localStorage.setItem('custom:onboarding', 'complete');
          localStorage.setItem('custom:setup_completed', 'true');
          
          // Go directly to dashboard
          setTimeout(() => {
            window.location.href = '/dashboard?newAccount=true&plan=free&dev=true&noLoading=true';
          }, 100);
          return;
        }
        
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
        setTimeout(() => {
          window.location.href = '/dashboard?newAccount=true&plan=free&noLoading=true';
        }, 100);
        return;
      }
      
      // Handle paid plans
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
      
      // Handle development mode for paid plans - bypass payment and go to dashboard
      if (devMode && bypassAuth) {
        logger.debug('[SubscriptionPage] Development mode: bypassing payment for paid plan');
        
        // Store in localStorage for development
        localStorage.setItem('custom:subscription_plan', plan.id);
        localStorage.setItem('custom:billingCycle', billingCycle);
        localStorage.setItem('custom:onboarding', 'complete');
        localStorage.setItem('custom:setup_completed', 'true');
        localStorage.setItem('custom:payment_completed', 'true');
        
        // Go directly to dashboard
        window.location.href = '/dashboard?newAccount=true&plan=' + plan.id + '&dev=true';
        return;
      }
      
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading subscription options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Choose Your Subscription</h1>
      <SubscriptionForm />
    </div>
  );
}

// Add this handlePlanSelection function to the existing component
const handlePlanSelection = (router, plan, billingCycle) => {
  try {
    // Store selection in session storage for transitions
    sessionStorage.setItem('selectedPlan', JSON.stringify({
      plan: plan.id,
      name: plan.name,
      price: plan.price[billingCycle],
      billingCycle,
      timestamp: Date.now()
    }));
    
    // Set cookies for server-side state tracking
    document.cookie = `selectedPlan=${plan.id}; path=/; max-age=${60*60*24*30}; samesite=lax`;
    document.cookie = `billingCycle=${billingCycle}; path=/; max-age=${60*60*24*30}; samesite=lax`;
    document.cookie = `subscriptionCompleted=true; path=/; max-age=${60*60*24*30}; samesite=lax`;
    
    logger.info('[Subscription] Plan selected:', { plan: plan.id, billingCycle });
    
    // Route based on plan type
    if (plan.id === 'free' || plan.id === 'basic') {
      // For free plans, redirect to transition page
      document.cookie = `freePlanSelected=true; path=/; max-age=${60*60*24*30}; samesite=lax`;
      router.push('/onboarding/subscription-to-dashboard');
    } else {
      // For paid plans, redirect to payment
      router.push(`/onboarding/subscription-to-payment?plan=${plan.id}&cycle=${billingCycle}`);
    }
  } catch (e) {
    logger.error('[Subscription] Error handling plan selection:', e);
    // On error, try direct navigation
    if (plan.id === 'free' || plan.id === 'basic') {
      router.push('/dashboard?from=subscription_error');
    } else {
      router.push(`/onboarding/payment?plan=${plan.id}`);
    }
  }
};
