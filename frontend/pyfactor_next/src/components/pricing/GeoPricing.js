import React, { useState, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

export default function GeoPricing() {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await fetch('/api/pricing/by-country');
      const data = await response.json();
      setPricing(data);
    } catch (error) {
      console.error('Error fetching pricing:', error);
      // Set default pricing
      setPricing({
        discount_percentage: 0,
        pricing: {
          professional: {
            monthly: 15,
            six_month: 78,
            yearly: 144,
            monthly_display: '$15.00',
            six_month_display: '$78.00',
            yearly_display: '$144.00'
          },
          enterprise: {
            monthly: 45,
            six_month: 234,
            yearly: 432,
            monthly_display: '$45.00',
            six_month_display: '$234.00',
            yearly_display: '$432.00'
          }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const plans = [
    {
      name: 'Free',
      price: { monthly: '$0', six_month: '$0', yearly: '$0' },
      description: 'Perfect for getting started',
      features: [
        '1 user',
        '3GB storage',
        'Basic features',
        'Community support',
        'Mobile app access'
      ],
      cta: 'Start Free',
      popular: false
    },
    {
      name: 'Professional',
      price: {
        monthly: pricing.pricing.professional.monthly_display,
        six_month: pricing.pricing.professional.six_month_display,
        yearly: pricing.pricing.professional.yearly_display
      },
      originalPrice: pricing.discount_percentage > 0 ? {
        monthly: '$15.00',
        six_month: '$78.00',
        yearly: '$144.00'
      } : null,
      description: 'For growing businesses',
      features: [
        'Up to 10 users',
        '50GB storage',
        'All features',
        'Priority support',
        'API access',
        'Advanced analytics'
      ],
      cta: 'Start Professional',
      popular: true
    },
    {
      name: 'Enterprise',
      price: {
        monthly: pricing.pricing.enterprise.monthly_display,
        six_month: pricing.pricing.enterprise.six_month_display,
        yearly: pricing.pricing.enterprise.yearly_display
      },
      originalPrice: pricing.discount_percentage > 0 ? {
        monthly: '$45.00',
        six_month: '$234.00',
        yearly: '$432.00'
      } : null,
      description: 'For large organizations',
      features: [
        'Unlimited users',
        'Unlimited storage',
        'All features',
        'Dedicated support',
        'Custom integrations',
        'SLA guarantee',
        'Training included'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Discount Banner */}
        {pricing.discount_percentage > 0 && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-800 font-semibold">
              🎉 You qualify for {pricing.discount_percentage}% regional pricing discount!
            </p>
            <p className="text-green-600 text-sm mt-1">
              Supporting businesses in {pricing.country_code}
            </p>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-lg inline-flex">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500'
              }`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'six_month'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500'
              }`}
              onClick={() => setBillingCycle('six_month')}
            >
              6 Months
              <span className="ml-1 text-green-600 text-xs">Save 13%</span>
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500'
              }`}
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly
              <span className="ml-1 text-green-600 text-xs">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border ${
                plan.popular
                  ? 'border-blue-600 shadow-xl'
                  : 'border-gray-200'
              } bg-white p-8`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <p className="mt-2 text-gray-600">{plan.description}</p>

              <div className="mt-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price[billingCycle]}
                  </span>
                  <span className="ml-2 text-gray-500">
                    /{billingCycle === 'monthly' ? 'month' : billingCycle === 'six_month' ? '6 months' : 'year'}
                  </span>
                </div>
                {plan.originalPrice && (
                  <p className="mt-1">
                    <span className="text-gray-400 line-through">
                      {plan.originalPrice[billingCycle]}
                    </span>
                    <span className="ml-2 text-green-600 font-semibold">
                      {pricing.discount_percentage}% off
                    </span>
                  </p>
                )}
              </div>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`mt-8 w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center text-gray-600">
          <p>All plans include automatic backups, SSL certificates, and 99.9% uptime SLA</p>
          {pricing.discount_percentage > 0 && (
            <p className="mt-2 text-sm">
              Regional pricing is automatically applied based on your location.
              <br />
              Verification may be required within 30 days.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}