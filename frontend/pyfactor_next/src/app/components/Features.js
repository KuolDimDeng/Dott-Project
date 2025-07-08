'use client';


import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

// Create custom feature icons using inline SVG
const InventoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const PaymentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const GlobalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const InvoiceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ReportingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const SupportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const BarcodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
  </svg>
);

const TaxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
  </svg>
);

const SecurityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
  
  const featureCategories = [
    {
      title: t('features.operations.title', 'Operations Management'),
      description: t('features.operations.description', 'Streamline your daily business operations'),
      features: [
        {
          title: t('feature.inventory', 'Advanced Inventory Management'),
          description: t('feature.inventory.description', 'Real-time stock tracking with barcode scanning and multi-location support'),
          icon: <InventoryIcon />,
          highlights: [t('highlights.bluetooth', 'Bluetooth scanner integration'), t('highlights.printBarcodes', 'Print custom barcodes'), t('highlights.lowStock', 'Low stock alerts')]
        },
        {
          title: t('feature.barcode', 'Barcode & QR Code'),
          description: t('feature.barcode.description', 'Generate and scan barcodes for products and documents'),
          icon: <BarcodeIcon />,
          highlights: [t('highlights.customLabel', 'Custom label printing'), t('highlights.mobileScanning', 'Mobile scanning'), t('highlights.batchProcessing', 'Batch processing')]
        },
        {
          title: t('feature.pos', 'Point of Sale'),
          description: t('feature.pos.description', 'Modern POS system with offline capabilities'),
          icon: <PaymentIcon />,
          highlights: [t('highlights.offlineMode', 'Offline mode'), t('highlights.multiplePayments', 'Multiple payment methods'), t('highlights.receiptCustom', 'Receipt customization')]
        }
      ]
    },
    {
      title: t('features.financial.title', 'Financial Management'),
      description: t('features.financial.description', 'Complete control over your business finances'),
      features: [
        {
          title: t('feature.invoicing', 'Multi-Currency Invoicing'),
          description: t('feature.invoicing.description', 'Professional invoices in 50+ currencies with automatic conversion'),
          icon: <InvoiceIcon />,
          highlights: [t('highlights.recurringInvoices', 'Recurring invoices'), t('highlights.paymentReminders', 'Payment reminders'), t('highlights.invoiceFactoring', 'Invoice factoring')]
        },
        {
          title: t('feature.tax', 'Regional Tax Compliance'),
          description: t('feature.tax.description', 'Automated tax calculations for 100+ countries'),
          icon: <TaxIcon />,
          highlights: [t('highlights.vatGst', 'VAT/GST support'), t('highlights.taxReports', 'Tax reports'), t('highlights.eFilingReady', 'E-filing ready')]
        },
        {
          title: t('feature.reporting', 'Financial Analytics'),
          description: t('feature.reporting.description', 'Real-time insights with AI-powered recommendations'),
          icon: <ReportingIcon />,
          highlights: [t('highlights.customDashboards', 'Custom dashboards'), t('highlights.profitAnalysis', 'Profit analysis'), t('highlights.cashFlowForecast', 'Cash flow forecasting')]
        }
      ]
    },
    {
      title: t('features.global.title', 'Global Business Tools'),
      description: t('features.global.description', 'Everything you need to operate internationally'),
      features: [
        {
          title: t('feature.payments', 'Regional Payment Gateways'),
          description: t('feature.payments.description', 'Accept payments through local methods in each country'),
          icon: <PaymentIcon />,
          highlights: [t('highlights.mobileMoney', 'Mobile money'), t('highlights.bankTransfers', 'Bank transfers'), t('highlights.digitalWallets', 'Digital wallets')]
        },
        {
          title: t('feature.global', 'Import/Export Management'),
          description: t('feature.global.description', 'Handle international trade documentation and compliance'),
          icon: <GlobalIcon />,
          highlights: [t('highlights.customsDocuments', 'Customs documents'), t('highlights.shippingIntegration', 'Shipping integration'), t('highlights.tradeCompliance', 'Trade compliance')]
        },
        {
          title: t('feature.security', 'Enterprise Security'),
          description: t('feature.security.description', 'Bank-grade security with regional compliance'),
          icon: <SecurityIcon />,
          highlights: [t('highlights.soc2Compliant', 'SOC2 compliant'), t('highlights.dataEncryption', 'Data encryption'), t('highlights.gdprReady', 'GDPR ready')]
        }
      ]
    }
  ];

  return (
    <section id="features" className="py-16 sm:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-primary-main uppercase tracking-wide">
            {t('features.eyebrow', 'Complete Business Solution')}
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            {t('features.heading', 'Everything You Need to Grow Globally')}
          </p>
          <p className="mt-6 max-w-2xl text-xl text-gray-600 mx-auto">
            {t('features.subheading', 'Powerful tools designed for modern businesses operating across borders')}
          </p>
        </div>
        
        {/* Feature Categories */}
        {featureCategories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="mb-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900">{category.title}</h3>
              <p className="mt-2 text-lg text-gray-600">{category.description}</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3">
              {category.features.map((feature, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="flex-shrink-0">
                        {feature.icon}
                      </div>
                      <h4 className="ml-3 text-lg font-semibold text-gray-900">
                        {feature.title}
                      </h4>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                      {feature.description}
                    </p>
                    
                    <ul className="space-y-2">
                      {feature.highlights.map((highlight, hIndex) => (
                        <li key={hIndex} className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-gray-600">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* Trust Badges */}
        <div className="mt-16 border-t border-gray-200 pt-16">
          <h3 className="text-center text-2xl font-bold text-gray-900 mb-8">
            {t('features.trust.title', 'Built for Security & Compliance')}
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-primary-light/10 rounded-full flex items-center justify-center mb-3">
                <SecurityIcon />
              </div>
              <h4 className="font-semibold text-gray-900">{t('trust.soc2Title', 'SOC2 Compliant')}</h4>
              <p className="text-sm text-gray-600 mt-1">{t('trust.soc2Desc', 'Enterprise security')}</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-primary-light/10 rounded-full flex items-center justify-center mb-3">
                <svg className="h-8 w-8 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900">{t('trust.encryptionTitle', '256-bit Encryption')}</h4>
              <p className="text-sm text-gray-600 mt-1">{t('trust.encryptionDesc', 'Bank-level security')}</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-primary-light/10 rounded-full flex items-center justify-center mb-3">
                <svg className="h-8 w-8 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900">{t('trust.gdprTitle', 'GDPR Ready')}</h4>
              <p className="text-sm text-gray-600 mt-1">{t('trust.gdprDesc', 'Privacy compliant')}</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-primary-light/10 rounded-full flex items-center justify-center mb-3">
                <svg className="h-8 w-8 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900">{t('trust.uptimeTitle', '99.9% Uptime')}</h4>
              <p className="text-sm text-gray-600 mt-1">{t('trust.uptimeDesc', 'Always available')}</p>
            </div>
          </div>
        </div>
        
      </div>
    </section>
  );
}