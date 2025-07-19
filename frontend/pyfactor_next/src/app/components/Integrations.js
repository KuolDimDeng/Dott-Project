'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

const integrations = {
  available: [
    {
      name: 'WhatsApp Business',
      logo: '/images/integrations/whatsapp.svg',
      description: 'Send invoices and receipts directly to customers'
    },
    {
      name: 'M-Pesa',
      logo: '/images/integrations/mpesa.svg',
      description: 'Accept mobile money payments seamlessly'
    },
    {
      name: 'Stripe',
      logo: '/images/integrations/stripe.svg',
      description: 'Process card payments globally'
    }
  ],
  comingSoon: [
    {
      name: 'Shopify',
      logo: '/images/integrations/shopify.svg',
      description: 'Sync your e-commerce inventory'
    },
    {
      name: 'WooCommerce',
      logo: '/images/integrations/woocommerce.svg',
      description: 'Connect your WordPress store'
    },
    {
      name: 'QuickBooks',
      logo: '/images/integrations/quickbooks.svg',
      description: 'Import and export accounting data'
    },
    {
      name: 'Amazon Seller',
      logo: '/images/integrations/amazon.svg',
      description: 'Manage your Amazon business'
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
                    <div className="flex-shrink-0 h-16 w-16 bg-gray-50 rounded-lg flex items-center justify-center">
                      {/* Using text as placeholder for logos */}
                      <span className="text-2xl font-bold text-gray-400">
                        {integration.name.charAt(0)}
                      </span>
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
                    <div className="mx-auto h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                      {/* Using text as placeholder for logos */}
                      <span className="text-2xl font-bold text-gray-400">
                        {integration.name.charAt(0)}
                      </span>
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