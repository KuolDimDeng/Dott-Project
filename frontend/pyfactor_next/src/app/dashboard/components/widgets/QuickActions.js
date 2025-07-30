'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  PlusCircleIcon,
  DocumentTextIcon,
  UserPlusIcon,
  CubeIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';

export default function QuickActions({ userRole }) {
  const router = useRouter();
  const { t } = useTranslation('dashboard');

  const actions = [
    {
      label: t('quickActions.createInvoice'),
      icon: DocumentTextIcon,
      onClick: () => router.push('/dashboard/invoices/new'),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      label: t('quickActions.addCustomer'),
      icon: UserPlusIcon,
      onClick: () => router.push('/dashboard/customers/new'),
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      label: t('quickActions.addProduct'),
      icon: CubeIcon,
      onClick: () => router.push('/dashboard/products/new'),
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      label: t('quickActions.recordSale'),
      icon: CurrencyDollarIcon,
      onClick: () => router.push('/dashboard/sales/new'),
      color: 'bg-yellow-500 hover:bg-yellow-600'
    }
  ];

  // Add admin-specific actions
  if (userRole === 'OWNER' || userRole === 'ADMIN') {
    actions.push({
      label: t('quickActions.viewReports'),
      icon: DocumentChartBarIcon,
      onClick: () => router.push('/dashboard/reports'),
      color: 'bg-indigo-500 hover:bg-indigo-600'
    });
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t('quickActions.title')}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`${action.color} text-white rounded-lg p-4 flex flex-col items-center justify-center transition-colors duration-200`}
          >
            <action.icon className="h-8 w-8 mb-2" />
            <span className="text-sm font-medium text-center">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}