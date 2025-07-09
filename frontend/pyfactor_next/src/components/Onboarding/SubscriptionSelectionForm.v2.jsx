'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { useCurrencyDetection } from '@/hooks/useCurrencyDetection';
import PricingDisplay from './PricingDisplay';
import CurrencySelector from './CurrencySelector';
import { getCountryCode, getCountryName } from '@/utils/countryMapping';

// Subscription plans with updated pricing
const PLANS = [
  {
    id: 'free',
    name: 'Basic',
    description: 'Perfect for small businesses just getting started',
    price: 'Free',
    monthlyPrice: 0,
    sixMonthPrice: 0,
    yearlyPrice: 0,
    features: [
      'Income and expense tracking',
      'Invoice creation & reminders',
      'Stripe & PayPal payments',
      'Mobile money (M-Pesa, etc.)',
      'Basic inventory tracking',
      'Barcode scanning',
      '3GB storage limit',
      '1 user only'
    ],
    buttonText: 'Start for Free'
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Everything growing businesses need to thrive',
    price: '$15/mo',
    monthlyPrice: 15,
    sixMonthPrice: 75, // 17% discount
    yearlyPrice: 144, // 20% discount
    features: [
      'Everything in Basic',
      'Up to 3 users',
      'Unlimited storage',
      'Priority support',
      'All features included',
      '17% discount on 6-month',
      '20% discount on annual'
    ],
    popular: true,
    buttonText: 'Choose Professional'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited scale for ambitious organizations',
    price: '$45/mo',
    monthlyPrice: 45,
    sixMonthPrice: 225, // 17% discount
    yearlyPrice: 432, // 20% discount
    features: [
      'Everything in Professional',
      'Unlimited users',
      'Custom onboarding',
      'Dedicated support',
      'All features included',
      '17% discount on 6-month',
      '20% discount on annual'
    ],
    premium: true,
    buttonText: 'Choose Enterprise'
  }
];

/**
 * Subscription Selection Form Component v2
 * Integrates with the state machine and session manager
 */
