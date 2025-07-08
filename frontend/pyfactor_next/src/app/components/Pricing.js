'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentUserPricing } from '@/utils/currencyUtils';
import { getCacheValue } from '@/utils/appCache';
import { debugCacheState, forceRefreshCountryDetection } from '@/utils/cacheCleaner';
import Link from 'next/link';

// This will be moved inside the component to use translation keys

export default function Pricing() {
  const { t } = useTranslation();
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly', '6month', 'annual'
  const [dynamicPricing, setDynamicPricing] = useState(null);
  const [userCountry, setUserCountry] = useState('US');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  
  // Feature comparison data with translations
  const featureComparison = [
    {
      category: t('pricing.features.categories.core', 'Core Features'),
      features: [
        { name: t('pricing.features.users', 'Users'), basic: t('pricing.features.users.basic', '1 user'), professional: t('pricing.features.users.professional', 'Up to 3 users'), enterprise: t('pricing.features.users.enterprise', 'Unlimited users') },
        { name: t('pricing.features.storage', 'Storage'), basic: t('pricing.features.storage.basic', '3GB'), professional: t('pricing.features.storage.professional', 'Unlimited'), enterprise: t('pricing.features.storage.enterprise', 'Unlimited') },
        { name: t('pricing.features.support', 'Support'), basic: t('pricing.features.support.basic', 'Basic support'), professional: t('pricing.features.support.professional', 'Priority support'), enterprise: t('pricing.features.support.enterprise', 'Dedicated support') },
        { name: t('pricing.features.onboarding', 'Onboarding'), basic: t('pricing.features.onboarding.basic', 'Self-service'), professional: t('pricing.features.onboarding.professional', 'Email assistance'), enterprise: t('pricing.features.onboarding.enterprise', 'Custom onboarding') }
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
        { name: t('pricing.features.customSecurity', 'Custom Security Policies'), basic: false, professional: false, enterprise: true }
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
        
        // Special check for USA - should NEVER have discount
        if (country === 'US' && isDeveloping) {
          console.warn('⚠️ WARNING: USA incorrectly marked as developing country! Forcing refresh...');
          const refreshResult = await forceRefreshCountryDetection();
          setDynamicPricing(await getCurrentUserPricing());
          setUserCountry(refreshResult.country);
          setHasDiscount(refreshResult.isDeveloping);
          return;
        }
        
        // Additional safety check for developed countries
        const developedCountries = ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'LU', 'MC', 'CH', 'NO', 'SE', 'DK', 'FI', 'IS', 'JP', 'KR', 'SG', 'HK', 'TW', 'IL', 'AE', 'QA', 'KW', 'BH', 'SA', 'OM', 'BN', 'CY', 'MT', 'SI', 'CZ', 'SK', 'EE', 'LV', 'LT', 'PL', 'HU', 'HR', 'GR'];
        
        const shouldHaveDiscount = !developedCountries.includes(country) && isDeveloping;
        
        setDynamicPricing(pricing);
        setUserCountry(country);
        setHasDiscount(shouldHaveDiscount);
      } catch (error) {
        console.error('❌ Error loading dynamic pricing:', error);
      }
    }
    
    loadDynamicPricing();
  }, []);

  const plans = [
    {
      name: t('pricing.plans.basic.name', 'Basic'),
      description: t('pricing.plans.basic.description', 'Perfect for freelancers and small businesses'),
      price: { 
        monthly: 'FREE', 
        '6month': 'FREE',
        annual: 'FREE' 
      },
      savings: {
        '6month': '$0',
        annual: '$0'
      },
      features: [
        t('pricing.plans.basic.features.0', '1 user'),
        t('pricing.plans.basic.features.1', '3GB storage'),
        t('pricing.plans.basic.features.2', 'All core features'),
        t('pricing.plans.basic.features.3', 'Basic support'),
        t('pricing.plans.basic.features.4', 'Mobile app access')
      ],
      cta: t('pricing.plans.basic.cta', 'Start Free'),
      highlight: false,
      popular: false,
    },
    {
      name: t('pricing.plans.professional.name', 'Professional'),
      description: t('pricing.plans.professional.description', 'For growing businesses that need more'),
      price: { 
        monthly: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.professional?.monthly?.formatted || '$7.50') :
          '$15',
        '6month': hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.professional?.sixMonth?.formatted || '$37.50') :
          '$75',
        annual: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.professional?.annual?.formatted ? 
            `${dynamicPricing.professional.annual.formatted.split('/')[0]}` : '$72') :
          '$144'
      },
      savings: {
        '6month': hasDiscount && userCountry !== 'US' ? '$7.50' : '$15',
        annual: hasDiscount && userCountry !== 'US' ? '$18' : '$36'
      },
      features: [
        t('pricing.plans.professional.features.0', 'Up to 3 users'),
        t('pricing.plans.professional.features.1', 'Unlimited storage'),
        t('pricing.plans.professional.features.2', 'All features included'),
        t('pricing.plans.professional.features.3', 'Priority support'),
        t('pricing.plans.professional.features.4', 'Advanced analytics'),
        t('pricing.plans.professional.features.5', 'Multi-location support')
      ],
      cta: t('pricing.plans.professional.cta', 'Get Professional'),
      highlight: false,
      popular: billingPeriod === '6month',
    },
    {
      name: t('pricing.plans.enterprise.name', 'Enterprise'),
      description: t('pricing.plans.enterprise.description', 'Unlimited scale for large organizations'),
      price: { 
        monthly: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.enterprise?.monthly?.formatted || '$22.50') :
          '$45',
        '6month': hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.enterprise?.sixMonth?.formatted || '$112.50') :
          '$225',
        annual: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.enterprise?.annual?.formatted ? 
            `${dynamicPricing.enterprise.annual.formatted.split('/')[0]}` : '$216') :
          '$432'
      },
      savings: {
        '6month': hasDiscount && userCountry !== 'US' ? '$22.50' : '$45',
        annual: hasDiscount && userCountry !== 'US' ? '$54' : '$108'
      },
      features: [
        t('pricing.plans.enterprise.features.0', 'Unlimited users'),
        t('pricing.plans.enterprise.features.1', 'Unlimited everything'),
        t('pricing.plans.enterprise.features.2', 'All features included'),
        t('pricing.plans.enterprise.features.3', 'Dedicated support'),
        t('pricing.plans.enterprise.features.4', 'Custom onboarding'),
        t('pricing.plans.enterprise.features.5', 'AI-powered insights'),
        t('pricing.plans.enterprise.features.6', 'API access')
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
          <div className="mt-8 mb-8 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-xl text-center shadow-lg">
            <div className="flex items-center justify-center mb-2">
              <svg className="h-8 w-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="text-2xl font-bold">
                {t('pricing.discount.title', '50% Off All Paid Plans!')}
              </span>
            </div>
            <p className="text-lg opacity-90">
              {t('pricing.discount.subtitle', 'Special pricing for businesses in {{country}} - Supporting local entrepreneurship', { country: userCountry })}
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
                      {plan.name === 'Basic' ? 'FREE' : plan.price[billingPeriod]}
                    </span>
                    {plan.name !== 'Basic' && (
                      <span className="ml-2 text-xl text-gray-500">
                        {billingPeriod === 'monthly' ? t('pricing.period.month', '/month') : billingPeriod === '6month' ? t('pricing.period.sixMonths', '/6 months') : t('pricing.period.year', '/year')}
                      </span>
                    )}
                  </div>
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
                    href={plan.name === 'Basic' ? '/api/auth/login' : `/api/auth/login?plan=${plan.name.toLowerCase()}&billing=${billingPeriod}`}
                    className={`block w-full text-center px-6 py-4 rounded-lg font-semibold transition-all duration-200 ${
                      plan.popular && billingPeriod === '6month'
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


      </div>
    </div>
  );
}