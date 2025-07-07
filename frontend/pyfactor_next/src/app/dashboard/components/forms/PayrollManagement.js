'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';
import { format, addDays, addWeeks } from 'date-fns';
import { loadStripeScript } from '@/utils/stripeUtils';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import PayrollRunSummary from './PayrollRunSummary';
import PayrollApproval from './PayrollApproval';
import { CenteredSpinner, ButtonSpinner } from '@/components/ui/StandardSpinner';

const PayrollManagement = ({ initialTab = 'run-payroll' }) => {
  // Tab management
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Original state
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [accountingPeriod, setAccountingPeriod] = useState('');
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [payrollSummary, setPayrollSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const toast = useToast();
  const [lastPayPeriod, setLastPayPeriod] = useState(null);
  const [nextPayPeriod, setNextPayPeriod] = useState(null);
  const [payPeriodType, setPayPeriodType] = useState('monthly');
  const [biWeeklyStartDate, setBiWeeklyStartDate] = useState(null);
  const [scheduledPayrolls, setScheduledPayrolls] = useState([]);
  const [country, setCountry] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [showUsdComparison, setShowUsdComparison] = useState(false);
  const [currencyInfo, setCurrencyInfo] = useState(null);
  
  // Payroll Settings state
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const [taxIdInfo, setTaxIdInfo] = useState({
    ein: '',
    stateId: '',
    countrySpecificIds: {}
  });
  const [businessCountry, setBusinessCountry] = useState('');
  const [payrollAdmin, setPayrollAdmin] = useState('');
  
  // Approval flow state
  const [showApproval, setShowApproval] = useState(false);
  const [calculatedPayrollRun, setCalculatedPayrollRun] = useState(null);

  useEffect(() => {
    // Set AWS RDS as the data source
    axiosInstance.defaults.headers.common['X-Data-Source'] = 'AWS_RDS';
    
    // Fetch all necessary data
    fetchBusinessCountry();
    fetchPayPeriods();
    fetchConnectedAccounts();
    fetchEmployees();
    fetchScheduledPayrolls();
  }, []);

  useEffect(() => {
    if (businessCountry) {
      // After country is determined, load country-specific settings
      fetchCurrencyInfo(businessCountry);
      fetchPayrollSettings();
    }
  }, [businessCountry]);

  const fetchBusinessCountry = async () => {
    try {
      // Use AWS RDS-connected endpoint
      const response = await axiosInstance.get('/api/auth/business-attributes/');
      if (response.data && response.data.country) {
        setBusinessCountry(response.data.country);
      } else {
        setBusinessCountry('US'); // Default to US if not set
      }
    } catch (error) {
      console.error('Error fetching business country:', error);
      setBusinessCountry('US'); // Default to US on error
    }
  };

  const fetchPayrollSettings = async () => {
    try {
      // Ensure we're using the AWS RDS data source
      const response = await axiosInstance.get('/api/payroll/settings/');
      
      if (response.data) {
        const settings = response.data;
        
        // Set tax information
        if (settings.taxInfo) {
          setTaxIdInfo(settings.taxInfo);
        }
        
        // Set authorized users
        if (settings.authorizedUsers && Array.isArray(settings.authorizedUsers)) {
          setAuthorizedUsers(settings.authorizedUsers);
        }
        
        // Set payroll admin
        if (settings.payrollAdmin) {
          setPayrollAdmin(settings.payrollAdmin);
        }
        
        // Set pay period type
        if (settings.payPeriodType) {
          setPayPeriodType(settings.payPeriodType);
        }
      }
    } catch (error) {
      console.error('Error fetching payroll settings:', error);
      // Don't show error toast as this might be first-time setup
    }
  };

  const savePayrollSettings = async (settingType) => {
    try {
      setLoading(true);
      let endpoint;
      let data;
      
      switch (settingType) {
        case 'authorization':
          endpoint = '/api/payroll/settings/authorization';
          data = { authorizedUsers, payrollAdmin };
          break;
        case 'tax':
          endpoint = '/api/payroll/settings/tax';
          data = { 
            taxInfo: taxIdInfo,
            businessCountry 
          };
          break;
        case 'schedule':
          endpoint = '/api/payroll/settings/schedule';
          data = { 
            payPeriodType,
            // Add other schedule-related settings
          };
          break;
        default:
          // Save all settings
          endpoint = '/api/payroll/settings/';
          data = {
            authorizedUsers,
            payrollAdmin,
            taxInfo: taxIdInfo,
            businessCountry,
            payPeriodType
          };
      }
      
      // Explicitly set AWS RDS as data source for this request
      const config = {
        headers: {
          'X-Data-Source': 'AWS_RDS'
        }
      };
      
      await axiosInstance.post(endpoint, data, config);
      toast.success(`Payroll ${settingType || 'settings'} saved successfully`);
    } catch (error) {
      toast.error(`Error saving payroll ${settingType || 'settings'}`);
      console.error(`Error saving payroll ${settingType || 'settings'}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledPayrolls = async () => {
    try {
      // Ensure we're using AWS RDS by setting explicit header
      const config = {
        headers: {
          'X-Data-Source': 'AWS_RDS'
        }
      };
      
      const response = await axiosInstance.get('/api/payroll/scheduled-runs/', config);
      // Ensure we're setting an array
      if (response.data && Array.isArray(response.data)) {
        setScheduledPayrolls(response.data);
      } else {
        console.warn('Scheduled payrolls API did not return an array:', response.data);
        setScheduledPayrolls([]);
      }
    } catch (error) {
      toast.error('Error fetching scheduled payrolls from AWS RDS');
      console.error('Error fetching scheduled payrolls:', error);
      // Ensure we set an empty array on error
      setScheduledPayrolls([]);
    }
  };

  const fetchPayPeriods = async () => {
    try {
      // Ensure we're using AWS RDS
      const config = {
        headers: {
          'X-Data-Source': 'AWS_RDS'
        }
      };
      
      const response = await axiosInstance.get('/api/payroll/pay-periods/', config);
      setLastPayPeriod(response.data.last_pay_period);
      setNextPayPeriod(response.data.next_pay_period);
    } catch (error) {
      toast.error('Error fetching pay periods from AWS RDS');
      console.error('Error fetching pay periods:', error);
    }
  };

  const fetchConnectedAccounts = async () => {
    try {
      // Ensure we're using AWS RDS
      const config = {
        headers: {
          'X-Data-Source': 'AWS_RDS'
        }
      };
      
      const response = await axiosInstance.get('/api/banking/accounts/', config);
      if (response.data.accounts && Array.isArray(response.data.accounts)) {
        setConnectedAccounts(response.data.accounts);
      } else {
        toast.info('No connected bank accounts found in AWS RDS');
        setConnectedAccounts([]);
      }
    } catch (error) {
      toast.error('Error fetching connected accounts from AWS RDS');
      console.error('Error fetching connected accounts:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      // Ensure we're using AWS RDS
      const config = {
        headers: {
          'X-Data-Source': 'AWS_RDS'
        }
      };
      
      const response = await axiosInstance.get('/api/hr/employees/', config);
      
      // Ensure response.data is an array before calling map
      if (response.data && Array.isArray(response.data)) {
        const employeesWithLastPayPeriod = response.data.map((employee) => ({
          ...employee,
          lastPayPeriod: employee.lastPayPeriod || 'N/A',
        }));
        setEmployees(employeesWithLastPayPeriod);
        setSelectedEmployees([]);
      } else {
        console.warn('Employees API did not return an array:', response.data);
        setEmployees([]);
        setSelectedEmployees([]);
      }
    } catch (error) {
      toast.error('Error fetching employees from AWS RDS');
      console.error('Error fetching employees:', error);
      // Ensure we set an empty array on error
      setEmployees([]);
      setSelectedEmployees([]);
    }
  };

  const fetchCurrencyInfo = async (countryCode) => {
    if (!countryCode) return;
    
    try {
      // Ensure we're using AWS RDS
      const config = {
        headers: {
          'X-Data-Source': 'AWS_RDS'
        }
      };
      
      const response = await axiosInstance.get(`/api/taxes/currency-info/${countryCode}/`, config);
      setCurrencyInfo(response.data);
    } catch (error) {
      console.error('Error fetching currency info from AWS RDS:', error);
    }
  };

  const handleRunPayroll = async () => {
    setLoading(true);
    try {
      // Ensure we're using AWS RDS
      const config = {
        headers: {
          'X-Data-Source': 'AWS_RDS'
        }
      };
      
      const response = await axiosInstance.post('/api/payroll/calculate/', {
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        accounting_period: accountingPeriod,
        account_id: selectedAccount,
        employee_ids: selectedEmployees,
        pay_period_type: payPeriodType,
        bi_weekly_start_date: biWeeklyStartDate ? format(biWeeklyStartDate, 'yyyy-MM-dd') : null,
      }, config);
      
      // Store the calculated payroll run data
      setCalculatedPayrollRun(response.data);
      setPayrollSummary(response.data);
      setOpenConfirmDialog(true);
    } catch (error) {
      toast.error(`Error calculating payroll from AWS RDS: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmRunPayroll = async () => {
    // Close the confirmation dialog and show the approval screen
    setOpenConfirmDialog(false);
    setShowApproval(true);
  };
  
  const handlePayrollApproval = async (approvalData) => {
    setLoading(true);
    try {
      // First create the payroll run in our system
      const payrollResponse = await axiosInstance.post('/api/payroll/run/', {
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        accounting_period: accountingPeriod,
        account_id: selectedAccount,
        employee_ids: selectedEmployees,
        pay_period_type: payPeriodType,
        bi_weekly_start_date: biWeeklyStartDate ? format(biWeeklyStartDate, 'yyyy-MM-dd') : null,
      });
      
      const payrollRunId = payrollResponse.data.id;
      
      // Approve the payroll with signature
      await axiosInstance.post('/api/payroll/approve/', {
        ...approvalData,
        payroll_run_id: payrollRunId,
      });
      
      // Initiate funding collection
      await axiosInstance.post('/api/payroll/collect-funds/', {
        payroll_run_id: payrollRunId,
      });
      
      setShowApproval(false);
      toast.success('Payroll approved and funding initiated');
      
      // Refresh scheduled payrolls after successful run
      fetchScheduledPayrolls();
      
      // Reset form
      setStartDate(null);
      setEndDate(null);
      setSelectedEmployees([]);
      setSelectAll(false);
      
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Error approving payroll';
      toast.error(errorMessage);
      console.error('Error approving payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const initiateStripePayment = async (payrollRunId) => {
    try {
      // Ensure Stripe script is loaded
      await loadStripeScript();
      
      // Get payment intent from our backend
      const response = await axiosInstance.post('/api/payments/create-payroll-intent', {
        payroll_run_id: payrollRunId,
        account_id: selectedAccount
      });
      
      if (!response.data || !response.data.clientSecret) {
        throw new Error('Failed to create payment intent');
      }
      
      const { clientSecret, stripeAccountId } = response.data;
      
      // Initialize Stripe with our public key
      const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_KEY, {
        stripeAccount: stripeAccountId // Use the connected account ID
      });
      
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/payroll/confirmation`,
        },
        redirect: 'if_required',
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
        // Update the payroll run status
        await axiosInstance.patch(`/api/payroll/run/${payrollRunId}/`, {
          payment_status: paymentIntent.status,
          stripe_payment_id: paymentIntent.id
        });
        
        return true;
      } else {
        throw new Error(`Payment status: ${paymentIntent.status}`);
      }
    } catch (error) {
      console.error('Stripe payment error:', error);
      // Notify backend about payment failure
      if (payrollRunId) {
        try {
          await axiosInstance.patch(`/api/payroll/run/${payrollRunId}/`, {
            payment_status: 'failed',
            payment_error: error.message
          });
        } catch (updateError) {
          console.error('Error updating payment status:', updateError);
        }
      }
      throw error;
    }
  };

  const handleEmployeeSelection = (employeeId) => {
    setSelectedEmployees((prev) => {
      const newSelection = prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId];
      setSelectAll(newSelection.length === employees.length);
      return newSelection;
    });
  };

  const handleDateChange = (e, type) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    if (type === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
    setAccountingPeriod('');
  };

  const handleAccountingPeriodChange = (event) => {
    setAccountingPeriod(event.target.value);
    setStartDate(null);
    setEndDate(null);
  };

  const handleSelectAll = (event) => {
    setSelectAll(event.target.checked);
    if (event.target.checked) {
      setSelectedEmployees(employees.map((emp) => emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handlePayPeriodTypeChange = (value) => {
    setPayPeriodType(value);
    setAccountingPeriod('');
    setStartDate(null);
    setEndDate(null);
    setBiWeeklyStartDate(null);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const getAccountingPeriods = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const periods = [];
    for (let i = 0; i < 12; i++) {
      periods.unshift(`${currentYear}-${String(i + 1).padStart(2, '0')}`);
    }
    return periods;
  };

  // Show approval screen if needed
  if (showApproval && calculatedPayrollRun) {
    return (
      <PayrollApproval
        payrollRun={calculatedPayrollRun}
        onApprove={handlePayrollApproval}
        onCancel={() => {
          setShowApproval(false);
          setCalculatedPayrollRun(null);
        }}
        currency={currencyInfo?.code || 'USD'}
      />
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-6">
        <div className="mr-2 text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Payroll Management</h1>
      </div>
      
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
          <li className="mr-2">
            <button 
              onClick={() => setActiveTab('run-payroll')} 
              className={`inline-block p-4 rounded-t-lg ${activeTab === 'run-payroll' 
                ? 'text-blue-600 border-b-2 border-blue-600 active' 
                : 'border-b-2 border-transparent hover:text-gray-600 hover:border-gray-300'}`}
            >
              Run Payroll
            </button>
          </li>
          <li className="mr-2">
            <button 
              onClick={() => setActiveTab('payroll-settings')} 
              className={`inline-block p-4 rounded-t-lg ${activeTab === 'payroll-settings' 
                ? 'text-blue-600 border-b-2 border-blue-600 active' 
                : 'border-b-2 border-transparent hover:text-gray-600 hover:border-gray-300'}`}
            >
              Payroll Settings
            </button>
          </li>
        </ul>
      </div>

      {/* Tab Content */}
      {activeTab === 'run-payroll' ? (
        <div>
          <p className="text-gray-600 mb-6">Run payroll and manage payments for your employees.</p>
          
          {/* Scheduled Payrolls Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Scheduled Payrolls</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.isArray(scheduledPayrolls) && scheduledPayrolls.length > 0 ? (
                scheduledPayrolls.map((payroll, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="font-semibold">{payroll.name}</h3>
                    <p className="text-sm text-gray-600">Date: {new Date(payroll.date).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-600">Employees: {payroll.employeeCount}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No scheduled payrolls found</p>
              )}
            </div>
          </div>

          {/* Connected Bank Accounts Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Connected Bank Accounts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectedAccounts.length > 0 ? (
                connectedAccounts.map((account) => (
                  <div key={account.account_id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="font-semibold">{account.name}</h3>
                    <p className="text-sm text-gray-600">Balance: ${account.balances?.current?.toFixed(2) || 'N/A'}</p>
                    <p className="text-sm text-gray-600">Account: {account.mask ? `****${account.mask}` : 'N/A'}</p>
                    <div className="mt-2">
                      <button
                        onClick={() => setSelectedAccount(account.account_id)}
                        className={`px-3 py-1 text-xs rounded ${selectedAccount === account.account_id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        {selectedAccount === account.account_id ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-500">No connected bank accounts found. Please connect an account first.</p>
                  <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Connect a Bank Account
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Payroll period selection */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Select Pay Period</h2>
            <div className="grid gap-6 mb-6 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">Pay Period Type</label>
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="monthly"
                      name="payPeriodType"
                      value="monthly"
                      checked={payPeriodType === 'monthly'}
                      onChange={() => handlePayPeriodTypeChange('monthly')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300"
                    />
                    <label htmlFor="monthly" className="ml-2 text-sm font-medium text-gray-900">Monthly</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="biweekly"
                      name="payPeriodType"
                      value="biweekly"
                      checked={payPeriodType === 'biweekly'}
                      onChange={() => handlePayPeriodTypeChange('biweekly')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300"
                    />
                    <label htmlFor="biweekly" className="ml-2 text-sm font-medium text-gray-900">Bi-Weekly</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="custom"
                      name="payPeriodType"
                      value="custom"
                      checked={payPeriodType === 'custom'}
                      onChange={() => handlePayPeriodTypeChange('custom')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300"
                    />
                    <label htmlFor="custom" className="ml-2 text-sm font-medium text-gray-900">Custom Period</label>
                  </div>
                </div>
              </div>

              {payPeriodType === 'monthly' && (
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900">Accounting Period</label>
                  <select
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    value={accountingPeriod}
                    onChange={handleAccountingPeriodChange}
                  >
                    <option value="">Select a period</option>
                    {getAccountingPeriods().map((period) => (
                      <option key={period} value={period}>
                        {period}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {payPeriodType === 'biweekly' && (
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900">Bi-Weekly Start Date</label>
                  <input
                    type="date"
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    value={biWeeklyStartDate ? format(biWeeklyStartDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setBiWeeklyStartDate(e.target.value ? new Date(e.target.value) : null)}
                  />
                  {biWeeklyStartDate && (
                    <p className="mt-2 text-sm text-gray-600">
                      End Date: {format(addDays(biWeeklyStartDate, 13), 'yyyy-MM-dd')}
                    </p>
                  )}
                </div>
              )}

              {payPeriodType === 'custom' && (
                <>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900">Start Date</label>
                    <input
                      type="date"
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => handleDateChange(e, 'start')}
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900">End Date</label>
                    <input
                      type="date"
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => handleDateChange(e, 'end')}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Employee Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Select Employees</h2>
            <div className="mb-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-blue-600"
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
                <span className="ml-2 text-gray-700">Select All</span>
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 border-b text-left">Select</th>
                    <th className="py-2 px-4 border-b text-left">Name</th>
                    <th className="py-2 px-4 border-b text-left">ID</th>
                    <th className="py-2 px-4 border-b text-left">Department</th>
                    <th className="py-2 px-4 border-b text-left">Position</th>
                    <th className="py-2 px-4 border-b text-left">Last Pay Period</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">
                        <input
                          type="checkbox"
                          className="form-checkbox h-5 w-5 text-blue-600"
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={() => handleEmployeeSelection(employee.id)}
                        />
                      </td>
                      <td className="py-2 px-4 border-b">{employee.name}</td>
                      <td className="py-2 px-4 border-b">{employee.employeeId || 'N/A'}</td>
                      <td className="py-2 px-4 border-b">{employee.department || 'N/A'}</td>
                      <td className="py-2 px-4 border-b">{employee.position || 'N/A'}</td>
                      <td className="py-2 px-4 border-b">{employee.lastPayPeriod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculate Payroll Button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={handleRunPayroll}
              disabled={loading || !selectedAccount || selectedEmployees.length === 0 || (!startDate && !endDate && !accountingPeriod && !biWeeklyStartDate)}
              className={`px-6 py-3 rounded-md text-white font-medium ${loading || !selectedAccount || selectedEmployees.length === 0 || (!startDate && !endDate && !accountingPeriod && !biWeeklyStartDate)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {loading ? (
                <>
                  <ButtonSpinner />
                  Processing...
                </>
              ) : (
                'Calculate Payroll'
              )}
            </button>
          </div>

          {/* Payroll Summary Dialog */}
          {openConfirmDialog && payrollSummary && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-screen overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">Payroll Summary</h2>
                <p className="mb-4">Please review the payroll details before confirming:</p>

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Pay Period:</p>
                      <p className="font-medium">
                        {payrollSummary.pay_period_start} to {payrollSummary.pay_period_end}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Employees:</p>
                      <p className="font-medium">{payrollSummary.employee_count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Gross Pay:</p>
                      <p className="font-medium">${payrollSummary.total_gross.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Deductions:</p>
                      <p className="font-medium">${payrollSummary.total_deductions.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Taxes:</p>
                      <p className="font-medium">${payrollSummary.total_taxes.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Net Pay:</p>
                      <p className="font-medium">${payrollSummary.total_net.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-2 px-3 border-b text-left text-xs">Employee</th>
                        <th className="py-2 px-3 border-b text-left text-xs">Gross Pay</th>
                        <th className="py-2 px-3 border-b text-left text-xs">Taxes</th>
                        <th className="py-2 px-3 border-b text-left text-xs">Deductions</th>
                        <th className="py-2 px-3 border-b text-left text-xs">Net Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollSummary.employees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-gray-50">
                          <td className="py-2 px-3 border-b text-sm">{employee.name}</td>
                          <td className="py-2 px-3 border-b text-sm">${employee.gross.toFixed(2)}</td>
                          <td className="py-2 px-3 border-b text-sm">${employee.taxes.toFixed(2)}</td>
                          <td className="py-2 px-3 border-b text-sm">${employee.deductions.toFixed(2)}</td>
                          <td className="py-2 px-3 border-b text-sm">${employee.net.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setOpenConfirmDialog(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRunPayroll}
                    disabled={loading}
                    className={`px-4 py-2 rounded-md text-white ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                  >
                    {loading ? 'Processing...' : 'Confirm Payroll Run'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-6">Configure payroll settings and authorizations.</p>
          
          {/* Payroll Authorizations */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Payroll Authorizations</h2>
            <p className="text-gray-600 mb-4">Designate employees who are authorized to run payroll.</p>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
              <h3 className="font-medium mb-2">Payroll Administrator</h3>
              <p className="text-sm text-gray-600 mb-4">
                The payroll administrator has full access to all payroll functions and can authorize other users.
                By default, only the business owner has this privilege.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Administrator</label>
                <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-md">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Business Owner</p>
                    <p className="text-sm text-gray-600">Owner privileges cannot be revoked</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delegate Administrative Rights</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={payrollAdmin}
                  onChange={(e) => setPayrollAdmin(e.target.value)}
                >
                  <option value="">Select an employee</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>{employee.name}</option>
                  ))}
                </select>
                
                <button 
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => {
                    if (payrollAdmin) {
                      toast.success('Payroll administrator updated successfully');
                      setAuthorizedUsers(prev => {
                        if (!prev.find(user => user.id === payrollAdmin)) {
                          const employee = employees.find(emp => emp.id === payrollAdmin);
                          return [...prev, { 
                            id: employee.id, 
                            name: employee.name, 
                            role: 'Admin', 
                            isAdmin: true 
                          }];
                        }
                        return prev;
                      });
                    } else {
                      toast.error('Please select an employee');
                    }
                  }}
                >
                  Save Administrator
                </button>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="font-medium mb-2">Authorized Payroll Users</h3>
              <p className="text-sm text-gray-600 mb-4">
                These employees can run payroll but cannot change payroll settings.
              </p>
              
              <div className="mb-4">
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => {
                    if (e.target.value) {
                      const employee = employees.find(emp => emp.id === e.target.value);
                      if (employee && !authorizedUsers.find(user => user.id === employee.id)) {
                        setAuthorizedUsers(prev => [...prev, { 
                          id: employee.id, 
                          name: employee.name, 
                          role: 'User', 
                          isAdmin: false 
                        }]);
                        e.target.value = "";
                        toast.success(`${employee.name} added as authorized payroll user`);
                      }
                    }
                  }}
                >
                  <option value="">Add an employee</option>
                  {employees
                    .filter(emp => !authorizedUsers.find(user => user.id === emp.id))
                    .map(employee => (
                      <option key={employee.id} value={employee.id}>{employee.name}</option>
                    ))
                  }
                </select>
              </div>
              
              {authorizedUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 tracking-wider">Name</th>
                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 tracking-wider">Role</th>
                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {authorizedUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="py-2 px-4 whitespace-nowrap">{user.name}</td>
                          <td className="py-2 px-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.isAdmin 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => {
                                setAuthorizedUsers(prev => prev.filter(u => u.id !== user.id));
                                toast.success(`${user.name} removed from authorized users`);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No additional authorized users</p>
              )}
            </div>
          </div>
          
          {/* Tax Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Tax Information</h2>
            <p className="text-gray-600 mb-4">Configure tax IDs and identifiers for payroll processing.</p>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Country
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={businessCountry}
                    onChange={(e) => {
                      setBusinessCountry(e.target.value);
                      // Reset country-specific tax IDs when country changes
                      setTaxIdInfo(prev => ({
                        ...prev,
                        countrySpecificIds: {}
                      }));
                    }}
                  >
                    <option value="">Select Country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="JP">Japan</option>
                    <option value="IN">India</option>
                    <option value="BR">Brazil</option>
                    <option value="ZA">South Africa</option>
                  </select>
                </div>
              </div>
              
              {businessCountry === 'US' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Federal Employer Identification Number (EIN)
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="XX-XXXXXXX"
                      value={taxIdInfo.ein}
                      onChange={(e) => setTaxIdInfo(prev => ({ ...prev, ein: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State Tax ID
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="State Tax ID"
                      value={taxIdInfo.stateId}
                      onChange={(e) => setTaxIdInfo(prev => ({ ...prev, stateId: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              
              {businessCountry === 'CA' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Number (BN)
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Business Number"
                      value={taxIdInfo.countrySpecificIds.bn || ''}
                      onChange={(e) => setTaxIdInfo(prev => ({ 
                        ...prev, 
                        countrySpecificIds: {
                          ...prev.countrySpecificIds,
                          bn: e.target.value
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provincial Tax ID
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Provincial Tax ID"
                      value={taxIdInfo.countrySpecificIds.provincialId || ''}
                      onChange={(e) => setTaxIdInfo(prev => ({ 
                        ...prev, 
                        countrySpecificIds: {
                          ...prev.countrySpecificIds,
                          provincialId: e.target.value
                        }
                      }))}
                    />
                  </div>
                </div>
              )}
              
              {businessCountry === 'GB' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PAYE Reference
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123/AB12345"
                      value={taxIdInfo.countrySpecificIds.payeRef || ''}
                      onChange={(e) => setTaxIdInfo(prev => ({ 
                        ...prev, 
                        countrySpecificIds: {
                          ...prev.countrySpecificIds,
                          payeRef: e.target.value
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accounts Office Reference
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123PX00123456"
                      value={taxIdInfo.countrySpecificIds.aoRef || ''}
                      onChange={(e) => setTaxIdInfo(prev => ({ 
                        ...prev, 
                        countrySpecificIds: {
                          ...prev.countrySpecificIds,
                          aoRef: e.target.value
                        }
                      }))}
                    />
                  </div>
                </div>
              )}
              
              {businessCountry && !['US', 'CA', 'GB'].includes(businessCountry) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Tax ID
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Business Tax ID"
                      value={taxIdInfo.countrySpecificIds.businessTaxId || ''}
                      onChange={(e) => setTaxIdInfo(prev => ({ 
                        ...prev, 
                        countrySpecificIds: {
                          ...prev.countrySpecificIds,
                          businessTaxId: e.target.value
                        }
                      }))}
                    />
                  </div>
                </div>
              )}
              
              <button 
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => {
                  toast.success('Tax information saved successfully');
                }}
              >
                Save Tax Information
              </button>
            </div>
          </div>
          
          {/* Pay Schedule */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Pay Schedule</h2>
            <p className="text-gray-600 mb-4">Configure your default pay schedule and cycle.</p>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Pay Frequency
                  </label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={payPeriodType}
                    onChange={(e) => setPayPeriodType(e.target.value)}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="semimonthly">Semi-Monthly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pay Day
                  </label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {payPeriodType === 'monthly' ? (
                      Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))
                    ) : payPeriodType === 'biweekly' ? (
                      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))
                    ) : (
                      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Settings
                </label>
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autorunPayroll"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autorunPayroll" className="ml-2 block text-sm text-gray-900">
                      Automatically run payroll on schedule (requires admin approval)
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="automaticTaxes"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      defaultChecked
                    />
                    <label htmlFor="automaticTaxes" className="ml-2 block text-sm text-gray-900">
                      Automatically calculate taxes and deductions
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="directDeposit"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      defaultChecked
                    />
                    <label htmlFor="directDeposit" className="ml-2 block text-sm text-gray-900">
                      Use direct deposit for all employees with bank information
                    </label>
                  </div>
                </div>
              </div>
              
              <button 
                className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => {
                  toast.success('Pay schedule saved successfully');
                }}
              >
                Save Pay Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement;