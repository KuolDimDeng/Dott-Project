'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { BanknotesIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

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

const MakePayments = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);
  const [formData, setFormData] = useState({
    vendorId: '',
    billId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    accountNumber: '',
    reference: '',
    notes: ''
  });

  const tenantId = getSecureTenantId();

  // Payment methods
  const paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'check', label: 'Check' },
    { value: 'ach', label: 'ACH Transfer' },
    { value: 'wire', label: 'Wire Transfer' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'cash', label: 'Cash' },
    { value: 'other', label: 'Other' }
  ];

  // Fetch vendors
  const fetchVendors = useCallback(async () => {
    logger.debug('[MakePayments] Fetching vendors for tenant:', tenantId);
    try {
      // TODO: Replace with actual API endpoint
      const mockVendors = [
        { id: 1, name: 'Office Supplies Co.', balance: 2500 },
        { id: 2, name: 'Tech Equipment Ltd.', balance: 5000 },
        { id: 3, name: 'Utility Services', balance: 1200 },
        { id: 4, name: 'Maintenance Services Inc.', balance: 3500 }
      ];
      setVendors(mockVendors);
    } catch (err) {
      logger.error('[MakePayments] Error fetching vendors:', err);
    }
  }, [tenantId]);

  // Fetch unpaid bills for selected vendor
  const fetchBills = useCallback(async (vendorId) => {
    if (!vendorId) {
      setBills([]);
      return;
    }

    logger.debug('[MakePayments] Fetching bills for vendor:', vendorId);
    try {
      // TODO: Replace with actual API endpoint
      const mockBills = [
        { id: 201, number: 'BILL-001', amount: 1500, balance: 1500, dueDate: '2025-01-15' },
        { id: 202, number: 'BILL-002', amount: 750, balance: 750, dueDate: '2025-01-20' },
        { id: 203, number: 'BILL-003', amount: 250, balance: 250, dueDate: '2025-01-10' }
      ];
      setBills(mockBills);
    } catch (err) {
      logger.error('[MakePayments] Error fetching bills:', err);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    if (formData.vendorId) {
      fetchBills(formData.vendorId);
    }
  }, [formData.vendorId, fetchBills]);

  // Update amount when bill is selected
  useEffect(() => {
    if (formData.billId) {
      const bill = bills.find(b => b.id === parseInt(formData.billId));
      if (bill) {
        setFormData(prev => ({ ...prev, amount: bill.balance.toString() }));
      }
    }
  }, [formData.billId, bills]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear messages on input change
    setError(null);
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    logger.debug('[MakePayments] Submitting payment:', formData);
    
    // Validation
    if (!formData.vendorId) {
      setError('Please select a vendor');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!formData.paymentDate) {
      setError('Please select a payment date');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      logger.info('[MakePayments] Payment recorded successfully');
      setSuccessMessage('Payment to vendor recorded successfully!');
      
      // Reset form
      setFormData({
        vendorId: '',
        billId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        accountNumber: '',
        reference: '',
        notes: ''
      });
      setBills([]);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      logger.error('[MakePayments] Error recording payment:', err);
      setError(err.message || 'Failed to record payment');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <BanknotesIcon className="h-6 w-6 text-blue-600 mr-2" />
            Make Payments
          </h1>
          <p className="text-gray-600 text-sm">Record outgoing payments to vendors and suppliers for bills and outstanding balances.</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          <p className="font-medium">{successMessage}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Payment Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vendor Selection */}
              <div>
                <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor <span className="text-red-500">*</span>
                  <FieldTooltip text="Select the vendor or supplier you're making a payment to. Outstanding balances are shown for reference." />
                </label>
                <select
                  id="vendorId"
                  name="vendorId"
                  value={formData.vendorId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a vendor</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name} (Balance: {formatCurrency(vendor.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Bill Selection */}
              <div>
                <label htmlFor="billId" className="block text-sm font-medium text-gray-700 mb-1">
                  Bill (Optional)
                  <FieldTooltip text="Link this payment to a specific vendor bill. If no bill is selected, it will be applied to the vendor's account balance." />
                </label>
                <select
                  id="billId"
                  name="billId"
                  value={formData.billId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.vendorId}
                >
                  <option value="">Select a bill (optional)</option>
                  {bills.map(bill => (
                    <option key={bill.id} value={bill.id}>
                      {bill.number} - {formatCurrency(bill.balance)} (Due: {bill.dueDate})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                  <FieldTooltip text="Enter the payment amount in USD. For partial payments, enter less than the full bill amount." />
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date <span className="text-red-500">*</span>
                  <FieldTooltip text="Date when the payment was made or scheduled. This is used for accounting records and cash flow tracking." />
                </label>
                <input
                  type="date"
                  id="paymentDate"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                  <FieldTooltip text="Choose how you're paying the vendor. Different methods may require additional information like check numbers or wire details." />
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {paymentMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number (for checks) */}
              {formData.paymentMethod === 'check' && (
                <div>
                  <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Check Number
                    <FieldTooltip text="Enter the check number for your records and vendor reconciliation." />
                  </label>
                  <input
                    type="text"
                    id="accountNumber"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Check number"
                  />
                </div>
              )}

              {/* Reference Number */}
              <div>
                <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number
                  <FieldTooltip text="Optional reference like wire transfer confirmation, ACH trace number, or internal transaction ID for your records." />
                </label>
                <input
                  type="text"
                  id="reference"
                  name="reference"
                  value={formData.reference}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Transaction ID, Confirmation #, etc."
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
                <FieldTooltip text="Add any additional information about this payment, such as payment terms, discounts applied, or vendor communications." />
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional payment information..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    vendorId: '',
                    billId: '',
                    amount: '',
                    paymentDate: new Date().toISOString().split('T')[0],
                    paymentMethod: 'bank_transfer',
                    accountNumber: '',
                    reference: '',
                    notes: ''
                  });
                  setBills([]);
                  setError(null);
                  setSuccessMessage('');
                }}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Make Payment'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Quick Payment Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Payment Tips</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Always verify vendor bank details before making payments</li>
          <li>• Keep payment confirmation numbers for your records</li>
          <li>• Schedule recurring payments for regular vendors</li>
          <li>• Review bills carefully before processing payments</li>
        </ul>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Debug: Tenant ID: {tenantId} | Component: MakePayments | Last Updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default MakePayments;