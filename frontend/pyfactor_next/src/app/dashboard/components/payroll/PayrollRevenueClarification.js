'use client';

import React from 'react';
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  CalendarIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline';

const PayrollRevenueClarification = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Understanding Dott Fees</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Run Payroll Fee */}
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 rounded-lg p-3">
              <CalculatorIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Run Payroll</h3>
              <p className="text-sm text-gray-600">Every pay period</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="bg-white rounded p-3">
              <p className="font-semibold text-blue-900">2.4% Processing Fee</p>
              <p className="text-sm text-gray-600 mt-1">
                Charged on total taxes (employee + employer)
              </p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="font-semibold text-blue-900">$2 per Employee</p>
              <p className="text-sm text-gray-600 mt-1">
                Direct deposit fee
              </p>
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium">When you pay:</p>
              <p>• When processing each payroll</p>
              <p>• Weekly, bi-weekly, or monthly</p>
            </div>
          </div>
        </div>

        {/* File Taxes Fee */}
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-600 rounded-lg p-3">
              <DocumentTextIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">File Payroll Taxes</h3>
              <p className="text-sm text-gray-600">Monthly/Quarterly</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="bg-white rounded p-3">
              <p className="font-semibold text-green-900">Flat Fee</p>
              <p className="text-sm text-gray-600 mt-1">
                Self-service: $65-$250<br />
                Full-service: $125-$450
              </p>
            </div>
            <div className="text-sm text-green-800">
              <p className="font-medium">When you pay:</p>
              <p>• When filing accumulated taxes</p>
              <p>• Based on filing frequency</p>
              <p>• Separate from payroll processing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Example Timeline */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-bold mb-4">Monthly Example (4 weekly payrolls)</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Week 1: Run Payroll (2.4% + $2/employee)</span>
            <span className="font-semibold">$120.80</span>
          </div>
          <div className="flex justify-between">
            <span>Week 2: Run Payroll (2.4% + $2/employee)</span>
            <span className="font-semibold">$120.80</span>
          </div>
          <div className="flex justify-between">
            <span>Week 3: Run Payroll (2.4% + $2/employee)</span>
            <span className="font-semibold">$120.80</span>
          </div>
          <div className="flex justify-between">
            <span>Week 4: Run Payroll (2.4% + $2/employee)</span>
            <span className="font-semibold">$120.80</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-green-700">
              <span>End of Month: File Taxes (Full-service)</span>
              <span className="font-semibold">$225.00</span>
            </div>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-lg font-bold">
              <span>Total Monthly Dott Revenue</span>
              <span>$708.20</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> These are two separate services. You can run payroll 
          without using our tax filing service, and vice versa.
        </p>
      </div>
    </div>
  );
};

export default PayrollRevenueClarification;