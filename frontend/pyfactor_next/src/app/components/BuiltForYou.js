'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

const businessTypes = [
  {
    id: 'freelancers',
    title: 'Freelancers',
    description: 'Track projects, invoice clients instantly, and manage your finances all in one place. Get paid faster with professional invoices.',
    image: '/images/people/freelancer.jpg' // Placeholder for stock photo
  },
  {
    id: 'contractors',
    title: 'Contractors',
    description: 'Manage multiple projects, track materials and labor costs, and send professional quotes. Keep your cash flow healthy.',
    image: '/images/people/contractor.jpg'
  },
  {
    id: 'entrepreneurs',
    title: 'Entrepreneurs',
    description: 'Scale your startup with powerful tools for inventory, sales, and financial tracking. Make data-driven decisions.',
    image: '/images/people/entrepreneur.jpg'
  },
  {
    id: 'consultants',
    title: 'Consultants',
    description: 'Bill by the hour or project, track expenses, and manage multiple clients effortlessly. Professional invoicing included.',
    image: '/images/people/consultant.jpg'
  },
  {
    id: 'retail',
    title: 'Retail Shop Owners',
    description: 'Manage inventory with barcode scanning, track sales, and accept multiple payment methods including mobile money.',
    image: '/images/people/retail-owner.jpg'
  },
  {
    id: 'street-vendors',
    title: 'Street Vendors',
    description: 'Simple mobile-first design to track daily sales, manage inventory, and accept digital payments on the go.',
    image: '/images/people/street-vendor.jpg'
  },
  {
    id: 'market-stalls',
    title: 'Market Stall Owners',
    description: 'Perfect for busy market days. Quick sales entry, inventory alerts, and daily profit tracking in your local currency.',
    image: '/images/people/market-stall.jpg'
  },
  {
    id: 'mobile-money-agents',
    title: 'Mobile Money Agents',
    description: 'Track transactions, manage float balances, and generate reports for network operators. Built for M-Pesa, MTN, and more.',
    image: '/images/people/mobile-money-agent.jpg'
  },
  {
    id: 'restaurants',
    title: 'Small Restaurant Owners',
    description: 'Manage orders, track ingredients, calculate food costs, and handle both dine-in and takeaway efficiently.',
    image: '/images/people/restaurant-owner.jpg'
  },
  {
    id: 'service-providers',
    title: 'Service Providers',
    description: 'For plumbers, electricians, mechanics, and more. Schedule jobs, track parts, and invoice on completion.',
    image: '/images/people/service-provider.jpg'
  },
  {
    id: 'online-sellers',
    title: 'Online Sellers',
    description: 'Sync inventory across platforms, manage orders, and track shipping. Perfect for social media sellers.',
    image: '/images/people/online-seller.jpg'
  },
  {
    id: 'transport',
    title: 'Transport Operators',
    description: 'For taxi, boda boda, and tuk-tuk operators. Track daily earnings, fuel costs, and maintenance schedules.',
    image: '/images/people/transport-operator.jpg'
  }
];

export default function BuiltForYou() {
  const { t } = useTranslation();
  
  return (
    <section className="py-16 sm:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-indigo-600 tracking-wide uppercase">
            Built For You
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Manage your business like a PRO!
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            Built for business owners like you
          </p>
        </div>

        {/* Business Type Cards */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {businessTypes.map((type) => (
            <div
              key={type.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
            >
              {/* Image Placeholder */}
              <div className="h-48 bg-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="mt-2 text-sm">Stock Photo</p>
                    <p className="text-xs">{type.title}</p>
                  </div>
                </div>
                {/* Uncomment when you have actual images
                <Image
                  src={type.image}
                  alt={type.title}
                  fill
                  className="object-cover"
                />
                */}
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
          <p className="text-lg text-gray-600 mb-6">
            Join thousands of business owners worldwide who trust Dott to manage their business
          </p>
          <button className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
            Start Your Free Trial
          </button>
        </div>
      </div>
    </section>
  );
}