export default function SubscriptionSelectionFormV2({ 
  initialData = {}, 
  onSelect, 
  submitting, 
  error: parentError,
  onBack
}) {
  const [selectedPlan, setSelectedPlan] = useState(initialData.selectedPlan || '');
  const [billingCycle, setBillingCycle] = useState(initialData.billingCycle || 'monthly'); // 'monthly', '6month', 'yearly'
  const [regionalPricing, setRegionalPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const { currency, setCurrency } = useCurrencyDetection();

  // Fetch regional pricing based on country from business info
  useEffect(() => {
    const fetchRegionalPricing = async () => {
      console.log('🎯 [SubscriptionSelection] Initial data received:', initialData);
      console.log('🎯 [SubscriptionSelection] Country value:', initialData.country);
      console.log('🎯 [SubscriptionSelection] All initial data keys:', Object.keys(initialData));
      
      if (!initialData.country) {
        console.log('🎯 [SubscriptionSelection] No country data, skipping pricing fetch');
        setPricingLoading(false);
        return;
      }

      try {
        logger.info('[SubscriptionSelection] Fetching regional pricing for:', initialData.country);
        
        // Convert country name to country code if needed
        const countryCode = getCountryCode(initialData.country) || initialData.country;
        logger.info('[SubscriptionSelection] Converting country:', {
          input: initialData.country,
          output: countryCode,
          isCode: initialData.country?.length === 2
        });
        
        // Debug: Log the exact URL being called
        const pricingUrl = `/api/pricing/by-country?country=${encodeURIComponent(countryCode)}`;
        console.log('🎯 [SubscriptionSelection] Fetching pricing from URL:', pricingUrl);
        console.log('🎯 [SubscriptionSelection] Country parameter:', countryCode);
        
        // Fetch pricing with country parameter
        const response = await fetch(pricingUrl);
        console.log('🎯 [SubscriptionSelection] Response status:', response.status);
        console.log('🎯 [SubscriptionSelection] Response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        
        logger.info('[SubscriptionSelection] Regional pricing data:', data);
        setRegionalPricing(data);
        
        // Fetch available payment methods for the country
        const paymentMethodsResponse = await fetch(`/api/payment-methods/available?country=${encodeURIComponent(countryCode)}`);
        const paymentMethodsData = await paymentMethodsResponse.json();
        
        logger.info('[SubscriptionSelection] Available payment methods:', paymentMethodsData);
        setAvailablePaymentMethods(paymentMethodsData.methods || []);
      } catch (error) {
        logger.error('[SubscriptionSelection] Error fetching regional pricing:', error);
      } finally {
        setPricingLoading(false);
      }
    };

    fetchRegionalPricing();
  }, [initialData.country]);

  const handlePlanSelect = async (planId) => {
    setSelectedPlan(planId);
    logger.info('[SubscriptionSelection] Plan selected', { planId, billingCycle });
    
    // Auto-submit the selection
    await onSelect(planId, billingCycle);
  };

  const handleBillingCycleChange = (cycle) => {
    setBillingCycle(cycle);
    logger.info('[SubscriptionSelection] Billing cycle changed', { cycle });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
        <p className="text-gray-600">Select the plan that best fits your business needs</p>
      </div>

      {/* Error display */}
      {parentError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {parentError}
        </div>
      )}

      {/* Regional pricing notice */}
      {regionalPricing && regionalPricing.discount_percentage > 0 && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center">
            <span className="text-2xl mr-2">🎉</span>
            <div>
              <p className="text-green-800 font-semibold">
                {regionalPricing.discount_percentage}% off all plans!
              </p>
              <p className="text-green-700 text-sm">
                Special pricing for businesses in {getCountryName(initialData.country) || initialData.country || 'your region'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment methods notice for Kenya */}
      {availablePaymentMethods.length > 0 && availablePaymentMethods.includes('mpesa') && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-blue-800 font-semibold">
                M-Pesa payment available!
              </p>
              <p className="text-blue-700 text-sm">
                Pay conveniently with mobile money for your subscription
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Currency Selector and Billing Cycle Toggle */}
      <div className="flex justify-between items-center mb-8">
        <CurrencySelector currency={currency} setCurrency={setCurrency} />
        
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => handleBillingCycleChange('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={submitting}
          >
            Monthly
          </button>
          <button
            onClick={() => handleBillingCycleChange('6month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
              billingCycle === '6month'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={submitting}
          >
            6 Months
            <span className="ml-1 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">POPULAR</span>
          </button>
          <button
            onClick={() => handleBillingCycleChange('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={submitting}
          >
            Yearly
            <span className="ml-1 text-xs text-green-600 font-normal">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      {pricingLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-lg border-2 p-6 ${
              plan.popular 
                ? 'border-blue-500 shadow-lg' 
                : plan.premium 
                ? 'border-purple-500' 
                : 'border-gray-200'
            } ${
              selectedPlan === plan.id ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            {/* Popular badge */}
            {plan.popular && billingCycle === '6month' && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
            )}
            
            {/* Premium badge */}
            {plan.premium && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  PREMIUM
                </span>
              </div>
            )}

            <div className="text-center mb-4">
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
              
              {/* Pricing Display */}
              <div className="mb-4">
                {plan.id === 'free' ? (
                  <div className="text-3xl font-bold">Free</div>
                ) : (
                  <div>
                    {regionalPricing && regionalPricing.discount_percentage > 0 ? (
                      <>
                        <div className="text-3xl font-bold">
                          ${billingCycle === 'monthly' 
                            ? regionalPricing.pricing[plan.id]?.monthly 
                            : billingCycle === '6month' 
                            ? regionalPricing.pricing[plan.id]?.six_month 
                            : regionalPricing.pricing[plan.id]?.yearly}
                        </div>
                        <div className="text-sm text-gray-500 line-through">
                          ${billingCycle === 'monthly' ? plan.monthlyPrice : billingCycle === '6month' ? plan.sixMonthPrice : plan.yearlyPrice}
                        </div>
                        <div className="text-sm text-green-600 font-semibold">
                          {regionalPricing.discount_percentage}% off
                        </div>
                      </>
                    ) : (
                      <div className="text-3xl font-bold">
                        ${billingCycle === 'monthly' ? plan.monthlyPrice : billingCycle === '6month' ? plan.sixMonthPrice : plan.yearlyPrice}
                      </div>
                    )}
                    {billingCycle === '6month' && plan.id !== 'free' && (
                      <div className="text-sm text-orange-600 mt-1">
                        Save ${plan.monthlyPrice * 6 - plan.sixMonthPrice} (${(plan.sixMonthPrice / 6).toFixed(2)}/mo)
                      </div>
                    )}
                    {billingCycle === 'yearly' && plan.id !== 'free' && (
                      <div className="text-sm text-green-600 mt-1">
                        Save ${plan.monthlyPrice * 12 - plan.yearlyPrice} per year
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            {/* Select button */}
            <button
              onClick={() => handlePlanSelect(plan.id)}
              disabled={submitting}
              className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                submitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : plan.popular && billingCycle === '6month'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : plan.popular
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : plan.premium
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-800 text-white hover:bg-gray-900'
              }`}
            >
              {submitting && selectedPlan === plan.id ? 'Processing...' : plan.buttonText}
            </button>
          </div>
        ))}
      </div>
      )}

      {/* Back button */}
      {onBack && (
        <div className="mt-8 text-center">
          <button
            onClick={onBack}
            disabled={submitting}
            className="text-gray-600 hover:text-gray-800 underline"
          >
            Back to Business Info
          </button>
        </div>
      )}

      {/* Regional pricing note */}
      <div className="mt-8 text-center text-sm text-gray-600">
        <p>* Regional pricing available. Prices automatically adjusted based on your location.</p>
      </div>
    </div>
  );
}