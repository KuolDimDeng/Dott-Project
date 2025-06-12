'use client';


import React, { useState } from 'react';
// Removed next-auth import - using Auth0 instead
import BenefitsSummary from './tabs/BenefitsSummary';
import BenefitsForm from './tabs/BenefitsForm';

const BenefitsPage = () => {
  const [activeTab, setActiveTab] = useState('summary');
  // Session not needed for benefits page
  const [benefitsUpdated, setBenefitsUpdated] = useState(false);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
  };

  const handleBenefitsUpdate = () => {
    setBenefitsUpdated(true);
    // Switch to summary tab to show the updated benefits
    setActiveTab('summary');
  };

  const employeeId = session?.user?.id;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white shadow-md rounded-lg mt-6 mb-6 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => handleTabChange('summary')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm w-1/2 ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Benefits Summary
            </button>
            <button
              onClick={() => handleTabChange('form')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm w-1/2 ${
                activeTab === 'form'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Update Benefits
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'summary' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Your Benefits Summary
              </h1>
              <BenefitsSummary 
                employeeId={employeeId} 
                key={benefitsUpdated ? 'updated' : 'initial'} 
              />
            </div>
          )}

          {activeTab === 'form' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Update Your Benefits
              </h1>
              <BenefitsForm 
                employeeId={employeeId} 
                onBenefitsUpdated={handleBenefitsUpdate} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BenefitsPage; 