'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { setCache, getCache } from '@/utils/cacheClient';
import { isValidUUID } from '@/utils/tenantUtils';
import { getFallbackTenantId, createFallbackApiResponse, storeReliableTenantId } from '@/utils/tenantFallback';

// Custom hook for Auth0 v4.x session management
const useAuth0Session = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const sessionData = await response.json();
          if (sessionData && sessionData.user) {
            setUser(sessionData.user);
          }
        }
      } catch (err) {
        console.error('[useAuth0Session] Error fetching session:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, []);

  return { user, isLoading, error };
};

// Header component with sign out option
const Header = ({ showSignOut = false, showBackButton = false }) => {
  const router = useRouter();

  const handleBack = () => {
    router.push('/onboarding/business-info');
  };

  const handleSignOut = async () => {
    try {
      window.location.href = '/api/auth/logout';
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

// Main SubscriptionPage component
export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useAuth0Session();
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
          const cachedBusinessInfo = getCache('business_info');
          if (cachedBusinessInfo) {
            logger.debug('[SubscriptionPage] Using cached business info');
            setBusinessData({
              businessName: cachedBusinessInfo.legal_name || 'Your Business',
              businessType: cachedBusinessInfo.business_type || 'Other'
            });
          } else {
            // Try to get from API
            const response = await fetch('/api/onboarding/business-info');
            if (response.ok) {
              const data = await response.json();
              if (data.businessInfo) {
                const businessInfo = {
                  businessName: data.businessInfo.businessName || 'Your Business',
                  businessType: data.businessInfo.businessType || 'Other'
                };
                setBusinessData(businessInfo);
                setCache('business_info', data.businessInfo, { ttl: 3600000 }); // 1 hour
              }
            }
          }
        } catch (error) {
          logger.error('[SubscriptionPage] Error loading business info:', error);
          // Use defaults
        }

        // Get tenant ID
        const fallbackTenantId = getFallbackTenantId();
        if (fallbackTenantId) {
          setTenantId(fallbackTenantId);
          logger.debug('[SubscriptionPage] Using fallback tenant ID');
        }

      } catch (error) {
        logger.error('[SubscriptionPage] Initialization error:', error);
        setError('Failed to initialize subscription page');
      } finally {
        setLoading(false);
      }
    };

    // Only initialize when user auth state is resolved
    if (!userLoading) {
      initializeSubscription();
    }
  }, [userLoading]);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check if still loading
      if (userLoading) {
        return;
      }
      
      if (!user) {
        logger.warn('[SubscriptionPage] No authenticated user found, redirecting to Auth0 login');
        // Redirect to Auth0 login
        window.location.href = '/api/auth/login';
        return;
      }
      
      // If user is authenticated, check if they have completed business info
      try {
        logger.debug('[SubscriptionPage] User authenticated, checking onboarding status');
        
        // Get user profile to check onboarding status
        const profileResponse = await fetch('/api/auth/profile');
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          
          console.log('🚨 [SUBSCRIPTION PAGE] === PROFILE API RESPONSE ANALYSIS ===');
          console.log('🚨 [SUBSCRIPTION PAGE] Raw profile response:', profile);
          console.log('🚨 [SUBSCRIPTION PAGE] Profile analysis:', {
            email: profile.email,
            needsOnboarding: profile.needsOnboarding,
            onboardingCompleted: profile.onboardingCompleted,
            currentStep: profile.currentStep,
            businessInfoCompleted: profile.businessInfoCompleted,
            tenantId: profile.tenantId,
            lastUpdated: profile.lastUpdated
          });
          
          logger.info('[SubscriptionPage] Profile API response:', profile);
          if (profile) {
            logger.debug('[SubscriptionPage] User profile:', {
              email: profile.email,
              needsOnboarding: profile.needsOnboarding,
              currentStep: profile.currentStep,
              tenantId: profile.tenantId
            });
            
            console.log('🚨 [SUBSCRIPTION PAGE] === REDIRECT LOGIC ANALYSIS ===');
            console.log('🚨 [SUBSCRIPTION PAGE] Checking redirect condition 1:');
            console.log('🚨 [SUBSCRIPTION PAGE] - profile.needsOnboarding:', profile.needsOnboarding);
            console.log('🚨 [SUBSCRIPTION PAGE] - profile.currentStep:', profile.currentStep);
            console.log('🚨 [SUBSCRIPTION PAGE] - Condition 1 result:', profile.needsOnboarding && profile.currentStep === 'business_info');
            
            // If user still needs business info, redirect them back
            if (profile.needsOnboarding && profile.currentStep === 'business_info') {
              console.log('🚨 [SUBSCRIPTION PAGE] ❌ REDIRECT TRIGGERED - Condition 1: needsOnboarding=true AND currentStep=business_info');
              logger.info('[SubscriptionPage] Business info incomplete, redirecting to business-info page');
              router.push('/onboarding/business-info');
              return;
            }
            
            console.log('🚨 [SUBSCRIPTION PAGE] Checking redirect condition 2:');
            console.log('🚨 [SUBSCRIPTION PAGE] - profile.needsOnboarding:', profile.needsOnboarding);
            console.log('🚨 [SUBSCRIPTION PAGE] - profile.businessInfoCompleted:', profile.businessInfoCompleted);
            console.log('🚨 [SUBSCRIPTION PAGE] - profile.currentStep:', profile.currentStep);
            console.log('🚨 [SUBSCRIPTION PAGE] - !profile.currentStep:', !profile.currentStep);
            console.log('🚨 [SUBSCRIPTION PAGE] - currentStep === business_info:', profile.currentStep === 'business_info');
            console.log('🚨 [SUBSCRIPTION PAGE] - Condition 2 result:', profile.needsOnboarding && !profile.businessInfoCompleted && (!profile.currentStep || profile.currentStep === 'business_info'));
            
            // Additional validation: Check if business info is actually completed
            if (profile.needsOnboarding && !profile.businessInfoCompleted && 
                (!profile.currentStep || profile.currentStep === 'business_info')) {
              console.log('🚨 [SUBSCRIPTION PAGE] ❌ REDIRECT TRIGGERED - Condition 2: needsOnboarding=true AND businessInfoCompleted=false');
              logger.info('[SubscriptionPage] Business info not completed, redirecting to business-info page');
              router.push('/onboarding/business-info');
              return;
            }
            
            console.log('🚨 [SUBSCRIPTION PAGE] ✅ NO REDIRECT - User passed all validation checks');
            console.log('🚨 [SUBSCRIPTION PAGE] User will remain on subscription page');
            
            // Set tenant ID if available from profile
            if (profile.tenantId && !tenantId) {
              setTenantId(profile.tenantId);
            }
          }
        } else {
          console.log('🚨 [SUBSCRIPTION PAGE] ❌ PROFILE API FAILED');
          console.log('🚨 [SUBSCRIPTION PAGE] Response status:', profileResponse.status);
          console.log('🚨 [SUBSCRIPTION PAGE] Response statusText:', profileResponse.statusText);
          logger.warn('[SubscriptionPage] Could not fetch user profile, continuing with session data');
        }
      } catch (error) {
        logger.error('[SubscriptionPage] Error checking user profile:', error);
        // Continue to show subscription page - user is authenticated via session
      }
    };

    // Only run auth check when user loading state is resolved
    checkAuth();
  }, [user, userLoading, router, tenantId]);

  const handleFreePlanSelection = async () => {
    try {
      setIsProcessing(true);
      logger.info('[SubscriptionPage] Processing free plan selection');

      // Save subscription choice via API
      const subscriptionData = {
        plan: 'free',
        billingInterval: billingCycle,
        paymentMethod: 'none',
        status: 'active'
      };

      const response = await fetch('/api/onboarding/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData)
      });

      if (response.ok) {
        logger.debug('[SubscriptionPage] Free plan saved successfully');
        
        // Cache the subscription data
        setCache('subscription_data', subscriptionData, { ttl: 86400000 }); // 24 hours
        
        // For free plan, complete setup in background and go directly to dashboard
        let setupTenantId = null;
        try {
          // Trigger background setup completion
          const setupResponse = await fetch('/api/onboarding/setup/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'complete',
              completedAt: new Date().toISOString(),
              background: true
            })
          });
          
          if (setupResponse.ok) {
            const setupResult = await setupResponse.json();
            logger.debug('[SubscriptionPage] Background setup completed successfully:', setupResult);
            
            // Get tenant ID from setup completion response
            if (setupResult.tenantId) {
              setupTenantId = setupResult.tenantId;
              logger.info('[SubscriptionPage] Got tenant ID from setup completion:', setupTenantId);
            }
          } else {
            logger.warn('[SubscriptionPage] Setup completion API failed:', setupResponse.status);
          }
        } catch (setupError) {
          logger.warn('[SubscriptionPage] Background setup failed, continuing anyway:', setupError);
          // Continue to dashboard redirect even if background setup fails
        }
        
        // Always attempt dashboard redirect regardless of background setup
        try {
          let foundTenantId = setupTenantId; // Start with tenant ID from setup completion
          
          // Method 1: Try to get tenant ID from profile (only if not already found)
          if (!foundTenantId) {
            try {
              const profileResponse = await fetch('/api/auth/profile');
              if (profileResponse.ok) {
                const profile = await profileResponse.json();
                logger.info('[SubscriptionPage] Profile API response:', profile);
                if (profile && (profile.tenantId || profile.tenant_id)) {
                  foundTenantId = profile.tenantId || profile.tenant_id;
                  logger.info('[SubscriptionPage] Got tenant ID from profile:', foundTenantId);
                } else {
                  logger.warn('[SubscriptionPage] Profile response missing tenantId:', {
                    hasProfile: !!profile,
                    profileKeys: profile ? Object.keys(profile) : [],
                    profile: profile
                  });
                }
              } else {
                logger.warn('[SubscriptionPage] Profile API failed:', profileResponse.status);
              }
            } catch (profileError) {
              logger.warn('[SubscriptionPage] Profile fetch failed:', profileError);
            }
          } else {
            logger.info('[SubscriptionPage] Already have tenant ID from setup completion, skipping profile API');
          }
          
          // Method 2: Try to get tenant ID from session if profile didn't work
          if (!foundTenantId) {
            try {
              const sessionResponse = await fetch('/api/auth/session');
              if (sessionResponse.ok) {
                const sessionData = await sessionResponse.json();
                logger.info('[SubscriptionPage] Session API response:', sessionData);
                if (sessionData && sessionData.user && (sessionData.user.tenantId || sessionData.user.tenant_id)) {
                  foundTenantId = sessionData.user.tenantId || sessionData.user.tenant_id;
                  logger.info('[SubscriptionPage] Got tenant ID from session:', foundTenantId);
                } else {
                  logger.warn('[SubscriptionPage] Session response missing tenantId:', {
                    hasSessionData: !!sessionData,
                    hasUser: !!(sessionData && sessionData.user),
                    userKeys: sessionData && sessionData.user ? Object.keys(sessionData.user) : [],
                    sessionData: sessionData
                  });
                }
              } else {
                logger.warn('[SubscriptionPage] Session API failed:', sessionResponse.status);
              }
            } catch (sessionError) {
              logger.warn('[SubscriptionPage] Session fetch failed:', sessionError);
            }
          }
          
          // Method 3: Check component state tenant ID
          if (!foundTenantId && tenantId) {
            foundTenantId = tenantId;
            logger.info('[SubscriptionPage] Using component state tenant ID:', foundTenantId);
          }
          
          // Method 4: Try to extract from recent user creation calls (check window/global state)
          if (!foundTenantId && typeof window !== 'undefined') {
            // Check if there's cached user creation data
            const cachedUserData = sessionStorage.getItem('recent_user_creation');
            if (cachedUserData) {
              try {
                const userData = JSON.parse(cachedUserData);
                if (userData.tenantId) {
                  foundTenantId = userData.tenantId;
                  logger.info('[SubscriptionPage] Got tenant ID from cached user creation data:', foundTenantId);
                }
              } catch (parseError) {
                logger.warn('[SubscriptionPage] Failed to parse cached user data:', parseError);
              }
            }
          }
          
          // Method 5: Try direct backend call to get user data
          if (!foundTenantId) {
            try {
              const directUserResponse = await fetch('/api/user/create-auth0-user', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ checkOnly: true })
              });
              
              if (directUserResponse.ok) {
                const userData = await directUserResponse.json();
                logger.info('[SubscriptionPage] Direct backend API response:', userData);
                if (userData.tenantId || userData.tenant_id) {
                  foundTenantId = userData.tenantId || userData.tenant_id;
                  logger.info('[SubscriptionPage] Got tenant ID from direct backend call:', foundTenantId);
                } else {
                  logger.warn('[SubscriptionPage] Direct backend response missing tenantId:', {
                    hasUserData: !!userData,
                    userDataKeys: userData ? Object.keys(userData) : [],
                    userData: userData
                  });
                }
              } else {
                logger.warn('[SubscriptionPage] Direct backend API failed:', directUserResponse.status);
              }
            } catch (backendError) {
              logger.warn('[SubscriptionPage] Direct backend call failed:', backendError);
            }
          }
          
          // Now redirect with the found tenant ID
          if (foundTenantId) {
            logger.info('[SubscriptionPage] Redirecting to tenant dashboard:', foundTenantId);
            router.push(`/tenant/${foundTenantId}/dashboard`);
            return;
          }
          
          // Last resort: generic dashboard with warning
          logger.warn('[SubscriptionPage] No tenant ID found anywhere, redirecting to generic dashboard');
          router.push('/dashboard');
        } catch (redirectError) {
          logger.error('[SubscriptionPage] Error during dashboard redirect:', redirectError);
          // Final fallback
          router.push('/dashboard');
        }
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      logger.error('[SubscriptionPage] Error selecting free plan:', error);
      setError('Failed to select plan. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaidPlanSelection = async (planId) => {
    try {
      setIsProcessing(true);
      logger.info('[SubscriptionPage] Processing paid plan selection', { planId });

      // Save subscription choice via API
      const subscriptionData = {
        plan: planId,
        billingInterval: billingCycle,
        paymentMethod: 'credit_card',
        status: 'pending'
      };

      const response = await fetch('/api/onboarding/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData)
      });

      if (response.ok) {
        logger.debug('[SubscriptionPage] Paid plan saved successfully');
        
        // Cache the subscription data
        setCache('subscription_data', subscriptionData, { ttl: 86400000 }); // 24 hours
        
        // For paid plans, go to payment page (which will redirect to dashboard after payment)
        router.push('/onboarding/payment');
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      logger.error('[SubscriptionPage] Error selecting paid plan:', error);
      setError('Failed to select plan. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlanSelection = (planId) => {
    setSelectedPlan(planId);
    
    if (planId === 'free') {
      handleFreePlanSelection();
    } else {
      handlePaidPlanSelection(planId);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription options...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showSignOut={true} showBackButton={true} />
      
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Choose Your Plan for {businessData.businessName}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Select the perfect plan for your {businessData.businessType.toLowerCase()} business
          </p>
          
          {/* Billing Toggle */}
          <div className="mt-8 flex justify-center">
            <div className="relative bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                className={`relative py-2 px-6 rounded-md text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`relative py-2 px-6 rounded-md text-sm font-medium transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => setBillingCycle('annual')}
              >
                Annual
                <span className="ml-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {subscriptionPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white border rounded-lg shadow-sm p-8 hover:shadow-lg transition-shadow ${
                selectedPlan === plan.id ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-200'
              }`}
            >
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-gray-600">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ${billingCycle === 'annual' && plan.price > 0 ? Math.round(plan.price * 0.8) : plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                  )}
                </div>
              </div>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanSelection(plan.id)}
                disabled={isProcessing}
                className={`mt-8 w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${
                  plan.id === 'professional'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : plan.id === 'enterprise'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing && selectedPlan === plan.id ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  `Choose ${plan.name}`
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
