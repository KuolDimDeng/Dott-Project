'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentDuplicateIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { CenteredSpinner } from '@components/ui/StandardSpinner';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

const TaxDepositManager = () => {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'current_quarter'
  });

  // Stats
  const [stats, setStats] = useState({
    scheduled: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
    totalDue: 0,
    totalPaid: 0
  });

  useEffect(() => {
    fetchDeposits();
  }, [filters]);

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      let url = '/api/taxes/payroll/deposits/';
      const params = new URLSearchParams();
      
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      
      // Add date range filters
      const dateRange = getDateRange(filters.dateRange);
      if (dateRange.start) {
        params.append('start_date', dateRange.start);
        params.append('end_date', dateRange.end);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch deposits');
      
      const data = await response.json();
      const depositsData = data.results || data;
      setDeposits(depositsData);
      calculateStats(depositsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (depositsData) => {
    const now = new Date();
    const stats = {
      scheduled: 0,
      pending: 0,
      completed: 0,
      overdue: 0,
      totalDue: 0,
      totalPaid: 0
    };

    depositsData.forEach(deposit => {
      stats[deposit.status]++;
      
      if (deposit.status === 'completed') {
        stats.totalPaid += parseFloat(deposit.total_deposit);
      } else {
        stats.totalDue += parseFloat(deposit.total_deposit);
        
        // Check if overdue
        if (isBefore(parseISO(deposit.due_date), now)) {
          stats.overdue++;
        }
      }
    });

    setStats(stats);
  };

  const getDateRange = (rangeType) => {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    
    switch (rangeType) {
      case 'current_quarter':
        const quarterStart = new Date(year, (quarter - 1) * 3, 1);
        const quarterEnd = new Date(year, quarter * 3, 0);
        return {
          start: format(quarterStart, 'yyyy-MM-dd'),
          end: format(quarterEnd, 'yyyy-MM-dd')
        };
      case 'current_year':
        return {
          start: `${year}-01-01`,
          end: `${year}-12-31`
        };
      case 'last_90_days':
        return {
          start: format(addDays(now, -90), 'yyyy-MM-dd'),
          end: format(now, 'yyyy-MM-dd')
        };
      default:
        return { start: null, end: null };
    }
  };

  const createDepositFromPayroll = async (payrollRunId) => {
    setLoading(true);
    try {
      const response = await fetch('/api/taxes/payroll/deposits/create_from_payroll/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ payroll_run_id: payrollRunId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create deposit');
      }
      
      const newDeposit = await response.json();
      setDeposits([newDeposit, ...deposits]);
      setShowCreateDialog(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (depositId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/taxes/payroll/deposits/${depositId}/process_payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ payment_method: 'eftps' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process payment');
      }
      
      const updatedDeposit = await response.json();
      setDeposits(deposits.map(d => d.id === depositId ? updatedDeposit : d));
      setShowPaymentDialog(false);
      setSelectedDeposit(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getStatusClasses = (status, dueDate) => {
    if (status === 'completed') return 'bg-green-100 text-green-800';
    if (status === 'failed') return 'bg-red-100 text-red-800';
    if (status === 'processing') return 'bg-blue-100 text-blue-800';
    
    // Check if overdue
    if (isBefore(parseISO(dueDate), new Date())) {
      return 'bg-red-100 text-red-800';
    }
    
    return 'bg-gray-100 text-gray-800';
  };

  const renderStats = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 truncate">
                Total Due
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {formatCurrency(stats.totalDue)}
              </p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 truncate">
                Total Paid
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {formatCurrency(stats.totalPaid)}
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 truncate">
                Overdue
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {stats.overdue}
              </p>
            </div>
            <div className="relative">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              {stats.overdue > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {stats.overdue}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 truncate">
                Scheduled
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {stats.scheduled}
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderDepositsTable = () => {
    const filteredDeposits = deposits.filter(deposit => {
      if (activeTab === 1) return deposit.status !== 'completed';
      if (activeTab === 2) return deposit.status === 'completed';
      return true;
    });

    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pay Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deposit Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Federal Income
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Social Security
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Medicare
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
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
            {filteredDeposits.map((deposit) => {
              const isOverdue = deposit.status !== 'completed' && 
                               isBefore(parseISO(deposit.due_date), new Date());
              
              return (
                <tr key={deposit.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(parseISO(deposit.pay_date), 'MM/dd/yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(parseISO(deposit.deposit_date), 'MM/dd/yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-900">
                        {format(parseISO(deposit.due_date), 'MM/dd/yyyy')}
                      </span>
                      {isOverdue && (
                        <div className="ml-2 group relative">
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                          <span className="absolute z-10 -top-8 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Overdue
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(deposit.federal_income_tax)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(deposit.social_security_tax)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(deposit.medicare_tax)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(deposit.total_deposit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(deposit.status, deposit.due_date)}`}>
                      {deposit.status_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-2">
                      {deposit.status !== 'completed' && (
                        <button
                          className="text-blue-600 hover:text-blue-900 group relative"
                          onClick={() => {
                            setSelectedDeposit(deposit);
                            setShowPaymentDialog(true);
                          }}
                        >
                          <CreditCardIcon className="h-5 w-5" />
                          <span className="absolute z-10 -top-8 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Make Payment
                          </span>
                        </button>
                      )}
                      {deposit.confirmation_number && (
                        <button className="text-gray-400 hover:text-gray-500 group relative">
                          <DocumentDuplicateIcon className="h-5 w-5" />
                          <span className="absolute z-10 -top-8 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Confirmation: {deposit.confirmation_number}
                          </span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredDeposits.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                  No deposits found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">
          Tax Deposits
        </h1>
        <button
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowCreateDialog(true)}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Deposit
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="text-red-500">×</span>
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {renderStats()}

      {/* Filters */}
      <div className="bg-white overflow-hidden shadow rounded-lg mb-4">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="all">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              >
                <option value="current_quarter">Current Quarter</option>
                <option value="current_year">Current Year</option>
                <option value="last_90_days">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 0
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab(0)}
          >
            All Deposits
          </button>
          <button
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm relative ${
              activeTab === 1
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab(1)}
          >
            Pending
            {stats.scheduled + stats.pending > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {stats.scheduled + stats.pending}
              </span>
            )}
          </button>
          <button
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 2
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab(2)}
          >
            Completed
          </button>
        </nav>
      </div>

      {/* Deposits Table */}
      {loading ? (
        <CenteredSpinner />
      ) : (
        renderDepositsTable()
      )}

      {/* Payment Dialog */}
      {showPaymentDialog && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="absolute inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Process Tax Deposit Payment
                </h3>
                {selectedDeposit && (
                  <div>
                    <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                      You are about to process a federal tax deposit through EFTPS
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Deposit Amount
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(selectedDeposit.total_deposit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Due Date
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {format(parseISO(selectedDeposit.due_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Tax Breakdown:
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Federal Income Tax: {formatCurrency(selectedDeposit.federal_income_tax)}</li>
                        <li>Social Security Tax: {formatCurrency(selectedDeposit.social_security_tax)}</li>
                        <li>Medicare Tax: {formatCurrency(selectedDeposit.medicare_tax)}</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-300"
                  onClick={() => processPayment(selectedDeposit.id)}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Process Payment'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowPaymentDialog(false);
                    setSelectedDeposit(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Deposit Dialog */}
      {showCreateDialog && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="absolute inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Create Tax Deposit
                </h3>
                <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                  Select a payroll run to create a tax deposit
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payroll Run ID
                  </label>
                  <input
                    type="text"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter payroll run ID"
                    onChange={(e) => {
                      // Handle payroll run selection
                    }}
                  />
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    // Create deposit logic
                  }}
                >
                  Create Deposit
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxDepositManager;