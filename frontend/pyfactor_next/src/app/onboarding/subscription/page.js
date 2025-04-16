///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/subscription/page.js
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { API } from 'aws-amplify';
import { fetchUserAttributes, updateUserAttributes, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { CheckIcon } from '@heroicons/react/24/solid';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { getOnboardingState } from '@/utils/cognito-utils';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

// Simple Header component
const Header = ({ showSignOut = false, showBackButton = false }) => {
  return (
    <header className="bg-white shadow-sm py-4 px-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          {showBackButton && (
            <Link 
              href="/onboarding/business-info" 
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </Link>
          )}
          <h1 className="text-lg font-semibold text-gray-900">PyFactor</h1>
        </div>
        {showSignOut && (
          <Link
            href="/sign-out"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign Out
          </Link>
        )}
      </div>
    </header>
  );
};

// Define subscription plans 
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

// Helper to get business info from Cognito and AppCache
const getBusinessInfoFromCognito = async () => {
  try {
    // Try to get from AppCache first
    const cachedBusinessInfo = getCacheValue('business_info');
    if (cachedBusinessInfo) {
      logger.debug('[SubscriptionPage] Using cached business info from AppCache');
      return {
        businessInfo: cachedBusinessInfo,
        source: 'appcache'
      };
    }
    
    // If not in AppCache, get directly from Cognito
    const attributes = await fetchUserAttributes();
    
    const businessInfo = {
      businessName: attributes['custom:businessname'] || 'Your Business',
      businessType: attributes['custom:businesstype'] || 'Other'
    };
    
    // Store in AppCache for future use
    setCacheValue('business_info', businessInfo, { ttl: 86400000 }); // 24 hours
    
    return {
      businessInfo,
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

// Helper function to handle submitting subscription plan selection to Cognito
const saveSubscriptionToCognito = async (planId, billingCycle, currentTenantId) => {
  try {
    logger.info('[SubscriptionPage] Saving subscription plan to Cognito', {
      planId,
      billingCycle,
      tenantId: currentTenantId,
      tenantIdType: typeof currentTenantId,
      isUUID: isValidUUID(currentTenantId)
    });
    
    if (!currentTenantId) {
      logger.error('[SubscriptionPage] Cannot save subscription without tenant ID');
      throw new Error('Missing tenant ID for subscription');
    }
    
    // Import AWS Amplify Auth to update user attributes
    const { updateUserAttributes } = await import('aws-amplify/auth');
    
    // Define attributes to update
    const updateAttributes = {
      'custom:subplan': planId,
      'custom:subscription_plan': planId, // Set both formats for better compatibility
      'custom:billing_cycle': billingCycle,
      'custom:subscription_status': 'active'
    };
    
    // Call the AWS API to update user attributes
    const result = await updateUserAttributes({
      userAttributes: updateAttributes
    });
    
    logger.info('[SubscriptionPage] Subscription plan saved to Cognito successfully');
    
    // Also store in local cache for backup and fast access
    if (typeof window !== 'undefined') {
      // Store with tenant isolation
      if (window.__APP_CACHE) {
        // Initialize tenant namespace if needed
        if (!window.__APP_CACHE.tenants) {
          window.__APP_CACHE.tenants = {};
        }
        if (!window.__APP_CACHE.tenants[currentTenantId]) {
          window.__APP_CACHE.tenants[currentTenantId] = {};
        }
        
        // Store subscription data in tenant namespace
        window.__APP_CACHE.tenants[currentTenantId].subscriptionType = planId;
        window.__APP_CACHE.tenants[currentTenantId].subscription_type = planId;
        window.__APP_CACHE.tenants[currentTenantId].billingCycle = billingCycle;
        
        // Also store with tenant-prefixed keys in user category
        if (!window.__APP_CACHE.user) {
          window.__APP_CACHE.user = {};
        }
        window.__APP_CACHE.user[`${currentTenantId}_subscriptionType`] = planId;
        window.__APP_CACHE.user[`${currentTenantId}_subscription_type`] = planId;
        window.__APP_CACHE.user[`${currentTenantId}_billingCycle`] = billingCycle;
      }
      
      // Also use traditional cache
      setCacheValue('selectedPlan', planId, { ttl: 86400000 * 30 }); // 30 days
      setCacheValue('billingCycle', billingCycle, { ttl: 86400000 * 30 }); // 30 days
      
      // Store with tenant ID for better isolation
      setCacheValue(`${currentTenantId}_subscriptionType`, planId, { ttl: 86400000 * 30 });
      setCacheValue(`${currentTenantId}_subscription_type`, planId, { ttl: 86400000 * 30 });
      setCacheValue(`${currentTenantId}_billingCycle`, billingCycle, { ttl: 86400000 * 30 });
    }
    
    // Make an API call to our subscription endpoint to ensure the backend is updated
    try {
      const apiUrl = `/api/user/subscription`;
      const token = await getAuthToken(true); // Force refresh for latest token
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          plan: planId,
          billingCycle
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.warn('[SubscriptionPage] API call to update subscription returned error:', {
          status: response.status,
          error: errorData
        });
      } else {
        const data = await response.json();
        logger.info('[SubscriptionPage] API call to update subscription successful:', data);
      }
    } catch (apiError) {
      // Log but don't block - the Cognito update is the critical part
      logger.warn('[SubscriptionPage] Error calling subscription API:', apiError);
    }
    
    return result;
  } catch (error) {
    logger.error('[SubscriptionPage] Error saving subscription to Cognito:', error);
    throw error;
  }
};

// Helper function to get authentication token for API calls with retry
const getAuthToken = async (forceRefresh = false) => {
  try {
    const { tokens } = await fetchAuthSession({ forceRefresh });
    return tokens?.idToken?.toString();
  } catch (error) {
    logger.error('[SubscriptionPage] Error getting auth token:', error);
    return null;
  }
};

// Helper function to create tenant with retries
const createOrGetTenant = async (tenantId, planId, billingCycle, retryCount = 3) => {
  let currentRetry = 0;
  let lastError = null;

  while (currentRetry < retryCount) {
    try {
      // Get the authentication token from Cognito, force refresh on retries
      const authToken = await getAuthToken(currentRetry > 0);
      
      if (!authToken) {
        logger.error('[SubscriptionPage] No auth token available for API call');
        throw new Error('Authentication token not available');
      }
      
      logger.info(`[SubscriptionPage] Making API call (attempt ${currentRetry + 1}/${retryCount})`);
      
      const response = await fetch('/api/tenant/getOrCreate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          tenantId,
          planId,
          billingCycle
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        logger.info('[SubscriptionPage] Successfully created/verified tenant record:', data);
        return { success: true, data };
      } else {
        const errorData = await response.json();
        logger.warn(`[SubscriptionPage] Error from tenant/getOrCreate API (attempt ${currentRetry + 1}/${retryCount}):`, errorData);
        
        // If unauthorized, retry with a fresh token
        if (response.status === 401) {
          currentRetry++;
          lastError = new Error(`Unauthorized (401) - retry ${currentRetry}/${retryCount}`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          continue;
        }
        
        // For other errors, return the failure
        return { success: false, error: errorData };
      }
    } catch (apiError) {
      logger.error(`[SubscriptionPage] API call error (attempt ${currentRetry + 1}/${retryCount}):`, apiError);
      currentRetry++;
      lastError = apiError;
      
      if (currentRetry < retryCount) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }
  }
  
  // If we get here, all retries failed
  return { success: false, error: lastError };
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
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  
  // Authentication and initialization
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Use the new Amplify v6 syntax for getCurrentUser
        const { userId, username } = await getCurrentUser();
        
        // Set user in state with compatible structure
        const currentUser = {
          username,
          attributes: {
            sub: userId
          }
        };
        
        setUser(currentUser);
        
        const onboardingState = await getOnboardingState(currentUser);
        if (onboardingState && onboardingState.completed) {
          router.push('/dashboard');
          return;
        }
        
        // Check if business info step is completed
        if (!onboardingState || !onboardingState.businessInfoCompleted) {
          router.push('/onboarding/business-info');
          return;
        }
        
        // Initialize subscription data
        await initializeSubscription();
      } catch (error) {
        logger.error('[SubscriptionPage] Error authenticating user:', error);
        router.push('/sign-in');
      }
    };
    
    checkAuth();
  }, [router, searchParams]);
  
  const initializeSubscription = async () => {
    try {
      setLoading(true);
      
      // Get business info from AppCache or Cognito
      const { businessInfo } = await getBusinessInfoFromCognito();
      setBusinessData(businessInfo);
      
      // Check for existing subscription in AppCache
      const cachedSubscription = getCacheValue('subscription');
      if (cachedSubscription) {
        logger.debug('[SubscriptionPage] Using cached subscription from AppCache', cachedSubscription);
        setSelectedPlan(cachedSubscription.planId);
        setBillingCycle(cachedSubscription.billingCycle || 'monthly');
      } else {
        // Try to get subscription from Cognito attributes
        try {
          const attributes = await fetchUserAttributes();
          if (attributes['custom:subplan']) {
            const planId = attributes['custom:subplan'];
            const billingCycle = attributes['custom:subscriptioninterval'] === 'annual' ? 'annual' : 'monthly';
            
            setSelectedPlan(planId);
            setBillingCycle(billingCycle);
            
            // Store in AppCache for future use
            setCacheValue('subscription', {
              planId,
              billingCycle,
              status: attributes['custom:subscriptionstatus'] || 'pending',
              requiresPayment: attributes['custom:requirespayment']?.toLowerCase() === 'true'
            }, { ttl: 3600000 }); // 1 hour
          }
        } catch (cognitoError) {
          logger.error('[SubscriptionPage] Error getting subscription from Cognito:', cognitoError);
        }
      }
      
      // Ensure we have a proper UUID tenant ID
      const validTenantId = await getOrCreateValidTenantId();
      setTenantId(validTenantId);
      
      logger.info('[SubscriptionPage] Using UUID tenant ID for subscription:', validTenantId);
      
    } catch (error) {
      logger.error('[SubscriptionPage] Error initializing subscription:', error);
      setError('Failed to load subscription information. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to ensure we have a valid UUID tenant ID 
  const getOrCreateValidTenantId = async () => {
    try {
      // Try to get tenant ID from Cognito first
      const attributes = await fetchUserAttributes();
      let tenantId = attributes['custom:tenant_ID'] || attributes['custom:tenantId'] || attributes['custom:businessid'];
      
      logger.info('[SubscriptionPage] Retrieved tenant ID from Cognito:', {
        tenantId,
        isUUID: tenantId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)
      });
      
      // If we have a tenant ID but it's not in UUID format, use local UUID generation
      if (tenantId && !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        logger.warn('[SubscriptionPage] Found tenant ID in old format:', tenantId);
        
        // Generate a proper UUID locally
        tenantId = uuidv4();
        logger.info('[SubscriptionPage] Generated replacement UUID for old format tenant ID:', tenantId);
      }
      
      // If still no valid UUID, generate one locally
      if (!tenantId || !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        tenantId = uuidv4();
        logger.info('[SubscriptionPage] Generated new UUID tenant ID locally:', tenantId);
      }
      
      // Store the tenant ID in app cache only (don't update Cognito directly here)
      setCacheValue('tenant_id', tenantId, { ttl: 86400000 * 30 }); // 30 days
      
      return tenantId;
    } catch (error) {
      logger.error('[SubscriptionPage] Error in getOrCreateValidTenantId:', error);
      
      // Generate a UUID as fallback
      const fallbackId = uuidv4();
      setCacheValue('tenant_id', fallbackId, { ttl: 86400000 * 30 }); // 30 days
      return fallbackId;
    }
  };

  // Update the handleFreePlanSelection function
  const handleFreePlanSelection = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      logger.info('[SubscriptionPage] Selecting free plan');
      
      // Ensure tenant ID is in UUID format
      if (tenantId && !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        logger.warn('[SubscriptionPage] Tenant ID is not in UUID format, generating proper UUID', {
          currentTenantId: tenantId
        });
        
        // Generate a new UUID for non-UUID tenant IDs
        const newUUID = uuidv4();
        logger.info('[SubscriptionPage] Generated new UUID to replace non-UUID tenant ID', {
          oldTenantId: tenantId,
          newTenantId: newUUID
        });
        
        // Update state
        setTenantId(newUUID);
        
        // Use the new UUID
        tenantId = newUUID;
      }
      
      // Store tenant ID in local cache
      setCacheValue('tenant_id', tenantId, { ttl: 86400000 * 30 }); // 30 days
      
      // First, ensure the tenant record exists in the database
      // Call the server-side API to create the tenant in AWS RDS and update Cognito
      logger.info('[SubscriptionPage] Calling tenant/getOrCreate API to ensure tenant record exists');
      let tenantCreated = false;
      
      // Use the new retry function
      const result = await createOrGetTenant(tenantId, 'free', billingCycle);
      
      if (result.success) {
        // Update tenant ID if a new one was returned
        if (result.data.tenantId && result.data.tenantId !== tenantId) {
          logger.info('[SubscriptionPage] Updating tenant ID from API response:', result.data.tenantId);
          tenantId = result.data.tenantId;
          setTenantId(result.data.tenantId);
          setCacheValue('tenant_id', result.data.tenantId, { ttl: 86400000 * 30 });
        }
        tenantCreated = true;
      } else {
        setError('Failed to create tenant record. Please try again.');
        return; // Exit early - don't redirect
      }
      
      // Continue with subscription data updates
      try {
        await saveSubscriptionToCognito('free', billingCycle, tenantId);
      } catch (cognitoError) {
        // Log error but continue with the flow
        logger.warn('[SubscriptionPage] Failed to update Cognito subscription attributes:', cognitoError);
      }
      
      // Set success state and prepare for redirect
      setSuccess(true);
      setMessage('Free plan selected successfully! Redirecting to dashboard...');
      
      // Log the redirect that's about to happen
      logger.info('[SubscriptionPage] Redirecting to dashboard with tenant ID', {
        tenantId,
        redirectUrl: tenantId ? `/${tenantId}/dashboard` : '/dashboard'
      });
      
      // Redirect after a short delay with tenant ID if available
      setTimeout(() => {
        if (tenantId) {
          router.push(`/${tenantId}/dashboard`);
        } else {
          router.push('/dashboard');
        }
      }, 1500);
      
    } catch (error) {
      logger.error('[SubscriptionPage] Error in free plan selection flow:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Update the handlePaidPlanSelection function
  const handlePaidPlanSelection = async (planId) => {
    try {
      setSubmitting(true);
      setError(null);
      
      logger.info('[SubscriptionPage] Selecting paid plan', { planId, billingCycle });
      
      // Ensure tenant ID is in UUID format
      if (tenantId && !tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        logger.warn('[SubscriptionPage] Tenant ID is not in UUID format, generating proper UUID', {
          currentTenantId: tenantId
        });
        
        // Generate a new UUID for non-UUID tenant IDs
        const newUUID = uuidv4();
        logger.info('[SubscriptionPage] Generated new UUID to replace non-UUID tenant ID', {
          oldTenantId: tenantId,
          newTenantId: newUUID
        });
        
        // Update state
        setTenantId(newUUID);
        
        // Use the new UUID
        tenantId = newUUID;
      }
      
      // Store tenant ID in local cache
      setCacheValue('tenant_id', tenantId, { ttl: 86400000 * 30 }); // 30 days
      
      // First, ensure the tenant record exists in the database
      // Call the server-side API to create the tenant in AWS RDS and update Cognito
      logger.info('[SubscriptionPage] Calling tenant/getOrCreate API to ensure tenant record exists');
      let tenantCreated = false;
      
      // Use the new retry function
      const result = await createOrGetTenant(tenantId, planId, billingCycle);
      
      if (result.success) {
        // Update tenant ID if a new one was returned
        if (result.data.tenantId && result.data.tenantId !== tenantId) {
          logger.info('[SubscriptionPage] Updating tenant ID from API response:', result.data.tenantId);
          tenantId = result.data.tenantId;
          setTenantId(result.data.tenantId);
          setCacheValue('tenant_id', result.data.tenantId, { ttl: 86400000 * 30 });
        }
        tenantCreated = true;
      } else {
        setError('Failed to create tenant record. Please try again.');
        return; // Exit early - don't redirect
      }
      
      // Continue with subscription data updates
      try {
        await saveSubscriptionToCognito(planId, billingCycle, tenantId);
      } catch (cognitoError) {
        // Log error but continue with the flow
        logger.warn('[SubscriptionPage] Failed to update Cognito subscription attributes:', cognitoError);
      }
      
      // Set success state and prepare for redirect
      setSuccess(true);
      setMessage(`${planId.charAt(0).toUpperCase() + planId.slice(1)} plan selected successfully! Redirecting to dashboard...`);
      
      // Log the redirect that's about to happen
      logger.info('[SubscriptionPage] Redirecting to dashboard with tenant ID', {
        tenantId,
        redirectUrl: tenantId ? `/${tenantId}/dashboard` : '/dashboard'
      });
      
      // Redirect after a short delay with tenant ID if available
      setTimeout(() => {
        if (tenantId) {
          router.push(`/${tenantId}/dashboard`);
        } else {
          router.push('/dashboard');
        }
      }, 1500);
      
    } catch (error) {
      logger.error('[SubscriptionPage] Error in paid plan selection flow:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Replace existing handlePlanSelection function with:
  const handlePlanSelection = async (planId) => {
    setSelectedPlan(planId);
    
    if (planId === 'free') {
      await handleFreePlanSelection();
    } else {
      await handlePaidPlanSelection(planId);
    }
  };

  // Function to reset error state and try the action again
  const handleTryAgain = () => {
    setError(null);
    if (selectedPlan) {
      handlePlanSelection(selectedPlan);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
          <p className="mt-4 text-lg text-gray-700">Loading subscription options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header showSignOut={true} showBackButton={true} />
      <main className="flex-grow px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-center mb-8 text-slate-800">Choose Your Subscription Plan</h1>
          <p className="text-md text-gray-600 text-center max-w-3xl mx-auto mb-8">
            Select the plan that best fits your business needs.
            You can upgrade or downgrade your subscription at any time.
          </p>
          
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">There was an error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleTryAgain}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckIcon className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{message}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Subscription Plans */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <div className={`border rounded-lg overflow-hidden ${selectedPlan === 'free' ? 'border-2 border-blue-500 shadow-md' : 'border-gray-200'}`}>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Free</h3>
                <p className="text-gray-500 mb-4">Basic features for small businesses</p>
                <p className="text-3xl font-bold mb-6">$0<span className="text-lg font-normal text-gray-500">/mo</span></p>
                <button
                  onClick={() => handlePlanSelection('free')}
                  disabled={submitting}
                  className={`w-full py-2 px-4 rounded-md ${selectedPlan === 'free' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors`}
                >
                  {submitting && selectedPlan === 'free' ? 'Processing...' : 'Select Free Plan'}
                </button>
              </div>
              <div className="px-6 pb-6">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-gray-700">Basic reporting</span>
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-gray-700">Limited storage</span>
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-gray-700">Email support</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Professional Plan */}
            <div className={`border rounded-lg overflow-hidden ${selectedPlan === 'professional' ? 'border-2 border-blue-500 shadow-md' : 'border-gray-200'}`}>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Professional</h3>
                <p className="text-gray-500 mb-4">Advanced features for growing businesses</p>
                <p className="text-3xl font-bold mb-6">$29<span className="text-lg font-normal text-gray-500">/{billingCycle}</span></p>
                <button
                  onClick={() => handlePlanSelection('professional')}
                  disabled={submitting}
                  className={`w-full py-2 px-4 rounded-md ${selectedPlan === 'professional' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors`}
                >
                  {submitting && selectedPlan === 'professional' ? 'Processing...' : 'Select Professional Plan'}
                </button>
              </div>
              <div className="px-6 pb-6">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-gray-700">Advanced reporting</span>
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-gray-700">Increased storage</span>
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-gray-700">Priority support</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Enterprise Plan */}
            <div className={`border rounded-lg overflow-hidden ${selectedPlan === 'enterprise' ? 'border-2 border-blue-500 shadow-md' : 'border-gray-200'}`}>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <p className="text-gray-500 mb-4">Premium features for large businesses</p>
                <p className="text-3xl font-bold mb-6">$99<span className="text-lg font-normal text-gray-500">/{billingCycle}</span></p>
                <button
                  onClick={() => handlePlanSelection('enterprise')}
                  disabled={submitting}
                  className={`w-full py-2 px-4 rounded-md ${selectedPlan === 'enterprise' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors`}
                >
                  {submitting && selectedPlan === 'enterprise' ? 'Processing...' : 'Select Enterprise Plan'}
                </button>
              </div>
              <div className="px-6 pb-6">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-gray-700">Full reporting suite</span>
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-gray-700">Unlimited storage</span>
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-gray-700">24/7 dedicated support</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Billing Cycle Toggle */}
          <div className="mt-10 flex flex-col items-center">
            <p className="text-gray-700 mb-4">Billing Cycle</p>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-md ${billingCycle === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-md ${billingCycle === 'annual' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Annual (Save 10%)
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
