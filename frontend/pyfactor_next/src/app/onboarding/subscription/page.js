///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/subscription/page.js
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { Box, Container, Typography, Button, Alert, CircularProgress } from '@/components/ui/TailwindComponents';

// Define subscription plans
const PLANS = [
  {
    id: 'free',
    name: 'Basic',
    price: {
      monthly: '0',
      annual: '0',
    },
    features: [
      'Income and expense tracking',
      'Invoice creation',
      'Basic features'
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: {
      monthly: '15',
      annual: '150',
    },
    features: [
      'Multiple users',
      'Advanced reporting',
      'Priority support'
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: {
      monthly: '45',
      annual: '450',
    },
    features: [
      'Unlimited everything',
      'Custom features',
      'Dedicated support'
    ],
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
    const initializeWithCookies = () => {
      try {
        const cookies = getCookies();
        
        // Get business data from cookies
        const businessName = cookies.businessName || '';
        const businessType = cookies.businessType || '';
        
        // Log what we found for debugging
        logger.debug('[SubscriptionPage] Initializing with cookies:', {
          businessName,
          businessType,
          onboardingStep: cookies.onboardingStep || '',
          onboardedStatus: cookies.onboardedStatus || '',
          hasIdToken: !!cookies.idToken,
          hasAccessToken: !!cookies.accessToken
        });
        
        // Set business data state
        setBusinessData({
          businessName,
          businessType
        });
        
        // Only load the page if we have business info
        if (businessName || businessType) {
          setLoading(false);
        } else {
          // If no business info in cookies, check the API
          checkBusinessInfoFromAPI();
        }
      } catch (error) {
        logger.error('[SubscriptionPage] Error initializing from cookies:', error);
        // Try the API as a fallback
        checkBusinessInfoFromAPI();
      }
    };
    
    const checkBusinessInfoFromAPI = async () => {
      try {
        logger.debug('[SubscriptionPage] Checking business info from API');
        const response = await fetch('/api/onboarding/business-info');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.businessInfo) {
            logger.debug('[SubscriptionPage] Got business info from API:', data);
            
            // Set business data state from API
            setBusinessData({
              businessName: data.businessInfo.businessName || '',
              businessType: data.businessInfo.businessType || ''
            });
            
            // If still no business info but we need to show the page
            if (!data.businessInfo.businessName && !data.businessInfo.businessType) {
              logger.warn('[SubscriptionPage] No business info from API either');
              setMessage('Business information not found. You may need to return to the business info page.');
            }
          } else {
            logger.warn('[SubscriptionPage] API check failed but continuing');
          }
        } else {
          logger.warn('[SubscriptionPage] API check returned error status:', response.status);
        }
      } catch (apiError) {
        logger.error('[SubscriptionPage] Error checking business info from API:', apiError);
      } finally {
        // Always finish loading even if API check failed
        setLoading(false);
      }
    };
    
    // Start initialization
    initializeWithCookies();
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
      // Store selected plan in session storage
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('selectedPlan', JSON.stringify({
            id: plan.id,
            name: plan.name,
            price: plan.price[billingCycle],
            billingCycle,
            timestamp: new Date().toISOString()
          }));
          logger.debug('[SubscriptionPage] Plan stored in session storage');
        } catch (storageError) {
          logger.warn('[SubscriptionPage] Failed to store plan in session storage:', storageError);
          // Continue anyway since we're using cookies as primary storage
        }
      }
      
      // Set cookies for onboarding flow
      if (typeof document !== 'undefined') {
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + 7); // 7 days
        
        // Set target based on plan
        const targetStep = plan.id === 'free' ? 'setup' : 'payment';
        
        // Update cookies with selected plan info
        document.cookie = `onboardingStep=${targetStep}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        document.cookie = `onboardedStatus=SUBSCRIPTION; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        document.cookie = `selectedPlan=${plan.id}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        document.cookie = `billingCycle=${billingCycle}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        
        logger.debug('[SubscriptionPage] Cookies set for plan selection:', {
          targetStep,
          selectedPlan: plan.id,
          billingCycle
        });
      }
      
      // Update Cognito attributes through the API
      // Important: This ensures Cognito attributes are updated even for free plan
      try {
        logger.debug('[SubscriptionPage] Updating Cognito attributes via API');
        const response = await fetch('/api/onboarding/subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plan: plan.id,
            interval: billingCycle,
            timestamp: new Date().toISOString()
          }),
          credentials: 'include'
        });
        
        const data = await response.json();
        logger.debug('[SubscriptionPage] API response:', data);
        
        if (!response.ok) {
          logger.warn('[SubscriptionPage] API returned error:', data);
          // Continue with cookies as backup even if API failed
        }
      } catch (apiError) {
        logger.error('[SubscriptionPage] Failed to update Cognito attributes:', apiError);
        // Continue with cookies as backup even if API failed
      }
      
      // Short timeout to ensure cookies are set before navigation
      setTimeout(() => {
        try {
          // Determine target route based on plan
          const targetRoute = plan.id === 'free' 
            ? '/dashboard' // Free plan goes straight to dashboard
            : '/onboarding/payment'; // Paid plans go to payment
            
          logger.debug('[SubscriptionPage] Navigating to:', targetRoute);
          
          // Use window.location for more reliable navigation
          if (typeof window !== 'undefined') {
            // Add timestamp to prevent caching issues
            window.location.href = `${targetRoute}?t=${Date.now()}`;
          } else {
            // Fallback to router if window is not available
            router.push(targetRoute);
          }
        } catch (error) {
          logger.error('[SubscriptionPage] Navigation error:', error);
          setMessage('Error during navigation. Please try again or reload the page.');
          setSubmitting(false);
        }
      }, 1000);
    } catch (error) {
      logger.error('[SubscriptionPage] Error during plan selection:', error);
      setMessage('Error processing your selection. Please try again.');
      setSubmitting(false);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box className="min-h-screen flex flex-col items-center justify-center">
          <CircularProgress />
          <Typography className="mt-4">Loading subscription options...</Typography>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box className="py-8">
        <Typography variant="h4" component="h1" className="text-center mb-2">
          Choose Your Subscription
        </Typography>
        <Typography variant="body1" className="text-center text-gray-600 mb-8">
          Select the plan that works best for your business
        </Typography>
        
        {/* Welcome message with business name */}
        {businessData.businessName && (
          <Alert severity="success" className="mb-8">
            <Typography variant="subtitle1">
              Welcome, <span className="font-medium">{businessData.businessName}</span>!
              {businessData.businessType && (
                <span className="ml-2 text-sm text-gray-600">
                  Business Type: {businessData.businessType}
                </span>
              )}
            </Typography>
          </Alert>
        )}
        
        {/* Status message */}
        {message && (
          <Alert 
            severity={submitting ? "info" : "error"} 
            className="mb-8"
          >
            <div className="flex items-center gap-2">
              <Typography>{message}</Typography>
              {submitting && <CircularProgress size="small" />}
            </div>
          </Alert>
        )}
        
        {/* Billing cycle toggle */}
        <Box className="flex justify-center mb-8">
          <div className="inline-flex p-1 bg-gray-100 rounded-lg">
            <button 
              className={`px-4 py-2 rounded-md ${billingCycle === 'monthly' ? 'bg-white shadow-sm' : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${billingCycle === 'annual' ? 'bg-white shadow-sm' : ''}`}
              onClick={() => setBillingCycle('annual')}
            >
              Annual <span className="text-xs text-green-600 font-bold">Save 17%</span>
            </button>
          </div>
        </Box>
        
        {/* Plan selection cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {PLANS.map((plan) => (
            <div key={plan.id} 
              className={`border rounded-lg p-6 transition-all ${
                selectedPlan?.id === plan.id ? 'border-blue-500 shadow-md' : 'shadow-sm hover:shadow'
              }`}
            >
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-2xl font-bold text-blue-600 mb-4">
                ${plan.price[billingCycle]}
                <span className="text-sm text-gray-500 font-normal ml-1">
                  {billingCycle === 'monthly' ? '/month' : '/year'}
                </span>
              </p>
              
              <hr className="my-4" />
              
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                className={`w-full py-2 px-4 rounded-md ${
                  submitting
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                onClick={() => handleSelectPlan(plan)}
                disabled={submitting}
              >
                {submitting && selectedPlan?.id === plan.id ? (
                  <span className="flex items-center justify-center">
                    <CircularProgress size="small" className="mr-2" />
                    Processing...
                  </span>
                ) : (
                  'Select Plan'
                )}
              </button>
            </div>
          ))}
        </div>
        
        {/* Back button */}
        <Box className="flex justify-between">
          <Button
            variant="outlined"
            onClick={() => router.push('/onboarding/business-info')}
            disabled={submitting}
          >
            Back to Business Info
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
