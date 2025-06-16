'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentUserPricing } from '@/utils/currencyUtils';
import { getCacheValue } from '@/utils/appCache';
import { debugCacheState, forceRefreshCountryDetection } from '@/utils/cacheCleaner';
import Link from 'next/link';

export default function Pricing() {
  const { t } = useTranslation();
  const [annual, setAnnual] = useState(false);
  const [dynamicPricing, setDynamicPricing] = useState(null);
  const [userCountry, setUserCountry] = useState('US');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState(null);
  
  // Load dynamic pricing based on user's country
  useEffect(() => {
    async function loadDynamicPricing() {
      try {
        // Debug current cache state
        console.log('🔍 Debug: Current cache state before loading pricing:');
        const cacheState = await debugCacheState();
        
        const pricing = await getCurrentUserPricing();
        const country = await getCacheValue('user_country') || 'US';
        const isDeveloping = await getCacheValue('user_is_developing_country') || false;
        
        console.log('🌍 Resolved values:', { country, isDeveloping });
        
        // Special check for USA - should NEVER have discount
        if (country === 'US' && isDeveloping) {
          console.warn('⚠️ WARNING: USA incorrectly marked as developing country! Forcing refresh...');
          const refreshResult = await forceRefreshCountryDetection();
          setDynamicPricing(await getCurrentUserPricing());
          setUserCountry(refreshResult.country);
          setHasDiscount(refreshResult.isDeveloping);
          console.log('✅ Fixed USA discount issue:', refreshResult);
          return;
        }
        
        // Additional safety check for developed countries
        const developedCountries = ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'LU', 'MC', 'CH', 'NO', 'SE', 'DK', 'FI', 'IS', 'JP', 'KR', 'SG', 'HK', 'TW', 'IL', 'AE', 'QA', 'KW', 'BH', 'SA', 'OM', 'BN', 'CY', 'MT', 'SI', 'CZ', 'SK', 'EE', 'LV', 'LT', 'PL', 'HU', 'HR', 'GR'];
        
        const shouldHaveDiscount = !developedCountries.includes(country) && isDeveloping;
        
        setDynamicPricing(pricing);
        setUserCountry(country);
        setHasDiscount(shouldHaveDiscount);
        
        console.log('✅ Loaded dynamic pricing:', { pricing, country, isDeveloping, hasDiscount: shouldHaveDiscount });
      } catch (error) {
        console.error('❌ Error loading dynamic pricing:', error);
      }
    }
    
    loadDynamicPricing();
  }, []);
  
  // Debug pricing logic
  console.log('🎯 Pricing Component Debug:', {
    userCountry,
    hasDiscount,
    isDeveloping: hasDiscount,
    professionalPrice: hasDiscount && userCountry !== 'US' ? 
      (dynamicPricing?.professional?.monthly?.formatted || '$7.50') : '$15',
    enterprisePrice: hasDiscount && userCountry !== 'US' ? 
      (dynamicPricing?.enterprise?.monthly?.formatted || '$17.50') : '$35'
  });

  const plans = [
    {
      name: 'Basic',
      description: 'Perfect for small businesses just getting started',
      price: { 
        monthly: 'FREE', 
        annual: 'FREE' 
      },
      savings: '',
      features: [
        { category: 'Core Business Tools', items: [
          '✓ Income and expense tracking',
          '✓ Invoice creation',
          '✓ Automated invoice reminders',
          '✓ 1 user limit'
        ]},
        { category: 'Global Payment Solutions', items: [
          '✓ Accept Stripe & PayPal payments',
          '✓ Mobile money payments (M-Pesa, etc.)',
          '✓ Reduced transaction fees',
          '✓ Multi-currency support'
        ]},
        { category: 'Inventory Management', items: [
          '✓ Basic inventory tracking',
          '✓ Low stock alerts',
          '✓ Barcode scanning',
          '✓ Inventory forecasting'
        ]},
        { category: 'Account Limits', items: [
          '• 3GB storage limit',
          '• Basic support (non-priority)',
          '• 1 user only',
          '• All features included'
        ]}
      ],
      cta: 'Start for Free',
      highlight: false,
      badge: '',
      color: 'bg-gray-50 border-gray-200',
    },
    {
      name: 'Professional',
      description: 'Everything growing businesses need to thrive',
      price: { 
        monthly: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.professional?.monthly?.formatted ? 
            `${dynamicPricing.professional.monthly.formatted}/mo` : '$7.50/mo') :
          '$15/mo',
        annual: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.professional?.annual?.formatted ? 
            `${dynamicPricing.professional.annual.formatted}/year` : '$72/year') :
          '$144/year'
      },
      savings: 'save 20%',
      features: [
        { category: 'Core Business Tools', items: [
          '✓ Income and expense tracking',
          '✓ Invoice creation',
          '✓ Automated invoice reminders',
          '✓ Up to 3 users'
        ]},
        { category: 'Global Payment Solutions', items: [
          '✓ Accept Stripe & PayPal payments',
          '✓ Mobile money payments (M-Pesa, etc.)',
          '✓ Reduced transaction fees',
          '✓ Multi-currency support'
        ]},
        { category: 'Inventory Management', items: [
          '✓ Basic inventory tracking',
          '✓ Low stock alerts',
          '✓ Barcode scanning',
          '✓ Inventory forecasting'
        ]},
        { category: 'Professional Benefits', items: [
          '• Unlimited storage',
          '• Priority support',
          '• 3 user collaboration',
          '• All features included',
          '• 20% discount on annual billing'
        ]}
      ],
      cta: 'Choose Professional',
      highlight: true,
      badge: 'Most popular',
      color: 'bg-gradient-to-b from-blue-50 to-white border-primary-light',
    },
    {
      name: 'Enterprise',
      description: 'Unlimited scale for ambitious organizations',
      price: { 
        monthly: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.enterprise?.monthly?.formatted ? 
            `${dynamicPricing.enterprise.monthly.formatted}/mo` : '$17.50/mo') :
          '$35/mo',
        annual: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.enterprise?.annual?.formatted ? 
            `${dynamicPricing.enterprise.annual.formatted}/year` : '$168/year') :
          '$336/year'
      },
      savings: 'save 20%',
      features: [
        { category: 'Core Business Tools', items: [
          '✓ Income and expense tracking',
          '✓ Invoice creation',
          '✓ Automated invoice reminders',
          '✓ Unlimited users'
        ]},
        { category: 'Global Payment Solutions', items: [
          '✓ Accept Stripe & PayPal payments',
          '✓ Mobile money payments (M-Pesa, etc.)',
          '✓ Reduced transaction fees',
          '✓ Multi-currency support'
        ]},
        { category: 'Inventory Management', items: [
          '✓ Basic inventory tracking',
          '✓ Low stock alerts',
          '✓ Barcode scanning',
          '✓ Inventory forecasting'
        ]},
        { category: 'Enterprise Benefits', items: [
          '• Unlimited everything',
          '• Priority support',
          '• Unlimited users',
          '• All features included',
          '• Custom onboarding',
          '• 20% discount on annual billing'
        ]}
      ],
      cta: 'Choose Enterprise',
      highlight: false,
      badge: 'Premium',
      color: 'bg-gradient-to-b from-purple-50 to-white border-secondary-main',
    },
  ];

  const toggleFeatures = (planName) => {
    setExpandedPlan(expandedPlan === planName ? null : planName);
  };

  return (
    <div id="pricing" className="relative py-16 sm:py-24 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-light rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute top-1/3 -right-24 w-96 h-96 bg-secondary-main rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute -bottom-24 left-1/4 w-96 h-96 bg-info-light rounded-full filter blur-3xl opacity-10"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <h2 className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-primary-light/10 text-primary-main">
            {t('pricing.eyebrow', 'Pricing')}
          </h2>
          <p className="mt-3 text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary-dark via-primary-main to-secondary-main">
            Choose Your Perfect Plan
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            Transparent pricing with no hidden fees. Scale your business with confidence.
          </p>
        </div>

        {/* Developing Country Discount Banner */}
        {hasDiscount && (
          <div className="mb-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-lg text-center">
            <div className="flex items-center justify-center">
              <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="font-semibold">
                🎉 Special Pricing for {userCountry}: 50% Off All Plans!
              </span>
            </div>
            <p className="mt-1 text-sm opacity-90">
              Supporting businesses in developing economies with reduced pricing
            </p>
          </div>
        )}
        
        <div className="mt-12 flex justify-center">
          <div className="relative bg-gray-100 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setAnnual(false)}
              className={`relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                !annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center ${
                annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Annual
              <span className="ml-2 bg-green-100 text-green-800 text-xs font-semibold px-1.5 py-0.5 rounded-full">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border ${
                plan.highlight 
                  ? 'ring-4 ring-primary-light/30' 
                  : ''
              } ${plan.color} overflow-hidden hover:shadow-xl transition-all duration-300 group`}
            >
              {plan.badge && (
                <div className="absolute top-4 right-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    plan.highlight 
                      ? 'bg-primary-main text-white' 
                      : plan.name === 'Enterprise' 
                        ? 'bg-secondary-main text-white'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {plan.badge}
                  </span>
                </div>
              )}
              
              <div className="p-6 md:p-8 flex-1 flex flex-col">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-gray-600">{plan.description}</p>
                <div className="mt-8">
                  <p className="flex items-baseline">
                    <span className="text-4xl font-extrabold text-gray-900">
                      {plan.name === 'Basic' ? 'FREE' : annual ? plan.price.annual.split('/')[0] : plan.price.monthly.split('/')[0]}
                    </span>
                    {plan.name !== 'Basic' && (
                      <span className="ml-1 text-gray-500">
                        {annual ? (
                          <>
                            /year<br />
                            <span className="text-sm">({plan.savings})</span>
                          </>
                        ) : '/mo'}
                      </span>
                    )}
                  </p>
                </div>
                
                <div className="mt-8 mb-8">
                  <Link
                    href="/api/auth/login"
                    className={`block w-full text-center px-6 py-3 border border-transparent rounded-lg ${
                      plan.highlight
                        ? 'bg-primary-main hover:bg-primary-dark text-white shadow-md'
                        : plan.name === 'Basic'
                          ? 'bg-white border-2 hover:bg-gray-50 text-primary-main border-primary-main'
                          : plan.name === 'Enterprise'
                            ? 'bg-secondary-main hover:bg-secondary-dark text-white shadow-md'
                            : 'bg-white border-2 hover:bg-gray-50 text-primary-main border-primary-main'
                    } text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-all duration-200`}
                  >
                    {plan.cta}
                  </Link>
                </div>
                
                <div className="space-y-6 flex-1">
                  {/* Always show all feature categories */}
                  {plan.features.map((category) => (
                    <div key={category.category}>
                      <h4 className="font-semibold text-gray-800 mb-2">{category.category}</h4>
                      <ul className="space-y-1">
                        {category.items.map((item, idx) => (
                          <li key={idx} className="text-sm text-gray-600">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  
                  {/* View all features button */}
                  <div className="pt-4 mt-auto">
                    <button 
                      type="button" 
                      className="text-primary-main hover:text-primary-dark text-sm font-medium flex items-center focus:outline-none group-hover:underline"
                      onClick={() => toggleFeatures(plan.name)}
                    >
                      View all features
                      <svg 
                        className={`ml-1 w-4 h-4 transform transition-transform ${expandedPlan === plan.name ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 bg-gray-50 rounded-2xl p-8 shadow-sm">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <h3 className="text-xl font-bold text-gray-900">Need more?</h3>
              <p className="mt-2 text-gray-600">Contact us for custom features or dedicated support for your large organization.</p>
              <div className="mt-6">
                <Link
                  href="/contact"
                  className="inline-flex items-center px-5 py-2.5 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-primary-main hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-all duration-200"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex">
                  <svg className="h-6 w-6 text-primary-main mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Custom development</span>
                </div>
                <div className="flex">
                  <svg className="h-6 w-6 text-primary-main mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Priority 24/7 support</span>
                </div>
                <div className="flex">
                  <svg className="h-6 w-6 text-primary-main mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Dedicated account manager</span>
                </div>
                <div className="flex">
                  <svg className="h-6 w-6 text-primary-main mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Custom API and integrations</span>
                </div>
                <div className="flex">
                  <svg className="h-6 w-6 text-primary-main mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Advanced security features</span>
                </div>
                <div className="flex">
                  <svg className="h-6 w-6 text-primary-main mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">SLA guarantees</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            All plans include: 24/7 customer support, regular updates, and secure data encryption
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/faq"
              className="inline-flex items-center px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Frequently Asked Questions
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center px-4 py-2 border border-primary-main text-base font-medium rounded-lg text-primary-main bg-white hover:bg-primary-light/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light"
            >
              Need a custom solution? Contact us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}