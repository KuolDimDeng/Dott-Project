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
const getBusinessInfoFromSources = () => {
  const sources = {};
  
  // Try cookies first
  const cookies = getCookies();
  if (cookies.businessName) {
    sources.cookies = {
      businessName: cookies.businessName,
      businessType: cookies.businessType || 'Other'
    };
  }
  
  // Try localStorage as fallback
  try {
    const storedInfo = localStorage.getItem('businessInfo');
    if (storedInfo) {
      try {
        sources.localStorage = JSON.parse(storedInfo);
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
    
    // Try individual keys
    const businessName = localStorage.getItem('businessName') || localStorage.getItem('custom:businessname');
    const businessType = localStorage.getItem('businessType') || localStorage.getItem('custom:businesstype');
    
    if (businessName) {
      sources.localStorageKeys = {
        businessName,
        businessType: businessType || 'Other'
      };
    }
  } catch (e) {
    // localStorage access error, ignore
  }
  
  // Combine sources, prioritizing cookies over localStorage
  return {
    // Return the business info from the first available source
    businessInfo: sources.cookies || sources.localStorage || sources.localStorageKeys || { 
      businessName: 'Your Business', 
      businessType: 'Other' 
    },
    // Return all sources for debugging
    sources
  };
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
    // Check if we've started the free plan flow
    if (localStorage.getItem('freePlanSelected') === 'true' && 
        localStorage.getItem('onboardingStep') === 'complete') {
      // If we're in the middle of processing a free plan, redirect directly
      const tenantId = localStorage.getItem('tenantId') || 
                       getCookie('tenantId') || 
                       localStorage.getItem('businessid') || 
                       getCookie('businessid');
      
      if (tenantId) {
        // Redirect immediately
        logger.debug('[SubscriptionPage] Detected free plan in progress, redirecting to dashboard');
        window.location.href = `/tenant/${tenantId}/dashboard?newAccount=true&plan=free&freePlan=true`;
        return;
      }
    }
    
    // Set hasRendered to true to prevent double initialization
    setHasRendered(true);
  }, []);
  
  // Initialize on page load
  useEffect(() => {
    // Skip if already initialized, already loaded, or in loading state
    if (initialized || !hasRendered || !loading || submitting) {
      return;
    }

    const initializeSubscription = async () => {
      try {
        // Mark as initialized to prevent double initialization
        setInitialized(true);
        
        // Check for URL parameters first
        const params = new URLSearchParams(window.location.search);
        const fromTenant = params.get('from')?.includes('tenant');
        const tenantIdFromUrl = params.get('tid');
        
        if (fromTenant && tenantIdFromUrl) {
          logger.info('[SubscriptionPage] Detected redirect from tenant page', {
            tenantId: tenantIdFromUrl,
            from: params.get('from')
          });
          
          // Store the tenant ID from redirect
          try {
            localStorage.setItem('tenantId', tenantIdFromUrl);
            localStorage.setItem('businessid', tenantIdFromUrl);
            document.cookie = `tenantId=${tenantIdFromUrl}; path=/; max-age=${60*60*24*30}; samesite=lax`;
            document.cookie = `businessid=${tenantIdFromUrl}; path=/; max-age=${60*60*24*30}; samesite=lax`;
          } catch (e) {
            // Ignore storage errors
            logger.warn('[SubscriptionPage] Failed to store tenant ID from URL', e);
          }
        }
        
        // Check for development mode bypass
        const devMode = process.env.NODE_ENV === 'development';
        const bypassAuth = localStorage.getItem('bypassAuthValidation') === 'true';
        
        if (devMode && bypassAuth) {
          logger.debug('[SubscriptionPage] Development mode: bypassing auth checks');
          
          // Get business name from localStorage in dev mode
          const businessName = localStorage.getItem('custom:businessname') || 
                               localStorage.getItem('businessName') || 
                               'Development Business';
          
          const businessType = localStorage.getItem('custom:businesstype') || 
                               localStorage.getItem('businessType') || 
                               'Other';
          
          setBusinessData({
            businessName,
            businessType
          });
          
          setLoading(false);
          return;
        }
        
        // Get business info from all possible sources
        const { businessInfo, sources } = getBusinessInfoFromSources();
        logger.debug('[SubscriptionPage] Found business info from sources:', sources);
        
        // Only update state if we have a business name
        if (businessInfo && businessInfo.businessName) {
          setBusinessData(businessInfo);
        }
        
        // Debug cookie state
        const cookieData = {
          businessName: getCookies().businessName || '',
          businessType: getCookies().businessType || '',
          onboardingStep: getCookies().onboardingStep || '',
          onboardedStatus: getCookies().onboardedStatus || '',
          tenantId: getCookies().tenantId || '',
          businessid: getCookies().businessid || '',
          hasIdToken: !!localStorage.getItem('idToken'),
          hasAccessToken: !!localStorage.getItem('accessToken')
        };
        
        logger.debug('[SubscriptionPage] Initializing with cookies:', cookieData);
        
        // Try to get authentication session
        let session = null;
        try {
          session = await fetchAuthSession();
          // If this succeeds, we have valid tokens
        } catch (authError) {
          logger.warn('[SubscriptionPage] Auth session error:', authError);
          // Continue despite auth error - we'll use cookies
        }
        
        setLoading(false);
      } catch (error) {
        logger.error('[SubscriptionPage] Initialization error:', error);
        setMessage('Failed to initialize subscription page. Please try again.');
        setLoading(false);
      }
    };

    // Start initialization
    initializeSubscription();
  }, [searchParams, updateOnboardingStep, STEPS, loading, submitting, initialized, hasRendered]);
  
  // Define the handleFreePlanSelection function
  const handleFreePlanSelection = async () => {
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
    
    // Check for development mode
    const devMode = process.env.NODE_ENV === 'development';
    const bypassAuth = localStorage.getItem('bypassAuthValidation') === 'true';
    
    // Handle development mode bypass
    if (devMode && bypassAuth) {
      logger.debug('[SubscriptionPage] Development mode: bypassing Cognito attributes update');
      
      // Store in localStorage for development
      localStorage.setItem('custom:subscription_plan', 'free');
      localStorage.setItem('custom:billingCycle', billingCycle);
      localStorage.setItem('custom:onboarding', 'complete');
      localStorage.setItem('custom:setup_completed', 'true');
      
      // Go directly to dashboard
      window.location.href = '/dashboard?newAccount=true&plan=free&dev=true&noLoading=true';
      return;
    }
    
    // Update Cognito attributes BEFORE redirecting - synchronous update
    try {
      const importModule = await import('@/config/amplifyUnified');
      const { updateUserAttributes } = importModule;
      
      const userAttributes = {
        'custom:onboarding': 'complete', // Direct string for reliability
        'custom:setupdone': 'true',
        'custom:subscription_plan': 'free',
        'custom:billingCycle': billingCycle,
        'custom:updated_at': new Date().toISOString(),
        'custom:onboardingCompletedAt': new Date().toISOString()
      };
      
      // Wait for the update to complete
      await updateUserAttributes(userAttributes);
      logger.info('[SubscriptionPage] Successfully updated Cognito attributes to complete');
      
      // Make a final update via the onboarding service for backup
      try {
        await updateOnboardingStep('complete', {
          'custom:subplan': 'free',
          'custom:subscriptioninterval': billingCycle
        });
        logger.info('[SubscriptionPage] Successfully completed onboarding via API');
      } catch (progressError) {
        logger.warn('[SubscriptionPage] API update failed, but Cognito update succeeded:', progressError);
        // Continue since direct Cognito update worked
      }
      
      // Redirect only after updates are complete
      logger.info('[SubscriptionPage] All updates completed, redirecting to dashboard');
      window.location.href = '/dashboard?newAccount=true&plan=free&noLoading=true&freePlan=true';
      return;
    } catch (error) {
      // Log error but still redirect
      logger.error('[SubscriptionPage] Failed to update Cognito attributes:', error);
      logger.info('[SubscriptionPage] Continuing to dashboard despite update failure');
      window.location.href = '/dashboard?newAccount=true&plan=free&noLoading=true&freePlan=true';
      return;
    }
  };
  
  // Check for free plan selection in URL as a separate effect
  useEffect(() => {
    // Skip if we haven't rendered yet, if we're still loading, if we're submitting,
    // or if there's no free plan parameter
    if (!hasRendered || loading || submitting || searchParams.get('plan') !== 'free') {
      return;
    }

    // Set a flag to prevent double processing
    const processingKey = 'freePlanProcessing';
    if (localStorage.getItem(processingKey) === 'true') {
      logger.debug('[SubscriptionPage] Free plan already being processed, skipping');
      return;
    }

    try {
      // Mark as processing
      localStorage.setItem(processingKey, 'true');
      
      // Handle free plan selection
      logger.debug('[SubscriptionPage] Free plan detected in URL, handling selection');
      handleFreePlanSelection();
      
      // Clear the processing flag after a timeout
      setTimeout(() => {
        localStorage.removeItem(processingKey);
      }, 5000);
    } catch (e) {
      // Clear the processing flag in case of error
      localStorage.removeItem(processingKey);
      logger.error('[SubscriptionPage] Error processing free plan:', e);
    }
  }, [loading, submitting, searchParams, hasRendered]);
  
  // Process URL parameters when redirected from tenant page
  useEffect(() => {
    // Skip if we've already run this effect
    if (loadedParams) {
      return;
    }
    
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
    
    // Mark as loaded so we don't run this effect again
    setLoadedParams(true);
    
    // Short delay before showing content
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  }, [searchParams, loadedParams]);

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
      {loading ? (
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <NotificationProvider>
          <SubscriptionForm />
        </NotificationProvider>
      )}
    </div>
  );
}
