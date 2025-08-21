'use client';


import React, { useState } from 'react';
import PaySummary from './summary/PaySummary';
import BankingInformation from './BankingInformation';
import TaxInformation from './TaxInformation';

/**
 * PayTab Component
 * Main component for the Pay tab section of the dashboard
 */
const PayTab = ({ employeeId }) => {
  const [activeView, setActiveView] = useState('summary');

  const renderContent = () => {
    switch (activeView) {
      case 'summary':
        return <PaySummary employeeId={employeeId} />;
      case 'banking':
        return <BankingInformation employeeId={employeeId} />;
      case 'taxes':
        return <TaxInformation employeeId={employeeId} />;
      case 'history':
        return <div className="p-4">Pay History view will be implemented here</div>;
      case 'benefits':
        return <div className="p-4">Benefits view will be implemented here</div>;
      default:
        return <PaySummary employeeId={employeeId} />;
    }
  };

  const tabLabels = {
    'summary': 'Summary',
    'banking': 'Banking',
    'taxes': 'Tax Info',
    'history': 'History',
    'benefits': 'Benefits'
  };

  return (
    <div className="w-full">
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {Object.keys(tabLabels).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeView === view 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tabLabels[view]}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        {renderContent()}
      </div>
    </div>
  );
};

export default PayTab; 