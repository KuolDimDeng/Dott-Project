'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

const FinancialManagement = () => {
  const { t } = useTranslation();

  const features = [
    {
      title: t('financial.multicurrency.title', 'Multi-Currency Invoicing'),
      subtitle: t('financial.multicurrency.subtitle', 'Professional invoices in 50+ currencies with automatic conversion'),
      items: [
        t('financial.multicurrency.recurring', 'Recurring invoices'),
        t('financial.multicurrency.reminders', 'Payment reminders'),
        t('financial.multicurrency.factoring', 'Invoice factoring')
      ],
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      title: t('financial.accounting.title', 'Dual Accounting Standards'),
      subtitle: t('financial.accounting.subtitle', 'The only platform supporting both IFRS and US GAAP'),
      items: [
        t('financial.accounting.ifrs', 'IFRS for 166+ countries'),
        t('financial.accounting.gaap', 'US GAAP for US businesses'),
        t('financial.accounting.autodetect', 'Auto-selects based on country')
      ],
      gradient: 'from-purple-500 to-pink-500',
      isNew: true
    },
    {
      title: t('financial.tax.title', 'Regional Tax Compliance'),
      subtitle: t('financial.tax.subtitle', 'Automated tax calculations for 100+ countries'),
      items: [
        t('financial.tax.vat', 'VAT/GST support'),
        t('financial.tax.reports', 'Tax reports'),
        t('financial.tax.efiling', 'E-filing ready')
      ],
      gradient: 'from-green-500 to-teal-500'
    },
    {
      title: t('financial.analytics.title', 'Financial Analytics'),
      subtitle: t('financial.analytics.subtitle', 'Real-time insights with AI-powered recommendations'),
      items: [
        t('financial.analytics.dashboards', 'Custom dashboards'),
        t('financial.analytics.profit', 'Profit analysis'),
        t('financial.analytics.cashflow', 'Cash flow forecasting')
      ],
      gradient: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-base font-semibold text-indigo-600 tracking-wide uppercase">
            {t('financial.section.title', 'Financial Management')}
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {t('financial.section.heading', 'Complete control over your business finances')}
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            {t('financial.section.subheading', 'Professional tools that adapt to your location and business needs')}
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              {/* Gradient Header */}
              <div className={`h-32 bg-gradient-to-br ${feature.gradient} p-6 relative`}>
                {feature.isNew && (
                  <span className="absolute top-4 right-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white backdrop-blur-sm">
                    NEW
                  </span>
                )}
                <div className="flex items-center justify-center h-full">
                  <svg className="w-12 h-12 text-white opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {feature.subtitle}
                </p>
                
                {/* Feature List */}
                <ul className="space-y-2">
                  {feature.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <p className="text-lg text-gray-600">
            {t('financial.cta.text', 'Join thousands of businesses worldwide using our financial management tools')}
          </p>
        </div>
      </div>
    </section>
  );
};

export default FinancialManagement;