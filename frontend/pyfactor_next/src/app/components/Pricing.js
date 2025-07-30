'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentUserPricing } from '@/utils/currencyUtils';
import { getCacheValue } from '@/utils/appCache';
import { debugCacheState, forceRefreshCountryDetection } from '@/utils/cacheCleaner';
import { getDevelopingCountryName, isDevelopingCountry } from '@/utils/developingCountries';
import Link from 'next/link';

// This will be moved inside the component to use translation keys

// Helper function to format price in local currency
function formatLocalPrice(usdPrice, exchangeRate) {
  if (!exchangeRate || !exchangeRate.rate) return '';
  
  // Extract numeric value from USD price string
  const numericPrice = parseFloat(usdPrice.replace('$', '').replace(',', ''));
  
  // Calculate local price
  const localPrice = numericPrice * exchangeRate.rate;
  
  // Format based on currency preferences
  const { symbol, decimals } = exchangeRate.format;
  const formattedPrice = decimals === 0 
    ? Math.round(localPrice).toLocaleString()
    : localPrice.toFixed(decimals).toLocaleString();
  
  // Return with both symbol and currency code
  return `${symbol}${formattedPrice} ${exchangeRate.currency}`;
}

export default function Pricing() {
  const { t } = useTranslation();
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly', '6month', 'annual'
  const [dynamicPricing, setDynamicPricing] = useState(null);
  const [userCountry, setUserCountry] = useState('US');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(null);
  
  // Feature comparison data with translations
  const featureComparison = [
    {
      category: t('pricing.features.categories.core', 'Core Features'),
      features: [
        { name: t('pricing.features.users', 'Users'), basic: t('pricing.features.users.basic', '1 user'), professional: t('pricing.features.users.professional', 'Up to 5 users'), enterprise: t('pricing.features.users.enterprise', 'Unlimited users') },
        { name: t('pricing.features.storage', 'Storage'), basic: t('pricing.features.storage.basic', '3GB'), professional: t('pricing.features.storage.professional', 'Unlimited'), enterprise: t('pricing.features.storage.enterprise', 'Unlimited') },
        { name: t('pricing.features.support', 'Support'), basic: t('pricing.features.support.basic', 'Community support'), professional: t('pricing.features.support.professional', 'Priority support'), enterprise: t('pricing.features.support.enterprise', 'Dedicated support') },
        { name: t('pricing.features.onboarding', 'Onboarding'), basic: t('pricing.features.onboarding.basic', 'Self-service'), professional: t('pricing.features.onboarding.professional', 'Email assistance'), enterprise: t('pricing.features.onboarding.enterprise', 'Premium onboarding') }
      ]
    },
    {
      category: t('pricing.features.categories.business', 'Business Management'),
      features: [
        { name: t('pricing.features.income', 'Income & Expense Tracking'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.multicurrency', 'Multi-Currency Support'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.invoices', 'Invoice Creation'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.reminders', 'Automated Reminders'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.customers', 'Customer Management'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.products', 'Product Catalog'), basic: true, professional: true, enterprise: true }
      ]
    },
    {
      category: t('pricing.features.categories.inventory', 'Inventory & POS'),
      features: [
        { name: t('pricing.features.inventory', 'Inventory Tracking'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.barcode', 'Barcode Scanning'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.barcodePrint', 'Custom Barcode Printing'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.stockAlerts', 'Low Stock Alerts'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.multiLocation', 'Multi-Location Inventory'), basic: false, professional: true, enterprise: true },
        { name: t('pricing.features.pos', 'POS System'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.offline', 'Offline Mode'), basic: false, professional: true, enterprise: true }
      ]
    },
    {
      category: t('pricing.features.categories.payments', 'Payments & Invoicing'),
      features: [
        { name: t('pricing.features.stripe', 'Stripe Integration'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.paypal', 'PayPal Integration'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.mobileMoney', 'Mobile Money (M-Pesa, etc.)'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.regionalPayments', 'Regional Payment Methods'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.factoring', 'Invoice Factoring'), basic: false, professional: true, enterprise: true },
        { name: t('pricing.features.recurring', 'Recurring Invoices'), basic: false, professional: true, enterprise: true },
        { name: t('pricing.features.paymentLinks', 'Payment Links'), basic: true, professional: true, enterprise: true }
      ]
    },
    {
      category: t('pricing.features.categories.tax', 'Tax & Compliance'),
      features: [
        { name: t('pricing.features.taxCalc', 'Regional Tax Calculations'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.vatGst', 'VAT/GST Support'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.taxReports', 'Tax Reports'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.eFiling', 'E-filing Ready'), basic: false, professional: true, enterprise: true },
        { name: t('pricing.features.multiRegion', 'Multi-Region Compliance'), basic: false, professional: true, enterprise: true }
      ]
    },
    {
      category: t('pricing.features.categories.analytics', 'Analytics & Reporting'),
      features: [
        { name: t('pricing.features.basicReports', 'Basic Reports'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.customReports', 'Custom Reports'), basic: false, professional: true, enterprise: true },
        { name: t('pricing.features.dashboard', 'Real-time Dashboard'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.profit', 'Profit Analysis'), basic: false, professional: true, enterprise: true },
        { name: t('pricing.features.cashFlow', 'Cash Flow Forecasting'), basic: false, professional: true, enterprise: true },
        { name: t('pricing.features.ai', 'AI Recommendations'), basic: false, professional: false, enterprise: true }
      ]
    },
    {
      category: t('pricing.features.categories.importExport', 'Import/Export'),
      features: [
        { name: t('pricing.features.importExport', 'Import/Export Management'), basic: false, professional: true, enterprise: true },
        { name: t('pricing.features.customs', 'Customs Documentation'), basic: false, professional: true, enterprise: true },
        { name: t('pricing.features.shipping', 'Shipping Integration'), basic: false, professional: true, enterprise: true },
        { name: t('pricing.features.trade', 'Trade Compliance'), basic: false, professional: false, enterprise: true }
      ]
    },
    {
      category: t('pricing.features.categories.security', 'Security & Compliance'),
      features: [
        { name: t('pricing.features.encryption', 'Data Encryption'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.twoFactor', 'Two-Factor Authentication'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.gdpr', 'GDPR Compliance'), basic: true, professional: true, enterprise: true },
        { name: t('pricing.features.soc2', 'SOC2 Compliance'), basic: false, professional: false, enterprise: true },
        { name: t('pricing.features.geofencing', 'Geofencing & Location'), basic: false, professional: true, enterprise: true }
      ]
    }
  ];
  
  // Load dynamic pricing based on user's country
  useEffect(() => {
    async function loadDynamicPricing() {
      try {
        const pricing = await getCurrentUserPricing();
        const country = await getCacheValue('user_country') || 'US';
        const isDeveloping = await getCacheValue('user_is_developing_country') || false;
        
        // Fetch exchange rate for the user's country
        console.log(`💱 [Pricing] Checking exchange rate for country: ${country}`);
        if (country !== 'US') {
          try {
            console.log(`💱 [Pricing] Fetching exchange rate from /api/exchange-rates?country=${country}`);
            const rateResponse = await fetch(`/api/exchange-rates?country=${country}`);
            console.log(`💱 [Pricing] Exchange rate API response status: ${rateResponse.status}`);
            if (rateResponse.ok) {
              const rateData = await rateResponse.json();
              console.log('💱 [Pricing] Exchange rate data:', rateData);
              if (rateData.success) {
                setExchangeRate(rateData);
                console.log(`💱 [Pricing] Exchange rate set: ${rateData.currency} @ ${rateData.rate}`);
              } else {
                console.warn('💱 [Pricing] Exchange rate API returned success: false', rateData);
              }
            } else {
              console.warn(`💱 [Pricing] Exchange rate API returned error: ${rateResponse.status}`);
            }
          } catch (error) {
            console.error('💱 [Pricing] Failed to fetch exchange rate:', error);
          }
        } else {
          console.log('💱 [Pricing] Country is US, no exchange rate needed');
        }
        
        // Use centralized function to check if country should have discount
        const shouldHaveDiscount = isDevelopingCountry(country);
        
        // Log detailed info for debugging
        console.log(`💱 [Pricing] Country check for ${country}:`, {
          isDevelopingCountry: shouldHaveDiscount,
          cachedIsDeveloping: isDeveloping,
          countryName: getDevelopingCountryName(country) || 'Not in list'
        });
        
        // Special check for USA - should NEVER have discount
        if (country === 'US' && shouldHaveDiscount) {
          console.error('⚠️ CRITICAL ERROR: USA incorrectly marked as developing country!');
          setHasDiscount(false);
        } else {
          setHasDiscount(shouldHaveDiscount);
        }
        
        setDynamicPricing(pricing);
        setUserCountry(country);
        
        console.log(`💱 [Pricing] Final state - Country: ${country}, Has Discount: ${shouldHaveDiscount}, Exchange Rate:`, exchangeRate);
      } catch (error) {
        console.error('❌ Error loading dynamic pricing:', error);
      }
    }
    
    loadDynamicPricing();
  }, []);
  
  // Log when exchange rate changes
  useEffect(() => {
    if (exchangeRate) {
      console.log('💱 [Pricing] Exchange rate updated:', exchangeRate);
    }
  }, [exchangeRate]);

  const plans = [
    {
      name: t('pricing.plans.basic.name', 'Basic'),
      description: t('pricing.plans.basic.description', 'Perfect for getting started'),
      price: { 
        monthly: t('free', 'FREE'), 
        '6month': t('free', 'FREE'),
        annual: t('free', 'FREE') 
      },
      savings: {
        '6month': '$0',
        annual: '$0'
      },
      features: [
        t('pricing.plans.basic.features.0', '1 user'),
        t('pricing.plans.basic.features.1', '3GB storage'),
        t('pricing.plans.basic.features.2', 'Basic features'),
        t('pricing.plans.basic.features.3', 'Community support'),
        t('pricing.plans.basic.features.4', 'Mobile app access'),
        t('pricing.plans.basic.features.5', 'Invoice & POS')
      ],
      cta: t('pricing.plans.basic.cta', 'Start Free'),
      highlight: false,
      popular: false,
    },
    {
      name: t('pricing.plans.professional.name', 'Professional'),
      description: t('pricing.plans.professional.description', 'For growing businesses that need more'),
      price: { 
        monthly: hasDiscount ? '$17.50' : '$35',
        '6month': hasDiscount ? '$87.50' : '$175',
        annual: hasDiscount ? '$168' : '$336'
      },
      savings: {
        '6month': hasDiscount ? '$17.50' : '$35',
        annual: hasDiscount ? '$42' : '$84'
      },
      features: [
        t('pricing.plans.professional.features.0', 'Up to 5 users'),
        t('pricing.plans.professional.features.1', 'Unlimited storage'),
        t('pricing.plans.professional.features.2', 'All features included'),
        t('pricing.plans.professional.features.3', 'Priority support'),
        t('pricing.plans.professional.features.4', 'Geofencing & location'),
        t('pricing.plans.professional.features.5', 'Advanced analytics')
      ],
      cta: t('pricing.plans.professional.cta', 'Get Professional'),
      highlight: false,
      popular: billingPeriod === '6month',
    },
    {
      name: t('pricing.plans.enterprise.name', 'Enterprise'),
      description: t('pricing.plans.enterprise.description', 'Unlimited scale for large organizations'),
      price: { 
        monthly: hasDiscount ? '$47.50' : '$95',
        '6month': hasDiscount ? '$237.50' : '$475',
        annual: hasDiscount ? '$456' : '$912'
      },
      savings: {
        '6month': hasDiscount ? '$47.50' : '$95',
        annual: hasDiscount ? '$114' : '$228'
      },
      features: [
        t('pricing.plans.enterprise.features.0', 'Unlimited users'),
        t('pricing.plans.enterprise.features.1', 'Unlimited everything'),
        t('pricing.plans.enterprise.features.2', 'All features included'),
        t('pricing.plans.enterprise.features.3', 'Dedicated support'),
        t('pricing.plans.enterprise.features.4', 'AI-powered insights'),
        t('pricing.plans.enterprise.features.5', 'API access')
      ],
      cta: t('pricing.plans.enterprise.cta', 'Get Enterprise'),
      highlight: billingPeriod === 'annual',
      popular: false,
    },
  ];

  return (
    <div id="pricing" className="py-16 sm:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-primary-main uppercase tracking-wide">
            {t('pricing.eyebrow', 'Simple, Transparent Pricing')}
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            {t('pricing.heading', 'Choose the Right Plan for Your Business')}
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            {t('pricing.subheading', 'No hidden fees. No credit card required for Basic plan. Cancel anytime.')}
          </p>
        </div>

        {/* Developing Country Discount Banner */}
        {hasDiscount && (
          <div className="mt-8 mb-8 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-xl text-center shadow-lg relative">
            <div className="flex items-center justify-center mb-2">
              <svg className="h-8 w-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-2xl font-bold">
                {t('pricing.discount.title', 'Supporting {{country}} Businesses', { country: getDevelopingCountryName(userCountry) || userCountry })}
              </span>
              {/* Info Icon with Tooltip */}
              <div className="relative ml-2 inline-block group">
                <svg className="h-5 w-5 cursor-help opacity-80 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  {t('pricing.discount.tooltip', 'This discount applies to businesses with primary operations in {{country}}', { country: getDevelopingCountryName(userCountry) || userCountry })}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-lg font-medium">
              {t('pricing.discount.subtitle', '50% discount for companies with local operations')}
            </p>
          </div>
        )}
        
        {/* Billing Toggle */}
        <div className="mt-10 flex justify-center">
          <div className="relative bg-white p-1 rounded-full shadow-md inline-flex">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`relative px-4 sm:px-6 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                billingPeriod === 'monthly' ? 'bg-primary-main text-white shadow-sm' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {t('pricing.billing.monthly', 'Monthly')}
            </button>
            <button
              onClick={() => setBillingPeriod('6month')}
              className={`relative px-4 sm:px-6 py-3 text-sm font-medium rounded-full transition-all duration-200 flex items-center ${
                billingPeriod === '6month' ? 'bg-primary-main text-white shadow-sm' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {t('pricing.billing.sixMonths', '6 Months')}
              <span className="ml-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">{t('pricing.billing.popular', 'POPULAR')}</span>
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`relative px-4 sm:px-6 py-3 text-sm font-medium rounded-full transition-all duration-200 flex items-center ${
                billingPeriod === 'annual' ? 'bg-primary-main text-white shadow-sm' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {t('pricing.billing.annual', 'Annual')}
              <span className="ml-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">{t('pricing.billing.save20', 'SAVE 20%')}</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid lg:grid-cols-3 gap-8 lg:gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl shadow-lg overflow-hidden ${
                plan.highlight 
                  ? 'ring-4 ring-primary-main ring-opacity-50 transform scale-105 bg-blue-50' 
                  : plan.name === 'Basic' 
                    ? 'border border-gray-200 bg-gray-50'
                    : 'border border-gray-200 bg-purple-50'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 transform translate-x-1 -translate-y-1">
                  <div className="bg-gradient-to-r from-primary-main to-primary-dark text-white px-4 py-1 rounded-bl-lg rounded-tr-2xl text-sm font-bold">
                    {t('pricing.mostPopular', 'MOST POPULAR')}
                  </div>
                </div>
              )}
              
              <div className="p-8 bg-white bg-opacity-60 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-gray-600">{plan.description}</p>
                
                <div className="mt-8">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-extrabold text-gray-900">
                      {plan.price[billingPeriod]}
                    </span>
                    {plan.name !== 'Basic' && (
                      <span className="ml-2 text-xl text-gray-500">
                        {billingPeriod === 'monthly' ? t('pricing.period.month', '/month') : billingPeriod === '6month' ? t('pricing.period.sixMonths', '/6 months') : t('pricing.period.year', '/year')}
                      </span>
                    )}
                  </div>
                  {/* Exchange Rate Display */}
                  {plan.name !== 'Basic' && exchangeRate && exchangeRate.currency !== 'USD' && (
                    <div className="mt-2">
                      <p className="text-lg text-gray-600">
                        ({formatLocalPrice(plan.price[billingPeriod], exchangeRate)})*
                      </p>
                    </div>
                  )}
                  {plan.name !== 'Basic' && billingPeriod === '6month' && (
                    <div className="mt-1">
                      <p className="text-sm text-orange-600 font-medium">
                        {t('pricing.save', 'Save {{amount}} ({{monthly}}/mo)', { 
                          amount: plan.savings['6month'], 
                          monthly: `$${(parseFloat(plan.price['6month'].replace('$', '')) / 6).toFixed(2)}`
                        })}
                      </p>
                    </div>
                  )}
                  {plan.name !== 'Basic' && billingPeriod === 'annual' && (
                    <div className="mt-1">
                      <p className="text-sm text-green-600 font-medium">
                        {t('pricing.save', 'Save {{amount}} ({{monthly}}/mo)', { 
                          amount: plan.savings.annual, 
                          monthly: `$${(parseFloat(plan.price.annual.replace('$', '')) / 12).toFixed(2)}`
                        })}
                      </p>
                    </div>
                  )}
                </div>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-10">
                  <Link
                    href="/api/auth/login"
                    className={`block w-full text-center px-6 py-4 rounded-lg font-semibold transition-all duration-200 ${
                      plan.name === 'Enterprise'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        : plan.popular && billingPeriod === '6month'
                          ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                          : plan.highlight && billingPeriod === 'annual'
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                            : plan.name === 'Basic'
                              ? 'bg-white border-2 border-primary-main text-primary-main hover:bg-primary-light hover:text-white'
                              : 'bg-primary-main hover:bg-primary-dark text-white'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Regional Pricing Disclaimer */}
        {hasDiscount && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t('pricing.disclaimer', '*Regional pricing based on business registration country')}
            </p>
          </div>
        )}

        {/* Compare Plans Button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-all duration-200"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {showComparison ? t('pricing.comparison.hide', 'Hide') : t('pricing.comparison.show', 'Compare')} {t('pricing.comparison.allFeatures', 'All Features')}
          </button>
        </div>

        {/* Feature Comparison Table */}
        {showComparison && (
          <div className="mt-12 bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-8">
              <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
                {t('pricing.comparison.title', 'Detailed Feature Comparison')}
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 font-semibold text-gray-900">{t('pricing.comparison.features', 'Features')}</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-900">{t('pricing.plans.basic.name', 'Basic')}</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-900 bg-primary-light/10">{t('pricing.plans.professional.name', 'Professional')}</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-900">{t('pricing.plans.enterprise.name', 'Enterprise')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featureComparison.map((category, catIdx) => (
                      <React.Fragment key={catIdx}>
                        <tr className="bg-gray-50">
                          <td colSpan="4" className="py-3 px-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                            {category.category}
                          </td>
                        </tr>
                        {category.features.map((feature, featIdx) => (
                          <tr key={featIdx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-4 px-4 text-gray-700">{feature.name}</td>
                            <td className="text-center py-4 px-4">
                              {typeof feature.basic === 'boolean' ? (
                                feature.basic ? (
                                  <svg className="h-5 w-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="h-5 w-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )
                              ) : (
                                <span className="text-gray-700">{feature.basic}</span>
                              )}
                            </td>
                            <td className="text-center py-4 px-4 bg-primary-light/10">
                              {typeof feature.professional === 'boolean' ? (
                                feature.professional ? (
                                  <svg className="h-5 w-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="h-5 w-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )
                              ) : (
                                <span className="text-gray-700 font-medium">{feature.professional}</span>
                              )}
                            </td>
                            <td className="text-center py-4 px-4">
                              {typeof feature.enterprise === 'boolean' ? (
                                feature.enterprise ? (
                                  <svg className="h-5 w-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="h-5 w-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )
                              ) : (
                                <span className="text-gray-700">{feature.enterprise}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {/* Exchange Rate Disclaimer */}
        {exchangeRate && exchangeRate.currency !== 'USD' && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              * {exchangeRate.disclaimer || t('pricing.exchangeDisclaimer', 'Exchange rate is estimated and may vary. Actual rates depend on payment provider.')}
            </p>
            {exchangeRate.source && (
              <p className="text-xs text-gray-400 mt-1">
                {t('pricing.exchangeSource', 'Source: {{source}}', { source: exchangeRate.source })}
              </p>
            )}
          </div>
        )}
        
        {/* Payment Methods Note - Currently only for Kenya */}
        {userCountry === 'KE' && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t('pricing.paymentMethods.kenya', '💳 Pay with credit card (USD) or M-Pesa (KES)')}
            </p>
          </div>
        )}


      </div>
    </div>
  );
}