'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPinIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import StandardSpinner from '@components/ui/StandardSpinner';

const StatePayrollManager = () => {
  const [loading, setLoading] = useState(false);
  const [stateAccounts, setStateAccounts] = useState([]);
  const [stateFilings, setStateFilings] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [validationResults, setValidationResults] = useState(null);
  const [processingResult, setProcessingResult] = useState(null);
  const [showWithholdingCalc, setShowWithholdingCalc] = useState(false);
  const [withholdingData, setWithholdingData] = useState({
    employee_id: '',
    gross_pay: '',
    pay_date: new Date().toISOString().split('T')[0],
    state_code: ''
  });

  // State configurations for major states
  const stateConfigs = {
    CA: { name: 'California', hasSUI: true, hasSDI: true, hasPIT: true },
    NY: { name: 'New York', hasSUI: true, hasSDI: true, hasPIT: true },
    TX: { name: 'Texas', hasSUI: true, hasSDI: false, hasPIT: false },
    FL: { name: 'Florida', hasSUI: true, hasSDI: false, hasPIT: false },
    PA: { name: 'Pennsylvania', hasSUI: true, hasSDI: false, hasPIT: true },
    IL: { name: 'Illinois', hasSUI: true, hasSDI: false, hasPIT: true }
  };

  useEffect(() => {
    fetchStateAccounts();
    fetchStateFilings();
  }, []);

  const fetchStateAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/taxes/payroll/state-accounts/active_states/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setStateAccounts(data);
    } catch (error) {
      console.error('Error fetching state accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStateFilings = async () => {
    try {
      const response = await fetch('/api/taxes/payroll/state-filings/by_state/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setStateFilings(data);
    } catch (error) {
      console.error('Error fetching state filings:', error);
    }
  };

  const validateStateAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/taxes/payroll/state/validate-accounts/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setValidationResults(data);
    } catch (error) {
      console.error('Error validating accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPayroll = async (payrollRunId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/taxes/payroll/state/process/${payrollRunId}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setProcessingResult(data);
    } catch (error) {
      console.error('Error processing payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWithholding = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/taxes/payroll/state/withholding/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(withholdingData)
      });
      const data = await response.json();
      // Handle response
    } catch (error) {
      console.error('Error calculating withholding:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactive' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      error: { bg: 'bg-red-100', text: 'text-red-800', label: 'Error' }
    };
    const config = statusConfig[status] || statusConfig.inactive;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading && stateAccounts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <StandardSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <MapPinIcon className="h-6 w-6 text-blue-600 mr-2" />
              State Payroll Tax Management
            </h2>
            <p className="text-gray-600 mt-1">Manage multi-state payroll tax accounts and filings</p>
          </div>
          <button
            onClick={validateStateAccounts}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Validate Accounts
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active States</p>
                <p className="text-2xl font-bold text-gray-900">{stateAccounts.length}</p>
              </div>
              <MapPinIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Filings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stateFilings.filter(f => f.status === 'pending').length}
                </p>
              </div>
              <DocumentTextIcon className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">$0.00</p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Validation Results Alert */}
      {validationResults && (
        <div className={`rounded-lg p-4 ${validationResults.all_valid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {validationResults.all_valid ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${validationResults.all_valid ? 'text-green-800' : 'text-yellow-800'}`}>
                {validationResults.all_valid ? 'All state accounts are valid' : 'Some accounts need attention'}
              </h3>
              {validationResults.invalid_states && validationResults.invalid_states.length > 0 && (
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Invalid states: {validationResults.invalid_states.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* State Accounts Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">State Tax Accounts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Types
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Filing Frequency
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stateAccounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{account.state_code}</div>
                        <div className="text-sm text-gray-500">{stateConfigs[account.state_code]?.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {account.state_employer_account_number || 'Not configured'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-1">
                      {account.has_withholding && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          PIT
                        </span>
                      )}
                      {account.has_unemployment && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          SUI
                        </span>
                      )}
                      {stateConfigs[account.state_code]?.hasSDI && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          SDI
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(account.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {account.filing_frequency || 'Quarterly'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedState(account.state_code)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* State Filings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent State Filings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Form Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stateFilings.map((filing) => (
                <tr key={filing.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {filing.state_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {filing.form_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {filing.period_start} - {filing.period_end}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(filing.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(filing.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      View
                    </button>
                    {filing.pdf_file && (
                      <button className="text-blue-600 hover:text-blue-900">
                        <ArrowDownTrayIcon className="h-4 w-4 inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withholding Calculator Modal */}
      {showWithholdingCalc && (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Calculate State Withholding</h3>
                <button
                  onClick={() => setShowWithholdingCalc(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <select
                  value={withholdingData.state_code}
                  onChange={(e) => setWithholdingData({...withholdingData, state_code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select State</option>
                  {Object.entries(stateConfigs).map(([code, config]) => (
                    <option key={code} value={code}>{code} - {config.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={withholdingData.employee_id}
                  onChange={(e) => setWithholdingData({...withholdingData, employee_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gross Pay
                </label>
                <input
                  type="number"
                  value={withholdingData.gross_pay}
                  onChange={(e) => setWithholdingData({...withholdingData, gross_pay: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pay Date
                </label>
                <input
                  type="date"
                  value={withholdingData.pay_date}
                  onChange={(e) => setWithholdingData({...withholdingData, pay_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowWithholdingCalc(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={calculateWithholding}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Calculate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => setShowWithholdingCalc(true)}
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <DocumentCheckIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default StatePayrollManager;