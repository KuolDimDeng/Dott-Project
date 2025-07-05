import React from 'react';
import { formatCurrency, formatDate } from '../../../../utils/formatters';

/**
 * Component to display a summary of a payroll run for review before finalization
 * @param {Object} props Component props
 * @param {Array} props.employees List of employees included in the payroll run
 * @param {Object} props.account Selected bank account for the payroll run
 * @param {string} props.startDate Start date of the payroll period
 * @param {string} props.endDate End date of the payroll period
 * @param {Array} props.payrollData Calculated payroll data for each employee
 * @param {string} props.currency Currency code (e.g., USD, CAD, GBP)
 * @param {Function} props.onConfirm Callback when user confirms the payroll run
 * @param {Function} props.onCancel Callback when user cancels the payroll run
 */
const PayrollRunSummary = ({
  employees,
  account,
  startDate,
  endDate,
  payrollData,
  currency = 'USD',
  onConfirm,
  onCancel
}) => {
  // Calculate totals
  const totalGrossPay = payrollData?.reduce((sum, item) => sum + (item.grossPay || 0), 0) || 0;
  const totalDeductions = payrollData?.reduce((sum, item) => sum + (item.totalDeductions || 0), 0) || 0;
  const totalNetPay = payrollData?.reduce((sum, item) => sum + (item.netPay || 0), 0) || 0;
  
  return (
    <div className="w-full p-4">
      <h2 className="text-2xl font-bold mb-4">
        Payroll Run Summary
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700">Pay Period</h3>
          <p className="text-base">
            {formatDate(startDate)} - {formatDate(endDate)}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700">Bank Account</h3>
          <p className="text-base">
            {account?.name || 'Not specified'} 
            {account?.last4 && `(${account.last4})`}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700">Available Balance</h3>
          <p className="text-base">
            {formatCurrency(account?.availableBalance || 0, currency)}
          </p>
        </div>
      </div>
      
      <hr className="my-4 border-gray-200" />
      
      <h3 className="text-lg font-medium mb-3">
        Employees ({payrollData?.length || 0})
      </h3>
      
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Pay
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deductions
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Pay
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payrollData?.map((item) => (
                <tr key={item.employeeId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.employeeName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.grossPay || 0, currency)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.totalDeductions || 0, currency)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.netPay || 0, currency)}</td>
                </tr>
              ))}
              {!payrollData?.length && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No employee data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Total Gross Pay</h3>
            <p className="text-xl font-semibold">{formatCurrency(totalGrossPay, currency)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700">Total Deductions</h3>
            <p className="text-xl font-semibold">{formatCurrency(totalDeductions, currency)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700">Total Net Pay</h3>
            <p className="text-xl font-semibold">{formatCurrency(totalNetPay, currency)}</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-4">
        <button 
          onClick={onCancel} 
          className="mr-4 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button 
          onClick={onConfirm}
          disabled={!payrollData?.length || totalNetPay <= 0}
          className={`px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            !payrollData?.length || totalNetPay <= 0 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          Confirm and Process Payroll
        </button>
      </div>
    </div>
  );
};

export default PayrollRunSummary; 