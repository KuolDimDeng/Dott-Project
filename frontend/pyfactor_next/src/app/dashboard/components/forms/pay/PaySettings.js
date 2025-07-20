'use client';


import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';

// Import sub-components for PaySettings
import PayCycles from './tabs/settings/PayCycles';
import BankAccounts from './tabs/settings/BankAccounts';
import TaxSettings from './tabs/settings/TaxSettings';
import GeneralSettings from './tabs/settings/GeneralSettings';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

/**
 * PaySettings Component
 * Allows business owners to configure pay-related settings
 */
const PaySettings = ({ userData }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  
  // Load pay settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          setSettings({
            loaded: true,
            timestamp: new Date().toISOString()
          });
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('[PaySettings] Error fetching settings:', error);
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Pay Settings</h2>
        <p className="text-gray-600">Configure payment cycles, bank accounts, and other settings</p>
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
            Pay Cycles
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Bank Accounts
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Tax Settings
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            General Settings
          </Tab>
        </Tab.List>
        
        <Tab.Panels className="mt-4">
          <Tab.Panel>
            {loading ? (
        <CenteredSpinner size="medium" /> ) : (
              <PayCycles userData={userData} />
            )}
          </Tab.Panel>
          
          <Tab.Panel>
            {loading ? (
        <CenteredSpinner size="medium" /> ) : (
              <BankAccounts userData={userData} />
            )}
          </Tab.Panel>
          
          <Tab.Panel>
            {loading ? (
        <CenteredSpinner size="medium" /> ) : (
              <TaxSettings userData={userData} />
            )}
          </Tab.Panel>
          
          <Tab.Panel>
            {loading ? (
        <CenteredSpinner size="medium" /> ) : (
              <GeneralSettings userData={userData} />
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default PaySettings; 