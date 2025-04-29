'use client';

import React from 'react';

/**
 * PaySummary Component
 * Displays a summary of an employee's pay information
 */
const PaySummary = ({ employeeId }) => {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-medium text-gray-900 mb-4">Pay Summary</h2>
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Salary Information</h3>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-sm text-gray-500">Base Annual Salary</p>
              <p className="text-base font-medium">$85,000.00</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Paycheck (Semi-monthly)</p>
              <p className="text-base font-medium">$3,541.67</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Pay Increase</p>
              <p className="text-base font-medium">Jan 15, 2023</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Next Review</p>
              <p className="text-base font-medium">Jan 2024</p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">Pay Distribution</h3>
          <div className="mt-3">
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-600">Direct Deposit - Checking Account (****1234)</span>
              <span className="text-sm font-medium">100%</span>
            </div>
            <div className="mt-4">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Update Pay Distribution
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaySummary; 