///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/subscription/page.js
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { generateClient } from 'aws-amplify/api';
import { fetchUserAttributes, updateUserAttributes, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { CheckIcon } from '@heroicons/react/24/solid';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { getOnboardingState } from '@/utils/cognito-utils';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { isValidUUID, generateDeterministicTenantId } from '@/utils/tenantUtils';
import { safeUpdateUserAttributes } from '@/utils/safeAttributes';
import { monitoredFetch } from '@/utils/networkMonitor';
import { 
  getFallbackTenantId, 
  storeReliableTenantId, 
  createFallbackApiResponse 
} from '@/utils/tenantFallback';

// Create API client
const apiClient = generateClient();

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

// Helper to get business info from Cognito and AppCache with enhanced reliability
const getBusinessInfoFromCognito = async () => {
  try {
    // Try multiple sources in order of reliability
    
    // 1. First try to get from sessionStorage directly (most reliable)
    try {
      const sessionBusinessInfo = sessionStorage.getItem('business_info');
      if (sessionBusinessInfo) {
        const parsedInfo = JSON.parse(sessionBusinessInfo);
        logger.debug('[SubscriptionPage] Using business info from sessionStorage');
        return {
          businessInfo: parsedInfo,
          source: 'sessionStorage'
        };
      }
    } catch (sessionError) {
      logger.warn('[SubscriptionPage] Error reading from sessionStorage:', sessionError);
    }
    
    // 2. Then try to get from AppCache
    const cachedBusinessInfo = getCacheValue('business_info');
    if (cachedBusinessInfo) {
      logger.debug('[SubscriptionPage] Using cached business info from AppCache');
      
      // Also store in sessionStorage for redundancy
      try {
        sessionStorage.setItem('business_info', JSON.stringify(cachedBusinessInfo));
      } catch (e) {
        // Ignore storage errors
      }
      
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

// Update the saveSubscriptionToCognito function to use the safer attributes update
const saveSubscriptionToCognito = async (planId, billingCycle, currentTenantId) => {
  try {
    logger.info('[SubscriptionPage] Saving subscription to Cognito', { 
      planId, 
      billingCycle, 
      currentTenantId 
    });
    
    if (!currentTenantId) {
      throw new Error('Missing tenant ID for subscription');
    }
    
    // Define attributes to update - only use allowed attributes
    // Avoiding custom:tenantId - only using officially allowed Cognito attributes
    const updateAttributes = {
      'custom:subplan': planId,
      'custom:subscription_plan': planId, // Set both formats for better compatibility
      'custom:billing_cycle': billingCycle,
      'custom:subscription_status': 'active',
      'custom:updated_at': new Date().toISOString()
    };
    
    // Try to update using the safe wrapper first
    const updateResult = await safeUpdateUserAttributes(updateAttributes, {
      fallbackToAllowed: true
    });
    
    // Check if the safe update was successful
    if (updateResult.success) {
      logger.info('[SubscriptionPage] Subscription plan saved to Cognito successfully', {
        partialSuccess: updateResult.partialSuccess,
        updatedAttributes: updateResult.updatedAttributes
      });
    } else {
      // Safe update failed, try the direct update as a fallback (which might still fail)
      logger.warn('[SubscriptionPage] Safe update failed, falling back to direct update:', updateResult.error);
      
      try {
        // Call the AWS API to update user attributes directly
        const result = await updateUserAttributes({
          userAttributes: updateAttributes
        });
        
        logger.info('[SubscriptionPage] Direct subscription update succeeded');
      } catch (directError) {
        // Log but continue - we'll still store in cache
        logger.error('[SubscriptionPage] Both safe and direct attribute updates failed:', directError);
        
        // Initialize a retry for non-sensitive attributes later
        setTimeout(async () => {
          try {
            // Only try to update the timestamp which should be allowed
            await updateUserAttributes({
              userAttributes: {
                'custom:updated_at': new Date().toISOString()
              }
            });
            logger.info('[SubscriptionPage] Minimal attribute update succeeded');
          } catch (retryError) {
            logger.error('[SubscriptionPage] Even minimal attribute update failed:', retryError);
          }
        }, 3000);
      }
    }
    
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
    
    return { success: true };
  } catch (error) {
    logger.error('[SubscriptionPage] Error saving subscription to Cognito:', error);
    // Return an object with success: false instead of throwing to handle gracefully
    return { success: false, error };
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
  const retryDelay = (attempt) => Math.min(2 ** attempt * 1000, 8000); // Exponential backoff
  let currentRetry = 0;
  
  // Get auth token for API call
  const token = await getAuthToken(currentRetry > 0);
  
  // Validate tenant ID format
  if (!tenantId || !isValidUUID(tenantId)) {
    console.warn("[SubscriptionPage] Invalid tenant ID format, regenerating:", tenantId);
    tenantId = generateDeterministicTenantId(String(tenantId) || uuidv4());
  }
  
  // Store tenant ID in localStorage for potential recovery
  storeReliableTenantId(tenantId);
  
  const makeRequest = async () => {
    try {
      // Prepare request data
      const payload = {
        tenantId,
        planId,
        billingCycle,
        requestId: generateRequestId()
      };
      
      console.log("[SubscriptionPage] Attempting to create or get tenant:", payload);
      
      // Use monitored fetch for network resilience
      const response = await monitoredFetch('/api/tenant/getOrCreate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
        timeout: 8000 // 8 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("[SubscriptionPage] Tenant creation successful:", data);
        
        // Update Cognito with tenant ID for future use
        await updateTenantIdInCognito(tenantId);
        
        return {
          success: true,
          tenantId: data.tenant?.id || tenantId,
          ...data
        };
      } else {
        // Handle different error status codes
        if (response.status === 404) {
          // The API endpoint is not found, use fallback mechanism
          console.warn("[SubscriptionPage] Tenant API endpoint not found (404), using fallback");
          
          // Try fallback API first
          try {
            const fallbackResponse = await fetch('/api/tenant/fallback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tenantId, businessId: tenantId })
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              console.log("[SubscriptionPage] Fallback API successful:", fallbackData);
              
              // Update Cognito with tenant ID
              await updateTenantIdInCognito(fallbackData.tenant?.id || tenantId);
              
              return {
                success: true,
                tenantId: fallbackData.tenant?.id || tenantId,
                fallback: true,
                ...fallbackData
              };
            }
          } catch (fallbackError) {
            console.error("[SubscriptionPage] Fallback API also failed:", fallbackError);
          }
          
          // If even fallback API fails, create a client-side fallback response
          return createFallbackApiResponse(tenantId);
        }
        
        // For other error codes, retry if possible
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error("[SubscriptionPage] Error creating/getting tenant (attempt " + (currentRetry + 1) + "):", error);
      
      if (currentRetry < retryCount) {
        currentRetry++;
        const delay = retryDelay(currentRetry);
        console.log(`[SubscriptionPage] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return makeRequest();
      }
      
      // If all retries fail, use fallback
      console.warn("[SubscriptionPage] All retries failed, using fallback response");
      
      // Ensure tenant ID is stored locally even if API fails
      storeReliableTenantId(tenantId);
      
      // Try local fallback API endpoint
      try {
        const fallbackResponse = await fetch('/api/tenant/fallback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId })
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log("[SubscriptionPage] Fallback API successful after retries:", fallbackData);
          return {
            success: true,
            tenantId: fallbackData.tenant?.id || tenantId,
            fallback: true,
            ...fallbackData
          };
        }
      } catch (fallbackError) {
        console.error("[SubscriptionPage] Fallback API also failed after retries:", fallbackError);
      }
      
      // Last resort: create client-side fallback response
      return createFallbackApiResponse(tenantId);
    }
  };
  
  return makeRequest();
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
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Authentication and initialization
  useEffect(() => {
    // Check if this is a direct navigation from business info page
    const source = searchParams.get('source');
    const fallback = searchParams.get('fallback');
    const timestamp = searchParams.get('ts');
    
    // Log navigation source for debugging
    if (source) {
      logger.debug('[SubscriptionPage] Page loaded from source:', { 
        source, 
        fallback: fallback === 'true',
        timestamp
      });
    }
    
    const checkAuth = async () => {
      try {
        logger.debug('[SubscriptionPage] Starting authentication check');
        
        // Use the new Amplify v6 syntax for getCurrentUser
        const { userId, username } = await getCurrentUser().catch(error => {
          logger.warn('[SubscriptionPage] getCurrentUser error, trying fallback:', error);
          
          // Check if we have tokens in sessionStorage as fallback
          const idToken = sessionStorage.getItem('idToken');
          if (idToken) {
            // Extract user info from token if possible
            try {
              const tokenParts = idToken.split('.');
              if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                return { 
                  userId: payload.sub, 
                  username: payload.email || payload['cognito:username'] 
                };
              }
            } catch (tokenError) {
              logger.error('[SubscriptionPage] Failed to parse token:', tokenError);
            }
          }
          
          // Re-throw if fallback fails
          throw error;
        });
        
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
      logger.debug('[SubscriptionPage] Initializing subscription page');
      
      // Get business info from AppCache or Cognito with fallback
      try {
        const { businessInfo, source } = await getBusinessInfoFromCognito();
        logger.debug('[SubscriptionPage] Retrieved business info successfully from ' + source);
        setBusinessData(businessInfo);
      } catch (businessInfoError) {
        logger.warn('[SubscriptionPage] Failed to get business info, using defaults:', businessInfoError);
        // Use default business data if retrieval fails
        setBusinessData({
          businessName: 'Your Business',
          businessType: 'Other',
          legalName: 'Your Business',
          country: 'US'
        });
      }
      
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
      
      // Check if we already have a valid UUID tenant ID
      const existingTenantId = attributes['custom:tenant_ID'] || attributes['custom:businessid'];
      
      // Log the tenant ID for debugging
      logger.info('[SubscriptionPage] Retrieved tenant ID from Cognito:', {
        tenantId: existingTenantId,
        source: existingTenantId === attributes['custom:tenant_ID'] ? 'custom:tenant_ID' : 
               (existingTenantId === attributes['custom:businessid'] ? 'custom:businessid' : 'none'),
        isUUID: existingTenantId && isValidUUID(existingTenantId)
      });
      
      // If we have a valid UUID tenant ID, use it
      if (existingTenantId && isValidUUID(existingTenantId)) {
        logger.info('[SubscriptionPage] Using existing valid UUID tenant ID:', existingTenantId);
        setCacheValue('tenant_id', existingTenantId, { ttl: 86400000 * 30 }); // 30 days
        return existingTenantId;
      }
      
      // Get user ID to use as a seed for deterministic UUID generation
      const { userId } = await getCurrentUser();
      
      if (!userId) {
        throw new Error('No user ID available for tenant ID generation');
      }
      
      // If we have a business ID in non-UUID format, generate a deterministic UUID from it
      if (existingTenantId && !isValidUUID(existingTenantId)) {
        // Use the business ID as a seed for deterministic UUID
        logger.warn('[SubscriptionPage] Converting non-UUID business ID to deterministic UUID:', existingTenantId);
        
        // We'll use the business ID prefixed with the user ID as the seed
        const seed = `${userId}_${existingTenantId}`;
        const deterministicId = generateDeterministicTenantId(seed);
        
        logger.info('[SubscriptionPage] Generated deterministic UUID from business ID:', {
          businessId: existingTenantId,
          deterministicId
        });
        
        // Store in app cache
        setCacheValue('tenant_id', deterministicId, { ttl: 86400000 * 30 });
        
        // Also update in Cognito for consistency
        try {
          await updateUserAttributes({
            userAttributes: {
              'custom:tenant_ID': deterministicId,
              'custom:businessid': deterministicId,
              'custom:updated_at': new Date().toISOString()
            }
          });
          logger.info('[SubscriptionPage] Updated Cognito with deterministic tenant ID');
        } catch (updateError) {
          logger.warn('[SubscriptionPage] Could not update Cognito with deterministic tenant ID:', updateError);
          // Continue with local value even if Cognito update fails
        }
        
        return deterministicId;
      }
      
      // No tenant ID found at all - generate a deterministic one based on user ID
      const deterministicId = generateDeterministicTenantId(userId);
      logger.info('[SubscriptionPage] Generated new deterministic tenant ID from user ID:', deterministicId);
      
      // Store in app cache for future use
      setCacheValue('tenant_id', deterministicId, { ttl: 86400000 * 30 });
      
      // Also update in Cognito for consistency
      try {
        await updateUserAttributes({
          userAttributes: {
            'custom:tenant_ID': deterministicId,
            'custom:businessid': deterministicId,
            'custom:updated_at': new Date().toISOString()
          }
        });
        logger.info('[SubscriptionPage] Updated Cognito with new deterministic tenant ID');
      } catch (updateError) {
        logger.warn('[SubscriptionPage] Could not update Cognito with new deterministic tenant ID:', updateError);
        // Continue with local value even if Cognito update fails
      }
      
      return deterministicId;
    } catch (error) {
      logger.error('[SubscriptionPage] Error in getOrCreateValidTenantId:', error);
      
      // Generate a UUID as fallback - still use deterministic if possible
      try {
        const { userId } = await getCurrentUser();
        if (userId) {
          const deterministicId = generateDeterministicTenantId(userId);
          setCacheValue('tenant_id', deterministicId, { ttl: 86400000 * 30 });
          return deterministicId;
        }
      } catch (userError) {
        logger.error('[SubscriptionPage] Could not get user ID for fallback deterministic UUID:', userError);
      }
      
      // Last resort - completely random UUID
      const fallbackId = uuidv4();
      setCacheValue('tenant_id', fallbackId, { ttl: 86400000 * 30 });
      return fallbackId;
    }
  };

  // Update the handleFreePlanSelection function
  const handleFreePlanSelection = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      console.log("[SubscriptionPage] Free plan selected");
      
      // Get or generate tenant ID
      let tenantId = await getOrCreateValidTenantId();
      console.log("[SubscriptionPage] Using tenant ID for free plan:", tenantId);
      
      // Mark it as subscription completed in localStorage for recovery
      localStorage.setItem('subscription_completed', 'true');
      localStorage.setItem('tenant_id', tenantId);
      
      // Create or get tenant with free plan
      const result = await createOrGetTenant(tenantId, 'free', 'monthly');
      
      if (result.success) {
        console.log("[SubscriptionPage] Free plan setup successful:", result);
        
        // Update Cognito with subscription status
        await saveSubscriptionToCognito('free', 'monthly', result.tenantId || tenantId);
        
        // Store tenant info securely
        storeReliableTenantId(result.tenantId || tenantId);
        
        // Redirect to dashboard using the tenant ID from result or fallback
        const effectiveTenantId = result.tenantId || result.tenant?.id || tenantId || getFallbackTenantId();
        
        if (effectiveTenantId) {
          const dashboardUrl = `/${effectiveTenantId}/dashboard?fromSubscription=true`;
          console.log("[SubscriptionPage] Redirecting to dashboard:", dashboardUrl);
          router.push(dashboardUrl);
        } else {
          console.error("[SubscriptionPage] No valid tenant ID for redirect");
          setErrorMessage("We couldn't redirect you to the dashboard. Please try again.");
        }
      } else {
        console.error("[SubscriptionPage] Free plan setup failed:", result);
        
        // Try fallback mechanisms
        if (result.fallback) {
          console.log("[SubscriptionPage] Using fallback tenant:", result);
          
          // Redirect with fallback tenant
          const fallbackTenantId = result.tenant?.id || tenantId || getFallbackTenantId();
          
          if (fallbackTenantId) {
            console.log("[SubscriptionPage] Redirecting with fallback tenant ID:", fallbackTenantId);
            router.push(`/${fallbackTenantId}/dashboard?fromSubscription=true&fallback=true`);
            return;
          }
        }
        
        // Show error if no fallback works
        setErrorMessage("There was an error setting up your account. Please try again.");
      }
    } catch (error) {
      console.error("[SubscriptionPage] Error in free plan selection:", error);
      
      // Try fallback redirect as last resort
      const fallbackId = getFallbackTenantId();
      if (fallbackId) {
        console.log("[SubscriptionPage] Attempting fallback redirect with ID:", fallbackId);
        router.push(`/${fallbackId}/dashboard?fromSubscription=true&recovery=true`);
      } else {
        setErrorMessage("There was an error setting up your account. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Update the handlePaidPlanSelection function
  const handlePaidPlanSelection = async (planId) => {
    try {
      setSubmitting(true);
      clearErrors();
      
      // Log the paid plan selection
      console.log("[SubscriptionPage] Paid plan selected:", { planId, billingCycle });
      
      // Get and validate the tenant ID
      const currentTenantId = await getOrCreateValidTenantId();
      
      // Store the tenant ID in local cache with a 30-day TTL
      await storeTenantInfo({
        tenantId: currentTenantId,
        ttl: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      try {
        // Call the createOrGetTenant function with the tenant ID and plan details
        const result = await createOrGetTenant(currentTenantId, planId, billingCycle);
        
        if (result?.success) {
          console.log("[SubscriptionPage] Tenant created or updated successfully:", result);
          
          // Update the tenant ID if a new one was returned
          if (result.tenantId && result.tenantId !== currentTenantId) {
            await updateTenantIdInCognito(result.tenantId);
            setTenantId(result.tenantId);
          }
        }
      } catch (apiError) {
        console.warn("[SubscriptionPage] API call failed, continuing with cached tenant ID:", apiError);
        // Continue with the process even if the API call fails
      }
      
      try {
        // Save the subscription information to Cognito
        await saveSubscriptionToCognito(planId, billingCycle, currentTenantId);
        console.log("[SubscriptionPage] Subscription saved to Cognito successfully");
      } catch (cognitoError) {
        console.error("[SubscriptionPage] Failed to save subscription to Cognito:", cognitoError);
        // Continue with the process even if saving to Cognito fails
      }
      
      // Create a checkout session if everything is successful
      try {
        const checkoutSessionUrl = await createCheckoutSession({
          planId,
          billingCycle,
          tenantId: tenantId || currentTenantId,
        });
        
        if (checkoutSessionUrl) {
          // Redirect to the checkout session URL
          window.location.href = checkoutSessionUrl;
          return;
        } else {
          throw new Error("No checkout URL returned");
        }
      } catch (checkoutError) {
        console.error("[SubscriptionPage] Failed to create checkout session:", checkoutError);
        
        // FALLBACK: If checkout fails, redirect to dashboard anyway
        const finalTenantId = tenantId || currentTenantId;
        const redirectPath = `/${finalTenantId}/dashboard`;
        
        console.log("[SubscriptionPage] Checkout failed, redirecting to dashboard with tenant ID", {
          tenantId: finalTenantId,
          redirectUrl: redirectPath,
          fallbackReason: "checkout_failed"
        });
        
        // Add a slight delay to ensure logs are visible
        setTimeout(() => {
          // Force client-side navigation via direct window location to bypass router issues
          window.location.href = redirectPath;
        }, 500);
      }
      
    } catch (error) {
      console.error("[SubscriptionPage] Error in paid plan selection:", error);
      setError("general", error.message || "Failed to select paid plan");
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

  // Add a direct tenant route resolution method to the page for edge cases
  useEffect(() => {
    // Post-subscription redirect handler with retries
    const handlePostSubscriptionRedirect = async () => {
      console.log("[SubscriptionPage] Checking for post-subscription redirect");
      
      // Check if subscription is completed
      const isCompleted = localStorage.getItem('subscription_completed') === 'true';
      if (!isCompleted) return;
      
      // Get tenant ID from various sources
      const tenantId = getFallbackTenantId();
      if (!tenantId) {
        console.warn("[SubscriptionPage] No tenant ID found for post-subscription redirect");
        return;
      }
      
      console.log("[SubscriptionPage] Attempting post-subscription redirect with tenant ID:", tenantId);
      
      try {
        // Try to redirect to dashboard
        const dashboardUrl = `/${tenantId}/dashboard?fromSubscription=true&recovery=true`;
        router.push(dashboardUrl);
      } catch (error) {
        console.error("[SubscriptionPage] Error in post-subscription redirect:", error);
      }
    };
    
    // Check for post-subscription redirect after a delay
    const redirectTimeout = setTimeout(handlePostSubscriptionRedirect, 2500);
    
    return () => clearTimeout(redirectTimeout);
  }, [router]);

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
  
  // Add error state rendering
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 className="mb-4 text-xl font-semibold text-center text-gray-800">Error Loading Subscription Options</h2>
          <p className="mb-6 text-center text-gray-600">{error}</p>
          <div className="flex flex-col space-y-3">
            <button 
              onClick={() => { setError(null); initializeSubscription(); }}
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Try Again
            </button>
            <button 
              onClick={() => router.push('/onboarding/business-info')}
              className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            >
              Back to Business Info
            </button>
          </div>
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
