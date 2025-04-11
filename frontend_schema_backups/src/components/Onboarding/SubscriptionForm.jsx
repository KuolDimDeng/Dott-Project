'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import LoadingSpinner from '@/components/LoadingSpinner';

// Subscription plans
const PLANS = [
  {
    id: 'basic',
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

// Subscription form component
export default function SubscriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState('professional');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
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
            const planData = JSON.parse(storedPlan);
            if (planData.plan && PLANS.some(p => p.id === planData.plan)) {
              setSelectedPlan(planData.plan);
              logger.debug('[SubscriptionForm] Plan restored from storage:', planData.plan);
            }
            
            if (planData.billingCycle) {
              setBillingCycle(planData.billingCycle);
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
  
  // Handle continue button click
  const handleContinue = async () => {
    try {
      setSubmitting(true);
      setError('');
      
      // Find the selected plan
      const plan = PLANS.find(p => p.id === selectedPlan);
      if (!plan) {
        setError('Please select a plan to continue');
        setSubmitting(false);
        return;
      }
      
      // Store selection in session storage
      sessionStorage.setItem('selectedPlan', JSON.stringify({
        plan: plan.id,
        name: plan.name,
        price: plan.price[billingCycle],
        billingCycle,
        timestamp: Date.now()
      }));
      
      // Update cookies for server-side tracking
      document.cookie = `selectedPlan=${plan.id}; path=/; max-age=${60*60*24*30}; samesite=lax`;
      document.cookie = `billingCycle=${billingCycle}; path=/; max-age=${60*60*24*30}; samesite=lax`;
      document.cookie = `subscriptionCompleted=true; path=/; max-age=${60*60*24*30}; samesite=lax`;
      
      logger.info('[SubscriptionForm] Plan selection confirmed:', { 
        plan: plan.id, 
        billingCycle,
        price: plan.price[billingCycle]
      });
      
      // Route based on plan type
      if (plan.id === 'basic') {
        // Free plan - redirect to transition page
        document.cookie = `freePlanSelected=true; path=/; max-age=${60*60*24*30}; samesite=lax`;
        router.push('/onboarding/subscription-to-dashboard');
      } else {
        // Paid plan - redirect to payment transition page
        router.push(`/onboarding/subscription-to-payment?plan=${plan.id}&cycle=${billingCycle}`);
      }
    } catch (e) {
      logger.error('[SubscriptionForm] Error during plan selection:', e);
      setError('An error occurred. Please try again.');
      setSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto">
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
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
              billingCycle === 'annual' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-700 hover:text-gray-900'
            } transition-all duration-200`}
          >
            Annual Billing
            <span className="ml-1.5 bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded">Save 20%</span>
          </button>
        </div>
      </div>
      
      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const priceText = getPriceText(plan);
          const savings = billingCycle === 'annual' ? getAnnualSavings(plan) : 0;
          
          return (
            <div 
              key={plan.id}
              className={`relative bg-white rounded-xl shadow-md overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                isSelected 
                  ? `border-${plan.color}-500 ring-2 ring-${plan.color}-500 ring-opacity-50 transform scale-105` 
                  : plan.popular 
                    ? `border-${plan.color}-200 hover:border-${plan.color}-400 hover:scale-102`
                    : 'border-gray-200 hover:border-gray-400 hover:scale-102'
              }`}
              onClick={() => handleSelectPlan(plan.id)}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className={`absolute top-0 right-0 bg-${plan.color}-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg`}>
                  MOST POPULAR
                </div>
              )}
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 left-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  ✓ Selected
                </div>
              )}
              
              <div className="p-6">
                <h3 className={`text-lg font-semibold text-${plan.color}-700 mb-1`}>{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                
                <div className="mt-4 mb-6">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">{priceText}</span>
                    {plan.price[billingCycle] !== 'Free' && (
                      <span className="ml-1 text-gray-500 text-sm">
                        {billingCycle === 'monthly' ? 'per month' : 'per year'}
                      </span>
                    )}
                  </div>
                  
                  {/* Show savings for annual billing */}
                  {billingCycle === 'annual' && savings > 0 && (
                    <p className="mt-2 text-sm text-green-600">
                      Save {savings}% with annual billing
                    </p>
                  )}
                </div>
                
                <div className="mt-6 mb-8">
                  <h4 className="text-sm font-medium text-gray-800 mb-4">Includes:</h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex">
                        <CheckIcon className={`h-5 w-5 flex-shrink-0 text-${plan.color}-500`} aria-hidden="true" />
                        <span className="ml-3 text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Add action button for each plan */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPlan(plan.id);
                  }}
                  className={`w-full py-2 rounded-md font-medium text-sm transition-colors ${
                    isSelected
                      ? `bg-${plan.color}-600 text-white hover:bg-${plan.color}-700`
                      : `bg-${plan.color}-100 text-${plan.color}-700 hover:bg-${plan.color}-200`
                  }`}
                >
                  {isSelected ? 'Selected' : plan.buttonText}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-6 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      )}
      
      {/* Plan selection instructions */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-700 font-medium">Click the button on any plan above to select it, then proceed with the selected plan</p>
      </div>
      
      {/* Continue button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={handleContinue}
          disabled={submitting}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <div className="flex items-center">
              <LoadingSpinner size="small" color="white" />
              <span className="ml-2">Processing...</span>
            </div>
          ) : (
            `Proceed with ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan`
          )}
        </button>
      </div>
      
      {/* Additional info */}
      <p className="text-center mt-6 text-sm text-gray-500">
        All plans include a 14-day free trial. No credit card required for Basic plan.
      </p>
    </div>
  );
}
