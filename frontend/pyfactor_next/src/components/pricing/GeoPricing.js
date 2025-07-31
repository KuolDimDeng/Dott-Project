import React, { useState, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';
import { isDevelopingCountry, getDevelopingCountryName } from '@/utils/developingCountries';

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
  
  return `${symbol} ${formattedPrice}`;
}

export default function GeoPricing() {
  const { t } = useTranslation();
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
      let countryOverride = urlParams.get('country');
      
      console.log('💰 [GeoPricing] === PRICING FETCH START ===');
      console.log('💰 [GeoPricing] Current URL:', window.location.href);
      console.log('💰 [GeoPricing] URL params:', urlParams.toString());
      console.log('💰 [GeoPricing] Country override from URL:', countryOverride);
      console.log('💰 [GeoPricing] Window location search:', window.location.search);
      console.log('💰 [GeoPricing] Window location hash:', window.location.hash);
      
      // Check if user is in Kenya from country detection
      const isKenyaDetected = window.localStorage.getItem('detectedCountry') === 'KE';
      console.log('💰 [GeoPricing] Kenya detected from storage:', isKenyaDetected);
      
      // Force Kenya for testing if on pricing section
      if (!countryOverride && (window.location.hash === '#pricing' || isKenyaDetected)) {
        console.log('💰 [GeoPricing] Setting country to KE');
        countryOverride = 'KE';
      }
      
      let apiUrl = '/api/pricing/by-country';
      if (countryOverride) {
        apiUrl = `/api/pricing/by-country?country=${countryOverride}`;
      }
      
      console.log('💰 [GeoPricing] Final API URL:', apiUrl);
      console.log('💰 [GeoPricing] Country being sent:', countryOverride || 'none');
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      console.log('💰 [GeoPricing] === API RESPONSE ===');
      console.log('💰 [GeoPricing] Full response:', data);
      console.log('💰 [GeoPricing] Country requested:', countryOverride);
      console.log('💰 [GeoPricing] Country detected:', data.country_code);
      console.log('💰 [GeoPricing] Discount percentage:', data.discount_percentage);
      console.log('💰 [GeoPricing] Currency:', data.currency);
      
      // Check if we got the wrong country
      if (countryOverride && data.country_code !== countryOverride) {
        console.error('💰 [GeoPricing] ❌ COUNTRY MISMATCH!');
        console.error('💰 [GeoPricing] Requested:', countryOverride, 'Got:', data.country_code);
        
        // FIX: If we requested a developing country but got US, apply correct pricing
        if (isDevelopingCountry(countryOverride) && data.country_code === 'US') {
          const countryName = getDevelopingCountryName(countryOverride) || countryOverride;
          console.warn(`💰 [GeoPricing] Applying manual ${countryName} (${countryOverride}) pricing override`);
          
          // Apply 50% discount to all developing countries
          data = {
            ...data,
            country_code: countryOverride,
            discount_percentage: 50,
            currency: 'USD', // Will be converted to local currency later
            pricing: {
              professional: {
                monthly: 17.50,      // 50% off $35
                six_month: 87.50,    // 50% off $175
                yearly: 168.00,      // 50% off $336
                monthly_display: '$17.50',
                six_month_display: '$87.50',
                yearly_display: '$168.00'
              },
              enterprise: {
                monthly: 47.50,      // 50% off $95
                six_month: 237.50,   // 50% off $475
                yearly: 456.00,      // 50% off $912
                monthly_display: '$47.50',
                six_month_display: '$237.50',
                yearly_display: '$456.00'
              }
            }
          };
        }
      }
      
      setPricing(data);
      
      // Store the country for exchange rate - prioritize what we requested
      const detectedCountry = countryOverride || data.country_code || 'US';
      setUserCountry(detectedCountry);
      
      console.log('💰 [GeoPricing] Using country for exchange rate:', detectedCountry);
      
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
      name: t('pricing.plans.free.name', 'Free'),
      price: { monthly: '$0', six_month: '$0', yearly: '$0' },
      description: t('pricing.plans.free.description', 'Perfect for getting started'),
      features: [
        t('pricing.plans.free.features.0', '1 user'),
        t('pricing.plans.free.features.1', '3GB storage'),
        t('pricing.plans.free.features.2', 'Basic features'),
        t('pricing.plans.free.features.3', 'Community support'),
        t('pricing.plans.free.features.4', 'Mobile app access')
      ],
      cta: t('pricing.plans.free.cta', 'Start Free'),
      popular: false
    },
    {
      name: t('pricing.plans.professional.name', 'Professional'),
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
      description: t('pricing.plans.professional.description', 'For growing businesses'),
      features: [
        t('pricing.plans.professional.features.0', 'Up to 10 users'),
        t('pricing.plans.professional.features.1', '50GB storage'),
        t('pricing.plans.professional.features.2', 'All features'),
        t('pricing.plans.professional.features.3', 'Priority support'),
        t('pricing.plans.professional.features.4', 'API access'),
        t('pricing.plans.professional.features.5', 'Advanced analytics')
      ],
      cta: t('pricing.plans.professional.cta', 'Start Professional'),
      popular: true
    },
    {
      name: t('pricing.plans.enterprise.name', 'Enterprise'),
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
      description: t('pricing.plans.enterprise.description', 'For large organizations'),
      features: [
        t('pricing.plans.enterprise.features.0', 'Unlimited users'),
        t('pricing.plans.enterprise.features.1', 'Unlimited storage'),
        t('pricing.plans.enterprise.features.2', 'All features'),
        t('pricing.plans.enterprise.features.3', 'Dedicated support'),
        t('pricing.plans.enterprise.features.4', 'Custom integrations'),
        t('pricing.plans.enterprise.features.5', 'SLA guarantee'),
        t('pricing.plans.enterprise.features.6', 'Training included')
      ],
      cta: t('pricing.plans.enterprise.cta', 'Start Enterprise'),
      popular: false
    }
  ];

  return (
    <div id="pricing" className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Pricing Header */}
        <div className="text-center mb-12">
          <h2 className="text-base font-semibold text-blue-600 uppercase tracking-wide">
            {t('pricing.title', 'Simple, Transparent Pricing')}
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            {t('pricing.heading', 'Choose the Right Plan for Your Business')}
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            {t('pricing.subheading', 'No hidden fees. No credit card required for Free plan. Cancel anytime.')}
          </p>
        </div>
        
        {/* Discount Banner */}
        {pricing && pricing.discount_percentage > 0 && (
          <div className="mb-8 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-xl shadow-lg text-center relative">
            <div className="flex items-center justify-center mb-2">
              <svg className="h-8 w-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-2xl font-bold">
                {t('pricing.discount.title', 'Supporting {{country}} Businesses', { 
                  country: getDevelopingCountryName(pricing.country_code) || pricing.country_code 
                })}
              </span>
            </div>
            <p className="text-lg font-medium">
              {t('pricing.discount.subtitle', '50% discount for companies with local operations')}
            </p>
          </div>
        )}

        {/* Local Currency Banner */}
        {pricing.currency && pricing.currency !== 'USD' && pricing.discount_percentage === 0 && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-blue-800 font-semibold">
              💱 {t('pricing.currency.title', 'Prices shown in {{currency}} (local currency)', { currency: pricing.currency })}
            </p>
            <p className="text-blue-600 text-sm mt-1">
              {t('pricing.currency.subtitle', 'Converted at current exchange rates with 1% processing fee')}
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
              {t('pricing.billing.monthly', 'Monthly')}
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'six_month'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500'
              }`}
              onClick={() => setBillingCycle('six_month')}
            >
              {t('pricing.billing.sixMonths', '6 Months')}
              <span className="ml-1 text-green-600 text-xs">{t('pricing.billing.save13', 'Save 13%')}</span>
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500'
              }`}
              onClick={() => setBillingCycle('yearly')}
            >
              {t('pricing.billing.yearly', 'Yearly')}
              <span className="ml-1 text-green-600 text-xs">{t('pricing.billing.save20', 'Save 20%')}</span>
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
                    {t('pricing.mostPopular', 'Most Popular')}
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
                    /{billingCycle === 'monthly' ? t('pricing.per.month', 'month') : billingCycle === 'six_month' ? t('pricing.per.sixMonths', '6 months') : t('pricing.per.year', 'year')}
                  </span>
                </div>
                {plan.originalPrice && (
                  <p className="mt-1">
                    <span className="text-gray-400 line-through">
                      {plan.originalPrice[billingCycle]}
                    </span>
                    <span className="ml-2 text-green-600 font-semibold">
                      {t('pricing.percentOff', '{{percentage}}% off', { percentage: pricing.discount_percentage })}
                    </span>
                  </p>
                )}
                {/* Exchange Rate Display for paid plans */}
                {plan.name !== 'Free' && exchangeRate && exchangeRate.currency !== 'USD' && (
                  <p className="text-xl font-semibold text-green-600 mt-2">
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

              <a
                href="/api/auth/login"
                className={`mt-8 w-full py-3 px-4 rounded-lg font-semibold transition-all block text-center ${
                  plan.name === 'Enterprise'
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                    : plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center text-gray-600">
          <p>{t('pricing.allPlansInclude', 'All plans include automatic backups, SSL certificates, and 99.9% uptime SLA')}</p>
          {pricing.discount_percentage > 0 && (
            <p className="mt-2 text-sm">
              {t('pricing.regionalPricing', 'Regional pricing is automatically applied based on your location.')}
              <br />
              {t('pricing.verificationRequired', 'Verification may be required within 30 days.')}
            </p>
          )}
          {pricing.currency && pricing.currency !== 'USD' && (
            <p className="mt-2 text-sm">
              {t('pricing.pricesConverted', 'Prices converted from USD using current exchange rates.')}
              <br />
              {t('pricing.chargesMayVary', 'Final charges may vary slightly based on exchange rate fluctuations.')}
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
              💳 {t('pricing.paymentMethods.kenya', 'Pay with credit card (USD) or M-Pesa (KES)')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}