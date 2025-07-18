import React from 'react';
import { ArrowTrendingUpIcon, DocumentTextIcon, UsersIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const DashboardPage = () => {
  const { t } = useTranslation('dashboard');
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : false;

  const quickStartGuides = [
    {
      title: t('quickStart.createInvoice.title'),
      icon: <DocumentTextIcon className="w-8 h-8 text-indigo-600" />,
      description: t('quickStart.createInvoice.description'),
      color: 'indigo',
      action: () => {
        /* Navigate to invoice creation page */
      },
    },
    {
      title: t('quickStart.manageCustomers.title'),
      icon: <UsersIcon className="w-8 h-8 text-purple-600" />,
      description: t('quickStart.manageCustomers.description'),
      color: 'purple',
      action: () => {
        /* Navigate to customer management page */
      },
    },
    {
      title: t('quickStart.trackInventory.title'),
      icon: <ArchiveBoxIcon className="w-8 h-8 text-red-600" />,
      description: t('quickStart.trackInventory.description'),
      color: 'red',
      action: () => {
        /* Navigate to inventory management page */
      },
    },
  ];

  return (
    <div className="bg-white p-6 rounded-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        {t('welcome')}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {quickStartGuides.map((guide, index) => (
          <div 
            key={index}
            className="bg-white shadow-md rounded-lg p-6 h-full flex flex-col justify-between transform transition-all duration-300 hover:-translate-y-2 hover:shadow-lg"
          >
            <div>
              {guide.icon}
              <h2 className="text-lg font-semibold my-3">
                {guide.title}
              </h2>
              <p className="text-gray-600 text-sm">
                {guide.description}
              </p>
            </div>
            <button 
              onClick={guide.action}
              className={`mt-4 px-4 py-2 rounded-md text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                guide.color === 'indigo' 
                  ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500' 
                  : guide.color === 'purple'
                  ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                  : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              }`}
            >
              Get Started
            </button>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">
        Key Performance Indicators
      </h2>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center mb-3">
              <ArrowTrendingUpIcon className="w-8 h-8 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold">
                Revenue Growth Rate
              </h3>
            </div>
            <p className="text-3xl font-bold mb-3">
              8.5%
            </p>
            <p className="text-gray-600 text-sm">
              Your revenue is growing steadily. Keep up the good work!
            </p>
          </div>
          <div>
            {/* You can add another KPI here or a mini chart */}
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          /* Navigate to full KPI dashboard */
        }}
        className="px-6 py-2.5 rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 font-medium"
      >
        View Full KPI Dashboard
      </button>
    </div>
  );
};

export default DashboardPage;
