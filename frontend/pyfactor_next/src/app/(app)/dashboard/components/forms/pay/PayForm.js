'use client';


import React from 'react';
import PayTab from './tabs/PayTab';

/**
 * PayForm Component
 * Main container for all pay-related information and functionality
 */
const PayForm = ({ employeeId = '123456' }) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Pay & Benefits</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and manage your compensation, tax withholdings, and benefit enrollments
        </p>
      </div>
      
      <PayTab employeeId={employeeId} />
    </div>
  );
};

export default PayForm; 