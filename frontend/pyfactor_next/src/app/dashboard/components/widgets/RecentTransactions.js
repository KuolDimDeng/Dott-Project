'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/utils/formatters';

export default function RecentTransactions({ transactions = [], limit = 5 }) {
  const { t } = useTranslation('dashboard');
  const router = useRouter();

  const displayTransactions = transactions.slice(0, limit);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionType = (type) => {
    switch (type) {
      case 'invoice':
        return t('widgets.invoice');
      case 'payment':
        return t('widgets.payment');
      case 'expense':
        return t('widgets.expense');
      default:
        return type;
    }
  };

  if (!transactions.length) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('recentActivity.title')}
        </h2>
        <div className="text-center py-8">
          <p className="text-gray-500">{t('empty.noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('recentActivity.title')}
        </h2>
        <button
          onClick={() => router.push('/dashboard/transactions')}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {t('recentActivity.viewAll')}
        </button>
      </div>

      <div className="space-y-3">
        {displayTransactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
            onClick={() => router.push(`/dashboard/transactions/${transaction.id}`)}
          >
            <div className="flex-1">
              <div className="flex items-center">
                <p className="font-medium text-gray-900">
                  {transaction.customer_name || transaction.vendor_name || 'Unknown'}
                </p>
                <span className="ml-2 text-xs text-gray-500">
                  {getTransactionType(transaction.type)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {transaction.description || `${getTransactionType(transaction.type)} #${transaction.number}`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(transaction.date)}
              </p>
            </div>

            <div className="text-right ml-4">
              <p className="font-semibold text-gray-900">
                {formatCurrency(transaction.amount, transaction.currency)}
              </p>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                {transaction.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}