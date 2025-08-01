'use client';

import React from 'react';
import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

// Feature details content
const getFeatureDetails = (t) => ({
  mobile: {
    title: t('featureDetails.mobile.title', 'Mobile Application'),
    subtitle: t('featureDetails.mobile.subtitle', 'Your Business in Your Pocket'),
    sections: [
      {
        heading: t('featureDetails.mobile.overview.heading', 'Complete Business Management on the Go'),
        content: t('featureDetails.mobile.overview.content', 'Access your entire business from your smartphone or tablet. Our mobile app is designed to give you full control whether you\'re at the office, in the field, or traveling. With offline capabilities, you can continue working even without an internet connection.')
      },
      {
        heading: t('featureDetails.mobile.features.heading', 'Key Mobile Features'),
        bullets: [
          t('featureDetails.mobile.features.1', 'Real-time sales and inventory tracking'),
          t('featureDetails.mobile.features.2', 'Create and send invoices instantly'),
          t('featureDetails.mobile.features.3', 'Accept payments on the spot'),
          t('featureDetails.mobile.features.4', 'View business analytics and reports'),
          t('featureDetails.mobile.features.5', 'Manage employees and timesheets'),
          t('featureDetails.mobile.features.6', 'Scan barcodes with your camera'),
          t('featureDetails.mobile.features.7', 'Works offline with automatic sync'),
          t('featureDetails.mobile.features.8', 'Push notifications for important events')
        ]
      },
      {
        heading: t('featureDetails.mobile.benefits.heading', 'Benefits for Your Business'),
        content: t('featureDetails.mobile.benefits.content', 'Stay connected to your business 24/7. Make informed decisions with real-time data. Serve customers faster with mobile POS. Reduce paperwork and manual processes.')
      }
    ],
    images: [
      {
        src: '/static/images/mobile-dashboard-screenshot.jpg',
        alt: t('featureDetails.mobile.images.dashboard', 'Mobile dashboard view'),
        caption: t('featureDetails.mobile.images.dashboardCaption', 'Dashboard with key metrics at a glance')
      },
      {
        src: '/static/images/mobile-pos-screenshot.jpg',
        alt: t('featureDetails.mobile.images.pos', 'Mobile POS screen'),
        caption: t('featureDetails.mobile.images.posCaption', 'Process sales from anywhere')
      },
      {
        src: '/static/images/mobile-inventory-screenshot.jpg',
        alt: t('featureDetails.mobile.images.inventory', 'Mobile inventory management'),
        caption: t('featureDetails.mobile.images.inventoryCaption', 'Track inventory in real-time')
      }
    ]
  },
  pos: {
    title: t('featureDetails.pos.title', 'POS and Barcode Scanning'),
    subtitle: t('featureDetails.pos.subtitle', 'Fast, Accurate, and Efficient Sales'),
    sections: [
      {
        heading: t('featureDetails.pos.overview.heading', 'Modern Point of Sale System'),
        content: t('featureDetails.pos.overview.content', 'Transform any device into a powerful point-of-sale system. Our POS is designed for speed and simplicity, allowing you to process sales quickly while maintaining accurate inventory tracking. The integrated barcode scanner makes checkout lightning fast.')
      },
      {
        heading: t('featureDetails.pos.features.heading', 'Advanced POS Features'),
        bullets: [
          t('featureDetails.pos.features.1', 'Barcode scanning with camera or Bluetooth scanner'),
          t('featureDetails.pos.features.2', 'Support for all payment types including mobile money'),
          t('featureDetails.pos.features.3', 'Automatic inventory updates with each sale'),
          t('featureDetails.pos.features.4', 'Customer management and loyalty programs'),
          t('featureDetails.pos.features.5', 'Split payments and partial payments'),
          t('featureDetails.pos.features.6', 'Returns and exchanges handling'),
          t('featureDetails.pos.features.7', 'Offline mode with queue management'),
          t('featureDetails.pos.features.8', 'Multi-location inventory tracking')
        ]
      },
      {
        heading: t('featureDetails.pos.barcode.heading', 'Powerful Barcode System'),
        content: t('featureDetails.pos.barcode.content', 'Generate custom barcodes for your products. Print barcode labels in various sizes. Scan products instantly during sales or inventory counts. Support for QR codes and standard barcodes.')
      }
    ],
    images: [
      {
        src: '/static/images/pos-checkout-screenshot.jpg',
        alt: t('featureDetails.pos.images.checkout', 'POS checkout screen'),
        caption: t('featureDetails.pos.images.checkoutCaption', 'Fast and intuitive checkout process')
      },
      {
        src: '/static/images/barcode-scanning-action.jpg',
        alt: t('featureDetails.pos.images.scanning', 'Barcode scanning in action'),
        caption: t('featureDetails.pos.images.scanningCaption', 'Scan products instantly with camera or scanner')
      },
      {
        src: '/static/images/payment-methods-screenshot.jpg',
        alt: t('featureDetails.pos.images.payments', 'Multiple payment methods'),
        caption: t('featureDetails.pos.images.paymentsCaption', 'Accept cash, cards, and mobile money')
      }
    ]
  },
  ai: {
    title: t('featureDetails.ai.title', 'AI-Powered Insights'),
    subtitle: t('featureDetails.ai.subtitle', 'Smart Recommendations for Growth'),
    sections: [
      {
        heading: t('featureDetails.ai.overview.heading', 'Artificial Intelligence for Your Business'),
        content: t('featureDetails.ai.overview.content', 'Our AI analyzes your business data to provide actionable insights and recommendations. Get predictive analytics, demand forecasting, and smart alerts that help you make better business decisions.')
      },
      {
        heading: t('featureDetails.ai.features.heading', 'AI-Powered Features'),
        bullets: [
          t('featureDetails.ai.features.1', 'Demand forecasting based on historical data'),
          t('featureDetails.ai.features.2', 'Inventory optimization recommendations'),
          t('featureDetails.ai.features.3', 'Best selling product analysis'),
          t('featureDetails.ai.features.4', 'Customer behavior insights'),
          t('featureDetails.ai.features.5', 'Pricing optimization suggestions'),
          t('featureDetails.ai.features.6', 'Seasonal trend detection'),
          t('featureDetails.ai.features.7', 'Cash flow predictions'),
          t('featureDetails.ai.features.8', 'Automated financial reports')
        ]
      },
      {
        heading: t('featureDetails.ai.benefits.heading', 'How AI Helps Your Business'),
        content: t('featureDetails.ai.benefits.content', 'Reduce stockouts and overstock situations. Identify growth opportunities. Optimize pricing for maximum profit. Understand customer preferences better.')
      }
    ],
    images: [
      {
        src: '/static/images/ai-dashboard-analytics.jpg',
        alt: t('featureDetails.ai.images.dashboard', 'AI analytics dashboard'),
        caption: t('featureDetails.ai.images.dashboardCaption', 'Smart insights at your fingertips')
      },
      {
        src: '/static/images/demand-forecast-chart.jpg',
        alt: t('featureDetails.ai.images.forecast', 'Demand forecasting chart'),
        caption: t('featureDetails.ai.images.forecastCaption', 'Predict future demand accurately')
      },
      {
        src: '/static/images/inventory-optimization.jpg',
        alt: t('featureDetails.ai.images.inventory', 'Inventory optimization'),
        caption: t('featureDetails.ai.images.inventoryCaption', 'AI-powered inventory recommendations')
      }
    ]
  },
  geofencing: {
    title: t('featureDetails.geofencing.title', 'Geofencing & Location Tracking'),
    subtitle: t('featureDetails.geofencing.subtitle', 'Smart Location-Based Management'),
    sections: [
      {
        heading: t('featureDetails.geofencing.overview.heading', 'Advanced Location Intelligence'),
        content: t('featureDetails.geofencing.overview.content', 'Ensure accurate time tracking and improve accountability with GPS-based clock in/out. Create virtual boundaries around work sites and get instant notifications when employees enter or leave designated areas.')
      },
      {
        heading: t('featureDetails.geofencing.features.heading', 'Location Management Features'),
        bullets: [
          t('featureDetails.geofencing.features.1', 'GPS-based clock in/out with location verification'),
          t('featureDetails.geofencing.features.2', 'Create unlimited geofence zones'),
          t('featureDetails.geofencing.features.3', 'Real-time employee location during work hours'),
          t('featureDetails.geofencing.features.4', 'Automated timesheet creation'),
          t('featureDetails.geofencing.features.5', 'Mileage tracking for delivery drivers'),
          t('featureDetails.geofencing.features.6', 'Site visit verification for field teams'),
          t('featureDetails.geofencing.features.7', 'Privacy-focused with employee consent'),
          t('featureDetails.geofencing.features.8', 'Detailed location history and reports')
        ]
      },
      {
        heading: t('featureDetails.geofencing.compliance.heading', 'Privacy & Compliance'),
        content: t('featureDetails.geofencing.compliance.content', 'Full GDPR and privacy law compliance. Employee consent management. Location tracking only during work hours. Transparent data usage policies.')
      }
    ],
    images: [
      {
        src: '/static/images/geofence-map-view.jpg',
        alt: t('featureDetails.geofencing.images.map', 'Geofence map view'),
        caption: t('featureDetails.geofencing.images.mapCaption', 'Create and manage work zones easily')
      },
      {
        src: '/static/images/employee-tracking-dashboard.jpg',
        alt: t('featureDetails.geofencing.images.tracking', 'Employee tracking dashboard'),
        caption: t('featureDetails.geofencing.images.trackingCaption', 'Real-time team location overview')
      },
      {
        src: '/static/images/location-reports.jpg',
        alt: t('featureDetails.geofencing.images.reports', 'Location reports'),
        caption: t('featureDetails.geofencing.images.reportsCaption', 'Detailed location analytics')
      }
    ]
  },
  mobilemoney: {
    title: t('featureDetails.mobilemoney.title', 'Mobile Money Payments'),
    subtitle: t('featureDetails.mobilemoney.subtitle', 'Accept Payments from Billions of Users Worldwide'),
    sections: [
      {
        heading: t('featureDetails.mobilemoney.overview.heading', 'Global Payment Acceptance'),
        content: t('featureDetails.mobilemoney.overview.content', 'Break down payment barriers and reach customers everywhere. Mobile money is the preferred payment method for billions of people globally, especially in emerging markets. With Dott, you can accept payments from M-Pesa users today, with many more mobile money providers coming soon.')
      },
      {
        heading: t('featureDetails.mobilemoney.current.heading', 'Currently Available'),
        bullets: [
          t('featureDetails.mobilemoney.current.1', 'M-Pesa (Kenya) - Over 30 million active users'),
          t('featureDetails.mobilemoney.current.2', 'Credit and Debit Cards (Visa, Mastercard, Amex)'),
          t('featureDetails.mobilemoney.current.3', 'Bank transfers and ACH payments'),
          t('featureDetails.mobilemoney.current.4', 'Cash payments (tracked in system)')
        ]
      },
      {
        heading: t('featureDetails.mobilemoney.coming.heading', 'Coming Soon'),
        bullets: [
          t('featureDetails.mobilemoney.coming.1', 'MTN Mobile Money - 180+ million users across Africa'),
          t('featureDetails.mobilemoney.coming.2', 'Airtel Money - 125+ million users in Africa and Asia'),
          t('featureDetails.mobilemoney.coming.3', 'Orange Money - 70+ million users in Africa and Middle East'),
          t('featureDetails.mobilemoney.coming.4', 'GCash (Philippines) - 81+ million registered users'),
          t('featureDetails.mobilemoney.coming.5', 'Paytm (India) - 350+ million users'),
          t('featureDetails.mobilemoney.coming.6', 'Pix (Brazil) - 140+ million users'),
          t('featureDetails.mobilemoney.coming.7', 'Mercado Pago - 80+ million users in Latin America'),
          t('featureDetails.mobilemoney.coming.8', 'bKash (Bangladesh), OVO (Indonesia), and more')
        ]
      },
      {
        heading: t('featureDetails.mobilemoney.benefits.heading', 'Why Mobile Money Matters'),
        content: t('featureDetails.mobilemoney.benefits.content', 'Instant payments with lower transaction fees. No bank account required for customers. Reach underbanked populations. Enable cross-border transactions. Perfect for small transactions and daily purchases.')
      }
    ],
    images: [
      {
        src: '/static/images/mobile-money-options.jpg',
        alt: t('featureDetails.mobilemoney.images.options', 'Mobile money payment options'),
        caption: t('featureDetails.mobilemoney.images.optionsCaption', 'Multiple payment methods in one platform')
      },
      {
        src: '/static/images/mpesa-payment-flow.jpg',
        alt: t('featureDetails.mobilemoney.images.mpesa', 'M-Pesa payment flow'),
        caption: t('featureDetails.mobilemoney.images.mpesaCaption', 'Simple and secure M-Pesa integration')
      },
      {
        src: '/static/images/global-payment-map.jpg',
        alt: t('featureDetails.mobilemoney.images.global', 'Global payment coverage map'),
        caption: t('featureDetails.mobilemoney.images.globalCaption', 'Worldwide mobile money coverage')
      }
    ]
  },
  languages: {
    title: t('featureDetails.languages.title', '30+ Languages Supported'),
    subtitle: t('featureDetails.languages.subtitle', 'Speak Your Customer\'s Language'),
    sections: [
      {
        heading: t('featureDetails.languages.overview.heading', 'True Global Accessibility'),
        content: t('featureDetails.languages.overview.content', 'Dott is available in over 30 languages, making it accessible to businesses worldwide. Every feature, button, and message is fully translated by native speakers to ensure clarity and cultural appropriateness.')
      },
      {
        heading: t('featureDetails.languages.supported.heading', 'Supported Languages'),
        bullets: [
          'English, Español (Spanish), Français (French), Português (Portuguese)',
          'Deutsch (German), 中文 (Chinese), العربية (Arabic), Kiswahili (Swahili)',
          'हिन्दी (Hindi), Русский (Russian), 日本語 (Japanese), Türkçe (Turkish)',
          'Bahasa Indonesia, Tiếng Việt (Vietnamese), Nederlands (Dutch)',
          'Hausa, Yorùbá, አማርኛ (Amharic), isiZulu, 한국어 (Korean)',
          'Italiano (Italian), Polski (Polish), ไทย (Thai), বাংলা (Bengali)',
          'اردو (Urdu), Filipino (Tagalog), Українська (Ukrainian)',
          'فارسی (Persian), chiShona (Shona), Igbo'
        ]
      },
      {
        heading: t('featureDetails.languages.benefits.heading', 'Benefits of Multilingual Support'),
        content: t('featureDetails.languages.benefits.content', 'Serve customers in their preferred language. Expand to new markets easily. Train employees faster with native language support. Build trust with localized content.')
      }
    ],
    images: [
      {
        src: '/static/images/language-selector.jpg',
        alt: t('featureDetails.languages.images.selector', 'Language selector'),
        caption: t('featureDetails.languages.images.selectorCaption', 'Switch languages instantly')
      },
      {
        src: '/static/images/multilingual-interface.jpg',
        alt: t('featureDetails.languages.images.interface', 'Multilingual interface'),
        caption: t('featureDetails.languages.images.interfaceCaption', 'Fully translated user interface')
      },
      {
        src: '/static/images/global-map.jpg',
        alt: t('featureDetails.languages.images.map', 'Global availability map'),
        caption: t('featureDetails.languages.images.mapCaption', 'Available worldwide in local languages')
      }
    ]
  }
});

