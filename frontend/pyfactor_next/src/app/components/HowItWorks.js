'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function HowItWorks() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('business');

  const businessSteps = [
    {
      number: '1',
      title: t('howItWorks.business.step1.title', 'Sign Up & Verify'),
      description: t('howItWorks.business.step1.desc', 'Create your free account and verify your business details'),
      icon: '✨'
    },
    {
      number: '2',
      title: t('howItWorks.business.step2.title', 'Set Up Your Store'),
      description: t('howItWorks.business.step2.desc', 'Add products, services, prices, and delivery options'),
      icon: '🏪'
    },
    {
      number: '3',
      title: t('howItWorks.business.step3.title', 'Receive Orders'),
      description: t('howItWorks.business.step3.desc', 'Get notified when customers place orders'),
      icon: '📱'
    },
    {
      number: '4',
      title: t('howItWorks.business.step4.title', 'Chat & Confirm'),
      description: t('howItWorks.business.step4.desc', 'Communicate directly with customers if needed'),
      icon: '💬'
    },
    {
      number: '5',
      title: t('howItWorks.business.step5.title', 'Process & Deliver'),
      description: t('howItWorks.business.step5.desc', 'Fulfill orders and manage delivery or pickup'),
      icon: '🚚'
    },
    {
      number: '6',
      title: t('howItWorks.business.step6.title', 'Get Paid & Grow'),
      description: t('howItWorks.business.step6.desc', 'Receive payments and track your business growth'),
      icon: '📈'
    }
  ];

  const consumerSteps = [
    {
      number: '1',
      title: t('howItWorks.consumer.step1.title', 'Browse Marketplace'),
      description: t('howItWorks.consumer.step1.desc', 'Explore local businesses and their offerings'),
      icon: '🔍'
    },
    {
      number: '2',
      title: t('howItWorks.consumer.step2.title', 'Select & Customize'),
      description: t('howItWorks.consumer.step2.desc', 'Choose products or services that you need'),
      icon: '🛒'
    },
    {
      number: '3',
      title: t('howItWorks.consumer.step3.title', 'Chat with Seller'),
      description: t('howItWorks.consumer.step3.desc', 'Ask questions or request customizations'),
      icon: '💬'
    },
    {
      number: '4',
      title: t('howItWorks.consumer.step4.title', 'Place Order'),
      description: t('howItWorks.consumer.step4.desc', 'Complete your order with preferred payment method'),
      icon: '💳'
    },
    {
      number: '5',
      title: t('howItWorks.consumer.step5.title', 'Track Delivery'),
      description: t('howItWorks.consumer.step5.desc', 'Monitor your order status in real-time'),
      icon: '📍'
    },
    {
      number: '6',
      title: t('howItWorks.consumer.step6.title', 'Rate & Review'),
      description: t('howItWorks.consumer.step6.desc', 'Share your experience to help others'),
      icon: '⭐'
    }
  ];

  const steps = activeTab === 'business' ? businessSteps : consumerSteps;

  return (
    <div id="howitworks" className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base text-primary-main font-semibold tracking-wide uppercase">
            {t('howItWorks.subtitle', 'Simple Process')}
          </h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            {t('howItWorks.title', 'How It Works')}
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            {t('howItWorks.description', 'Get started in minutes with our simple process')}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setActiveTab('business')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'business'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('howItWorks.forBusinesses', 'For Businesses')}
            </button>
            <button
              onClick={() => setActiveTab('consumer')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'consumer'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('howItWorks.forShoppers', 'For Shoppers')}
            </button>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    activeTab === 'business' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {step.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <div className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full mb-2 ${
                    activeTab === 'business' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-green-600 text-white'
                  }`}>
                    STEP {step.number}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">
                    {step.description}
                  </p>
                </div>
              </div>
              
              {/* Connection Line (except for last item) */}
              {index < steps.length - 1 && index % 3 !== 2 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gray-300"></div>
              )}
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => window.location.href = activeTab === 'business' ? '/auth/signin' : '/marketplace'}
              className={`px-8 py-3 font-semibold rounded-full transition-colors ${
                activeTab === 'business'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {activeTab === 'business' 
                ? t('howItWorks.ctaBusiness', 'Start Your Business')
                : t('howItWorks.ctaConsumer', 'Start Shopping')
              }
            </button>
            <button
              onClick={() => setActiveTab(activeTab === 'business' ? 'consumer' : 'business')}
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-full hover:border-gray-400 transition-colors"
            >
              {activeTab === 'business'
                ? t('howItWorks.switchToConsumer', 'See Shopper Process')
                : t('howItWorks.switchToBusiness', 'See Business Process')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}