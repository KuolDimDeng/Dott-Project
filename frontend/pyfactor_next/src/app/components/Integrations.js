'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

const integrations = {
  available: [
    {
      name: 'WhatsApp Business',
      logo: '/images/integrations/whatsapp.jpg',
      description: 'Send invoices and receipts directly to customers',
      hasLogo: false // Logo file not found, will use placeholder
    },
    {
      name: 'M-Pesa',
      logo: '/images/integrations/mpesa.jpg',
      description: 'Accept mobile money payments seamlessly',
      hasLogo: true
    },
    {
      name: 'Stripe',
      logo: '/images/integrations/stripe.jpg',
      description: 'Process card payments globally',
      hasLogo: false // Logo file not found, will use placeholder
    }
  ],
  comingSoon: [
    {
      name: 'Shopify',
      logo: '/images/integrations/shopify.jpg',
      description: 'Sync your e-commerce inventory',
      hasLogo: true
    },
    {
      name: 'WooCommerce',
      logo: '/images/integrations/woocommerce.jpg',
      description: 'Connect your WordPress store',
      hasLogo: true
    },
    {
      name: 'QuickBooks',
      logo: '/images/integrations/quickbooks.jpg',
      description: 'Import and export accounting data',
      hasLogo: false // Logo file not found, will use placeholder
    },
    {
      name: 'Amazon Seller',
      logo: '/images/integrations/amazon.jpg',
      description: 'Manage your Amazon business',
      hasLogo: true
    }
  ]
};

export default function Integrations() {
  const { t } = useTranslation();
  
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-indigo-600 tracking-wide uppercase">
            Integrations
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Connect with the tools you love
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            Seamlessly integrate with popular business tools and payment platforms
          </p>
        </div>

        <div className="mt-16">
          {/* Available Now */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center justify-center">
              <span className="text-green-600 mr-2">✅</span> Available Now
            </h3>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
              {integrations.available.map((integration) => (
                <div
                  key={integration.name}
                  className="relative bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 flex items-center justify-center">
                      {integration.hasLogo ? (
                        <div className="w-24 h-16 flex items-center justify-center">
                          <Image
                            src={integration.logo}
                            alt={`${integration.name} logo`}
                            width={96}
                            height={64}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-16 w-16 bg-gray-50 rounded-lg flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-400">
                            {integration.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {integration.name}
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coming Soon */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center justify-center">
              <span className="text-blue-600 mr-2">🚀</span> Coming Soon
            </h3>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
              {integrations.comingSoon.map((integration) => (
                <div
                  key={integration.name}
                  className="relative bg-gray-50 p-6 rounded-xl border-2 border-dashed border-gray-300 opacity-75"
                >
                  <div className="text-center">
                    <div className="mx-auto flex items-center justify-center mb-4">
                      {integration.hasLogo ? (
                        <div className="w-20 h-16 flex items-center justify-center">
                          <Image
                            src={integration.logo}
                            alt={`${integration.name} logo`}
                            width={80}
                            height={64}
                            className="max-w-full max-h-full object-contain opacity-60 grayscale"
                          />
                        </div>
                      ) : (
                        <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-400">
                            {integration.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <h4 className="text-lg font-semibold text-gray-700">
                      {integration.name}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      {integration.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}