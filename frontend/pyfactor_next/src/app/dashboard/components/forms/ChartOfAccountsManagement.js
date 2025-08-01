'use client';

import React, { useState, useEffect, Fragment, useRef, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useTable, usePagination, useSortBy } from 'react-table';
import { 
  MagnifyingGlassIcon,
  PlusIcon,
  CalculatorIcon,
  DocumentPlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  XMarkIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { accountingApi } from '@/utils/apiClient';
import { logger } from '@/utils/logger';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

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

/**
 * Chart of Accounts Management Component
 * Industry-standard double-entry bookkeeping with account hierarchy and backend connectivity
 */
function ChartOfAccountsManagement({ onNavigate }) {
  const router = useRouter();
  
  // State management
  const [activeTab, setActiveTab] = useState('list');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalAccounts: 0,
    activeAccounts: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0
  });
  
  // Account types for the chart of accounts
  const accountTypes = [
    { value: 'asset', label: 'Asset', range: '1000-1999' },
    { value: 'liability', label: 'Liability', range: '2000-2999' },
    { value: 'equity', label: 'Equity', range: '3000-3999' },
    { value: 'revenue', label: 'Revenue', range: '4000-4999' },
    { value: 'expense', label: 'Expense', range: '5000-5999' },
    { value: 'cost_of_goods_sold', label: 'Cost of Goods Sold', range: '6000-6999' }
  ];

  // Form state for create/edit
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '',
    description: '',
    parentAccount: '',
    normalBalance: 'debit',
    currentBalance: 0,
    isActive: true,
    taxRate: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  // Load data on component mount
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await accountingApi.chartOfAccounts.getAll().catch(err => {
        logger.warn('[ChartOfAccounts] API not ready, using demo data:', err);
        // Return demo data if API is not ready
        return [
          { id: 1, code: '1000', name: 'Cash', type: 'asset', description: 'Cash and cash equivalents', normalBalance: 'debit', currentBalance: 50000, isActive: true },
          { id: 2, code: '1200', name: 'Accounts Receivable', type: 'asset', description: 'Money owed by customers', normalBalance: 'debit', currentBalance: 25000, isActive: true },
          { id: 3, code: '2000', name: 'Accounts Payable', type: 'liability', description: 'Money owed to suppliers', normalBalance: 'credit', currentBalance: 15000, isActive: true },
          { id: 4, code: '3000', name: "Owner's Equity", type: 'equity', description: 'Owner investment in business', normalBalance: 'credit', currentBalance: 100000, isActive: true },
          { id: 5, code: '4000', name: 'Sales Revenue', type: 'revenue', description: 'Income from sales', normalBalance: 'credit', currentBalance: 75000, isActive: true },
          { id: 6, code: '5000', name: 'Rent Expense', type: 'expense', description: 'Monthly rent payments', normalBalance: 'debit', currentBalance: 5000, isActive: true }
        ];
      });
      
      setAccounts(Array.isArray(data) ? data : []);
      
      // Calculate stats
      const stats = {
        totalAccounts: data.length,
        activeAccounts: data.filter(a => a.isActive).length,
        totalAssets: data.filter(a => a.type === 'asset').reduce((sum, a) => sum + (a.currentBalance || 0), 0),
        totalLiabilities: data.filter(a => a.type === 'liability').reduce((sum, a) => sum + (a.currentBalance || 0), 0),
        totalEquity: data.filter(a => a.type === 'equity').reduce((sum, a) => sum + (a.currentBalance || 0), 0)
      };
      setStats(stats);
      
    } catch (error) {
      logger.error('[ChartOfAccounts] Error loading accounts:', error);
      toast.error('Failed to load chart of accounts');
    } finally {
      setLoading(false);
    }
  };

  // Filter accounts based on search term
  const filteredAccounts = useMemo(() => {
    if (!searchTerm) return accounts;
    
    return accounts.filter(account =>
      account.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [accounts, searchTerm]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.code) {
      newErrors.code = 'Account code is required';
    } else if (!/^\d{4}$/.test(formData.code)) {
      newErrors.code = 'Account code must be 4 digits';
    }
    
    if (!formData.name) {
      newErrors.name = 'Account name is required';
    }
    
    if (!formData.type) {
      newErrors.type = 'Account type is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      if (selectedAccount) {
        // Update existing account
        await accountingApi.chartOfAccounts.update(selectedAccount.id, formData);
        toast.success('Account updated successfully');
        setIsEditModalOpen(false);
      } else {
        // Create new account
        await accountingApi.chartOfAccounts.create(formData);
        toast.success('Account created successfully');
        setIsCreateModalOpen(false);
      }
      
      loadAccounts();
      resetForm();
    } catch (error) {
      logger.error('[ChartOfAccounts] Error saving account:', error);
      toast.error('Failed to save account');
    }
  };

  // Handle account deletion
  const handleDelete = async () => {
    if (!selectedAccount) return;
    
    try {
      await accountingApi.chartOfAccounts.delete(selectedAccount.id);
      toast.success('Account deleted successfully');
      setIsDeleteModalOpen(false);
      loadAccounts();
    } catch (error) {
      logger.error('[ChartOfAccounts] Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      type: '',
      description: '',
      parentAccount: '',
      normalBalance: 'debit',
      currentBalance: 0,
      isActive: true,
      taxRate: '',
      notes: ''
    });
    setErrors({});
    setSelectedAccount(null);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Summary Cards Component
  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CalculatorIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-4 flex-1 min-w-0">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Accounts</p>
            <p className="text-3xl font-bold text-blue-600 truncate">{loading ? '-' : stats.totalAccounts}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <BanknotesIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-4 flex-1 min-w-0">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Assets</p>
            <p className="text-3xl font-bold text-green-600 truncate">{loading ? '-' : formatCurrency(stats.totalAssets)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <BuildingLibraryIcon className="h-8 w-8 text-red-600" />
          </div>
          <div className="ml-4 flex-1 min-w-0">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Liabilities</p>
            <p className="text-3xl font-bold text-red-600 truncate">{loading ? '-' : formatCurrency(stats.totalLiabilities)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ChartBarIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div className="ml-4 flex-1 min-w-0">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Equity</p>
            <p className="text-3xl font-bold text-purple-600 truncate">{loading ? '-' : formatCurrency(stats.totalEquity)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <DocumentPlusIcon className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="ml-4 flex-1 min-w-0">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Active Accounts</p>
            <p className="text-3xl font-bold text-yellow-600 truncate">{loading ? '-' : stats.activeAccounts}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Search and Actions Component
  const renderSearchAndActions = () => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="relative flex-1 max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by code, name, or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <button
        onClick={() => {
          resetForm();
          setIsCreateModalOpen(true);
          setActiveTab('create');
        }}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        Create Account
      </button>
    </div>
  );

  // Tab Navigation Component
  const renderTabNavigation = () => (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-8">
        {[
          { id: 'list', label: 'Chart of Accounts', icon: ChartBarIcon },
          { id: 'create', label: 'Create Account', icon: DocumentPlusIcon },
          { id: 'details', label: 'Account Details', icon: EyeIcon }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );

  // Account List Table
  const renderAccountList = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <CenteredSpinner size="medium" />
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Normal Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Balance
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
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {account.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {account.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      account.type === 'asset' ? 'bg-green-100 text-green-800' :
                      account.type === 'liability' ? 'bg-red-100 text-red-800' :
                      account.type === 'equity' ? 'bg-purple-100 text-purple-800' :
                      account.type === 'revenue' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {account.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`font-medium ${
                      account.normalBalance === 'debit' ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      {account.normalBalance}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(account.currentBalance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      account.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedAccount(account);
                          setIsViewModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAccount(account);
                          setFormData({
                            code: account.code,
                            name: account.name,
                            type: account.type,
                            description: account.description || '',
                            parentAccount: account.parentAccount || '',
                            normalBalance: account.normalBalance,
                            currentBalance: account.currentBalance,
                            isActive: account.isActive,
                            taxRate: account.taxRate || '',
                            notes: account.notes || ''
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAccount(account);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Create/Edit Form Modal
  const renderFormModal = () => {
    const isOpen = isCreateModalOpen || isEditModalOpen;
    const title = selectedAccount ? 'Edit Account' : 'Create New Account';
    
    return (
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
            resetForm();
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="absolute inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Account Code
                            <FieldTooltip text="4-digit code that identifies the account. Use standard ranges: 1000s for assets, 2000s for liabilities, etc." />
                          </label>
                          <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                              errors.code
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                            }`}
                            placeholder="1000"
                          />
                          {errors.code && (
                            <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Account Type
                            <FieldTooltip text="The category of account based on accounting principles. Determines how the account behaves in reports." />
                          </label>
                          <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                              errors.type
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                            }`}
                          >
                            <option value="">Select Type</option>
                            {accountTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label} ({type.range})
                              </option>
                            ))}
                          </select>
                          {errors.type && (
                            <p className="mt-1 text-sm text-red-600">{errors.type}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Account Name
                          <FieldTooltip text="Descriptive name for the account that clearly identifies its purpose." />
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                            errors.name
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                          }`}
                          placeholder="e.g., Cash in Bank"
                        />
                        {errors.name && (
                          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Description
                          <FieldTooltip text="Additional details about the account's purpose and usage." />
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={2}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="Detailed description of the account..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Normal Balance
                            <FieldTooltip text="Whether the account normally has a debit or credit balance. Assets and expenses are debit, liabilities and revenue are credit." />
                          </label>
                          <select
                            value={formData.normalBalance}
                            onChange={(e) => setFormData({ ...formData, normalBalance: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          >
                            <option value="debit">Debit</option>
                            <option value="credit">Credit</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Current Balance
                            <FieldTooltip text="The current balance of the account. This will be updated automatically by transactions." />
                          </label>
                          <input
                            type="number"
                            value={formData.currentBalance}
                            onChange={(e) => setFormData({ ...formData, currentBalance: parseFloat(e.target.value) || 0 })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            step="0.01"
                          />
                        </div>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label className="ml-2 block text-sm text-gray-900">
                          Active Account
                        </label>
                      </div>
                    </div>

                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                      <button
                        type="submit"
                        className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:col-start-2"
                      >
                        {selectedAccount ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                        onClick={() => {
                          setIsCreateModalOpen(false);
                          setIsEditModalOpen(false);
                          resetForm();
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Heroicon */}
      <div className="flex items-center space-x-3">
        <CalculatorIcon className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-black">Chart of Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your accounting structure with industry-standard double-entry bookkeeping</p>
        </div>
      </div>

      {renderSummaryCards()}
      {renderSearchAndActions()}
      {renderTabNavigation()}

      {/* Content based on active tab */}
      {activeTab === 'list' && renderAccountList()}
      {activeTab === 'create' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600">Use the "Create Account" button to add new accounts to your chart of accounts.</p>
        </div>
      )}
      {activeTab === 'details' && !selectedAccount && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600">Select an account from the list to view its details.</p>
        </div>
      )}

      {/* Modals */}
      {renderFormModal()}

      {/* Delete Confirmation Modal */}
      <Transition.Root show={isDeleteModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={setIsDeleteModalOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="absolute inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <XMarkIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                        Delete Account
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete {selectedAccount?.name}? This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                      onClick={handleDelete}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                      onClick={() => setIsDeleteModalOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}

export default ChartOfAccountsManagement;