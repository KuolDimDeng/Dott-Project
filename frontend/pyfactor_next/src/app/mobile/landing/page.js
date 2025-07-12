'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation, I18nextProvider } from 'react-i18next';
import { initializeCountryDetection } from '@/services/countryDetectionService';
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

  useEffect(() => {
    // Initialize country detection and language
    async function init() {
      try {
        const { country, language, isDeveloping: isDevCountry } = await initializeCountryDetection();
        setSelectedCountry(country);
        setIsDeveloping(isDevCountry);
        
        // Set language based on country
        await i18nInstance.changeLanguage(language);
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
      title: 'Made for Africa',
      description: 'M-Pesa, offline mode, local support',
      color: 'text-orange-600 bg-orange-100'
    }
  ];

  // Pricing based on CLAUDE.md configuration
  const basePricing = {
    basic: 0,
    pro: 15,
    enterprise: 45
  };

  // Apply 50% discount for developing countries
  const pricing = {
    basic: 0, // Always free
    pro: isDeveloping ? 7.50 : 15,
    enterprise: isDeveloping ? 22.50 : 45
  };

  // Currency conversion rates (approximate)
  const currencyRates = {
    KE: { symbol: 'KES', rate: 150 },
    NG: { symbol: 'NGN', rate: 750 },
    GH: { symbol: 'GHS', rate: 12 },
    ZA: { symbol: 'ZAR', rate: 18 },
    US: { symbol: 'USD', rate: 1 }
  };

  const currentCurrency = currencyRates[selectedCountry] || currencyRates.US;
  
  const formatPrice = (usdPrice) => {
    const localPrice = Math.round(usdPrice * currentCurrency.rate);
    return `${currentCurrency.symbol} ${localPrice.toLocaleString()}`;
  };

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
            {t('hero.description', 'All-in-one business management platform that works offline.')}
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
          Simple, Transparent Pricing
        </h2>
        <p className="text-center text-gray-600 mb-6">
          50% off for developing countries
        </p>

        {/* Country Selector */}
        <div className="flex justify-center mb-8">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="US">United States (USD)</option>
            <option value="KE">Kenya (KES)</option>
            <option value="NG">Nigeria (NGN)</option>
            <option value="GH">Ghana (GHS)</option>
            <option value="ZA">South Africa (ZAR)</option>
          </select>
        </div>

        {/* Pricing Cards */}
        <div className="space-y-4 max-w-lg mx-auto">
          {/* Basic Plan */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-bold text-lg text-gray-900">Basic</h3>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold text-gray-900">
                {t('pricing.free', 'Free')}
              </span>
              <span className="text-gray-600">{t('pricing.forever', 'forever')}</span>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                1 user
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                Basic features
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                3GB storage
              </li>
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="bg-blue-600 text-white rounded-xl p-6 relative">
            <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs px-3 py-1 rounded-full">
              POPULAR
            </div>
            <h3 className="font-bold text-lg">Professional</h3>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold">
                {formatPrice(pricing.pro)}
              </span>
              <span className="text-blue-100">/{t('pricing.month', 'month')}</span>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center text-sm">
                <CheckCircleIcon className="h-5 w-5 text-white mr-2" />
                Up to 3 users
              </li>
              <li className="flex items-center text-sm">
                <CheckCircleIcon className="h-5 w-5 text-white mr-2" />
                All features
              </li>
              <li className="flex items-center text-sm">
                <CheckCircleIcon className="h-5 w-5 text-white mr-2" />
                50GB storage
              </li>
              <li className="flex items-center text-sm">
                <CheckCircleIcon className="h-5 w-5 text-white mr-2" />
                Priority support
              </li>
            </ul>
            <Link
              href="/auth/mobile-signup"
              className="block w-full bg-white text-blue-600 rounded-lg py-3 font-semibold text-center hover:bg-blue-50 transition-colors"
            >
              Get Started For Free
            </Link>
          </div>
        </div>
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
        <p>© 2024 Dott Business. All rights reserved.</p>
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