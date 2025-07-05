'use client';

import React, { useState, useEffect } from 'react';

const Deposit = ({ deposit, userData }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [depositAccounts, setDepositAccounts] = useState([]);
  
  const [newAccount, setNewAccount] = useState({
    accountType: 'Checking',
    routingNumber: '',
    accountNumber: '',
    confirmAccountNumber: '',
    depositAmount: 'Remainder',
    depositPercent: 100,
    depositFixedAmount: 0,
    isPrimary: false
  });
  
  const [errors, setErrors] = useState({});
  
  // Load initial data
  useEffect(() => {
    if (deposit) {
      // In a real app, we would fetch multiple accounts from the API
      // For this demo, we'll create mock data based on the single deposit object provided
      setDepositAccounts([
        {
          id: '1',
          accountType: deposit.accountType || 'Checking',
          bankName: deposit.bankName || 'First National Bank',
          routingNumberMasked: '****' + (deposit.routingLastFour || '9876'),
          accountNumberMasked: '****' + (deposit.accountLastFour || '4321'),
          depositAmount: 'Remainder',
          depositPercent: 100,
          depositFixedAmount: 0,
          isPrimary: true,
          active: true
        }
      ]);
    }
  }, [deposit]);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setNewAccount(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  const handleDepositTypeChange = (type) => {
    setNewAccount(prev => {
      // Reset values based on deposit type
      if (type === 'Remainder') {
        return {
          ...prev,
          depositAmount: 'Remainder',
          depositPercent: 100,
          depositFixedAmount: 0
        };
      } else if (type === 'Percent') {
        return {
          ...prev,
          depositAmount: 'Percent',
          depositFixedAmount: 0
        };
      } else {
        return {
          ...prev,
          depositAmount: 'Fixed',
          depositPercent: 0
        };
      }
    });
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!newAccount.routingNumber || newAccount.routingNumber.length !== 9) {
      newErrors.routingNumber = 'Valid 9-digit routing number is required';
    }
    
    if (!newAccount.accountNumber || newAccount.accountNumber.length < 4) {
      newErrors.accountNumber = 'Valid account number is required';
    }
    
    if (newAccount.accountNumber !== newAccount.confirmAccountNumber) {
      newErrors.confirmAccountNumber = 'Account numbers do not match';
    }
    
    if (newAccount.depositAmount === 'Fixed' && 
        (!newAccount.depositFixedAmount || newAccount.depositFixedAmount <= 0)) {
      newErrors.depositFixedAmount = 'Please enter a valid amount';
    }
    
    if (newAccount.depositAmount === 'Percent' && 
        (!newAccount.depositPercent || newAccount.depositPercent <= 0 || 
         newAccount.depositPercent > 100)) {
      newErrors.depositPercent = 'Please enter a valid percentage (1-100)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleAddAccount = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    
    try {
      // In a real app, this would be an API call to add a direct deposit account
      console.log('[Deposit] Adding new direct deposit account:', newAccount);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add to local state with masked account numbers (simulating server response)
      const newId = 'account-' + Math.floor(Math.random() * 10000);
      const lastFourRouting = newAccount.routingNumber.slice(-4);
      const lastFourAccount = newAccount.accountNumber.slice(-4);
      
      const mockBankNames = [
        'First National Bank', 
        'Chase Bank', 
        'Bank of America', 
        'Wells Fargo', 
        'Citibank',
        'TD Bank',
        'PNC Bank',
        'Capital One'
      ];
      
      // Randomly select a bank name for demo purposes
      const bankName = mockBankNames[Math.floor(Math.random() * mockBankNames.length)];
      
      const newAccountObj = {
        id: newId,
        accountType: newAccount.accountType,
        bankName: bankName,
        routingNumberMasked: '****' + lastFourRouting,
        accountNumberMasked: '****' + lastFourAccount,
        depositAmount: newAccount.depositAmount,
        depositPercent: newAccount.depositAmount === 'Percent' ? newAccount.depositPercent : 0,
        depositFixedAmount: newAccount.depositAmount === 'Fixed' ? newAccount.depositFixedAmount : 0,
        isPrimary: depositAccounts.length === 0 ? true : newAccount.isPrimary,
        active: true
      };
      
      // If this is set as primary, update other accounts
      let updatedAccounts = [...depositAccounts];
      if (newAccount.isPrimary) {
        updatedAccounts = updatedAccounts.map(account => ({
          ...account,
          isPrimary: false
        }));
      }
      
      setDepositAccounts([...updatedAccounts, newAccountObj]);
      
      // Reset form
      setNewAccount({
        accountType: 'Checking',
        routingNumber: '',
        accountNumber: '',
        confirmAccountNumber: '',
        depositAmount: 'Remainder',
        depositPercent: 100,
        depositFixedAmount: 0,
        isPrimary: false
      });
      
      setShowAddAccount(false);
      alert('Direct deposit account has been added successfully!');
    } catch (error) {
      console.error('[Deposit] Error adding direct deposit account:', error);
      alert('Failed to add direct deposit account. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleMakePrimary = async (accountId) => {
    setLoading(true);
    
    try {
      // In a real app, this would be an API call
      console.log('[Deposit] Setting account as primary:', accountId);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update local state
      const updatedAccounts = depositAccounts.map(account => ({
        ...account,
        isPrimary: account.id === accountId
      }));
      
      setDepositAccounts(updatedAccounts);
    } catch (error) {
      console.error('[Deposit] Error setting primary account:', error);
      alert('Failed to update primary account. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to remove this direct deposit account?')) {
      return;
    }
    
    setLoading(true);
    
    try {
      // In a real app, this would be an API call
      console.log('[Deposit] Removing account:', accountId);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update local state - In a real app, we might want to just mark as inactive
      const updatedAccounts = depositAccounts.filter(account => account.id !== accountId);
      
      // If we removed the primary account and others exist, make the first one primary
      if (depositAccounts.find(a => a.id === accountId)?.isPrimary && updatedAccounts.length > 0) {
        updatedAccounts[0].isPrimary = true;
      }
      
      setDepositAccounts(updatedAccounts);
    } catch (error) {
      console.error('[Deposit] Error removing account:', error);
      alert('Failed to remove account. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDepositAmount = (account) => {
    if (account.depositAmount === 'Remainder') {
      return 'Remainder of Net Pay';
    } else if (account.depositAmount === 'Percent') {
      return `${account.depositPercent}% of Net Pay`;
    } else {
      return `$${account.depositFixedAmount.toFixed(2)}`;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Direct Deposit Accounts
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage where your paycheck is deposited
          </p>
        </div>
        
        <div className="px-6 py-5">
          {depositAccounts.length === 0 ? (
            <div className="text-center py-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No direct deposit accounts</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add a bank account to set up direct deposit.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddAccount(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Account
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Distribution
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {depositAccounts.map(account => (
                      <tr key={account.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {account.bankName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {account.accountNumberMasked}
                              </div>
                            </div>
                            {account.isPrimary && (
                              <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                Primary
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{account.accountType}</div>
                          <div className="text-sm text-gray-500">Routing: {account.routingNumberMasked}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDepositAmount(account)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {!account.isPrimary && (
                            <button
                              onClick={() => handleMakePrimary(account.id)}
                              disabled={loading}
                              className="text-blue-600 hover:text-blue-900 focus:outline-none focus:underline disabled:opacity-50 mr-4"
                            >
                              Make Primary
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveAccount(account.id)}
                            disabled={loading || (account.isPrimary && depositAccounts.length > 1)}
                            className="text-red-600 hover:text-red-900 focus:outline-none focus:underline disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {!showAddAccount && (
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddAccount(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Another Account
                  </button>
                </div>
              )}
            </div>
          )}
          
          {showAddAccount && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <form onSubmit={handleAddAccount}>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Add Direct Deposit Account</h4>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label htmlFor="accountType" className="block text-sm font-medium text-gray-700">
                        Account Type
                      </label>
                      <select
                        id="accountType"
                        name="accountType"
                        value={newAccount.accountType}
                        onChange={handleInputChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="Checking">Checking</option>
                        <option value="Savings">Savings</option>
                      </select>
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="routingNumber" className="block text-sm font-medium text-gray-700">
                        Routing Number
                      </label>
                      <input
                        type="text"
                        name="routingNumber"
                        id="routingNumber"
                        autoComplete="off"
                        value={newAccount.routingNumber}
                        onChange={handleInputChange}
                        className={`mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md ${
                          errors.routingNumber ? 'border-red-300' : ''
                        }`}
                      />
                      {errors.routingNumber && (
                        <p className="mt-2 text-sm text-red-600" id="routingNumber-error">
                          {errors.routingNumber}
                        </p>
                      )}
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
                        Account Number
                      </label>
                      <input
                        type="text"
                        name="accountNumber"
                        id="accountNumber"
                        autoComplete="off"
                        value={newAccount.accountNumber}
                        onChange={handleInputChange}
                        className={`mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md ${
                          errors.accountNumber ? 'border-red-300' : ''
                        }`}
                      />
                      {errors.accountNumber && (
                        <p className="mt-2 text-sm text-red-600" id="accountNumber-error">
                          {errors.accountNumber}
                        </p>
                      )}
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="confirmAccountNumber" className="block text-sm font-medium text-gray-700">
                        Confirm Account Number
                      </label>
                      <input
                        type="text"
                        name="confirmAccountNumber"
                        id="confirmAccountNumber"
                        autoComplete="off"
                        value={newAccount.confirmAccountNumber}
                        onChange={handleInputChange}
                        className={`mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md ${
                          errors.confirmAccountNumber ? 'border-red-300' : ''
                        }`}
                      />
                      {errors.confirmAccountNumber && (
                        <p className="mt-2 text-sm text-red-600" id="confirmAccountNumber-error">
                          {errors.confirmAccountNumber}
                        </p>
                      )}
                    </div>
                    
                    <div className="sm:col-span-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deposit Amount
                      </label>
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <input
                            id="depositAmount-remainder"
                            name="depositAmount"
                            type="radio"
                            checked={newAccount.depositAmount === 'Remainder'}
                            onChange={() => handleDepositTypeChange('Remainder')}
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                          />
                          <label htmlFor="depositAmount-remainder" className="ml-3 block text-sm font-medium text-gray-700">
                            Remainder of Net Pay
                          </label>
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            id="depositAmount-percent"
                            name="depositAmount"
                            type="radio"
                            checked={newAccount.depositAmount === 'Percent'}
                            onChange={() => handleDepositTypeChange('Percent')}
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                          />
                          <label htmlFor="depositAmount-percent" className="ml-3 block text-sm font-medium text-gray-700">
                            Percentage of Net Pay
                          </label>
                          
                          {newAccount.depositAmount === 'Percent' && (
                            <div className="ml-4 relative rounded-md shadow-sm w-32">
                              <input
                                type="number"
                                name="depositPercent"
                                id="depositPercent"
                                min="1"
                                max="100"
                                value={newAccount.depositPercent}
                                onChange={handleInputChange}
                                className={`focus:ring-blue-500 focus:border-blue-500 block w-full pr-8 sm:text-sm border-gray-300 rounded-md ${
                                  errors.depositPercent ? 'border-red-300' : ''
                                }`}
                              />
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">%</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {errors.depositPercent && newAccount.depositAmount === 'Percent' && (
                          <p className="mt-2 text-sm text-red-600 ml-7" id="depositPercent-error">
                            {errors.depositPercent}
                          </p>
                        )}
                        
                        <div className="flex items-center">
                          <input
                            id="depositAmount-fixed"
                            name="depositAmount"
                            type="radio"
                            checked={newAccount.depositAmount === 'Fixed'}
                            onChange={() => handleDepositTypeChange('Fixed')}
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                          />
                          <label htmlFor="depositAmount-fixed" className="ml-3 block text-sm font-medium text-gray-700">
                            Fixed Amount
                          </label>
                          
                          {newAccount.depositAmount === 'Fixed' && (
                            <div className="ml-4 relative rounded-md shadow-sm w-32">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">$</span>
                              </div>
                              <input
                                type="number"
                                name="depositFixedAmount"
                                id="depositFixedAmount"
                                min="0.01"
                                step="0.01"
                                value={newAccount.depositFixedAmount}
                                onChange={handleInputChange}
                                className={`focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 sm:text-sm border-gray-300 rounded-md ${
                                  errors.depositFixedAmount ? 'border-red-300' : ''
                                }`}
                              />
                            </div>
                          )}
                        </div>
                        
                        {errors.depositFixedAmount && newAccount.depositAmount === 'Fixed' && (
                          <p className="mt-2 text-sm text-red-600 ml-7" id="depositFixedAmount-error">
                            {errors.depositFixedAmount}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {depositAccounts.length > 0 && (
                      <div className="sm:col-span-6">
                        <div className="flex items-center">
                          <input
                            id="isPrimary"
                            name="isPrimary"
                            type="checkbox"
                            checked={newAccount.isPrimary}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="isPrimary" className="ml-2 block text-sm text-gray-700">
                            Make this my primary account
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddAccount(false)}
                      className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        saving ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        'Add Account'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Direct Deposit Information
        </h3>
        <div className="space-y-4 text-sm">
          <p>
            Direct deposit is the safest and fastest way to receive your pay. Your pay will be deposited automatically into your bank account(s) on payday.
          </p>
          <p>
            To set up direct deposit, you'll need your bank's routing number and your account number, which can be found on your checks or by contacting your bank.
          </p>
          <p>
            If you add multiple accounts, you can specify how your pay should be distributed:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Remainder: The account receives whatever is left after other distributions</li>
            <li>Percentage: The account receives a percentage of your net pay</li>
            <li>Fixed Amount: The account receives a specific dollar amount</li>
          </ul>
          <p>
            Your primary account will receive any remaining funds after all other distributions have been made.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Deposit; 