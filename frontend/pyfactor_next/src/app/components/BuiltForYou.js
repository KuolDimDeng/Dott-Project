'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

export default function BuiltForYou() {
  const { t } = useTranslation();
  
  const businessTypes = [
    {
      id: 'freelancers',
      title: t('builtForYou.types.freelancers.title', 'Freelancers'),
      description: t('builtForYou.types.freelancers.description', 'Track projects, invoice clients instantly, and manage your finances all in one place. Get paid faster with professional invoices.'),
      image: '/images/people/freelancer.jpg'
    },
    {
      id: 'contractors',
      title: t('builtForYou.types.contractors.title', 'Contractors'),
      description: t('builtForYou.types.contractors.description', 'Manage multiple projects, track materials and labor costs, and send professional quotes. Keep your cash flow healthy.'),
      image: '/images/people/contractor.jpg'
    },
    {
      id: 'entrepreneurs',
      title: t('builtForYou.types.entrepreneurs.title', 'Entrepreneurs'),
      description: t('builtForYou.types.entrepreneurs.description', 'Scale your startup with powerful tools for inventory, sales, and financial tracking. Make data-driven decisions.'),
      image: '/images/people/entrepreneur.jpg'
    },
    {
      id: 'consultants',
      title: t('builtForYou.types.consultants.title', 'Consultants'),
      description: t('builtForYou.types.consultants.description', 'Bill by the hour or project, track expenses, and manage multiple clients effortlessly. Professional invoicing included.'),
      image: '/images/people/consultant.jpg'
    },
    {
      id: 'retail',
      title: t('builtForYou.types.retail.title', 'Retail Shop Owners'),
      description: t('builtForYou.types.retail.description', 'Manage inventory with barcode scanning, track sales, and accept multiple payment methods including mobile money.'),
      image: '/images/people/retail-owner.jpg'
    },
    {
      id: 'street-vendors',
      title: t('builtForYou.types.streetVendors.title', 'Street Vendors'),
      description: t('builtForYou.types.streetVendors.description', 'Simple mobile-first design to track daily sales, manage inventory, and accept digital payments on the go.'),
      image: '/images/people/street-vendor.jpg'
    },
    {
      id: 'market-stalls',
      title: t('builtForYou.types.marketStalls.title', 'Market Stall Owners'),
      description: t('builtForYou.types.marketStalls.description', 'Perfect for busy market days. Quick sales entry, inventory alerts, and daily profit tracking in your local currency.'),
      image: '/images/people/market-stall.jpg'
    },
    {
      id: 'mobile-money-agents',
      title: t('builtForYou.types.mobileMoneyAgents.title', 'Mobile Money Agents'),
      description: t('builtForYou.types.mobileMoneyAgents.description', 'Track transactions, manage float balances, and generate reports for network operators. Built for M-Pesa, MTN, and more.'),
      image: '/images/people/mobile-money-agent.jpg'
    },
    {
      id: 'restaurants',
      title: t('builtForYou.types.restaurants.title', 'Small Restaurant Owners'),
      description: t('builtForYou.types.restaurants.description', 'Manage orders, track ingredients, calculate food costs, and handle both dine-in and takeaway efficiently.'),
      image: '/images/people/restaurant-owner.jpg'
    },
    {
      id: 'service-providers',
      title: t('builtForYou.types.serviceProviders.title', 'Service Providers'),
      description: t('builtForYou.types.serviceProviders.description', 'For plumbers, electricians, mechanics, and more. Schedule jobs, track parts, and invoice on completion.'),
      image: '/images/people/service-provider.jpg'
    },
    {
      id: 'online-sellers',
      title: t('builtForYou.types.onlineSellers.title', 'Online Sellers'),
      description: t('builtForYou.types.onlineSellers.description', 'Sync inventory across platforms, manage orders, and track shipping. Perfect for social media sellers.'),
      image: '/images/people/online-seller.jpg'
    },
    {
      id: 'transport',
      title: t('builtForYou.types.transport.title', 'Transport Operators'),
      description: t('builtForYou.types.transport.description', 'For taxi, boda boda, and tuk-tuk operators. Track daily earnings, fuel costs, and maintenance schedules.'),
      image: '/images/people/transport-operator.jpg'
    }
  ];
  
  return (
    <section className="py-16 sm:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-indigo-600 tracking-wide uppercase">
            {t('builtForYou.title', 'Built For You')}
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {t('builtForYou.heading', 'Manage your business like a Pro!')}
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            {t('builtForYou.subheading', 'Built for business owners like you')}
          </p>
        </div>

        {/* Business Type Cards */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {businessTypes.map((type) => (
            <div
              key={type.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
            >
              {/* Image */}
              <div className="h-48 bg-gray-200 relative">
                <Image
                  src={type.image}
                  alt={type.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                />
              </div>
              
              {/* Card Content */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {type.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {type.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <p className="text-lg text-gray-600">
            {t('builtForYou.cta', 'Join thousands of business owners worldwide who trust Dott to manage their business')}
          </p>
        </div>
      </div>
    </section>
  );
}