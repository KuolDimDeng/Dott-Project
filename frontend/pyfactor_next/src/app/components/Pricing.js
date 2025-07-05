'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentUserPricing } from '@/utils/currencyUtils';
import { getCacheValue } from @/utils/appCache';
import { debugCacheState, forceRefreshCountryDetection } from '@/utils/cacheCleaner';
import Link from 'next/link';

// Feature comparison data
const featureComparison = [
  {
    category: 'Core Features',
    features: [
      { name: 'Users', basic: '1 user', professional: 'Up to 3 users', enterprise: 'Unlimited users' },
      { name: 'Storage', basic: '3GB', professional: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Support', basic: 'Basic support', professional: 'Priority support', enterprise: 'Dedicated support' },
      { name: 'Onboarding', basic: 'Self-service', professional: 'Email assistance', enterprise: 'Custom onboarding' }
    ]
  },
  {
    category: 'Business Management',
    features: [
      { name: 'Income & Expense Tracking', basic: true, professional: true, enterprise: true },
      { name: 'Multi-Currency Support', basic: true, professional: true, enterprise: true },
      { name: 'Invoice Creation', basic: true, professional: true, enterprise: true },
      { name: 'Automated Reminders', basic: true, professional: true, enterprise: true },
      { name: 'Customer Management', basic: true, professional: true, enterprise: true },
      { name: 'Product Catalog', basic: true, professional: true, enterprise: true }
    ]
  },
  {
    category: 'Inventory & POS',
    features: [
      { name: 'Inventory Tracking', basic: true, professional: true, enterprise: true },
      { name: 'Barcode Scanning', basic: true, professional: true, enterprise: true },
      { name: 'Custom Barcode Printing', basic: true, professional: true, enterprise: true },
      { name: 'Low Stock Alerts', basic: true, professional: true, enterprise: true },
      { name: 'Multi-Location Inventory', basic: false, professional: true, enterprise: true },
      { name: 'POS System', basic: true, professional: true, enterprise: true },
      { name: 'Offline Mode', basic: false, professional: true, enterprise: true }
    ]
  },
  {
    category: 'Payments & Invoicing',
    features: [
      { name: 'Stripe Integration', basic: true, professional: true, enterprise: true },
      { name: 'PayPal Integration', basic: true, professional: true, enterprise: true },
      { name: 'Mobile Money (M-Pesa, etc.)', basic: true, professional: true, enterprise: true },
      { name: 'Regional Payment Methods', basic: true, professional: true, enterprise: true },
      { name: 'Invoice Factoring', basic: false, professional: true, enterprise: true },
      { name: 'Recurring Invoices', basic: false, professional: true, enterprise: true },
      { name: 'Payment Links', basic: true, professional: true, enterprise: true }
    ]
  },
  {
    category: 'Tax & Compliance',
    features: [
      { name: 'Regional Tax Calculations', basic: true, professional: true, enterprise: true },
      { name: 'VAT/GST Support', basic: true, professional: true, enterprise: true },
      { name: 'Tax Reports', basic: true, professional: true, enterprise: true },
      { name: 'E-filing Ready', basic: false, professional: true, enterprise: true },
      { name: 'Multi-Region Compliance', basic: false, professional: true, enterprise: true }
    ]
  },
  {
    category: 'Analytics & Reporting',
    features: [
      { name: 'Basic Reports', basic: true, professional: true, enterprise: true },
      { name: 'Custom Reports', basic: false, professional: true, enterprise: true },
      { name: 'Real-time Dashboard', basic: true, professional: true, enterprise: true },
      { name: 'Profit Analysis', basic: false, professional: true, enterprise: true },
      { name: 'Cash Flow Forecasting', basic: false, professional: true, enterprise: true },
      { name: 'AI Recommendations', basic: false, professional: false, enterprise: true }
    ]
  },
  {
    category: 'Import/Export',
    features: [
      { name: 'Import/Export Management', basic: false, professional: true, enterprise: true },
      { name: 'Customs Documentation', basic: false, professional: true, enterprise: true },
      { name: 'Shipping Integration', basic: false, professional: true, enterprise: true },
      { name: 'Trade Compliance', basic: false, professional: false, enterprise: true }
    ]
  },
  {
    category: 'Security & Compliance',
    features: [
      { name: 'Data Encryption', basic: true, professional: true, enterprise: true },
      { name: 'Two-Factor Authentication', basic: true, professional: true, enterprise: true },
      { name: 'GDPR Compliance', basic: true, professional: true, enterprise: true },
      { name: 'SOC2 Compliance', basic: false, professional: false, enterprise: true },
      { name: 'Custom Security Policies', basic: false, professional: false, enterprise: true }
    ]
  }
];

export default function Pricing() {
  const { t } = useTranslation();
  const [annual, setAnnual] = useState(false);
  const [dynamicPricing, setDynamicPricing] = useState(null);
  const [userCountry, setUserCountry] = useState('US');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  
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
      name: 'Basic',
      description: 'Perfect for freelancers and small businesses',
      price: { 
        monthly: 'FREE', 
        annual: 'FREE' 
      },
      features: [
        '1 user',
        '3GB storage',
        'All core features',
        'Basic support',
        'Mobile app access'
      ],
      cta: 'Start Free',
      highlight: false,
      popular: false,
    },
    {
      name: 'Professional',
      description: 'For growing businesses that need more',
      price: { 
        monthly: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.professional?.monthly?.formatted || '$7.50') :
          '$15',
        annual: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.professional?.annual?.formatted ? 
            `${dynamicPricing.professional.annual.formatted.split('/')[0]}` : '$72') :
          '$144'
      },
      features: [
        'Up to 3 users',
        'Unlimited storage',
        'All features included',
        'Priority support',
        'Advanced analytics',
        'Multi-location support'
      ],
      cta: 'Get Professional',
      highlight: true,
      popular: true,
    },
    {
      name: 'Enterprise',
      description: 'Unlimited scale for large organizations',
      price: { 
        monthly: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.enterprise?.monthly?.formatted || '$22.50') :
          '$45',
        annual: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.enterprise?.annual?.formatted ? 
            `${dynamicPricing.enterprise.annual.formatted.split('/')[0]}` : '$216') :
          '$432'
      },
      features: [
        'Unlimited users',
        'Unlimited everything',
        'All features included',
        'Dedicated support',
        'Custom onboarding',
        'AI-powered insights',
        'API access'
      ],
      cta: 'Get Enterprise',
      highlight: false,
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
            Choose the Right Plan for Your Business
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            No hidden fees. No credit card required for Basic plan. Cancel anytime.
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
                50% Off All Paid Plans!
              </span>
            </div>
            <p className="text-lg opacity-90">
              Special pricing for businesses in {userCountry} - Supporting local entrepreneurship
            </p>
          </div>
        )}
        
        {/* Billing Toggle */}
        <div className="mt-10 flex justify-center">
          <div className="relative bg-white p-1 rounded-full shadow-md inline-flex">
            <button
              onClick={() => setAnnual(false)}
              className={`relative px-6 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                !annual ? 'bg-primary-main text-white shadow-sm' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Monthly billing
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`relative px-6 py-3 text-sm font-medium rounded-full transition-all duration-200 flex items-center ${
                annual ? 'bg-primary-main text-white shadow-sm' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Annual billing
              <span className="ml-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">SAVE 20%</span>
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
                    MOST POPULAR
                  </div>
                </div>
              )}
              
              <div className="p-8 bg-white bg-opacity-60 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-gray-600">{plan.description}</p>
                
                <div className="mt-8">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-extrabold text-gray-900">
                      {plan.name === 'Basic' ? 'FREE' : annual ? plan.price.annual : plan.price.monthly}
                    </span>
                    {plan.name !== 'Basic' && (
                      <span className="ml-2 text-xl text-gray-500">
                        {annual ? '/year' : '/month'}
                      </span>
                    )}
                  </div>
                  {plan.name !== 'Basic' && annual && (
                    <p className="mt-1 text-sm text-green-600 font-medium">
                      Save {hasDiscount ? '$36' : '$36'} per year
                    </p>
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
                      plan.highlight
                        ? 'bg-primary-main hover:bg-primary-dark text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        : plan.name === 'Basic'
                          ? 'bg-white border-2 border-primary-main text-primary-main hover:bg-primary-light hover:text-white'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
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
            {showComparison ? 'Hide' : 'Compare'} All Features
          </button>
        </div>

        {/* Feature Comparison Table */}
        {showComparison && (
          <div className="mt-12 bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-8">
              <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
                Detailed Feature Comparison
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 font-semibold text-gray-900">Features</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-900">Basic</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-900 bg-primary-light/10">Professional</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-900">Enterprise</th>
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