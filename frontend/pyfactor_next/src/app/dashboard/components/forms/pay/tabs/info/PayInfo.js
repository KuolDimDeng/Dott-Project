'use client';

import React, { useState, useEffect } from 'react';

/**
 * PayInfo Component
 * Displays payment information and options for the employee
 */
const PayInfo = ({ userData }) => {
  const [loading, setLoading] = useState(true);
  const [payInfo, setPayInfo] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editedInfo, setEditedInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  useEffect(() => {
    const fetchPayInfo = async () => {
      setLoading(true);
      
      try {
        // Simulate API call
        setTimeout(() => {
          // Sample payment information
          const samplePayInfo = {
            paymentMethod: 'Direct Deposit',
            bankName: 'First National Bank',
            accountType: 'Checking',
            accountNumber: '**** **** **** 4567',
            routingNumber: '**** ****',
            payFrequency: 'Bi-weekly',
            nextPayDate: '2023-12-15',
            estimatedAmount: 2450.75,
            taxWithholding: {
              federal: 'Single',
              state: 'California',
              allowances: 2,
              additionalWithholding: 50
            },
            directDepositAllocations: [
              {
                id: 1,
                accountName: 'Primary Checking',
                bankName: 'First National Bank',
                accountNumber: '**** **** **** 4567',
                routingNumber: '**** ****',
                amount: '100%'
              }
            ]
          };
          
          setPayInfo(samplePayInfo);
          setEditedInfo(null);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('[PayInfo] Error fetching payment information:', error);
        setLoading(false);
      }
    };
    
    fetchPayInfo();
  }, []);
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const handleEdit = () => {
    setEditedInfo({
      ...payInfo,
      directDepositAllocations: [...payInfo.directDepositAllocations]
    });
    setEditing(true);
  };
  
  const handleCancel = () => {
    setEditing(false);
    setEditedInfo(null);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('taxWithholding.')) {
      const field = name.split('.')[1];
      setEditedInfo({
        ...editedInfo,
        taxWithholding: {
          ...editedInfo.taxWithholding,
          [field]: value
        }
      });
    } else {
      setEditedInfo({
        ...editedInfo,
        [name]: value
      });
    }
  };
  
  const handleAllocationChange = (id, field, value) => {
    const updatedAllocations = editedInfo.directDepositAllocations.map(allocation => {
      if (allocation.id === id) {
        return { ...allocation, [field]: value };
      }
      return allocation;
    });
    
    setEditedInfo({
      ...editedInfo,
      directDepositAllocations: updatedAllocations
    });
  };
  
  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Simulate API call
      setTimeout(() => {
        setPayInfo(editedInfo);
        setEditing(false);
        setSaving(false);
        setSuccessMessage('Payment information updated successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }, 1500);
    } catch (error) {
      console.error('[PayInfo] Error updating payment information:', error);
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">Payment Information</h3>
              <p className="mt-1 text-sm text-gray-500">
                View and update your payment method and settings.
              </p>
            </div>
            {!editing && (
              <div className="mt-4 sm:mt-0">
                <button
                  type="button"
                  onClick={handleEdit}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit Information
                </button>
              </div>
            )}
          </div>
          
          <div className="mt-6 border-t border-gray-200 pt-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Payment Method</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {editing ? (
                    <select
                      name="paymentMethod"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={editedInfo.paymentMethod}
                      onChange={handleInputChange}
                    >
                      <option value="Direct Deposit">Direct Deposit</option>
                      <option value="Check">Paper Check</option>
                    </select>
                  ) : (
                    payInfo.paymentMethod
                  )}
                </dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Pay Frequency</dt>
                <dd className="mt-1 text-sm text-gray-900">{payInfo.payFrequency}</dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Next Pay Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(payInfo.nextPayDate)}</dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Estimated Amount</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatCurrency(payInfo.estimatedAmount)}</dd>
              </div>
            </dl>
          </div>
          
          {payInfo.paymentMethod === 'Direct Deposit' && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900">Direct Deposit Allocations</h4>
              <div className="mt-4 space-y-4">
                {(editing ? editedInfo : payInfo).directDepositAllocations.map((allocation) => (
                  <div key={allocation.id} className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Account Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {editing ? (
                            <input
                              type="text"
                              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              value={allocation.accountName}
                              onChange={(e) => handleAllocationChange(allocation.id, 'accountName', e.target.value)}
                            />
                          ) : (
                            allocation.accountName
                          )}
                        </dd>
                      </div>
                      
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Bank Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {editing ? (
                            <input
                              type="text"
                              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              value={allocation.bankName}
                              onChange={(e) => handleAllocationChange(allocation.id, 'bankName', e.target.value)}
                            />
                          ) : (
                            allocation.bankName
                          )}
                        </dd>
                      </div>
                      
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Account Number</dt>
                        <dd className="mt-1 text-sm text-gray-900">{allocation.accountNumber}</dd>
                      </div>
                      
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Routing Number</dt>
                        <dd className="mt-1 text-sm text-gray-900">{allocation.routingNumber}</dd>
                      </div>
                      
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Allocation</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {editing ? (
                            <input
                              type="text"
                              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              value={allocation.amount}
                              onChange={(e) => handleAllocationChange(allocation.id, 'amount', e.target.value)}
                            />
                          ) : (
                            allocation.amount
                          )}
                        </dd>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                To change your bank account information, please contact HR.
              </p>
            </div>
          )}
          
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900">Tax Withholding</h4>
            <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Federal Filing Status</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {editing ? (
                    <select
                      name="taxWithholding.federal"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={editedInfo.taxWithholding.federal}
                      onChange={handleInputChange}
                    >
                      <option value="Single">Single</option>
                      <option value="Married Filing Jointly">Married Filing Jointly</option>
                      <option value="Married Filing Separately">Married Filing Separately</option>
                      <option value="Head of Household">Head of Household</option>
                    </select>
                  ) : (
                    payInfo.taxWithholding.federal
                  )}
                </dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">State</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {editing ? (
                    <select
                      name="taxWithholding.state"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={editedInfo.taxWithholding.state}
                      onChange={handleInputChange}
                    >
                      <option value="California">California</option>
                      <option value="New York">New York</option>
                      <option value="Texas">Texas</option>
                      <option value="Florida">Florida</option>
                      <option value="Washington">Washington</option>
                    </select>
                  ) : (
                    payInfo.taxWithholding.state
                  )}
                </dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Allowances</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {editing ? (
                    <input
                      type="number"
                      name="taxWithholding.allowances"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={editedInfo.taxWithholding.allowances}
                      onChange={handleInputChange}
                      min="0"
                      max="10"
                    />
                  ) : (
                    payInfo.taxWithholding.allowances
                  )}
                </dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Additional Withholding</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {editing ? (
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        name="taxWithholding.additionalWithholding"
                        className="mt-1 block w-full pl-7 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={editedInfo.taxWithholding.additionalWithholding}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </div>
                  ) : (
                    formatCurrency(payInfo.taxWithholding.additionalWithholding)
                  )}
                </dd>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              For complete tax form changes, please contact HR or submit a new W-4 form.
            </p>
          </div>
          
          {editing && (
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayInfo; 