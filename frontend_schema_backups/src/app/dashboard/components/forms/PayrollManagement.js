'use client';
import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';
import { format, addDays, addWeeks } from 'date-fns';

const PayrollManagement = () => {
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

  useEffect(() => {
    fetchPayPeriods();
    fetchConnectedAccounts();
    fetchEmployees();
    fetchScheduledPayrolls();
  }, []);

  useEffect(() => {
    if (country) {
      // This is just example logic - replace with your actual service type determination
      if (['US', 'CA'].includes(country)) {
        setServiceType('full');
      } else {
        setServiceType('self');
      }
      fetchCurrencyInfo(country);
    }
  }, [country]);

  const fetchScheduledPayrolls = async () => {
    try {
      const response = await axiosInstance.get('/api/payroll/scheduled-runs/');
      setScheduledPayrolls(response.data);
    } catch (error) {
      toast.error('Error fetching scheduled payrolls');
      console.error('Error fetching scheduled payrolls:', error);
    }
  };

  const fetchPayPeriods = async () => {
    try {
      const response = await axiosInstance.get('/api/payroll/pay-periods/');
      setLastPayPeriod(response.data.last_pay_period);
      setNextPayPeriod(response.data.next_pay_period);
    } catch (error) {
      toast.error('Error fetching pay periods');
      console.error('Error fetching pay periods:', error);
    }
  };

  const fetchConnectedAccounts = async () => {
    try {
      const response = await axiosInstance.get('/api/banking/accounts/');
      if (response.data.accounts && Array.isArray(response.data.accounts)) {
        setConnectedAccounts(response.data.accounts);
      } else {
        toast.info('No connected bank accounts found');
        setConnectedAccounts([]);
      }
    } catch (error) {
      toast.error('Error fetching connected accounts');
      console.error('Error fetching connected accounts:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axiosInstance.get('/api/hr/employees/');
      const employeesWithLastPayPeriod = response.data.map((employee) => ({
        ...employee,
        lastPayPeriod: employee.lastPayPeriod || 'N/A',
      }));
      setEmployees(employeesWithLastPayPeriod);
    } catch (error) {
      toast.error('Error fetching employees');
      console.error('Error fetching employees:', error);
    }
  };

  const fetchCurrencyInfo = async (countryCode) => {
    if (!countryCode) return;
    
    try {
      const response = await axiosInstance.get(`/api/taxes/currency-info/${countryCode}/`);
      setCurrencyInfo(response.data);
    } catch (error) {
      console.error('Error fetching currency info:', error);
    }
  };

  const handleRunPayroll = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/api/payroll/calculate/', {
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        accounting_period: accountingPeriod,
        account_id: selectedAccount,
        employee_ids: selectedEmployees,
        pay_period_type: payPeriodType,
        bi_weekly_start_date: biWeeklyStartDate ? format(biWeeklyStartDate, 'yyyy-MM-dd') : null,
      });
      setPayrollSummary(response.data);
      setOpenConfirmDialog(true);
    } catch (error) {
      toast.error(`Error calculating payroll: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmRunPayroll = async () => {
    setLoading(true);
    try {
      await axiosInstance.post('/api/payroll/run/', {
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        accounting_period: accountingPeriod,
        account_id: selectedAccount,
        employee_ids: selectedEmployees,
        pay_period_type: payPeriodType,
        bi_weekly_start_date: biWeeklyStartDate ? format(biWeeklyStartDate, 'yyyy-MM-dd') : null,
      });
      setOpenConfirmDialog(false);
      toast.success('Payroll run successfully');
    } catch (error) {
      toast.error('Error running payroll');
      console.error('Error running payroll:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center mb-2">
        <div className="mr-2 text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Payroll Management</h1>
      </div>
      <p className="text-gray-600 mb-6">Manage payroll and run payrolls for your company.</p>

      {/* Scheduled Payrolls Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Scheduled Payrolls</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scheduledPayrolls.length > 0 ? (
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
                <p className="text-sm text-gray-600">Account Type: {account.type || 'N/A'}</p>
                <div className="mt-3">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-blue-600"
                      checked={selectedAccount === account.account_id}
                      onChange={() => setSelectedAccount(account.account_id)}
                    />
                    <span className="ml-2 text-gray-700">Select for Payroll</span>
                  </label>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No connected bank accounts found</p>
          )}
        </div>
      </div>

      {selectedAccount && (
        <div className="mb-6 text-blue-600">
          <p>
            The selected account (
            {connectedAccounts.find((a) => a.account_id === selectedAccount)?.name}) will be used
            to fund this payroll run.
          </p>
        </div>
      )}

      {/* Country Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
        <select
          className="w-full p-2 border border-gray-300 rounded-md bg-white"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="">Select Country</option>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="UK">United Kingdom</option>
          <option value="AU">Australia</option>
          {/* Add more countries */}
        </select>
      </div>

      {country && country !== 'US' && (
        <div className="mb-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="form-checkbox h-5 w-5 text-blue-600"
              checked={showUsdComparison}
              onChange={(e) => setShowUsdComparison(e.target.checked)}
            />
            <span className="ml-2 text-gray-700">Show USD comparison</span>
          </label>
        </div>
      )}

      {currencyInfo && (
        <div className="mb-4">
          <p className="text-sm">
            Currency: {currencyInfo.symbol} ({currencyInfo.code})
            {showUsdComparison && currencyInfo.code !== 'USD' && (
              <span className="block text-sm text-gray-500">
                Exchange Rate: 1 USD = {currencyInfo.exchangeRate} {currencyInfo.code}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Service Type Alert */}
      {country && serviceType && (
        <div className={`p-4 mb-6 rounded-md ${serviceType === 'full' ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {serviceType === 'full' ? (
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p>
                {serviceType === 'full' 
                  ? "Full-service payroll available - we'll handle tax filing for you" 
                  : "Self-service payroll - we'll provide filing instructions but you'll need to submit taxes manually"
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pay Period Selection */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Select Pay Period</h2>
        <p className="text-sm text-gray-600 mb-4">
          Choose either monthly, bi-weekly, or a custom date range for your pay period. You can
          only select one option.
        </p>
        
        <div className="space-y-2 mb-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio h-5 w-5 text-blue-600"
              checked={payPeriodType === 'monthly'}
              onChange={() => handlePayPeriodTypeChange('monthly')}
            />
            <span className="ml-2 text-gray-700">Monthly</span>
          </label>
          
          <label className="inline-flex items-center block">
            <input
              type="radio"
              className="form-radio h-5 w-5 text-blue-600"
              checked={payPeriodType === 'biweekly'}
              onChange={() => handlePayPeriodTypeChange('biweekly')}
            />
            <span className="ml-2 text-gray-700">Bi-weekly</span>
          </label>
          
          <label className="inline-flex items-center block">
            <input
              type="radio"
              className="form-radio h-5 w-5 text-blue-600"
              checked={payPeriodType === 'custom'}
              onChange={() => handlePayPeriodTypeChange('custom')}
            />
            <span className="ml-2 text-gray-700">Custom Date Range</span>
          </label>
        </div>

        {payPeriodType === 'monthly' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Accounting Period</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md bg-white"
              value={accountingPeriod}
              onChange={handleAccountingPeriodChange}
            >
              <option value="">Select Period</option>
              {getAccountingPeriods().map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>
        )}

        {payPeriodType === 'biweekly' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bi-weekly Start Date</label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={formatDate(biWeeklyStartDate)}
              onChange={(e) => setBiWeeklyStartDate(e.target.value ? new Date(e.target.value) : null)}
            />
          </div>
        )}

        {payPeriodType === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={formatDate(startDate)}
                onChange={(e) => handleDateChange(e, 'start')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={formatDate(endDate)}
                onChange={(e) => handleDateChange(e, 'end')}
              />
            </div>
          </div>
        )}
      </div>

      {/* Employee Summary Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Employee Summary</h2>
        <div className="mb-2">
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
        
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="sr-only">Select</span>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salary
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Pay Period
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.length > 0 ? (
                employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-blue-600"
                        checked={selectedEmployees.includes(employee.id)}
                        onChange={() => handleEmployeeSelection(employee.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {`${employee.first_name} ${employee.last_name}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.department || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.job_title || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.salary ? `$${Number(employee.salary).toFixed(2)}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.lastPayPeriod}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No employees found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="button"
        onClick={handleRunPayroll}
        disabled={
          !selectedAccount ||
          (!accountingPeriod && !biWeeklyStartDate && (!startDate || !endDate)) ||
          loading ||
          selectedEmployees.length === 0
        }
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing
          </div>
        ) : (
          'Run Payroll'
        )}
      </button>

      {/* Confirm Dialog */}
      {openConfirmDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Confirm Payroll Run</h3>
            <div className="mb-6">
              <p className="mb-2">Total Payroll Amount: ${payrollSummary?.total_amount.toFixed(2)}</p>
              <p className="mb-2">Number of Employees: {payrollSummary?.employee_count}</p>
              <p>Pay Period: {payrollSummary?.pay_period}</p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setOpenConfirmDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRunPayroll}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filing Instructions for Self-Service */}
      {payrollSummary && payrollSummary.service_type === 'self' && (
        <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-2">Filing Instructions</h3>
          <p className="mb-4">{payrollSummary.filing_instructions}</p>
          
          {payrollSummary.tax_authority_links && (
            <div>
              <h4 className="font-medium mb-2">Tax Authority Links:</h4>
              <ul className="space-y-2">
                {Object.entries(payrollSummary.tax_authority_links).map(([name, url]) => (
                  <li key={name} className="pl-2 border-l-2 border-blue-500">
                    <p className="font-medium">{name}</p>
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PayrollManagement;