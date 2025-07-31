'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation, I18nextProvider } from 'react-i18next';
import { initializeCountryDetection } from '@/services/countryDetectionService';
import { isDevelopingCountry, getDevelopingCountryName } from '@/utils/developingCountries';
import i18nInstance from '@/i18n';
import SmartAppBanner from '@/components/SmartAppBanner';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CameraIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  DevicePhoneMobileIcon,
  CloudArrowUpIcon,
  BoltIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

export default function MobileLandingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [isDeveloping, setIsDeveloping] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [currencyInfo, setCurrencyInfo] = useState({ symbol: 'USD', decimals: 2 });
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly', '6month', 'annual'

  useEffect(() => {
    // Initialize country detection and language
    async function init() {
      try {
        const { country, language, isDeveloping: isDevCountry } = await initializeCountryDetection();
        setSelectedCountry(country);
        setIsDeveloping(isDevCountry);
        
        // Set language based on country
        await i18nInstance.changeLanguage(language);
        
        // Fetch exchange rate - matching desktop implementation
        console.log(`💱 [Mobile Pricing] Checking exchange rate for country: ${country}`);
        if (country !== 'US') {
          try {
            console.log(`💱 [Mobile Pricing] Fetching exchange rate from /api/exchange-rates?country=${country}`);
            const rateResponse = await fetch(`/api/exchange-rates?country=${country}`);
            console.log(`💱 [Mobile Pricing] Exchange rate API response status: ${rateResponse.status}`);
            if (rateResponse.ok) {
              const rateData = await rateResponse.json();
              console.log('💱 [Mobile Pricing] Exchange rate data:', rateData);
              if (rateData.success) {
                setExchangeRate(rateData);
                console.log(`💱 [Mobile Pricing] Exchange rate set: ${rateData.currency} @ ${rateData.rate}`);
              } else {
                console.warn('💱 [Mobile Pricing] Exchange rate API returned success: false', rateData);
              }
            } else {
              console.warn(`💱 [Mobile Pricing] Exchange rate API returned error: ${rateResponse.status}`);
            }
          } catch (error) {
            console.error('💱 [Mobile Pricing] Failed to fetch exchange rate:', error);
          }
        } else {
          console.log('💱 [Mobile Pricing] Country is US, no exchange rate needed');
        }
      } catch (error) {
        console.error('Error initializing country/language:', error);
      }
    }
    init();
  }, []);

  const features = [
    {
      icon: CurrencyDollarIcon,
      title: 'Point of Sale',
      description: 'Process sales instantly, even offline'
    },
    {
      icon: CameraIcon,
      title: 'Barcode Scanner',
      description: 'Scan products with your camera'
    },
    {
      icon: DocumentTextIcon,
      title: 'Quick Invoicing',
      description: 'Create and send invoices on the go'
    },
    {
      icon: ChartBarIcon,
      title: 'Real-time Analytics',
      description: 'Track your business performance'
    }
  ];

  const benefits = [
    {
      icon: CloudArrowUpIcon,
      title: 'Works Offline',
      description: 'Continue selling without internet',
      color: 'text-green-600 bg-green-100'
    },
    {
      icon: BoltIcon,
      title: 'Lightning Fast',
      description: 'Instant loading, no delays',
      color: 'text-purple-600 bg-purple-100'
    },
    {
      icon: DevicePhoneMobileIcon,
      title: 'Mobile First',
      description: 'Designed for phones & tablets',
      color: 'text-blue-600 bg-blue-100'
    },
    {
      icon: GlobeAltIcon,
      title: 'Mobile Money',
      description: 'M-Pesa, offline mode, local support',
      color: 'text-orange-600 bg-orange-100'
    }
  ];

  // Pricing based on CLAUDE.md configuration - matching desktop exactly
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
        monthly: isDeveloping ? '$17.50' : '$35',
        '6month': isDeveloping ? '$87.50' : '$175',
        annual: isDeveloping ? '$168' : '$336'
      },
      savings: {
        '6month': isDeveloping ? '$17.50' : '$35',
        annual: isDeveloping ? '$42' : '$84'
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
        monthly: isDeveloping ? '$47.50' : '$95',
        '6month': isDeveloping ? '$237.50' : '$475',
        annual: isDeveloping ? '$456' : '$912'
      },
      savings: {
        '6month': isDeveloping ? '$47.50' : '$95',
        annual: isDeveloping ? '$114' : '$228'
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

  // Helper function to format price in local currency - matching desktop
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

  return (
    <I18nextProvider i18n={i18nInstance}>
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Smart App Banner */}
      <SmartAppBanner />
      
      {/* Hero Section */}
      <div className="px-4 pt-20 pb-12 text-center">
        <div className="mb-8">
          <img 
            src="/static/images/favicon.png" 
            alt="Dott" 
            className="h-24 w-24 mx-auto rounded-2xl shadow-lg mb-6"
          />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('hero.title', 'Your Business,')}<br />{t('hero.subtitle', 'In Your Pocket')}
          </h1>
          <p className="text-lg text-gray-600 max-w-sm mx-auto">
            {t('hero.description', 'AI-powered business management platform that works offline.')}
          </p>
        </div>

        <div className="space-y-3 max-w-sm mx-auto">
          <Link
            href="/auth/mobile-signup"
            className="block w-full bg-blue-600 text-white rounded-xl py-4 font-semibold text-lg hover:bg-blue-700 transition-colors"
          >
            Get Started For Free
          </Link>
          <Link
            href="/auth/mobile-login"
            className="block w-full bg-white text-blue-600 rounded-xl py-4 font-semibold text-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors"
          >
            Sign In
          </Link>
          <p className="text-sm text-gray-500 mt-2">
            No credit card required • Free forever plan
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="px-4 py-12 bg-white">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Everything You Need
        </h2>
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-4">
              <feature.icon className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="px-4 py-12">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Built for Your Success
        </h2>
        <div className="space-y-4 max-w-lg mx-auto">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start space-x-4 bg-white rounded-xl p-4 shadow-sm">
              <div className={`p-3 rounded-lg ${benefit.color.split(' ')[1]}`}>
                <benefit.icon className={`h-6 w-6 ${benefit.color.split(' ')[0]}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{benefit.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Section */}
      <div className="px-4 py-12 bg-gray-50">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          {t('pricing.heading', 'Choose the Right Plan for Your Business')}
        </h2>
        <p className="text-center text-gray-600 mb-4">
          {t('pricing.subheading', 'No hidden fees. No credit card required for Basic plan. Cancel anytime.')}
        </p>
        
        {/* Developing Country Discount Banner - matching desktop */}
        {isDeveloping && (
          <div className="mt-4 mb-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-xl text-center shadow-lg relative">
            <div className="flex items-center justify-center mb-1">
              <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-lg font-bold">
                {t('pricing.discount.title', 'Supporting {{country}} Businesses', { country: getDevelopingCountryName(selectedCountry) || selectedCountry })}
              </span>
            </div>
            <p className="text-sm font-medium">
              {t('pricing.discount.subtitle', '50% discount for companies with local operations')}
            </p>
          </div>
        )}
        
        {/* Billing Toggle - matching desktop */}
        <div className="mb-8 flex justify-center">
          <div className="relative bg-white p-1 rounded-full shadow-md inline-flex">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                billingPeriod === 'monthly' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {t('pricing.billing.monthly', 'Monthly')}
            </button>
            <button
              onClick={() => setBillingPeriod('6month')}
              className={`relative px-3 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center ${
                billingPeriod === '6month' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {t('pricing.billing.sixMonths', '6 Months')}
              <span className="ml-1 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{t('pricing.billing.popular', 'POPULAR')}</span>
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`relative px-3 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center ${
                billingPeriod === 'annual' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {t('pricing.billing.annual', 'Annual')}
              <span className="ml-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{t('pricing.billing.save20', 'SAVE 20%')}</span>
            </button>
          </div>
        </div>


        {/* Pricing Cards */}
        <div className="space-y-4 max-w-lg mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl shadow-lg overflow-hidden ${
                plan.highlight 
                  ? 'ring-4 ring-blue-600 ring-opacity-50 transform scale-105 bg-blue-50' 
                  : plan.name === 'Basic' 
                    ? 'border border-gray-200 bg-gray-50'
                    : plan.popular && billingPeriod === '6month'
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 bg-purple-50'
              }`}
            >
              {plan.popular && billingPeriod === '6month' && (
                <div className="absolute -top-3 right-4 bg-orange-500 text-white text-xs px-3 py-1 rounded-full">
                  {t('pricing.mostPopular', 'MOST POPULAR')}
                </div>
              )}
              {plan.highlight && billingPeriod === 'annual' && (
                <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs px-3 py-1 rounded-full">
                  {t('pricing.bestValue', 'BEST VALUE')}
                </div>
              )}
              
              <div className={`p-6 ${plan.popular && billingPeriod === '6month' ? '' : 'bg-white bg-opacity-60 backdrop-blur-sm'}`}>
                <h3 className={`text-xl font-bold ${plan.popular && billingPeriod === '6month' ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                <p className={`mt-1 text-sm ${plan.popular && billingPeriod === '6month' ? 'text-blue-100' : 'text-gray-600'}`}>{plan.description}</p>
                
                <div className="mt-4">
                  <div className="flex items-baseline">
                    <span className={`text-4xl font-extrabold ${plan.popular && billingPeriod === '6month' ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price[billingPeriod]}
                    </span>
                    {plan.name !== 'Basic' && (
                      <span className={`ml-2 text-lg ${plan.popular && billingPeriod === '6month' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {billingPeriod === 'monthly' ? t('pricing.period.month', '/month') : billingPeriod === '6month' ? t('pricing.period.sixMonths', '/6 months') : t('pricing.period.year', '/year')}
                      </span>
                    )}
                  </div>
                  {/* Exchange Rate Display */}
                  {plan.name !== 'Basic' && exchangeRate && exchangeRate.currency !== 'USD' && (
                    <div className="mt-1">
                      <p className={`text-base ${plan.popular && billingPeriod === '6month' ? 'text-blue-100' : 'text-gray-600'}`}>
                        ({formatLocalPrice(plan.price[billingPeriod], exchangeRate)})*
                      </p>
                    </div>
                  )}
                  {plan.name !== 'Basic' && billingPeriod === '6month' && (
                    <div className="mt-1">
                      <p className={`text-xs font-medium ${plan.popular ? 'text-orange-200' : 'text-orange-600'}`}>
                        {t('pricing.save', 'Save {{amount}} ({{monthly}}/mo)', { 
                          amount: plan.savings['6month'], 
                          monthly: `$${(parseFloat(plan.price['6month'].replace('$', '')) / 6).toFixed(2)}`
                        })}
                      </p>
                    </div>
                  )}
                  {plan.name !== 'Basic' && billingPeriod === 'annual' && (
                    <div className="mt-1">
                      <p className={`text-xs font-medium ${plan.highlight ? 'text-green-600' : 'text-green-600'}`}>
                        {t('pricing.save', 'Save {{amount}} ({{monthly}}/mo)', { 
                          amount: plan.savings.annual, 
                          monthly: `$${(parseFloat(plan.price.annual.replace('$', '')) / 12).toFixed(2)}`
                        })}
                      </p>
                    </div>
                  )}
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircleIcon className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${plan.popular && billingPeriod === '6month' ? 'text-white' : 'text-green-500'}`} />
                      <span className={`text-sm ${plan.popular && billingPeriod === '6month' ? 'text-white' : 'text-gray-700'}`}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Link
                    href="/auth/mobile-signup"
                    className={`block w-full text-center px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                      plan.name === 'Enterprise' && billingPeriod === 'annual'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl'
                        : plan.popular && billingPeriod === '6month'
                          ? 'bg-white hover:bg-blue-50 text-blue-600'
                          : plan.highlight && billingPeriod === 'annual'
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                            : plan.name === 'Basic'
                              ? 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Exchange Rate Disclaimer */}
        {exchangeRate && exchangeRate.currency !== 'USD' && (
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              * {exchangeRate.disclaimer || t('pricing.exchangeDisclaimer', 'Exchange rate is estimated and may vary. Actual rates depend on payment provider.')}
            </p>
            {exchangeRate.source && (
              <p className="text-xs text-gray-400 mt-1">
                {t('pricing.exchangeSource', 'Source: {{source}}', { source: exchangeRate.source })}
              </p>
            )}
          </div>
        )}
        
        {/* Regional Pricing Disclaimer */}
        {isDeveloping && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600">
              {t('pricing.disclaimer', '*Regional pricing based on business registration country')}
            </p>
          </div>
        )}
        
        {/* Payment Methods Note - Currently only for Kenya */}
        {selectedCountry === 'KE' && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              {t('pricing.paymentMethods.kenya', '💳 Pay with credit card (USD) or M-Pesa (KES)')}
            </p>
          </div>
        )}
      </div>

      {/* Testimonials */}
      <div className="px-4 py-12 bg-white">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Trusted by Businesses
        </h2>
        <div className="space-y-4 max-w-lg mx-auto">
          <div className="bg-gray-50 rounded-xl p-6">
            <p className="text-gray-700 italic mb-4">
              "Dott transformed how I run my shop. I can track inventory and process M-Pesa payments even when the internet is down!"
            </p>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                JK
              </div>
              <div className="ml-3">
                <p className="font-semibold text-gray-900">Jane Kamau</p>
                <p className="text-sm text-gray-600">Shop Owner, Nairobi</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-4 py-16 bg-gradient-to-t from-blue-600 to-blue-700 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Grow Your Business?
        </h2>
        <p className="text-lg text-blue-100 mb-8 max-w-sm mx-auto">
          Join thousands of businesses already using Dott
        </p>
        <Link
          href="/auth/mobile-signup"
          className="inline-flex items-center bg-white text-blue-600 rounded-xl px-8 py-4 font-semibold text-lg hover:bg-blue-50 transition-colors"
        >
          Get Started Free
          <ArrowRightIcon className="ml-2 h-5 w-5" />
        </Link>
        <p className="mt-4 text-sm text-blue-200">
          No credit card required • Cancel anytime
        </p>
      </div>

      {/* Footer */}
      <div className="px-4 py-8 bg-gray-900 text-gray-400 text-center text-sm">
        <p>© 2024 Dott, LLC. All rights reserved.</p>
        <div className="mt-2 space-x-4">
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
        </div>
      </div>
    </div>
    </I18nextProvider>
  );
}