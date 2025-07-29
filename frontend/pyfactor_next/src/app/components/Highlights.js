'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import FeatureDetailModal from './FeatureDetailModal';

export default function Highlights() {
  const { t } = useTranslation();
  const [openModal, setOpenModal] = useState(null);
  
  const highlights = [
    {
      key: 'mobile',
      title: t('highlights.mobile.title', 'Mobile Application'),
      description: t('highlights.mobile.description', 'Access your business data anytime, anywhere with our powerful mobile app. Manage inventory, process sales, and view real-time reports on the go.'),
      image: '/static/images/mobile-app-screenshot.jpg',
      imageAlt: t('highlights.mobile.imageAlt', 'Mobile application screenshot'),
      reverse: false,
    },
    {
      key: 'pos',
      title: t('highlights.pos.title', 'POS and Barcode Scanning'),
      description: t('highlights.pos.description', 'Transform any device into a powerful point-of-sale system. Scan barcodes instantly, process sales quickly, track inventory in real-time, and accept all payment methods including cash, cards, and mobile money.'),
      image: '/static/images/pos-barcode-screenshot.jpg',
      imageAlt: t('highlights.pos.imageAlt', 'POS system with barcode scanning feature'),
      reverse: true,
    },
    {
      key: 'ai',
      title: t('highlights.ai.title', 'AI-Powered Insights'),
      description: t('highlights.ai.description', 'Get smart recommendations and predictive analytics based on your business data. Our AI helps you forecast demand, optimize inventory, and identify growth opportunities.'),
      image: '/static/images/ai-dashboard-screenshot.jpg',
      imageAlt: t('highlights.ai.imageAlt', 'AI analytics dashboard screenshot'),
      reverse: false,
    },
    {
      key: 'jobs',
      title: t('highlights.jobs.title', 'Comprehensive Job Management'),
      description: t('highlights.jobs.description', 'End-to-end job costing from quote to completion. Track materials, labor, and expenses with real-time profitability analysis. Perfect for service businesses, contractors, and field operations with mobile-first design.'),
      image: '/static/images/job-management-screenshot.jpg',
      imageAlt: t('highlights.jobs.imageAlt', 'Job management and costing interface'),
      reverse: true,
    },
    {
      key: 'geofencing',
      title: t('highlights.geofencing.title', 'Geofencing & Location Tracking'),
      description: t('highlights.geofencing.description', 'Ensure accurate time tracking with GPS-based clock in/out. Perfect for field teams, delivery drivers, and remote workers. Set up virtual boundaries for work sites and get alerts when employees enter or leave designated areas.'),
      image: '/static/images/geofencing-screenshot.jpg',
      imageAlt: t('highlights.geofencing.imageAlt', 'Geofencing and location tracking interface'),
      reverse: false,
    },
    {
      key: 'mobilemoney',
      title: t('highlights.mobilemoney.title', 'Mobile Money Payments'),
      description: t('highlights.mobilemoney.description', 'Accept payments from anywhere in the world. M-Pesa integration is live in Kenya, with MTN Mobile Money, Airtel Money, Orange Money, GCash, Paytm, Pix, and Mercado Pago coming soon. Reach billions of customers who prefer mobile money over traditional banking.'),
      image: '/static/images/mobile-money-screenshot.jpg',
      imageAlt: t('highlights.mobilemoney.imageAlt', 'Mobile money payment options'),
      reverse: true,
    },
    {
      key: 'whatsapp',
      title: t('highlights.whatsapp.title', 'WhatsApp Business'),
      description: t('highlights.whatsapp.description', 'Transform customer communication with WhatsApp Business integration. Create and manage your product catalog, automatically send invoices and receipts, provide instant customer support, and reach customers on their preferred messaging platform.'),
      image: '/static/images/whatsapp-business-screenshot.jpg',
      imageAlt: t('highlights.whatsapp.imageAlt', 'WhatsApp Business integration interface'),
      reverse: false,
    },
    {
      key: 'languages',
      title: t('highlights.languages.title', '30+ Languages Supported'),
      description: t('highlights.languages.description', 'Reach customers and manage your business in your preferred language. From English to Swahili, Spanish to Mandarin, we support over 30 languages to make Dott accessible to businesses worldwide.'),
      image: '/static/images/languages-screenshot.jpg',
      imageAlt: t('highlights.languages.imageAlt', 'Multi-language interface demonstration'),
      reverse: true,
    },
  ];

  return (
    <div className="bg-gray-50 py-16 sm:py-24" id="highlights">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-primary-main uppercase tracking-wide">
            {t('highlights.eyebrow', 'Key Benefits')}
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            {t('highlights.heading', 'Why businesses choose Dott')}
          </p>
          <p className="mt-6 max-w-2xl text-xl text-gray-600 mx-auto">
            {t('highlights.subheading', 'Advanced features that set us apart from the competition and help your business grow.')}
          </p>
        </div>

        <div className="mt-16 space-y-16">
          {highlights.map((highlight, index) => (
            <div 
              key={index}
              className={`relative ${
                index !== highlights.length - 1 ? 'pb-16 border-b border-gray-200' : ''
              }`}
            >
              <div className={`lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center ${
                highlight.reverse ? 'lg:grid-flow-row-dense' : ''
              }`}>
                <div className={`${highlight.reverse ? 'lg:col-start-2' : 'lg:col-start-1'}`}>
                  <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight sm:text-3xl">
                    {highlight.title}
                  </h3>
                  <p className="mt-3 text-lg text-gray-600">
                    {highlight.description}
                  </p>
                  
                  {/* Show feature details for specific highlights */}
                  {highlight.title === t('highlights.pos.title', 'POS and Barcode Scanning') && (
                    <div className="mt-6">
                      <p className="text-sm font-medium text-gray-500 mb-3">{t('highlights.features.label', 'Key features:')}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.pos.features.quickCheckout', 'Quick checkout')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.pos.features.barcodeScanning', 'Barcode scanning')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.pos.features.allPaymentTypes', 'All payment types')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.pos.features.inventoryTracking', 'Inventory tracking')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.pos.features.offlineMode', 'Offline mode')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.pos.features.mobileReady', 'Mobile ready')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Show job management features */}
                  {highlight.title === t('highlights.jobs.title', 'Comprehensive Job Management') && (
                    <div className="mt-6">
                      <p className="text-sm font-medium text-gray-500 mb-3">{t('highlights.features.label', 'Key features:')}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.jobs.features.jobCosting', 'Real-time job costing')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.jobs.features.mobileFieldApp', 'Mobile field app')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.jobs.features.materialTracking', 'Material tracking')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.jobs.features.timeTracking', 'Auto time tracking')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.jobs.features.photoCapture', 'Photo capture')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.jobs.features.digitalSignatures', 'Digital signatures')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.jobs.features.profitabilityAnalysis', 'Profitability analysis')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.jobs.features.offlineSupport', 'Offline support')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Show geofencing features */}
                  {highlight.title === t('highlights.geofencing.title', 'Geofencing & Location Tracking') && (
                    <div className="mt-6">
                      <p className="text-sm font-medium text-gray-500 mb-3">{t('highlights.features.label', 'Key features:')}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.geofencing.features.gpsClockInOut', 'GPS clock in/out')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.geofencing.features.virtualBoundaries', 'Virtual boundaries')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.geofencing.features.realTimeAlerts', 'Real-time alerts')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.geofencing.features.automatedTimesheets', 'Automated timesheets')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.geofencing.features.complianceReady', 'Compliance ready')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-sm text-gray-700">{t('highlights.geofencing.features.teamManagement', 'Team management')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Show mobile money options */}
                  {highlight.title === t('highlights.mobilemoney.title', 'Mobile Money Payments') && (
                    <div className="mt-6">
                      <p className="text-sm font-medium text-gray-500 mb-3">{t('highlights.mobilemoney.available', 'Payment methods:')}</p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-green-600 mb-2">{t('highlights.mobilemoney.live', 'Now Available:')}</p>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                              M-Pesa (Kenya)
                            </span>
                            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                              Credit/Debit Cards
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-600 mb-2">{t('highlights.mobilemoney.coming', 'Coming Soon:')}</p>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                              MTN Mobile Money
                            </span>
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                              Airtel Money
                            </span>
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                              Orange Money
                            </span>
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                              GCash
                            </span>
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                              Paytm
                            </span>
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                              Pix
                            </span>
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                              Mercado Pago
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Show supported languages */}
                  {highlight.title === t('highlights.languages.title', '30+ Languages Supported') && (
                    <div className="mt-6">
                      <p className="text-sm font-medium text-gray-500 mb-3">{t('highlights.languages.availableIn', 'Available in:')}</p>
                      <div className="flex flex-wrap gap-2">
                        {['English', 'Español', 'Français', 'Português', 'Deutsch', '中文', 'العربية', 'Kiswahili', 'हिन्दी', 'Русский', '日本語', 'Türkçe', 'Bahasa Indonesia', 'Tiếng Việt', 'Nederlands', 'Hausa', 'Yorùbá', 'አማርኛ', 'isiZulu', '한국어', 'Italiano', 'Polski', 'ไทย', 'বাংলা', 'اردو', 'Filipino', 'Українська', 'فارسی', 'chiShona', 'Igbo'].map((lang) => (
                          <span key={lang} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-8">
                    <button
                      onClick={() => setOpenModal(highlight.key)}
                      className="inline-flex items-center text-primary-main font-medium hover:text-primary-dark"
                    >
                      {t('highlights.learnMore', 'Learn more')}
                      <svg 
                        className="ml-2 w-5 h-5" 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 20 20" 
                        fill="currentColor" 
                        aria-hidden="true"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className={`mt-10 lg:mt-0 ${highlight.reverse ? 'lg:col-start-1' : 'lg:col-start-2'}`}>
                  <div className="relative overflow-hidden rounded-lg shadow-xl">
                    <div className="aspect-w-5 aspect-h-3">
                      <Image
                        src={highlight.image}
                        alt={highlight.imageAlt}
                        width={800}
                        height={480}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Feature Detail Modal */}
      <FeatureDetailModal
        isOpen={openModal !== null}
        onClose={() => setOpenModal(null)}
        featureKey={openModal}
      />
    </div>
  );
}