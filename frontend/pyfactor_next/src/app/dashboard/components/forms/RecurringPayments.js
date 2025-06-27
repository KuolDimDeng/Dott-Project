'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const RecurringPayments = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [recurringPayments, setRecurringPayments] = useState([]);
  const [stats, setStats] = useState({
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    failedPayments: 0,
    successRate: 0
  });

  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }


  const [tenantId, setTenantId] = useState(null);
  
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  const frequencies = ['all', 'weekly', 'monthly', 'quarterly', 'yearly'];

  // Fetch recurring payments
  const fetchRecurringPayments = useCallback(async () => {
    logger.debug('[RecurringPayments] Fetching recurring payments for tenant:', tenantId);
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API endpoint
      const mockData = [
        {
          id: 1,
          customer: 'ABC Corporation',
          amount: 2500,
          frequency: 'monthly',
          nextPayment: '2025-02-01',
          status: 'active',
          lastPayment: '2025-01-01',
          startDate: '2024-01-01'
        },
        {
          id: 2,
          customer: 'XYZ Limited',
          amount: 5000,
          frequency: 'quarterly',
          nextPayment: '2025-04-01',
          status: 'active',
          lastPayment: '2025-01-01',
          startDate: '2024-01-01'
        },
        {
          id: 3,
          customer: 'Tech Solutions Inc',
          amount: 1000,
          frequency: 'weekly',
          nextPayment: '2025-01-13',
          status: 'paused',
          lastPayment: '2025-01-06',
          startDate: '2024-06-01'
        },
        {
          id: 4,
          customer: 'Global Services LLC',
          amount: 10000,
          frequency: 'yearly',
          nextPayment: '2025-12-01',
          status: 'active',
          lastPayment: '2024-12-01',
          startDate: '2023-12-01'
        }
      ];

      const filteredData = filter === 'all' 
        ? mockData 
        : mockData.filter(p => p.frequency === filter);

      setRecurringPayments(filteredData);

      // Calculate stats
      const active = mockData.filter(p => p.status === 'active').length;
      const monthlyRev = mockData
        .filter(p => p.status === 'active')
        .reduce((sum, p) => {
          const multiplier = {
            weekly: 4,
            monthly: 1,
            quarterly: 0.33,
            yearly: 0.083
          };
          return sum + (p.amount * multiplier[p.frequency]);
        }, 0);

      setStats({
        activeSubscriptions: active,
        monthlyRevenue: Math.round(monthlyRev),
        failedPayments: 2,
        successRate: 95.5
      });

      logger.info('[RecurringPayments] Data loaded successfully');
    } catch (err) {
      logger.error('[RecurringPayments] Error fetching data:', err);
      setError(err.message | 'Failed to load recurring payments');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, filter]);

  useEffect(() => {
    fetchRecurringPayments();
  }, [fetchRecurringPayments]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] | 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p className="font-semibold">Error loading recurring payments</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <ArrowPathIcon className="h-6 w-6 text-blue-600 mr-2" />
            Recurring Payments
          </h1>
          <p className="text-gray-600 text-sm">Manage subscription billing and automated recurring payments for your customers.</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Subscription
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
          <p className="text-2xl font-bold text-gray-900">{stats.activeSubscriptions}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Failed Payments</p>
          <p className="text-2xl font-bold text-red-600">{stats.failedPayments}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Success Rate</p>
          <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-2">
        {frequencies.map((freq) => (
          <button
            key={freq}
            onClick={() => setFilter(freq)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === freq
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {freq.charAt(0).toUpperCase() + freq.slice(1)}
          </button>
        ))}
      </div>

      {/* Recurring Payments Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frequency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Next Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recurringPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {payment.customer}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(payment.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {payment.frequency.charAt(0).toUpperCase() + payment.frequency.slice(1)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(payment.nextPayment).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(payment.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                  <button className="text-gray-600 hover:text-gray-900 mr-3">Edit</button>
                  {payment.status === 'active' ? (
                    <button className="text-yellow-600 hover:text-yellow-900">Pause</button>
                  ) : (
                    <button className="text-green-600 hover:text-green-900">Resume</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Debug: Tenant ID: {tenantId} | Component: RecurringPayments
      </div>
    </div>
  );
};

export default RecurringPayments;
