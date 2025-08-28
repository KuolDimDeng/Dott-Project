'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

const MetricCard = ({ title, value, change, changeType, icon: Icon, currency, currencySymbol = '$' }) => {
  const isPositive = changeType === 'increase';
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const changeIcon = isPositive ? ArrowUpIcon : ArrowDownIcon;
  const ChangeIcon = changeIcon;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {currency && currencySymbol}{value?.toLocaleString() || '0'}
          </p>
          {change !== undefined && (
            <div className={`mt-2 flex items-center text-sm ${changeColor}`}>
              <ChangeIcon className="h-4 w-4 mr-1" />
              <span>{Math.abs(change)}%</span>
              <span className="text-gray-600 ml-1">vs last period</span>
            </div>
          )}
        </div>
        <div className="ml-4">
          <div className="p-3 bg-blue-50 rounded-full">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MetricsGrid({ data, currencySymbol = '$' }) {
  const { t } = useTranslation('dashboard');

  const metrics = [
    {
      title: t('widgets.revenue', 'Revenue'),
      value: data?.revenue || data?.totalRevenue || 0,
      change: data?.revenueChange || data?.revenueGrowth,
      changeType: (data?.revenueChange || data?.revenueGrowth) >= 0 ? 'increase' : 'decrease',
      icon: CurrencyDollarIcon,
      currency: true
    },
    {
      title: t('widgets.sales', 'Sales'),
      value: data?.sales || 0,
      change: data?.salesChange,
      changeType: data?.salesChange >= 0 ? 'increase' : 'decrease',
      icon: ShoppingCartIcon,
      currency: false
    },
    {
      title: t('widgets.customers', 'Customers'),
      value: data?.customers || 0,
      change: data?.customersChange,
      changeType: data?.customersChange >= 0 ? 'increase' : 'decrease',
      icon: UserGroupIcon,
      currency: false
    },
    {
      title: t('widgets.profit', 'Profit'),
      value: data?.profit || data?.netProfit || 0,
      change: data?.profitChange || data?.profitMargin,
      changeType: (data?.profitChange || data?.profitMargin) >= 0 ? 'increase' : 'decrease',
      icon: ChartBarIcon,
      currency: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} currencySymbol={currencySymbol} />
      ))}
    </div>
  );
}