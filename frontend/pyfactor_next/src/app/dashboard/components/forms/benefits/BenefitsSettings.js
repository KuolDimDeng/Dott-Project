'use client';

import React, { useState } from 'react';
import { Tab } from '@headlessui/react';

const BenefitsSettings = ({ userData }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Benefits Settings</h2>
        <p className="text-gray-600">Configure and manage benefits settings for your organization</p>
      </div>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              We are working to provide these benefits settings in the future. This section will allow you to configure benefit options, enrollment periods, and more.
            </p>
          </div>
        </div>
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
            General Settings
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Enrollment Periods
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Provider Settings
          </Tab>
        </Tab.List>
        
        <Tab.Panels className="mt-4">
          <Tab.Panel>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800">General Settings</h3>
                <p className="text-sm text-gray-600 mt-1">Configure basic benefit settings for your organization</p>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Benefits Eligibility (Days After Hire)
                  </label>
                  <input 
                    type="number" 
                    className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="90"
                    disabled
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Days after hire date when employees become eligible for benefits
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center">
                    <input
                      id="auto-enroll"
                      name="auto-enroll"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled
                    />
                    <label htmlFor="auto-enroll" className="ml-2 block text-sm text-gray-700">
                      Auto-enroll eligible employees in default benefits
                    </label>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 ml-6">
                    Automatically enroll employees in default benefits when they become eligible
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center">
                    <input
                      id="allow-opt-out"
                      name="allow-opt-out"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled
                    />
                    <label htmlFor="allow-opt-out" className="ml-2 block text-sm text-gray-700">
                      Allow employees to opt out of benefits
                    </label>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 ml-6">
                    Let employees decline benefits enrollment if they choose
                  </p>
                </div>
              </div>
              
              <div className="mt-6 text-center py-8">
                <svg className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  Benefits settings will be available soon.
                </p>
              </div>
            </div>
          </Tab.Panel>
          
          <Tab.Panel>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800">Enrollment Periods</h3>
                <p className="text-sm text-gray-600 mt-1">Configure open enrollment and special enrollment periods</p>
              </div>
              
              <div className="text-center py-8">
                <svg className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  Enrollment period settings will be available soon.
                </p>
              </div>
            </div>
          </Tab.Panel>
          
          <Tab.Panel>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800">Provider Settings</h3>
                <p className="text-sm text-gray-600 mt-1">Configure benefit providers and plan settings</p>
              </div>
              
              <div className="text-center py-8">
                <svg className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  Provider settings will be available soon.
                </p>
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default BenefitsSettings; 