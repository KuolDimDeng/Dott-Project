import React, { useState, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

// Helper function to format price in local currency
function formatLocalPrice(usdPrice, exchangeRate) {
  if (!exchangeRate || !exchangeRate.rate || !usdPrice) return '';
  
  // Extract numeric value from price string (e.g., "$15.00" -> 15)
  const numericPrice = parseFloat(usdPrice.replace(/[^0-9.-]+/g, ''));
  
  // Calculate local price
  const localPrice = numericPrice * exchangeRate.rate;
  
  // Format based on currency preferences
  const { symbol, decimals } = exchangeRate.format;
  const formattedPrice = decimals === 0 
    ? Math.round(localPrice).toLocaleString()
    : localPrice.toFixed(decimals).toLocaleString();
  
  return `${symbol}${formattedPrice}`;
}

export default function GeoPricing() {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [userCountry, setUserCountry] = useState('US');

  useEffect(() => {
    fetchPricing();
  }, []);
  
  // Log exchange rate changes
  useEffect(() => {
    if (exchangeRate) {
      console.log('💱 [GeoPricing] Exchange rate state updated:', exchangeRate);
    }
  }, [exchangeRate]);

  const fetchPricing = async () => {
    try {
      // Check for country override in URL
      const urlParams = new URLSearchParams(window.location.search);
      const countryOverride = urlParams.get('country');
      
      console.log('💰 [GeoPricing] Starting fetchPricing...');
      console.log('💰 [GeoPricing] URL params:', { countryOverride });
      
      let apiUrl = '/api/pricing/by-country';
      if (countryOverride) {
        apiUrl = `/api/pricing/by-country?country=${countryOverride}`;
      }
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      console.log('💰 GeoPricing - API Response:', data);
      console.log('💰 GeoPricing - Country detected:', data.country_code || countryOverride || 'US');
      setPricing(data);
      
      // Store the country for exchange rate
      const detectedCountry = countryOverride || data.country_code || 'US';
      setUserCountry(detectedCountry);
      
      // Fetch exchange rate for the user's country
      if (detectedCountry !== 'US') {
        try {
          console.log(`💱 [GeoPricing] Fetching exchange rate for ${detectedCountry}`);
          const rateResponse = await fetch(`/api/exchange-rates?country=${detectedCountry}`);
          console.log(`💱 [GeoPricing] Exchange rate API status: ${rateResponse.status}`);
          
          if (rateResponse.ok) {
            const rateData = await rateResponse.json();
            console.log('💱 [GeoPricing] Exchange rate data:', rateData);
            if (rateData.success) {
              setExchangeRate(rateData);
            }
          }
        } catch (error) {
          console.error('💱 [GeoPricing] Failed to fetch exchange rate:', error);
        }
      }
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
    <div id="pricing" className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Pricing Header */}
        <div className="text-center mb-12">
          <h2 className="text-base font-semibold text-blue-600 uppercase tracking-wide">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            Choose the Right Plan for Your Business
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            No hidden fees. No credit card required for Free plan. Cancel anytime.
          </p>
        </div>
        
        {/* Discount Banner */}
        {pricing.discount_percentage > 0 && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-800 font-semibold">
              🎉 You qualify for {pricing.discount_percentage}% regional pricing discount!
            </p>
            <p className="text-green-600 text-sm mt-1">
              Supporting businesses in {pricing.country_code}
            </p>
            {pricing.currency && pricing.currency !== 'USD' && (
              <p className="text-green-600 text-sm mt-1">
                Prices shown in {pricing.currency} with current exchange rates
              </p>
            )}
          </div>
        )}

        {/* Local Currency Banner */}
        {pricing.currency && pricing.currency !== 'USD' && pricing.discount_percentage === 0 && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-blue-800 font-semibold">
              💱 Prices shown in {pricing.currency} (local currency)
            </p>
            <p className="text-blue-600 text-sm mt-1">
              Converted at current exchange rates with 1% processing fee
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
                {/* Exchange Rate Display for paid plans */}
                {plan.name !== 'Free' && exchangeRate && exchangeRate.currency !== 'USD' && (
                  <p className="text-xl font-semibold text-blue-600 mt-2">
                    ({formatLocalPrice(plan.price[billingCycle], exchangeRate)})*
                  </p>
                )}
                {/* Debug: Show exchange rate status */}
                {console.log('💱 [GeoPricing] Rendering price card:', {
                  planName: plan.name,
                  exchangeRate: exchangeRate,
                  currency: exchangeRate?.currency,
                  shouldShowExchange: plan.name !== 'Free' && exchangeRate && exchangeRate.currency !== 'USD'
                })}
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
          {pricing.currency && pricing.currency !== 'USD' && (
            <p className="mt-2 text-sm">
              Prices converted from USD using current exchange rates.
              <br />
              Final charges may vary slightly based on exchange rate fluctuations.
            </p>
          )}
          {pricing.exchange_info && (
            <p className="mt-2 text-xs text-gray-500">
              Exchange rate: 1 USD = {pricing.exchange_info.rate?.toFixed(4)} {pricing.currency}
              <br />
              Last updated: {new Date(pricing.exchange_info.last_updated).toLocaleString()}
            </p>
          )}
        </div>
        
        {/* Exchange Rate Disclaimer */}
        {exchangeRate && exchangeRate.currency !== 'USD' && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              * {exchangeRate.disclaimer || 'Exchange rate is estimated and may vary. Actual rates depend on payment provider.'}
            </p>
            {exchangeRate.source && (
              <p className="text-xs text-gray-400 mt-1">
                Source: {exchangeRate.source}
              </p>
            )}
          </div>
        )}
        
        {/* Payment Methods Note - Only for Kenya */}
        {userCountry === 'KE' && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              💳 Pay with credit card (USD) or M-Pesa (KES)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}