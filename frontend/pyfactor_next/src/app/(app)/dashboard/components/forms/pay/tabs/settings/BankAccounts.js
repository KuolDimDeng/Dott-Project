'use client';


import React, { useState, useEffect } from 'react';

/**
 * BankAccounts Component
 * Allows configuration of company bank accounts for payroll processing
 * Used within the PaySettings parent component
 */
const BankAccounts = ({ userData }) => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Default empty account for adding new
  const emptyAccount = {
    id: null,
    name: '',
    accountType: 'checking',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    isPrimary: false,
    dateAdded: new Date().toISOString()
  };
  
  // Load bank accounts data
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          // Sample data - would be fetched from API in production
          const sampleAccounts = [
            { 
              id: 1, 
              name: 'Primary Payroll Account', 
              accountType: 'checking', 
              bankName: 'First National Bank',
              accountNumber: '****1234',
              routingNumber: '****5678',
              isPrimary: true,
              dateAdded: '2022-03-15T00:00:00Z'
            },
            { 
              id: 2, 
              name: 'Benefits Account', 
              accountType: 'savings', 
              bankName: 'Credit Union West',
              accountNumber: '****5678',
              routingNumber: '****9012',
              isPrimary: false,
              dateAdded: '2022-09-22T00:00:00Z'
            }
          ];
          
          setAccounts(sampleAccounts);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('[BankAccounts] Error fetching accounts:', error);
        setLoading(false);
      }
    };
    
    fetchAccounts();
  }, []);
  
  const handleSelectAccount = (account) => {
    setSelectedAccount(account);
    setIsEditing(false);
    setIsAdding(false);
  };
  
  const handleAddAccount = () => {
    setSelectedAccount(emptyAccount);
    setIsAdding(true);
    setIsEditing(false);
  };
  
  const handleEditAccount = () => {
    setIsEditing(true);
    setIsAdding(false);
  };
  
  const handleDeleteAccount = async () => {
    if (!selectedAccount || selectedAccount.isPrimary) return;
    
    if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      setIsSaving(true);
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Remove the account from the list
        setAccounts(accounts.filter(a => a.id !== selectedAccount.id));
        setSelectedAccount(null);
        setIsSaving(false);
        
        // Show success message
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } catch (error) {
        console.error('[BankAccounts] Error deleting account:', error);
        setIsSaving(false);
      }
    }
  };
  
  const handleSaveAccount = async () => {
    setIsSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (isAdding) {
        // Generate a fake ID for the new account
        const newId = Math.max(...accounts.map(a => a.id), 0) + 1;
        const newAccount = { ...selectedAccount, id: newId };
        
        // Add the new account to the list
        setAccounts([...accounts, newAccount]);
        setSelectedAccount(newAccount);
      } else {
        // Update the accounts list with the edited account
        setAccounts(accounts.map(a => a.id === selectedAccount.id ? selectedAccount : a));
      }
      
      setIsSaving(false);
      setIsEditing(false);
      setIsAdding(false);
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('[BankAccounts] Error saving account:', error);
      setIsSaving(false);
    }
  };
  
  const handleCancelEdit = () => {
    if (isAdding) {
      setSelectedAccount(null);
      setIsAdding(false);
    } else {
      // Reset any changes by re-selecting the original account from the list
      const originalAccount = accounts.find(a => a.id === selectedAccount.id);
      setSelectedAccount(originalAccount);
      setIsEditing(false);
    }
  };
  
  const handleInputChange = (field, value) => {
    setSelectedAccount(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Bank Accounts List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Bank Accounts</h3>
          <button
            type="button"
            onClick={handleAddAccount}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Account
          </button>
        </div>
        
        {accounts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No bank accounts configured. Add your first account to set up payroll.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {accounts.map((account) => (
              <li 
                key={account.id}
                className={`px-4 py-4 cursor-pointer hover:bg-gray-50 ${selectedAccount?.id === account.id ? 'bg-blue-50' : ''}`}
                onClick={() => handleSelectAccount(account)}
              >
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{account.name}</p>
                    <p className="text-sm text-gray-500">{account.bankName}</p>
                    <p className="text-sm text-gray-500">Account: {account.accountNumber}</p>
                  </div>
                  {account.isPrimary && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Primary
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Bank Account Details */}
      <div className="md:col-span-2">
        {selectedAccount ? (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {isAdding ? 'Add New Account' : 'Account Details'}
              </h3>
              {!isEditing && !isAdding && (
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={handleEditAccount}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  {!selectedAccount.isPrimary && (
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="px-4 py-5 sm:p-6">
              {saveSuccess && (
                <div className="mb-4 rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        {isAdding ? 'Account added successfully' : 'Account updated successfully'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Name</label>
                  {isEditing || isAdding ? (
                    <input
                      type="text"
                      value={selectedAccount.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{selectedAccount.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Type</label>
                  {isEditing || isAdding ? (
                    <select
                      value={selectedAccount.accountType}
                      onChange={(e) => handleInputChange('accountType', e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="business">Business</option>
                    </select>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900 capitalize">{selectedAccount.accountType}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                  {isEditing || isAdding ? (
                    <input
                      type="text"
                      value={selectedAccount.bankName}
                      onChange={(e) => handleInputChange('bankName', e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{selectedAccount.bankName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Number</label>
                  {isEditing || isAdding ? (
                    <input
                      type="text"
                      value={selectedAccount.accountNumber.replace(/\*/g, '')}
                      onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder={isAdding ? "Enter account number" : "Replace masked account number"}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{selectedAccount.accountNumber}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Routing Number</label>
                  {isEditing || isAdding ? (
                    <input
                      type="text"
                      value={selectedAccount.routingNumber.replace(/\*/g, '')}
                      onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder={isAdding ? "Enter routing number" : "Replace masked routing number"}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{selectedAccount.routingNumber}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date Added</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {isAdding ? 'Will be added today' : new Date(selectedAccount.dateAdded).toLocaleDateString()}
                  </p>
                </div>
                
                {(isEditing || isAdding) && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center">
                      <input
                        id="primary-account"
                        name="primary-account"
                        type="checkbox"
                        checked={selectedAccount.isPrimary}
                        onChange={(e) => handleInputChange('isPrimary', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="primary-account" className="ml-2 block text-sm text-gray-900">
                        Set as primary account
                      </label>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Primary accounts are used for all payroll transactions by default.
                    </p>
                  </div>
                )}
              </div>
              
              {(isEditing || isAdding) && (
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAccount}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : (isAdding ? 'Add Account' : 'Save Changes')}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 flex items-center justify-center text-gray-500">
            Select a bank account to view details or add a new account
          </div>
        )}
      </div>
    </div>
  );
};

export default BankAccounts; 