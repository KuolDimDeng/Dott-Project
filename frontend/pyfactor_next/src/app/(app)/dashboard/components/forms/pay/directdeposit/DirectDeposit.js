'use client';


import React from 'react';

/**
 * DirectDeposit Component
 * Displays and manages an employee's direct deposit accounts
 */
const DirectDeposit = ({ employeeId }) => {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium text-gray-900">Direct Deposit Accounts</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Add Account
        </button>
      </div>
      
      <div className="space-y-5">
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <span className="font-medium text-gray-900">Chase Bank</span>
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">Primary</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Checking •••• 4567</p>
              <p className="text-sm text-gray-600 mt-1">75% of net pay</p>
            </div>
            <div className="flex space-x-2">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Edit
              </button>
              <button className="text-sm text-red-600 hover:text-red-800 font-medium">
                Remove
              </button>
            </div>
          </div>
        </div>
        
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <span className="font-medium text-gray-900">Bank of America</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Savings •••• 7890</p>
              <p className="text-sm text-gray-600 mt-1">25% of net pay</p>
            </div>
            <div className="flex space-x-2">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Edit
              </button>
              <button className="text-sm text-red-600 hover:text-red-800 font-medium">
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-3 bg-gray-50 rounded border text-sm">
        <h4 className="font-medium text-gray-700 mb-1">Information</h4>
        <p className="text-gray-600">Changes to direct deposit accounts may take 1-2 pay periods to become effective. Contact HR for immediate changes.</p>
      </div>
    </div>
  );
};

export default DirectDeposit; 