export default function FeatureDetailModal({ isOpen, onClose, featureKey }) {
  const { t } = useTranslation();
  const featureDetails = getFeatureDetails(t);
  const feature = featureDetails[featureKey];

  if (!isOpen || !feature) return null;

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="absolute inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold">{feature.title}</h2>
                <p className="text-lg mt-2 text-blue-100">{feature.subtitle}</p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-blue-100 transition-colors"
              >
                <XMarkIcon className="h-8 w-8" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-8 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Text sections */}
            <div className="space-y-8">
              {feature.sections.map((section, index) => (
                <div key={index}>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {section.heading}
                  </h3>
                  {section.content && (
                    <p className="text-gray-700 leading-relaxed">
                      {section.content}
                    </p>
                  )}
                  {section.bullets && (
                    <ul className="mt-4 space-y-2">
                      {section.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex} className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-700">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Images section */}
            <div className="mt-10">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                {t('featureDetails.screenshots', 'Screenshots & Examples')}
              </h3>
              <div className="grid gap-6 md:grid-cols-3">
                {feature.images.map((image, index) => (
                  <div key={index} className="space-y-2">
                    <div className="aspect-w-16 aspect-h-10 bg-gray-100 rounded-lg overflow-hidden">
                      {/* Placeholder for image */}
                      <div className="flex items-center justify-center text-gray-400">
                        <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      {/* Uncomment when images are available */}
                      {/* <Image
                        src={image.src}
                        alt={image.alt}
                        width={400}
                        height={250}
                        className="object-cover"
                      /> */}
                    </div>
                    <p className="text-sm text-gray-600 text-center">{image.caption}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Call to action */}
            <div className="mt-10 bg-blue-50 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('featureDetails.cta.heading', 'Ready to get started?')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('featureDetails.cta.text', 'Join thousands of businesses already using Dott to grow.')}
              </p>
              <button
                onClick={() => window.location.href = '/auth/signup'}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {t('featureDetails.cta.button', 'Start Free Trial')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}