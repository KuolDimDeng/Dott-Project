'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';

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
      'Limited features'
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
      'Advanced features',
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
      'Dedicated support',
      'Custom features'
    ],
  },
];

export default function SimplifiedSubscription({ metadata }) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [businessData, setBusinessData] = useState({
    businessName: '',
    businessType: ''
  });
  
  useEffect(() => {
    try {
      logger.debug('[Subscription] Page loaded with metadata:', metadata);
      
      // Check cookies for business data
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
          try {
            acc[key] = decodeURIComponent(value);
          } catch (e) {
            acc[key] = value;
          }
        }
        return acc;
      }, {});
      
      logger.debug('[Subscription] Cookies:', cookies);
      
      // Set business data from cookies or metadata
      const businessName = metadata?.businessName || cookies.businessName || '';
      const businessType = metadata?.businessType || cookies.businessType || '';
      
      setBusinessData({
        businessName,
        businessType
      });
      
      // Log for debugging
      logger.info('[Subscription] Business data initialized:', {
        businessName,
        businessType,
        source: metadata?.businessName ? 'metadata' : 
                cookies.businessName ? 'cookies' : 'none'
      });
      
    } catch (error) {
      logger.error('[Subscription] Error initializing:', error);
      setError('Error initializing page');
    }
  }, [metadata]);
  
  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    
    // Show info to the user that we're proceeding
    setError(`Processing ${plan.name} plan selection...`);
    setIsSubmitting(true);
    
    // Simulate a delay to show processing
    setTimeout(() => {
      try {
        // Save selection in session storage
        sessionStorage.setItem('selectedPlan', JSON.stringify({
          id: plan.id,
          name: plan.name,
          price: plan.price[billingCycle],
          billingCycle,
          businessName: businessData.businessName,
          businessType: businessData.businessType,
          timestamp: new Date().toISOString()
        }));
        
        try {
          // Special case for free plan - bypass payment page entirely
          if (plan.id === 'free') {
            try {
              const timestamp = new Date().getTime();
              
              // CRITICAL: Create a test page that will force the redirect to dashboard
              // This approach bypasses middleware routing entirely
              const html = `
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Redirecting...</title>
                  <script>
                    // Clear cookies that might cause routing issues
                    document.cookie = "onboardingStep=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                    document.cookie = "onboardedStatus=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                    
                    // Set fresh cookies
                    document.cookie = "selectedPlan=free;path=/;max-age=86400";
                    document.cookie = "onboardingStep=dashboard;path=/;max-age=86400";
                    document.cookie = "onboardedStatus=COMPLETE;path=/;max-age=86400";
                    document.cookie = "freePlanSelected=true;path=/;max-age=86400";
                    
                    // Add a slight delay to ensure cookies are set
                    setTimeout(function() {
                      // Direct navigation to dashboard
                      window.location.replace("/dashboard?freePlan=true&t=${timestamp}");
                    }, 100);
                  </script>
                </head>
                <body>
                  <h1>Processing Free Plan Selection</h1>
                  <p>Please wait while we redirect you to your dashboard...</p>
                </body>
                </html>
              `;
              
              // Create a blob with the HTML content
              const blob = new Blob([html], { type: 'text/html' });
              const redirectUrl = URL.createObjectURL(blob);
              
              // Clear sessionStorage
              sessionStorage.removeItem('pendingSubscription');
              
              // Also set cookies here as a backup
              document.cookie = "onboardingStep=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              document.cookie = "onboardedStatus=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              document.cookie = `selectedPlan=free;path=/;max-age=86400`;
              document.cookie = `onboardingStep=dashboard;path=/;max-age=86400`;
              document.cookie = `onboardedStatus=COMPLETE;path=/;max-age=86400`;
              document.cookie = `freePlanSelected=true;path=/;max-age=86400`;
              
              // Log the redirect attempt
              logger.info('[Subscription] Redirecting to dashboard via HTML redirect page');
              
              // Navigate to the blob URL which will then redirect to dashboard
              window.location.href = redirectUrl;
            } catch (redirectError) {
              logger.error('[Subscription] Error with advanced redirect:', redirectError);
              
              // Fallback to direct navigation
              try {
                // Set cookies again
                document.cookie = `selectedPlan=free;path=/;max-age=86400`;
                document.cookie = `freePlanSelected=true;path=/;max-age=86400`;
                
                // Direct navigation  
                window.location.href = '/dashboard';
              } catch (fallbackError) {
                logger.error('[Subscription] Fallback navigation also failed:', fallbackError);
                setError('Error redirecting to dashboard. Please try navigating there manually.');
              }
            }
            
            // Show processing message
            setError('Processing free plan selection. Redirecting to dashboard...');
            
            // Return early to prevent further execution
            return;
          }
          
          // Handle paid plans (professional or enterprise)
          
          // 1. SessionStorage for compatibility with existing code
          // Store in both selectedPlan AND pendingSubscription
          const planData = {
            id: plan.id,
            name: plan.name,
            price: plan.price[billingCycle],
            billingCycle,
            businessName: businessData.businessName,
            businessType: businessData.businessType,
            timestamp: new Date().toISOString(),
            // Add fields expected by the payment page
            plan: plan.id,
            payment_method: 'stripe'
          };
          
          sessionStorage.setItem('selectedPlan', JSON.stringify(planData));
          sessionStorage.setItem('pendingSubscription', JSON.stringify(planData));
          
          // 2. Set cookies as backup
          const cookiePlanData = JSON.stringify({
            id: plan.id,
            price: plan.price[billingCycle],
            billingCycle
          });
          
          // CRITICAL: Clear conflicting cookies first
          document.cookie = "onboardingStep=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie = "onboardedStatus=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          
          // Set fresh cookies
          document.cookie = `paymentPlanData=${encodeURIComponent(cookiePlanData)};path=/;max-age=86400`;
          document.cookie = `onboardingStep=payment;path=/;max-age=86400`;
          document.cookie = `onboardedStatus=SUBSCRIPTION;path=/;max-age=86400`;
          
          // Log what we've stored
          logger.info('[Subscription] Subscription data saved for payment:', { 
            plan: plan.id, 
            price: plan.price[billingCycle],
            stored: true,
            pendingSubscription: true
          });
          
          // 3. Use direct navigation to prevent data loss
          window.location.href = `/onboarding/payment?plan=${plan.id}&t=${new Date().getTime()}`;
        } catch (error) {
          logger.error('[Subscription] Error processing plan selection:', error);
          setError('Error selecting plan. Please try again.');
          setIsSubmitting(false);
        }
      } catch (error) {
        logger.error('[Subscription] Error selecting plan:', error);
        setError('Error selecting plan. Please try again.');
        setIsSubmitting(false);
      }
    }, 1000);
  };
  
  const toggleBillingCycle = () => {
    setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-center mb-2">Choose Your Plan</h1>
        
        {businessData.businessName && (
          <div className="text-center mb-4 p-3 bg-green-50 rounded-md">
            <p className="text-green-700">
              Welcome, <span className="font-medium">{businessData.businessName}</span>!
            </p>
            <p className="text-sm text-gray-600">
              Business Type: {businessData.businessType || 'Not specified'}
            </p>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-center">
            <p className="text-blue-700">{error}</p>
            {isSubmitting && (
              <div className="mt-2 flex justify-center">
                <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-blue-600 rounded-full"></div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-lg inline-flex items-center">
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
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`border rounded-lg p-6 shadow-sm hover:shadow-md transition-all ${
              selectedPlan?.id === plan.id ? 'border-blue-500 shadow-md' : ''
            }`}>
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
                  isSubmitting && selectedPlan?.id === plan.id
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                onClick={() => handleSelectPlan(plan)}
                disabled={isSubmitting}
              >
                {isSubmitting && selectedPlan?.id === plan.id ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-white rounded-full mr-2"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Select Plan'
                )}
              </button>
            </div>
          ))}
        </div>
        
        <div className="mt-8 flex justify-between">
          <button
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            onClick={() => router.push('/onboarding/business-info')}
            disabled={isSubmitting}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}