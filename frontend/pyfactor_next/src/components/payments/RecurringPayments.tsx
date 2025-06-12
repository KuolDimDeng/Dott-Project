'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, CreditCard, DollarSign, RefreshCw, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface RecurringPayment {
  id: string;
  customerName: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextPaymentDate: string;
  status: 'active' | 'paused' | 'cancelled';
  startDate: string;
  endDate?: string;
  lastPaymentDate?: string;
  totalPayments: number;
  failedPayments: number;
}

const RecurringPayments: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('all');

  useEffect(() => {
    fetchRecurringPayments();
  }, []);

  const fetchRecurringPayments = async () => {
    try {
      setLoading(true);
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockData: RecurringPayment[] = [
        {
          id: '1',
          customerName: 'ABC Corporation',
          amount: 2500,
          frequency: 'monthly',
          nextPaymentDate: '2024-02-01',
          status: 'active',
          startDate: '2023-01-01',
          lastPaymentDate: '2024-01-01',
          totalPayments: 12,
          failedPayments: 0
        },
        {
          id: '2',
          customerName: 'XYZ Industries',
          amount: 5000,
          frequency: 'quarterly',
          nextPaymentDate: '2024-04-01',
          status: 'active',
          startDate: '2023-04-01',
          lastPaymentDate: '2024-01-01',
          totalPayments: 4,
          failedPayments: 1
        },
        {
          id: '3',
          customerName: 'Tech Solutions Ltd',
          amount: 1000,
          frequency: 'weekly',
          nextPaymentDate: '2024-01-29',
          status: 'paused',
          startDate: '2023-06-01',
          lastPaymentDate: '2024-01-15',
          totalPayments: 32,
          failedPayments: 2
        },
        {
          id: '4',
          customerName: 'Global Services Inc',
          amount: 10000,
          frequency: 'yearly',
          nextPaymentDate: '2024-12-01',
          status: 'active',
          startDate: '2022-12-01',
          lastPaymentDate: '2023-12-01',
          totalPayments: 2,
          failedPayments: 0
        }
      ];
      
      setRecurringPayments(mockData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch recurring payments');
      console.error('Error fetching recurring payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'paused':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getFrequencyBadge = (frequency: string) => {
    const colors = {
      weekly: 'bg-purple-100 text-purple-800',
      monthly: 'bg-blue-100 text-blue-800',
      quarterly: 'bg-green-100 text-green-800',
      yearly: 'bg-orange-100 text-orange-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[frequency as keyof typeof colors]}`}>
        {frequency}
      </span>
    );
  };

  const filteredPayments = selectedFrequency === 'all' 
    ? recurringPayments 
    : recurringPayments.filter(p => p.frequency === selectedFrequency);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Recurring Payments</h1>
        <p className="text-gray-600">Manage and monitor recurring payment subscriptions</p>
      </div>

      {/* Debug Info */}
      {user && (
        <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-600">
          <p>Tenant ID: {user.tenantId}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">
                {recurringPayments.filter(p => p.status === 'active').length}
              </p>
            </div>
            <RefreshCw className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${recurringPayments
                  .filter(p => p.status === 'active')
                  .reduce((sum, p) => {
                    const multiplier = { weekly: 4, monthly: 1, quarterly: 0.33, yearly: 0.083 };
                    return sum + (p.amount * multiplier[p.frequency]);
                  }, 0)
                  .toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed Payments</p>
              <p className="text-2xl font-bold text-gray-900">
                {recurringPayments.reduce((sum, p) => sum + p.failedPayments, 0)}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {((recurringPayments.reduce((sum, p) => sum + p.totalPayments - p.failedPayments, 0) / 
                  recurringPayments.reduce((sum, p) => sum + p.totalPayments, 0) * 100) || 0).toFixed(1)}%
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Filter by frequency:</label>
        <select
          value={selectedFrequency}
          onChange={(e) => setSelectedFrequency(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Frequencies</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {/* Recurring Payments Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
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
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{payment.customerName}</div>
                    <div className="text-sm text-gray-500">Since {new Date(payment.startDate).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">${payment.amount.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getFrequencyBadge(payment.frequency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                      {new Date(payment.nextPaymentDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(payment.status)}
                      <span className="ml-2 text-sm font-medium text-gray-900 capitalize">{payment.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {payment.totalPayments > 0 
                        ? `${((payment.totalPayments - payment.failedPayments) / payment.totalPayments * 100).toFixed(0)}%`
                        : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {payment.totalPayments - payment.failedPayments}/{payment.totalPayments} successful
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                    {payment.status === 'active' ? (
                      <button className="text-yellow-600 hover:text-yellow-900">Pause</button>
                    ) : payment.status === 'paused' ? (
                      <button className="text-green-600 hover:text-green-900">Resume</button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecurringPayments;