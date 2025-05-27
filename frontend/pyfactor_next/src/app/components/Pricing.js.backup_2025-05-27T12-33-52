'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function Pricing() {
  const { t } = useTranslation();
  const [annual, setAnnual] = useState(true);
  
  const plans = [
    {
      name: 'Basic',
      description: 'Perfect for small businesses just getting started',
      price: { monthly: 'FREE', annual: 'FREE' },
      savings: '',
      features: [
        { category: 'Core Business Tools', items: [
          { name: 'Income and expense tracking', included: true },
          { name: 'Invoice creation', included: true },
          { name: 'Automated invoice reminders', included: true },
          { name: 'Multiple users', included: false },
          { name: 'Bank account integration', value: 'Limited (2 accounts)' },
          { name: 'Financial reporting', value: 'Basic' },
          { name: 'Expense categorization', included: true },
        ]},
        { category: 'Global Payment Solutions', items: [
          { name: 'Accept Stripe & PayPal payments', included: true },
          { name: 'Mobile money payments (M-Pesa, etc.)', value: 'Limited' },
          { name: 'Reduced transaction fees', included: false },
          { name: 'Multi-currency support', value: 'Limited' },
          { name: 'Currency exchange services', value: '2% fee' },
          { name: 'Invoice factoring (US & Canada)', included: false },
          { name: 'White-label payment solutions', included: false },
        ]},
        { category: 'Inventory Management', items: [
          { name: 'Basic inventory tracking', included: true },
          { name: 'Low stock alerts', included: false },
          { name: 'Barcode scanning', included: false },
          { name: 'Inventory forecasting', included: false },
          { name: 'Multi-location inventory', included: false },
          { name: 'Custom inventory categories', included: false },
        ]},
        { category: 'Mobile Features', items: [
          { name: 'Mobile app access', included: true },
          { name: 'Mobile Point of Sale (mPOS)', included: false },
          { name: 'Offline mode', value: 'Limited' },
        ]},
        { category: 'Tax & Compliance', items: [
          { name: 'Tax calculation', included: true },
          { name: 'Self-service payroll (0.4% fee)', value: 'Available as add-on' },
          { name: 'Regional compliance updates', included: false },
        ]},
        { category: 'Integrations', items: [
          { name: 'Accounting software integration', value: 'Limited' },
          { name: 'E-commerce platform integration', included: false },
          { name: 'Custom integrations', included: false },
        ]},
        { category: 'Additional Features', items: [
          { name: 'Storage space', value: '2 GB' },
          { name: 'AI-powered business insights', included: false },
          { name: 'Advanced forecasting', included: false },
          { name: 'Custom API access', included: false },
          { name: 'Priority support', included: false },
          { name: 'Dedicated account manager', included: false },
          { name: 'HR & CRM modules', value: 'Add-on' },
        ]},
      ],
      cta: 'Start for Free',
      highlight: false,
      badge: '',
      color: 'bg-gray-50 border-gray-200',
    },
    {
      name: 'Professional',
      description: 'Everything growing businesses need to thrive',
      price: { monthly: '£11.59/mo', annual: '£9.99/mo' },
      savings: 'Save 14%',
      features: [
        { category: 'Core Business Tools', items: [
          { name: 'Income and expense tracking', included: true },
          { name: 'Invoice creation', included: true },
          { name: 'Automated invoice reminders', included: true },
          { name: 'Multiple users', included: true },
          { name: 'Bank account integration', value: 'Up to 10 accounts' },
          { name: 'Financial reporting', value: 'Advanced' },
          { name: 'Expense categorization', included: true },
        ]},
        { category: 'Global Payment Solutions', items: [
          { name: 'Accept Stripe & PayPal payments', included: true },
          { name: 'Mobile money payments (M-Pesa, etc.)', included: true },
          { name: 'Reduced transaction fees', included: true },
          { name: 'Multi-currency support', included: true },
          { name: 'Currency exchange services', value: '1.5% fee' },
          { name: 'Invoice factoring (US & Canada)', value: 'Limited' },
          { name: 'White-label payment solutions', value: 'Limited' },
        ]},
        { category: 'Inventory Management', items: [
          { name: 'Basic inventory tracking', included: true },
          { name: 'Low stock alerts', included: true },
          { name: 'Barcode scanning', included: true },
          { name: 'Inventory forecasting', value: 'Limited' },
          { name: 'Multi-location inventory', value: 'Limited' },
          { name: 'Custom inventory categories', value: 'Limited' },
        ]},
        { category: 'Mobile Features', items: [
          { name: 'Mobile app access', included: true },
          { name: 'Mobile Point of Sale (mPOS)', included: true },
          { name: 'Offline mode', included: true },
        ]},
        { category: 'Tax & Compliance', items: [
          { name: 'Tax calculation', included: true },
          { name: 'Self-service payroll (0.4% fee)', value: 'Discounted' },
          { name: 'Regional compliance updates', included: true },
        ]},
        { category: 'Integrations', items: [
          { name: 'Accounting software integration', included: true },
          { name: 'E-commerce platform integration', included: true },
          { name: 'Custom integrations', value: 'Limited' },
        ]},
        { category: 'Additional Features', items: [
          { name: 'Storage space', value: '30 GB' },
          { name: 'AI-powered business insights', included: true },
          { name: 'Advanced forecasting', value: 'Limited' },
          { name: 'Custom API access', included: false },
          { name: 'Priority support', included: true },
          { name: 'Dedicated account manager', included: false },
          { name: 'HR & CRM modules', value: 'Discounted' },
        ]},
      ],
      cta: 'Choose Professional',
      highlight: true,
      badge: 'Most popular',
      color: 'bg-gradient-to-b from-blue-50 to-white border-primary-light',
    },
    {
      name: 'Enterprise',
      description: 'Customized solutions for large organizations',
      price: { monthly: '£34.77/mo', annual: '£29.99/mo' },
      savings: 'Save 14%',
      features: [
        { category: 'Core Business Tools', items: [
          { name: 'Income and expense tracking', included: true },
          { name: 'Invoice creation', included: true },
          { name: 'Automated invoice reminders', included: true },
          { name: 'Multiple users', included: true },
          { name: 'Bank account integration', value: 'Unlimited' },
          { name: 'Financial reporting', value: 'Custom' },
          { name: 'Expense categorization', included: true },
        ]},
        { category: 'Global Payment Solutions', items: [
          { name: 'Accept Stripe & PayPal payments', included: true },
          { name: 'Mobile money payments (M-Pesa, etc.)', included: true },
          { name: 'Reduced transaction fees', included: true },
          { name: 'Multi-currency support', included: true },
          { name: 'Currency exchange services', value: '1% fee' },
          { name: 'Invoice factoring (US & Canada)', included: true },
          { name: 'White-label payment solutions', included: true },
        ]},
        { category: 'Inventory Management', items: [
          { name: 'Basic inventory tracking', included: true },
          { name: 'Low stock alerts', included: true },
          { name: 'Barcode scanning', included: true },
          { name: 'Inventory forecasting', included: true },
          { name: 'Multi-location inventory', included: true },
          { name: 'Custom inventory categories', included: true },
        ]},
        { category: 'Mobile Features', items: [
          { name: 'Mobile app access', included: true },
          { name: 'Mobile Point of Sale (mPOS)', included: true },
          { name: 'Offline mode', included: true },
        ]},
        { category: 'Tax & Compliance', items: [
          { name: 'Tax calculation', included: true },
          { name: 'Self-service payroll (0.4% fee)', value: 'Discounted' },
          { name: 'Regional compliance updates', included: true },
        ]},
        { category: 'Integrations', items: [
          { name: 'Accounting software integration', included: true },
          { name: 'E-commerce platform integration', included: true },
          { name: 'Custom integrations', included: true },
        ]},
        { category: 'Additional Features', items: [
          { name: 'Storage space', value: 'Unlimited' },
          { name: 'AI-powered business insights', included: true },
          { name: 'Advanced forecasting', included: true },
          { name: 'Custom API access', included: true },
          { name: 'Priority support', included: true },
          { name: 'Dedicated account manager', included: true },
          { name: 'HR & CRM modules', value: 'Discounted' },
        ]},
      ],
      cta: 'Contact Sales',
      highlight: false,
      badge: 'Premium',
      color: 'bg-gradient-to-b from-purple-50 to-white border-secondary-main',
    },
  ];

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

        {/* Billing toggle */}
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
              <span className="ml-2 bg-green-100 text-green-800 text-xs font-semibold px-1.5 py-0.5 rounded-full">Save 14%</span>
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
                    <span className="text-4xl font-extrabold text-gray-900">{annual ? plan.price.annual : plan.price.monthly}</span>
                    {plan.name !== 'Basic' && <span className="ml-1 text-gray-500">{annual ? 'per month, billed annually' : ''}</span>}
                  </p>
                  {plan.name !== 'Basic' && annual && (
                    <p className="mt-1 text-sm text-green-600 font-medium">{plan.savings}</p>
                  )}
                </div>
                
                <div className="mt-8 mb-8">
                  <Link
                    href="/auth/signin"
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
                  {plan.features.slice(0, 3).map((category) => (
                    <div key={category.category}>
                      <h4 className="font-semibold text-gray-800">{category.category}</h4>
                      <ul className="mt-2 space-y-2">
                        {category.items.slice(0, 4).map((feature) => (
                          <li key={feature.name} className="flex">
                            {feature.hasOwnProperty('included') ? (
                              feature.included ? (
                                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              )
                            ) : (
                              <svg className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="text-gray-600 text-sm">{feature.name}
                              {feature.hasOwnProperty('value') && <span className="ml-1 text-xs font-medium text-gray-500">({feature.value})</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  
                  {/* View all features button/accordion */}
                  <div className="pt-4">
                    <button 
                      type="button" 
                      className="text-primary-main hover:text-primary-dark text-sm font-medium flex items-center focus:outline-none group-hover:underline"
                      onClick={(e) => e.preventDefault()}
                    >
                      View all features
                      <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
              <h3 className="text-xl font-bold text-gray-900">Enterprise Solutions</h3>
              <p className="mt-2 text-gray-600">Need custom features or dedicated support for your large organization?</p>
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