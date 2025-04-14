'use client';

import React, { useState } from 'react';

/**
 * Benefits Management Component for HR
 * Handles employee benefits, health insurance, retirement plans, etc.
 */
const BenefitsManagement = () => {
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Employee Benefits</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="text-center py-8">
          <svg className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h2 className="mt-4 text-lg font-medium text-gray-900">Benefits Management</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Manage health insurance, retirement plans, and other employee benefits. <br />
            This feature will be available soon.
          </p>
          <button 
            className="mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
            disabled
          >
            Coming Soon
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-3">Benefits Features</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center">
              <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Manage health, dental, and vision insurance plans
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Administer 401(k) and other retirement plans
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Track paid time off, sick leave, and vacation time
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Manage life insurance and disability coverage
            </li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-3">Employee Self-Service</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Employees can view and update their benefit elections
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Self-service enrollment during open enrollment periods
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Access benefit plan documents and summaries
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Track retirement plan contributions and balances
            </li>
          </ul>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-lg font-semibold mb-3">Common Benefits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-700">Health Insurance</h3>
            <p className="text-sm text-blue-600 mt-1">Medical, dental, vision coverage</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-700">Retirement</h3>
            <p className="text-sm text-green-600 mt-1">401(k), pension plans, matching</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-700">Paid Time Off</h3>
            <p className="text-sm text-purple-600 mt-1">Vacation, holidays, sick leave</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="font-medium text-amber-700">Life Insurance</h3>
            <p className="text-sm text-amber-600 mt-1">Coverage for employees and dependents</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-medium text-red-700">Disability</h3>
            <p className="text-sm text-red-600 mt-1">Short and long-term disability coverage</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-medium text-indigo-700">Wellness Programs</h3>
            <p className="text-sm text-indigo-600 mt-1">Health initiatives and incentives</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenefitsManagement; 