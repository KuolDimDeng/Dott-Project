'use client';


import React, { useState } from 'react';
import { Tab } from '@headlessui/react';

// Import subtab components
import BenefitsSummary from './tabs/BenefitsSummary';
import ManageBenefits from './tabs/ManageBenefits';
import BenefitsDocuments from './tabs/BenefitsDocuments';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

const MyBenefits = ({ userData }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">My Benefits</h2>
        <p className="text-gray-600">View and manage your employee benefits</p>
      </div>
      
      <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <Tab.List className="flex border-b border-gray-200">
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Benefits Summary
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Manage my Benefits
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Documents
          </Tab>
        </Tab.List>
        
        <Tab.Panels className="mt-4">
          <Tab.Panel>
            {loading ? (
        <CenteredSpinner size="medium" /> : (
              <BenefitsSummary userData={userData} />
            )}
          </Tab.Panel>
          
          <Tab.Panel>
            {loading ? (
        <CenteredSpinner size="medium" /> : (
              <ManageBenefits userData={userData} />
            )}
          </Tab.Panel>
          
          <Tab.Panel>
            {loading ? (
        <CenteredSpinner size="medium" /> : (
              <BenefitsDocuments userData={userData} />
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default MyBenefits; 