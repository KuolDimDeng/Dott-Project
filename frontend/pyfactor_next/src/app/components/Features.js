'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

// Create custom feature icons using inline SVG
const InventoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const PaymentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const GlobalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const InvoiceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ReportingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const SupportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

export default function Features() {
  const { t } = useTranslation();
  const [renderKey, setRenderKey] = useState(0);
  
  useEffect(() => {
    const handleLanguageChange = () => {
      setRenderKey(prev => prev + 1); // Force re-render
    };
    
    window.addEventListener('languageChange', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, []);
  
  const features = [
    {
      title: t('feature.inventory', 'Inventory Management'),
      description: t('feature.inventory.description', 'Track stock levels, print barcodes, and sync with Bluetooth scanners for efficient inventory management.'),
      icon: <InventoryIcon />,
      highlight: true,
      isNew: true,
    },
    {
      title: t('feature.payments', 'Global Payments'),
      description: t('feature.payments.description', 'Accept payments globally through credit cards, bank transfers, mobile money, and regional payment methods.'),
      icon: <PaymentIcon />,
      highlight: true,
    },
    {
      title: t('feature.global', 'Multi-Region Support'),
      description: t('feature.global.description', 'Manage international sales, imports, exports, and comply with regional tax regulations seamlessly.'),
      icon: <GlobalIcon />,
      highlight: true,
    },
    {
      title: t('feature.invoicing', 'Invoicing & Billing'),
      description: t('feature.invoicing.description', 'Create professional invoices in multiple currencies with factoring options for businesses worldwide.'),
      icon: <InvoiceIcon />,
      highlight: false,
    },
    {
      title: t('feature.reporting', 'Advanced Reporting'),
      description: t('feature.reporting.description', 'Get insights with customizable reports, real-time business analytics, and AI-powered recommendations.'),
      icon: <ReportingIcon />,
      highlight: false,
    },
    {
      title: t('feature.support', '24/7 Support'),
      description: t('feature.support.description', 'Our global team provides 24/7 support in multiple languages to help you succeed with our platform.'),
      icon: <SupportIcon />,
      highlight: false,
    },
  ];

  return (
    <section id="features" className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-primary-main uppercase tracking-wide">
            {t('features.eyebrow', 'Features')}
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            {t('features.heading', 'Global Business Features')}
          </p>
          <p className="mt-6 max-w-2xl text-xl text-gray-600 mx-auto">
            {t('features.subheading', 'Everything you need to run your business efficiently across 100+ countries')}
          </p>
          
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-primary-light/10 text-primary-main">
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('features.countries', '100+ Countries Supported')}
            </span>
            
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-primary-light/10 text-primary-main">
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {t('features.payments', 'Global Payment Options')}
            </span>
            
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-primary-light/10 text-primary-main">
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              {t('features.inventory', 'Advanced Inventory Management')}
            </span>
          </div>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div 
              key={index}
              className={`relative flex flex-col rounded-2xl overflow-hidden shadow-md transition duration-300 hover:shadow-lg ${
                feature.highlight ? 'border-t-4 border-primary-main' : 'border border-gray-200'
              }`}
            >
              {feature.isNew && (
                <span className="absolute right-4 top-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-main text-white">
                  {t('features.new', 'NEW')}
                </span>
              )}
              
              <div className="p-6 flex-1">
                <div className="flex items-center justify-center h-16 w-16 mx-auto mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-center">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-16">
          <a
            href="#pricing"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-main hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light"
          >
            {t('features.cta', 'Explore All Features')}
          </a>
        </div>
      </div>
    </section>
  );
}