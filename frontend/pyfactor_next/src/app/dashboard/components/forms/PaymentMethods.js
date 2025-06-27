'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { CreditCardIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

// Tooltip component for field help
const FieldTooltip = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block ml-1">
      <QuestionMarkCircleIcon 
        className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      />
      {isVisible && (
        <div className="absolute z-10 w-64 p-2 text-xs text-white bg-gray-900 rounded-md shadow-lg -top-2 left-6">
          <div className="relative">
            {text}
            <div className="absolute w-2 h-2 bg-gray-900 rotate-45 -left-1 top-2"></div>
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentMethods = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank_account',
    accountNumber: '',
    routingNumber: '',
    bankName: '',
    isDefault: false,
    isActive: true
  });

  const [tenantId, setTenantId] = useState(null);
  
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  // Payment method types
  const methodTypes = [
    { value: 'bank_account', label: 'Bank Account' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'debit_card', label: 'Debit Card' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'stripe', label: 'Stripe' },
    { value: 'square', label: 'Square' },
    { value: 'other', label: 'Other' }
  ];

  // Fetch payment methods
  const fetchPaymentMethods = useCallback(async () => {
    logger.debug('[PaymentMethods] Fetching payment methods for tenant:', tenantId);
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API endpoint
      const mockMethods = [
        {
          id: 1,
          name: 'Main Business Account',
          type: 'bank_account',
          accountNumber: '****1234',
          bankName: 'Chase Bank',
          isDefault: true,
          isActive: true
        },
        {
          id: 2,
          name: 'Company Credit Card',
          type: 'credit_card',
          accountNumber: '****5678',
          bankName: 'American Express',
          isDefault: false,
          isActive: true
        },
        {
          id: 3,
          name: 'PayPal Business',
          type: 'paypal',
          accountNumber: 'business@company.com',
          bankName: 'PayPal',
          isDefault: false,
          isActive: true
        }
      ];

      setPaymentMethods(mockMethods);
      logger.info('[PaymentMethods] Payment methods loaded successfully');
    } catch (err) {
      logger.error('[PaymentMethods] Error fetching payment methods:', err);
      setError(err.message | 'Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);
  
  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddNew = () => {
    setEditingMethod(null);
    setFormData({
      name: '',
      type: 'bank_account',
      accountNumber: '',
      routingNumber: '',
      bankName: '',
      isDefault: false,
      isActive: true
    });
    setShowAddModal(true);
  };

  const handleEdit = (method) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      type: method.type,
      accountNumber: method.accountNumber.replace('****', ''),
      routingNumber: method.routingNumber | '',
      bankName: method.bankName,
      isDefault: method.isDefault,
      isActive: method.isActive
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    logger.debug('[PaymentMethods] Submitting payment method:', formData);

    // Validation
    if (!formData.name) {
      setError('Please enter a name for this payment method');
      return;
    }
    if (!formData.accountNumber) {
      setError('Please enter account details');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const action = editingMethod ? 'updated' : 'added';
      logger.info(`[PaymentMethods] Payment method ${action} successfully`);
      setSuccessMessage(`Payment method ${action} successfully!`);
      setShowAddModal(false);
      fetchPaymentMethods();
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      logger.error('[PaymentMethods] Error saving payment method:', err);
      setError(err.message | 'Failed to save payment method');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (methodId) => {
    if (!window.confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    logger.debug('[PaymentMethods] Deleting payment method:', methodId);
    setIsLoading(true);

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      logger.info('[PaymentMethods] Payment method deleted successfully');
      setSuccessMessage('Payment method deleted successfully!');
      fetchPaymentMethods();
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      logger.error('[PaymentMethods] Error deleting payment method:', err);
      setError(err.message | 'Failed to delete payment method');
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      bank_account: '🏦',
      credit_card: '💳',
      debit_card: '💳',
      paypal: '🅿️',
      stripe: '💵',
      square: '⬛',
      other: '💰'
    };
    return icons[type] | '💰';
  };

  if (isLoading && !showAddModal) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <CreditCardIcon className="h-6 w-6 text-blue-600 mr-2" />
            Payment Methods
          </h1>
          <p className="text-gray-600 text-sm">Manage your business payment methods including bank accounts, credit cards, and digital payment providers.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Payment Method
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          <p className="font-medium">{successMessage}</p>
        </div>
      )}
      
      {error && !showAddModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Payment Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paymentMethods.map((method) => (
          <div key={method.id} className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{getTypeIcon(method.type)}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{method.name}</h3>
                  <p className="text-sm text-gray-500">
                    {methodTypes.find(t => t.value === method.type)?.label | method.type}
                  </p>
                </div>
              </div>
              {method.isDefault && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Default
                </span>
              )}
            </div>
            
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Account:</span> {method.accountNumber}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Bank/Provider:</span> {method.bankName}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Status:</span>{' '}
                <span className={method.isActive ? 'text-green-600' : 'text-red-600'}>
                  {method.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => handleEdit(method)}
                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(method.id)}
                className="text-red-600 hover:text-red-900 text-sm font-medium"
                disabled={method.isDefault}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 py-4">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Method Name <span className="text-red-500">*</span>
                    <FieldTooltip text="Give this payment method a recognizable name like 'Main Business Account' or 'Company Credit Card'." />
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-red-500">*</span>
                    <FieldTooltip text="Select the type of payment method. This determines what information is required and how it can be used." />
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {methodTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.type === 'bank_account' ? 'Account Number' : 'Account/Card Number'} <span className="text-red-500">*</span>
                    <FieldTooltip text="Enter the account or card number. For security, only the last 4 digits will be displayed once saved." />
                  </label>
                  <input
                    type="text"
                    id="accountNumber"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {formData.type === 'bank_account' && (
                  <div>
                    <label htmlFor="routingNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Routing Number
                      <FieldTooltip text="9-digit routing number for your bank. This is required for ACH transfers and direct deposits." />
                    </label>
                    <input
                      type="text"
                      id="routingNumber"
                      name="routingNumber"
                      value={formData.routingNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">
                    Bank/Provider Name
                    <FieldTooltip text="Name of the bank or payment provider (e.g., Chase Bank, PayPal, Stripe) for identification purposes." />
                  </label>
                  <input
                    type="text"
                    id="bankName"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isDefault"
                      checked={formData.isDefault}
                      onChange={handleInputChange}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Set as default</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving...' : (editingMethod ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        Debug: Tenant ID: {tenantId} | Component: PaymentMethods
      </div>
    </div>
  );
};

export default PaymentMethods;
