'use client';

import React, { useState, useEffect } from 'react';
import {
  CalculatorIcon,
  BanknotesIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const PayrollFeeBreakdown = ({ employees, payPeriod }) => {
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (employees && employees.length > 0) {
      calculatePayrollWithFees();
    }
  }, [employees]);

  const calculatePayrollWithFees = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payroll/calculate-fees/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employees: employees.map(emp => ({
            employee_id: emp.id,
            gross_salary: emp.grossSalary || emp.salary
          })),
          pay_period_start: payPeriod.start,
          pay_period_end: payPeriod.end
        })
      });

      const data = await response.json();
      if (data.success) {
        setCalculation(data.payroll_calculation);
      }
    } catch (error) {
      console.error('Error calculating payroll fees:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!calculation) {
    return null;
  }

  const { summary } = calculation;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CalculatorIcon className="h-6 w-6" />
          Payroll Cost Breakdown
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Complete cost analysis including processing fees
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Gross Salaries</p>
              <p className="text-2xl font-bold text-blue-900">
                ${summary.total_gross.toFixed(2)}
              </p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-900">Total Taxes</p>
              <p className="text-2xl font-bold text-yellow-900">
                ${summary.government_receives.toFixed(2)}
              </p>
            </div>
            <BanknotesIcon className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">Processing Fees</p>
              <p className="text-2xl font-bold text-green-900">
                ${summary.dott_revenue.toFixed(2)}
              </p>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-900">Total Cost</p>
              <p className="text-2xl font-bold text-purple-900">
                ${summary.employer_total_payment.toFixed(2)}
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Gross Salaries</span>
            <span className="font-medium">${summary.total_gross.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between py-2 text-sm text-gray-500">
            <span className="ml-4">Employee Taxes (withheld)</span>
            <span>-${summary.total_employee_tax.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Employer Taxes (additional)</span>
            <span className="font-medium">+${summary.total_employer_tax.toFixed(2)}</span>
          </div>
          
          <div className="border-t pt-3">
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">
                ${(summary.total_gross + summary.total_employer_tax).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 -mx-6 px-6 py-3">
            <h4 className="font-medium text-gray-900 mb-2">Processing Fees:</h4>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">
                Tax Filing Fee (2.4% of ${summary.government_receives.toFixed(2)})
              </span>
              <span>${summary.total_processing_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">
                Direct Deposit ({employees.length} × $2.00)
              </span>
              <span>${summary.total_direct_deposit_fees.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between py-2 text-lg font-bold">
              <span>Total to Pay</span>
              <span className="text-blue-600">
                ${summary.employer_total_payment.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Breakdown */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
          <InformationCircleIcon className="h-5 w-5" />
          Where Your Payment Goes
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-800">To Employees (Net Pay)</span>
            <span className="font-medium text-blue-900">
              ${summary.employees_receive.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-800">To Government (All Taxes)</span>
            <span className="font-medium text-blue-900">
              ${summary.government_receives.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-800">To Dott (Processing Fees)</span>
            <span className="font-medium text-blue-900">
              ${summary.dott_revenue.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Fee Justification */}
      <div className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
        <p className="font-medium text-gray-900 mb-2">Why the 2.4% fee?</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Automatic tax calculations for {employees.length} employees</li>
          <li>Electronic filing with government tax authorities</li>
          <li>Compliance guarantee and audit protection</li>
          <li>Direct deposit to all employee accounts</li>
          <li>Detailed reporting and record keeping</li>
        </ul>
        <p className="mt-2 font-medium text-green-700">
          Save $500+ monthly vs. traditional payroll services
        </p>
      </div>
    </div>
  );
};

export default PayrollFeeBreakdown;