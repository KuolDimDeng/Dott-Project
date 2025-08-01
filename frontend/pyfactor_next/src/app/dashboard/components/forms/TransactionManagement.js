'use client';

import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { 
  CurrencyDollarIcon, 
  ShoppingCartIcon, 
  ArrowPathIcon, 
  PlusCircleIcon, 
  MinusCircleIcon,
  DocumentTextIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TransactionManagement = () => {
  const [tenantId, setTenantId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [transactionType, setTransactionType] = useState('');
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    type: 'sale',
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    tax_amount: '',
    discount_amount: '',
    payment_method: 'cash',
    customer_id: '',
    vendor_id: '',
    account_id: '',
    category: '',
    reference_number: '',
    notes: '',
    items: []
  });

  const [stats, setStats] = useState({
    totalSales: 0,
    totalExpenses: 0,
    totalIncome: 0,
    totalRefunds: 0,
    netAmount: 0
  });

  // Fetch tenant ID on mount
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  const transactionTypes = [
    {
      id: 'sale',
      name: 'Record Sale',
      description: 'Record a sale transaction with automatic inventory and accounting updates',
      icon: <ShoppingCartIcon className="h-12 w-12 text-green-600" />,
      color: 'green',
      accounting: 'Debit: Cash/AR, Credit: Sales Revenue'
    },
    {
      id: 'refund',
      name: 'Process Refund',
      description: 'Process a refund for a previous sale with automatic reversals',
      icon: <ArrowPathIcon className="h-12 w-12 text-red-600" />,
      color: 'red',
      accounting: 'Debit: Sales Returns, Credit: Cash/AR'
    },
    {
      id: 'income',
      name: 'Add Income',
      description: 'Record miscellaneous income not from sales',
      icon: <PlusCircleIcon className="h-12 w-12 text-blue-600" />,
      color: 'blue',
      accounting: 'Debit: Cash/AR, Credit: Other Income'
    },
    {
      id: 'expense',
      name: 'Add Expense',
      description: 'Record business expenses and costs',
      icon: <MinusCircleIcon className="h-12 w-12 text-orange-600" />,
      color: 'orange',
      accounting: 'Debit: Expense Account, Credit: Cash/AP'
    }
  ];

  // Fetch transactions data
  const fetchTransactions = useCallback(async () => {
    logger.debug('[TransactionManagement] Fetching transactions for tenant:', tenantId);
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API endpoint when backend is ready
      // const response = await fetch(`/api/accounting/transactions`);
      // const data = await response.json();
      
      // Mock data for now
      const mockData = [
        {
          id: 1,
          type: 'sale',
          date: '2025-01-27',
          description: 'Product Sale - Widget A',
          amount: 1500.00,
          tax_amount: 120.00,
          total_amount: 1620.00,
          payment_method: 'credit_card',
          customer_name: 'ABC Corp',
          reference_number: 'INV-001',
          status: 'completed'
        },
        {
          id: 2,
          type: 'expense',
          date: '2025-01-26',
          description: 'Office Supplies',
          amount: 250.00,
          tax_amount: 0,
          total_amount: 250.00,
          payment_method: 'cash',
          vendor_name: 'Office Depot',
          reference_number: 'EXP-001',
          status: 'completed'
        },
        {
          id: 3,
          type: 'income',
          date: '2025-01-25',
          description: 'Consulting Services',
          amount: 3000.00,
          tax_amount: 0,
          total_amount: 3000.00,
          payment_method: 'bank_transfer',
          customer_name: 'XYZ Ltd',
          reference_number: 'INC-001',
          status: 'completed'
        },
        {
          id: 4,
          type: 'refund',
          date: '2025-01-24',
          description: 'Return - Widget A (Damaged)',
          amount: -500.00,
          tax_amount: -40.00,
          total_amount: -540.00,
          payment_method: 'credit_card',
          customer_name: 'ABC Corp',
          reference_number: 'REF-001',
          status: 'completed'
        }
      ];

      setTransactions(mockData);
      
      // Calculate stats
      const sales = mockData.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.total_amount, 0);
      const expenses = mockData.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.total_amount, 0);
      const income = mockData.filter(t => t.type === 'income').reduce((sum, t) => sum + t.total_amount, 0);
      const refunds = mockData.filter(t => t.type === 'refund').reduce((sum, t) => sum + Math.abs(t.total_amount), 0);
      
      setStats({
        totalSales: sales,
        totalExpenses: expenses,
        totalIncome: income,
        totalRefunds: refunds,
        netAmount: sales + income - expenses - refunds
      });
      
      logger.info('[TransactionManagement] Transactions loaded successfully');
    } catch (err) {
      logger.error('[TransactionManagement] Error fetching transactions:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTransactionTypeSelect = (type) => {
    setTransactionType(type);
    setFormData(prev => ({
      ...prev,
      type: type
    }));
    setShowTransactionDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      logger.info('[TransactionManagement] Submitting transaction:', formData);
      
      // Validate amount
      if (parseFloat(formData.amount) <= 0) {
        toast.error('Amount must be greater than zero');
        return;
      }
      
      // TODO: Replace with actual API call
      toast.success(`${formData.type.charAt(0).toUpperCase() + formData.type.slice(1)} recorded successfully`);
      
      setShowTransactionDialog(false);
      resetForm();
      fetchTransactions();
    } catch (error) {
      logger.error('[TransactionManagement] Error saving transaction:', error);
      toast.error('Failed to save transaction');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'sale',
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      tax_amount: '',
      discount_amount: '',
      payment_method: 'cash',
      customer_id: '',
      vendor_id: '',
      account_id: '',
      category: '',
      reference_number: '',
      notes: '',
      items: []
    });
    setTransactionType('');
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'sale':
        return <ShoppingCartIcon className="h-5 w-5 text-green-600" />;
      case 'refund':
        return <ArrowPathIcon className="h-5 w-5 text-red-600" />;
      case 'income':
        return <PlusCircleIcon className="h-5 w-5 text-blue-600" />;
      case 'expense':
        return <MinusCircleIcon className="h-5 w-5 text-orange-600" />;
      default:
        return <CurrencyDollarIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'sale':
        return 'text-green-600';
      case 'refund':
        return 'text-red-600';
      case 'income':
        return 'text-blue-600';
      case 'expense':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
        <p className="font-semibold">Error loading transactions</p>
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
            <CalculatorIcon className="h-6 w-6 text-blue-600 mr-2" />
            Transaction Management
          </h1>
          <p className="text-gray-600 text-sm">Record sales, refunds, income, and expenses with automatic accounting entries and financial tracking.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCartIcon className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Sales</dt>
                  <dd className="text-lg font-semibold text-gray-900">{formatCurrency(stats.totalSales)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MinusCircleIcon className="h-6 w-6 text-orange-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                  <dd className="text-lg font-semibold text-gray-900">{formatCurrency(stats.totalExpenses)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlusCircleIcon className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Other Income</dt>
                  <dd className="text-lg font-semibold text-gray-900">{formatCurrency(stats.totalIncome)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowPathIcon className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Refunds</dt>
                  <dd className="text-lg font-semibold text-gray-900">{formatCurrency(stats.totalRefunds)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Net Amount</dt>
                  <dd className={`text-lg font-semibold ${stats.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(stats.netAmount)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('list')}
              className={`py-2 px-4 text-sm font-medium border-b-2 ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transaction History
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`py-2 px-4 text-sm font-medium border-b-2 ${
                activeTab === 'new'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              New Transaction
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'list' && (
            <div>
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer/Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
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
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getTransactionIcon(transaction.type)}
                            <span className={`ml-2 text-sm font-medium ${getTransactionColor(transaction.type)}`}>
                              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.customer_name || transaction.vendor_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.reference_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={transaction.total_amount >= 0 ? 'text-gray-900' : 'text-red-600'}>
                            {formatCurrency(transaction.total_amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            transaction.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelectedTransaction(transaction)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            View
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            <DocumentTextIcon className="h-5 w-5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'new' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Select Transaction Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {transactionTypes.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => handleTransactionTypeSelect(type.id)}
                    className="relative rounded-lg border-2 border-gray-200 p-6 hover:border-blue-500 cursor-pointer transition-colors"
                  >
                    <div className="text-center">
                      <div className="flex justify-center mb-4">
                        {type.icon}
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{type.name}</h4>
                      <p className="text-sm text-gray-500 mb-2">{type.description}</p>
                      <p className="text-xs text-gray-400 italic">{type.accounting}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Dialog */}
      <Transition appear show={showTransactionDialog} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowTransactionDialog(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="absolute inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="absolute inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 mb-4"
                  >
                    {transactionType && transactionTypes.find(t => t.id === transactionType)?.name}
                  </Dialog.Title>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Date
                          <FieldTooltip text="Transaction date for accounting records" />
                        </label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleInputChange}
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Reference Number
                          <FieldTooltip text="Invoice, receipt, or transaction reference number" />
                        </label>
                        <input
                          type="text"
                          name="reference_number"
                          value={formData.reference_number}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                        <FieldTooltip text="Brief description of the transaction" />
                      </label>
                      <input
                        type="text"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    {(transactionType === 'sale' || transactionType === 'refund' || transactionType === 'income') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Customer
                          <FieldTooltip text="Select the customer for this transaction" />
                        </label>
                        <select
                          name="customer_id"
                          value={formData.customer_id}
                          onChange={handleInputChange}
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="">Select Customer</option>
                          <option value="1">ABC Corp</option>
                          <option value="2">XYZ Ltd</option>
                          <option value="3">Tech Solutions</option>
                        </select>
                      </div>
                    )}

                    {transactionType === 'expense' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Vendor
                          <FieldTooltip text="Select the vendor for this expense" />
                        </label>
                        <select
                          name="vendor_id"
                          value={formData.vendor_id}
                          onChange={handleInputChange}
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="">Select Vendor</option>
                          <option value="1">Office Depot</option>
                          <option value="2">Utility Company</option>
                          <option value="3">Tech Supplies Inc</option>
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Amount
                          <FieldTooltip text="Base amount before tax and discounts" />
                        </label>
                        <input
                          type="number"
                          name="amount"
                          value={formData.amount}
                          onChange={handleInputChange}
                          required
                          step="0.01"
                          min="0.01"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>

                      {(transactionType === 'sale' || transactionType === 'refund') && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Tax Amount
                              <FieldTooltip text="Sales tax amount if applicable" />
                            </label>
                            <input
                              type="number"
                              name="tax_amount"
                              value={formData.tax_amount}
                              onChange={handleInputChange}
                              step="0.01"
                              min="0"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Discount
                              <FieldTooltip text="Discount amount if any" />
                            </label>
                            <input
                              type="number"
                              name="discount_amount"
                              value={formData.discount_amount}
                              onChange={handleInputChange}
                              step="0.01"
                              min="0"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Payment Method
                        <FieldTooltip text="How the payment was made or received" />
                      </label>
                      <select
                        name="payment_method"
                        value={formData.payment_method}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="cash">Cash</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="debit_card">Debit Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="check">Check</option>
                        <option value="mobile_money">Mobile Money</option>
                        <option value="credit">On Credit</option>
                      </select>
                    </div>

                    {transactionType === 'expense' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Expense Category
                          <FieldTooltip text="Category for expense tracking and reporting" />
                        </label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="">Select Category</option>
                          <option value="office_supplies">Office Supplies</option>
                          <option value="utilities">Utilities</option>
                          <option value="rent">Rent</option>
                          <option value="payroll">Payroll</option>
                          <option value="marketing">Marketing</option>
                          <option value="travel">Travel</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Notes
                        <FieldTooltip text="Additional notes or details about this transaction" />
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    {/* Accounting Preview */}
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Accounting Entry Preview</h4>
                      <div className="text-sm text-gray-600">
                        {transactionType === 'sale' && (
                          <>
                            <div>Debit: Cash/Accounts Receivable - ${formData.amount || '0.00'}</div>
                            <div>Credit: Sales Revenue - ${formData.amount || '0.00'}</div>
                            {formData.tax_amount && (
                              <div>Credit: Sales Tax Payable - ${formData.tax_amount}</div>
                            )}
                          </>
                        )}
                        {transactionType === 'refund' && (
                          <>
                            <div>Debit: Sales Returns & Allowances - ${formData.amount || '0.00'}</div>
                            <div>Credit: Cash/Accounts Receivable - ${formData.amount || '0.00'}</div>
                          </>
                        )}
                        {transactionType === 'income' && (
                          <>
                            <div>Debit: Cash/Accounts Receivable - ${formData.amount || '0.00'}</div>
                            <div>Credit: Other Income - ${formData.amount || '0.00'}</div>
                          </>
                        )}
                        {transactionType === 'expense' && (
                          <>
                            <div>Debit: {formData.category || 'Expense'} - ${formData.amount || '0.00'}</div>
                            <div>Credit: Cash/Accounts Payable - ${formData.amount || '0.00'}</div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => { setShowTransactionDialog(false); resetForm(); }}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                      >
                        Record Transaction
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <div className="text-xs text-gray-500 text-center mt-4">
        Debug: Tenant ID: {tenantId} | Component: TransactionManagement
      </div>
    </div>
  );
};

export default TransactionManagement;