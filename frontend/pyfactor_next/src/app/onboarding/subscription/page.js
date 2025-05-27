'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchUserAttributes, updateUserAttributes, getCurrentUser } from '@/config/amplifyUnified';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { setCacheValue, getCacheValue } from '@/utils/appCache';
import { isValidUUID } from '@/utils/tenantUtils';
import { getFallbackTenantId, createFallbackApiResponse, storeReliableTenantId } from '@/utils/tenantFallback';
import { fetchAuthSession } from '@/config/amplifyUnified';

// Header component with sign out option
const Header = ({ showSignOut = false, showBackButton = false }) => {
  const router = useRouter();

  const handleBack = () => {
    router.push('/onboarding/business-info');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white py-4 px-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          {showBackButton && (
            <button 
              onClick={handleBack}
              className="mr-4 text-gray-600 hover:text-gray-900"
              aria-label="Go back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <img 
            src="/logo.svg" 
            alt="Logo" 
            className="h-8"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/images/logo-fallback.png';
            }} 
          />
        </div>
        {showSignOut && (
          <button 
            onClick={handleSignOut}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
};

// Subscription plans data
const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    description: 'Basic features for small businesses',
    price: 0,
    features: [
      'Basic reporting',
      'Limited storage',
      'Email support'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Advanced features for growing businesses',
    price: 29,
    features: [
      'Advanced reporting',
      'Increased storage',
      'Priority support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Premium features for large businesses',
    price: 99,
    features: [
      'Full reporting suite',
      'Unlimited storage',
      '24/7 dedicated support'
    ]
  }
];

// CheckIcon component for features list
const CheckIcon = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={props.className || "h-5 w-5"} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path 
      fillRule="evenodd" 
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
      clipRule="evenodd" 
    />
  </svg>
);

// Add this session check helper function
const ensureAuthSessionSaved = async () => {
  try {
    // Try to get and refresh the current session
    const { tokens } = await fetchAuthSession({ forceRefresh: true });
    
    // Store auth tokens in sessionStorage for emergency fallback
    if (tokens?.idToken) {
      sessionStorage.setItem('idToken', tokens.idToken.toString());
      document.cookie = `idToken=${tokens.idToken.toString()}; path=/; max-age=86400; SameSite=Strict; Secure`;
      
      // Also set auth session cookie for middleware
      document.cookie = `authSessionId=${tokens.idToken.toString().split('.')[2]}; path=/; max-age=86400; SameSite=Strict; Secure`;
      
      // Extract expiration from token for debugging
      try {
        const payload = JSON.parse(atob(tokens.idToken.toString().split('.')[1]));
        const expiration = new Date(payload.exp * 1000).toISOString();
        logger.debug('[SubscriptionPage] Token refreshed, expires:', expiration);
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    if (tokens?.accessToken) {
      sessionStorage.setItem('accessToken', tokens.accessToken.toString());
      document.cookie = `accessToken=${tokens.accessToken.toString()}; path=/; max-age=86400; SameSite=Strict; Secure`;
    }
    
    return true;
  } catch (error) {
    logger.error('[SubscriptionPage] Error refreshing auth session:', error);
    return false;
  }
};

// Main SubscriptionPage component
export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [businessData, setBusinessData] = useState({
    businessName: 'Your Business',
    businessType: 'Other'
  });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tenantId, setTenantId] = useState(null);

  // Initialize subscription data
  useEffect(() => {
    const initializeSubscription = async () => {
      try {
        setLoading(true);
        logger.info('[SubscriptionPage] Initializing subscription page');

        // Try to get business info with fallback to defaults
        try {
          // Check AppCache first
          const cachedBusinessInfo = getCacheValue('businessInfo');
          if (cachedBusinessInfo) {
            logger.debug('[SubscriptionPage] Using cached business info');
            setBusinessData(cachedBusinessInfo);
          } else {
            // Try to get from Cognito attributes
            const attributes = await fetchUserAttributes();
            if (attributes['custom:businessname']) {
              const businessInfo = {
                businessName: attributes['custom:businessname'] || 'Your Business',
                businessType: attributes['custom:businesstype'] || 'Other',
                legalName: attributes['custom:legalname'] || attributes['custom:businessname'] || 'Your Business',
                country: attributes['custom:country'] || 'US'
              };
              setBusinessData(businessInfo);
              setCacheValue('businessInfo', businessInfo, { ttl: 3600000 }); // 1 hour
            }
          }
        } catch (error) {
          logger.warn('[SubscriptionPage] Failed to get business info, using defaults:', error);
        }

        // Generate tenant ID if needed
        let currentTenantId;
        try {
          const attributes = await fetchUserAttributes();
          currentTenantId = attributes['custom:tenant_ID'] || attributes['custom:businessid'];
          
          // If not a valid UUID, generate one
          if (!currentTenantId || !isValidUUID(currentTenantId)) {
            currentTenantId = uuidv4();
            logger.info('[SubscriptionPage] Generated new tenant ID:', currentTenantId);
            
            // Store the new ID in AppCache
            setCacheValue('tenant_id', currentTenantId, { ttl: 86400000 * 30 }); // 30 days
            
            // Try to update Cognito attributes
            try {
              await updateUserAttributes({
                userAttributes: {
                  'custom:tenant_ID': currentTenantId,
                  'custom:businessid': currentTenantId,
                  'custom:updated_at': new Date().toISOString()
                }
              });
            } catch (updateError) {
              logger.warn('[SubscriptionPage] Could not update Cognito with tenant ID:', updateError);
            }
          }
        } catch (error) {
          // Fallback to UUID generation if Cognito fails
          currentTenantId = uuidv4();
          logger.warn('[SubscriptionPage] Error getting tenant ID, generated fallback:', currentTenantId);
        }
        
        setTenantId(currentTenantId);
      } catch (error) {
        logger.error('[SubscriptionPage] Error initializing subscription:', error);
        setError('Failed to load subscription information. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    // Check authentication and initialize
    const checkAuth = async () => {
      try {
        await getCurrentUser();
        await initializeSubscription();
      } catch (error) {
        logger.error('[SubscriptionPage] Error authenticating user:', error);
        router.push('/sign-in');
      }
    };

    checkAuth();
  }, [router]);

  // Handle free plan selection
  const handleFreePlanSelection = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      logger.info('[SubscriptionPage] Free plan selected');

      // Ensure we have a tenant ID
      if (!tenantId) {
        const newTenantId = uuidv4();
        setTenantId(newTenantId);
        logger.info('[SubscriptionPage] Generated new tenant ID for free plan:', newTenantId);
      }

      // Store subscription info in localStorage for recovery and fallback
      localStorage.setItem('subscription_completed', 'true');
      localStorage.setItem('tenant_id', tenantId);
      localStorage.setItem('subscription_plan', 'free');
      localStorage.setItem('subscription_date', new Date().toISOString());

      // Also set as cookies for the middleware
      document.cookie = `tenant_id=${tenantId}; path=/; max-age=2592000; SameSite=Strict`;
      document.cookie = `subscription_plan=free; path=/; max-age=2592000; SameSite=Strict`;
      document.cookie = `subscription_status=active; path=/; max-age=2592000; SameSite=Strict`;

      // Skip Cognito attribute updates entirely - they're not allowed
      logger.info('[SubscriptionPage] Storing subscription data locally');

      // Store tenant ID for fallback mechanisms
      storeReliableTenantId(tenantId);

      // Add subscription data to session/local storage for the dashboard
      try {
        // Also try to use app cache if available
        if (typeof setCacheValue === 'function') {
          setCacheValue('selectedPlan', 'free', { ttl: 86400000 * 30 }); // 30 days
          setCacheValue('subscription_status', 'active', { ttl: 86400000 * 30 });
        }
        
        sessionStorage.setItem('selectedPlan', 'free');
        sessionStorage.setItem('subscription_status', 'active');
      } catch (storageError) {
        logger.warn('[SubscriptionPage] Error saving to session storage:', storageError);
      }

      // Refresh auth session before redirecting
      await ensureAuthSessionSaved();

      // Redirect to dashboard with the tenant ID
      const dashboardUrl = "/" + tenantId + "/dashboard?fromSubscription=true&plan=free";
      logger.info('[SubscriptionPage] Redirecting to dashboard:', dashboardUrl);
      
      // Use window.location.href for more reliable navigation with cookies
      window.location.href = dashboardUrl;
    } catch (error) {
      logger.error('[SubscriptionPage] Error in free plan selection:', error);
      setError('There was an error setting up your account. Please try again.');
      
      // Try fallback redirect
      try {
        const fallbackId = getFallbackTenantId() || tenantId || uuidv4();
        logger.info('[SubscriptionPage] Attempting fallback redirect with ID:', fallbackId);
        
        // First ensure authentication
        await ensureAuthSessionSaved();
        
        // Then redirect
        setTimeout(() => {
          router.push("/" + fallbackId + "/dashboard?fromSubscription=true&recovery=true");
        }, 500);
      } catch (redirectError) {
        logger.error('[SubscriptionPage] Fallback redirect failed:', redirectError);
        // If all else fails, try to go to home
        setTimeout(() => {
          router.push('/');
        }, 1500);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle paid plan selection
  const handlePaidPlanSelection = async (planId) => {
    try {
      setIsProcessing(true);
      setError(null);
      logger.info('[SubscriptionPage] Paid plan selected:', { planId, billingCycle });

      // Ensure we have a tenant ID
      if (!tenantId) {
        const newTenantId = uuidv4();
        setTenantId(newTenantId);
        logger.info('[SubscriptionPage] Generated new tenant ID for paid plan:', newTenantId);
      }

      // Store subscription info in localStorage for recovery and fallback
      localStorage.setItem('subscription_completed', 'true');
      localStorage.setItem('tenant_id', tenantId);
      localStorage.setItem('subscription_plan', planId);
      localStorage.setItem('billing_cycle', billingCycle);
      localStorage.setItem('subscription_date', new Date().toISOString());

      // Skip Cognito attribute updates entirely - they're not allowed
      logger.info('[SubscriptionPage] Storing subscription data locally');

      // Store tenant ID for fallback mechanisms
      storeReliableTenantId(tenantId);

      // Add subscription data to session/local storage for the dashboard
      try {
        // Also try to use app cache if available
        if (typeof setCacheValue === 'function') {
          setCacheValue('selectedPlan', planId, { ttl: 86400000 * 30 }); // 30 days
          setCacheValue('billingCycle', billingCycle, { ttl: 86400000 * 30 });
          setCacheValue('subscription_status', 'pending', { ttl: 86400000 * 30 });
        }
        
        sessionStorage.setItem('selectedPlan', planId);
        sessionStorage.setItem('billingCycle', billingCycle);
        sessionStorage.setItem('subscription_status', 'pending');
      } catch (storageError) {
        logger.warn('[SubscriptionPage] Error saving to session storage:', storageError);
      }

      // Refresh auth session before redirecting
      await ensureAuthSessionSaved();

      // For this simplified version, we'll redirect to the dashboard directly
      // In a real implementation, we would create a checkout session here
      const dashboardUrl = "/" + tenantId + "/dashboard?fromSubscription=true&plan=" + planId;
      logger.info('[SubscriptionPage] Redirecting to dashboard:', dashboardUrl);
      
      // Use Next.js router with a small delay to ensure tokens are saved
      setTimeout(() => {
        router.push(dashboardUrl);
      }, 500);
    } catch (error) {
      logger.error('[SubscriptionPage] Error in paid plan selection:', error);
      setError('There was an error setting up your subscription. Please try again.');
      
      // If all else fails, try to go to home
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle plan selection - directs to appropriate handler
  const handlePlanSelection = (planId) => {
    setSelectedPlan(planId);
    if (planId === 'free') {
      handleFreePlanSelection();
    } else {
      handlePaidPlanSelection(planId);
    }
  };

  // Loading state
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

  // Error state
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
              onClick={() => { setError(null); window.location.reload(); }}
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

  // Main subscription page content
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
          
          {/* Subscription Plans */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {subscriptionPlans.map(plan => (
              <div 
                key={plan.id}
                className={"border rounded-lg overflow-hidden " + (selectedPlan === plan.id ? 'border-2 border-blue-500 shadow-md' : 'border-gray-200')}
              >
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-500 mb-4">{plan.description}</p>
                  <p className="text-3xl font-bold mb-6">
                    {"$" + plan.price}
                    <span className="text-lg font-normal text-gray-500">/{billingCycle}</span>
                  </p>
                  <button
                    onClick={() => handlePlanSelection(plan.id)}
                    disabled={isProcessing}
                    className={"w-full py-2 px-4 rounded-md " + (
                      isProcessing ? 'bg-gray-300 cursor-not-allowed' : 
                      selectedPlan === plan.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    ) + " focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"}
                  >
                    {isProcessing && selectedPlan === plan.id ? 'Processing...' : 'Select ' + plan.name + ' Plan'}
                  </button>
                </div>
                <div className="px-6 pb-6">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          
          {/* Billing Cycle Toggle */}
          <div className="mt-10 flex flex-col items-center">
            <p className="text-gray-700 mb-4">Billing Cycle</p>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={"px-4 py-2 rounded-md " + (billingCycle === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800')}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={"px-4 py-2 rounded-md " + (billingCycle === 'annual' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800')}
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
