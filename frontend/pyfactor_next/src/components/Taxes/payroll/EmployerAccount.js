'use client';

import React, { useState, useEffect } from 'react';
import {
  BuildingLibraryIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
  PlusIcon,
  PencilIcon,
  DocumentCheckIcon,
  XMarkIcon,
  LockClosedIcon,
  CheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { CenteredSpinner } from '@components/ui/StandardSpinner';

const EmployerAccount = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editing, setEditing] = useState(false);
  const [verifyingEIN, setVerifyingEIN] = useState(false);
  const [showStateDialog, setShowStateDialog] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  
  const [account, setAccount] = useState({
    ein: '',
    ein_verified: false,
    eftps_enrolled: false,
    eftps_pin: '',
    state_accounts: {},
    federal_deposit_schedule: 'monthly',
    previous_year_liability: '',
    tax_contact_name: '',
    tax_contact_email: '',
    tax_contact_phone: '',
    has_poa: false,
    poa_firm_name: '',
    poa_caf_number: ''
  });

  const [originalAccount, setOriginalAccount] = useState(null);

  useEffect(() => {
    fetchAccount();
  }, []);

  const fetchAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/taxes/payroll/employer-account/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch account');
      
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        setAccount(data.results[0]);
        setOriginalAccount(data.results[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveAccount = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/taxes/payroll/employer-account/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(account)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save account');
      }
      
      const data = await response.json();
      setAccount(data);
      setOriginalAccount(data);
      setEditing(false);
      setSuccess('Account settings saved successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyEIN = async () => {
    if (!account.ein) return;
    
    setVerifyingEIN(true);
    setError(null);
    
    try {
      const response = await fetch('/api/taxes/payroll/employer-account/verify_ein/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ ein: account.ein })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify EIN');
      }
      
      const data = await response.json();
      if (data.valid) {
        setAccount({ ...account, ein: data.ein, ein_verified: true });
        setSuccess('EIN verified successfully');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifyingEIN(false);
    }
  };

  const handleCancel = () => {
    setAccount(originalAccount);
    setEditing(false);
  };

  const formatEIN = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 9)}`;
    }
    return cleaned;
  };

  const handleEINChange = (e) => {
    const formatted = formatEIN(e.target.value);
    setAccount({ ...account, ein: formatted, ein_verified: false });
  };

  const addStateAccount = () => {
    if (!selectedState) return;
    
    const newStateAccounts = {
      ...account.state_accounts,
      [selectedState]: {
        account_number: '',
        access_code: '',
        enabled: true
      }
    };
    
    setAccount({ ...account, state_accounts: newStateAccounts });
    setSelectedState('');
    setShowStateDialog(false);
  };

  const updateStateAccount = (state, field, value) => {
    const newStateAccounts = {
      ...account.state_accounts,
      [state]: {
        ...account.state_accounts[state],
        [field]: value
      }
    };
    
    setAccount({ ...account, state_accounts: newStateAccounts });
  };

  const removeStateAccount = (state) => {
    const newStateAccounts = { ...account.state_accounts };
    delete newStateAccounts[state];
    setAccount({ ...account, state_accounts: newStateAccounts });
  };

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  if (loading && !account.ein) {
    return <CenteredSpinner />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">
          Employer Tax Account Settings
        </h1>
        <div>
          {editing ? (
            <>
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 mr-2"
                onClick={handleCancel}
              >
                <XMarkIcon className="w-4 h-4 inline mr-1" />
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                onClick={saveAccount}
                disabled={loading}
              >
                <DocumentCheckIcon className="w-4 h-4 inline mr-1" />
                Save Changes
              </button>
            </>
          ) : (
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              onClick={() => setEditing(true)}
            >
              <PencilIcon className="w-4 h-4 inline mr-1" />
              Edit Settings
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{success}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setSuccess(null)}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Federal Tax Information */}
      <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Federal Tax Information
          </h3>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employer Identification Number (EIN)
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                  value={account.ein}
                  onChange={handleEINChange}
                  disabled={!editing}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {account.ein_verified ? (
                    <div className="group relative">
                      <CheckBadgeIcon className="h-5 w-5 text-green-500" />
                      <span className="absolute z-10 -top-8 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        EIN Verified
                      </span>
                    </div>
                  ) : account.ein && editing ? (
                    <button
                      className="text-sm text-blue-600 hover:text-blue-500"
                      onClick={verifyEIN}
                      disabled={verifyingEIN}
                    >
                      {verifyingEIN ? 'Verifying...' : 'Verify'}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Federal Deposit Schedule
              </label>
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                value={account.federal_deposit_schedule}
                onChange={(e) => setAccount({ ...account, federal_deposit_schedule: e.target.value })}
                disabled={!editing}
              >
                <option value="monthly">Monthly</option>
                <option value="semiweekly">Semi-Weekly</option>
                <option value="next_day">Next Day</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Previous Year Tax Liability
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="text"
                  className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                  value={account.previous_year_liability}
                  onChange={(e) => setAccount({ ...account, previous_year_liability: e.target.value })}
                  disabled={!editing}
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">Used to determine deposit schedule</p>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={account.eftps_enrolled}
                  onChange={(e) => setAccount({ ...account, eftps_enrolled: e.target.checked })}
                  disabled={!editing}
                />
                <div className="relative">
                  <div className={`block w-10 h-6 rounded-full ${account.eftps_enrolled ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${account.eftps_enrolled ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <span className="ml-3 text-sm font-medium text-gray-700">EFTPS Enrolled</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* State Tax Accounts */}
      <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              State Tax Accounts
            </h3>
            {editing && (
              <button
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowStateDialog(true)}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add State
              </button>
            )}
          </div>
          
          {Object.keys(account.state_accounts).length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {Object.entries(account.state_accounts).map(([state, data]) => (
                <li key={state} className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {state}
                        </span>
                        {data.enabled ? (
                          <CheckIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <XMarkIcon className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      {editing ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 mt-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Account Number</label>
                            <input
                              type="text"
                              className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                              value={data.account_number || ''}
                              onChange={(e) => updateStateAccount(state, 'account_number', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Access Code</label>
                            <input
                              type="password"
                              className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                              value={data.access_code || ''}
                              onChange={(e) => updateStateAccount(state, 'access_code', e.target.value)}
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                checked={data.enabled}
                                onChange={(e) => updateStateAccount(state, 'enabled', e.target.checked)}
                              />
                              <span className="ml-2 text-sm text-gray-700">Active</span>
                            </label>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Account: {data.account_number ? '****' + data.account_number.slice(-4) : 'Not configured'}
                        </p>
                      )}
                    </div>
                    {editing && (
                      <button
                        className="ml-4 text-gray-400 hover:text-gray-500"
                        onClick={() => removeStateAccount(state)}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              No state tax accounts configured
            </p>
          )}
        </div>
      </div>

      {/* Tax Contact Information */}
      <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Tax Contact Information
          </h3>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                value={account.tax_contact_name}
                onChange={(e) => setAccount({ ...account, tax_contact_name: e.target.value })}
                disabled={!editing}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                value={account.tax_contact_email}
                onChange={(e) => setAccount({ ...account, tax_contact_email: e.target.value })}
                disabled={!editing}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                value={account.tax_contact_phone}
                onChange={(e) => setAccount({ ...account, tax_contact_phone: e.target.value })}
                disabled={!editing}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Power of Attorney */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Power of Attorney
          </h3>
          
          <div className="flex items-center mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={account.has_poa}
                onChange={(e) => setAccount({ ...account, has_poa: e.target.checked })}
                disabled={!editing}
              />
              <div className="relative">
                <div className={`block w-10 h-6 rounded-full ${account.has_poa ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${account.has_poa ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700">Power of Attorney on File</span>
            </label>
          </div>
          
          {account.has_poa && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firm Name
                </label>
                <input
                  type="text"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                  value={account.poa_firm_name}
                  onChange={(e) => setAccount({ ...account, poa_firm_name: e.target.value })}
                  disabled={!editing}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CAF Number
                </label>
                <input
                  type="text"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                  value={account.poa_caf_number}
                  onChange={(e) => setAccount({ ...account, poa_caf_number: e.target.value })}
                  disabled={!editing}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add State Dialog */}
      {showStateDialog && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Add State Tax Account
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select State
                  </label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                  >
                    <option value="">Choose a state</option>
                    {states
                      .filter(state => !account.state_accounts[state])
                      .map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))
                    }
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-300"
                  onClick={addStateAccount}
                  disabled={!selectedState}
                >
                  Add State
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowStateDialog(false)}
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

export default EmployerAccount;