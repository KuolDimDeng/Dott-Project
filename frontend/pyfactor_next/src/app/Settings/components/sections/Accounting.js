'use client';

import React from 'react';
import AccountingStandards from './AccountingStandards';
import { 
  CalculatorIcon,
  DocumentTextIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const Accounting = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  console.log('[Accounting] === COMPONENT RENDERED ===');
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white px-6 py-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <CalculatorIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Accounting Settings</h2>
            <p className="text-sm text-gray-600">Configure accounting standards and financial settings for your business</p>
          </div>
        </div>
      </div>

      {/* Accounting Standards Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Accounting Standards</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Set the accounting standards that your business follows for financial reporting
          </p>
        </div>
        
        <div className="px-6 py-6">
          <AccountingStandards 
            user={user}
            profileData={profileData}
            isOwner={isOwner}
            isAdmin={isAdmin}
            notifySuccess={notifySuccess}
            notifyError={notifyError}
          />
        </div>
      </div>

      {/* Future accounting settings can be added here */}
      {/* 
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Financial Reports</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Configure financial reporting preferences and templates
          </p>
        </div>
        
        <div className="px-6 py-6">
          <p className="text-gray-500">Additional accounting settings will be available here in the future.</p>
        </div>
      </div>
      */}
    </div>
  );
};

export default Accounting;