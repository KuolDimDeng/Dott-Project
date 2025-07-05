'use client';


import React from 'react';

/**
 * PayDeductions Component
 * Displays and manages an employee's pay deductions
 */
const PayDeductions = ({ employeeId }) => {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-medium text-gray-900 mb-4">Pay Deductions</h2>
      
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Tax Withholdings</h3>
          <div className="space-y-4 mt-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Federal Filing Status</p>
                <p className="text-base font-medium">Single</p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Update
              </button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Federal Allowances</p>
                <p className="text-base font-medium">2</p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Update
              </button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">State Filing Status</p>
                <p className="text-base font-medium">Single</p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Update
              </button>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">Benefit Deductions</h3>
          <div className="space-y-4 mt-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Health Insurance</p>
                <p className="text-base font-medium">$125.00 per paycheck</p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Manage
              </button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">401(k) Contribution</p>
                <p className="text-base font-medium">6% ($212.50 per paycheck)</p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Manage
              </button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">HSA Contribution</p>
                <p className="text-base font-medium">$50.00 per paycheck</p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Manage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayDeductions; 