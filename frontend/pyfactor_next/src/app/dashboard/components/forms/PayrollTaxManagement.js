'use client';

import React, { useState, useEffect } from 'react';
import { taxesApi } from '@/services/api/taxes';
import { toast } from 'react-hot-toast';

const PayrollTaxManagement = () => {
  const [loading, setLoading] = useState(true);
  const [payrollTaxes, setPayrollTaxes] = useState({
    currentPeriod: {
      federalIncome: 0,
      socialSecurity: 0,
      medicare: 0,
      stateIncome: 0,
      federalUnemployment: 0,
      stateUnemployment: 0
    },
    yearToDate: {
      federalIncome: 0,
      socialSecurity: 0,
      medicare: 0,
      stateIncome: 0,
      federalUnemployment: 0,
      stateUnemployment: 0
    }
  });
  const [taxDeposits, setTaxDeposits] = useState([]);
  const [filingSchedule, setFilingSchedule] = useState('monthly');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [newDeposit, setNewDeposit] = useState({
    deposit_date: '',
    tax_period: '',
    federal_amount: '',
    state_amount: '',
    confirmation_number: ''
  });

  useEffect(() => {
    fetchPayrollTaxData();
  }, []);

  const fetchPayrollTaxData = async () => {
    try {
      setLoading(true);
      
      // Fetch payroll tax summary
      const summaryResponse = await taxesApi.payrollTax.getSummary();
      if (summaryResponse.data) {
        setPayrollTaxes(summaryResponse.data);
      }
      
      // Fetch tax deposits
      const depositsResponse = await taxesApi.payrollTax.getDeposits();
      if (depositsResponse.data) {
        setTaxDeposits(depositsResponse.data);
      }
      
      // Fetch filing schedule
      const scheduleResponse = await taxesApi.payrollTax.getFilingSchedule();
      if (scheduleResponse.data) {
        setFilingSchedule(scheduleResponse.data.schedule);
      }
    } catch (error) {
      console.error('Error fetching payroll tax data:', error);
      toast.error('Failed to load payroll tax data');
    } finally {
      setLoading(false);
    }
  };

  const handleMakeDeposit = async () => {
    try {
      await taxesApi.payrollTax.makeDeposit(newDeposit);
      toast.success('Tax deposit recorded successfully');
      setShowDepositModal(false);
      setNewDeposit({
        deposit_date: '',
        tax_period: '',
        federal_amount: '',
        state_amount: '',
        confirmation_number: ''
      });
      fetchPayrollTaxData();
    } catch (error) {
      console.error('Error recording tax deposit:', error);
      toast.error('Failed to record tax deposit');
    }
  };

  const calculateTotalTaxes = (period) => {
    const taxes = payrollTaxes[period];
    return Object.values(taxes).reduce((sum, amount) => sum + amount, 0);
  };

  const getNextDepositDue = () => {
    const today = new Date();
    const currentDate = today.getDate();
    
    if (filingSchedule === 'monthly') {
      // Monthly deposits due by 15th of following month
      if (currentDate <= 15) {
        return new Date(today.getFullYear(), today.getMonth(), 15);
      } else {
        return new Date(today.getFullYear(), today.getMonth() + 1, 15);
      }
    } else if (filingSchedule === 'semiweekly') {
      // Semi-weekly: Wed/Fri/Mon deposits become due by following Wed/Fri/Mon
      const dayOfWeek = today.getDay();
      const daysUntilNext = dayOfWeek < 3 ? 3 - dayOfWeek : dayOfWeek < 5 ? 5 - dayOfWeek : 8 - dayOfWeek;
      return new Date(today.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
    }
    return today;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payroll Tax Management</h1>
        <button
          onClick={() => setShowDepositModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Make Tax Deposit
        </button>
      </div>

      {/* Filing Schedule Alert */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Your current filing schedule is <strong>{filingSchedule}</strong>. 
              Next deposit due: <strong>{getNextDepositDue().toLocaleDateString()}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Current Period and YTD Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Current Period Taxes</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Federal Income Tax</span>
              <span className="font-medium">${payrollTaxes.currentPeriod.federalIncome.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Social Security Tax</span>
              <span className="font-medium">${payrollTaxes.currentPeriod.socialSecurity.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Medicare Tax</span>
              <span className="font-medium">${payrollTaxes.currentPeriod.medicare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">State Income Tax</span>
              <span className="font-medium">${payrollTaxes.currentPeriod.stateIncome.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Federal Unemployment (FUTA)</span>
              <span className="font-medium">${payrollTaxes.currentPeriod.federalUnemployment.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">State Unemployment (SUTA)</span>
              <span className="font-medium">${payrollTaxes.currentPeriod.stateUnemployment.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-semibold">Total Due</span>
              <span className="font-bold text-red-600">
                ${calculateTotalTaxes('currentPeriod').toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Year-to-Date Taxes</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Federal Income Tax</span>
              <span className="font-medium">${payrollTaxes.yearToDate.federalIncome.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Social Security Tax</span>
              <span className="font-medium">${payrollTaxes.yearToDate.socialSecurity.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Medicare Tax</span>
              <span className="font-medium">${payrollTaxes.yearToDate.medicare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">State Income Tax</span>
              <span className="font-medium">${payrollTaxes.yearToDate.stateIncome.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Federal Unemployment (FUTA)</span>
              <span className="font-medium">${payrollTaxes.yearToDate.federalUnemployment.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">State Unemployment (SUTA)</span>
              <span className="font-medium">${payrollTaxes.yearToDate.stateUnemployment.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-semibold">Total YTD</span>
              <span className="font-bold">
                ${calculateTotalTaxes('yearToDate').toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Deposits History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Tax Deposit History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deposit Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Federal Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confirmation #
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {taxDeposits.map((deposit) => (
                <tr key={deposit.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(deposit.deposit_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{deposit.tax_period}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${deposit.federal_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${deposit.state_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    ${(deposit.federal_amount + deposit.state_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{deposit.confirmation_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Make Tax Deposit</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Deposit Date</label>
                <input
                  type="date"
                  value={newDeposit.deposit_date}
                  onChange={(e) => setNewDeposit({ ...newDeposit, deposit_date: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax Period</label>
                <input
                  type="text"
                  placeholder="e.g., Q1 2024, Jan 2024"
                  value={newDeposit.tax_period}
                  onChange={(e) => setNewDeposit({ ...newDeposit, tax_period: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Federal Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={newDeposit.federal_amount}
                  onChange={(e) => setNewDeposit({ ...newDeposit, federal_amount: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">State Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={newDeposit.state_amount}
                  onChange={(e) => setNewDeposit({ ...newDeposit, state_amount: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirmation Number</label>
                <input
                  type="text"
                  value={newDeposit.confirmation_number}
                  onChange={(e) => setNewDeposit({ ...newDeposit, confirmation_number: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
            </div>
            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setShowDepositModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleMakeDeposit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Record Deposit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollTaxManagement;