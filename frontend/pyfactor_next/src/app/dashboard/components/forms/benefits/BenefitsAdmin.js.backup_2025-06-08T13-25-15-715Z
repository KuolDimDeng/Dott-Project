'use client';

import React, { useState } from 'react';
import { Tab } from '@headlessui/react';

const BenefitsAdmin = ({ userData, isOwner }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Benefits Administration</h2>
        <p className="text-gray-600">Manage company-wide benefits and employee enrollment</p>
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
              We are working to provide these benefits options in the future. For now, you can select placeholder options below.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-md mb-6">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Select Benefits Option</h3>
          <p className="text-sm text-gray-600">Choose how you want to handle benefits for your company</p>
        </div>
        
        <div className="p-4">
          <div className="space-y-4">
            <div 
              className={`p-4 border rounded-md cursor-pointer ${
                selectedOption === 'dott' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleOptionSelect('dott')}
            >
              <div className="flex items-start">
                <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                  selectedOption === 'dott' ? 'border-blue-600' : 'border-gray-400'
                }`}>
                  {selectedOption === 'dott' && (
                    <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                  )}
                </div>
                <div className="ml-3">
                  <h4 className="text-md font-medium text-gray-800">Dott Benefits White Label</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Select from a range of benefits we've partnered with other companies to offer under our white label program.
                  </p>
                  
                  {selectedOption === 'dott' && (
                    <div className="mt-3 p-3 bg-gray-100 rounded-md">
                      <p className="text-sm text-gray-600">
                        We are working to provide these options in the future. Please check back later.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div 
              className={`p-4 border rounded-md cursor-pointer ${
                selectedOption === 'generic' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleOptionSelect('generic')}
            >
              <div className="flex items-start">
                <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                  selectedOption === 'generic' ? 'border-blue-600' : 'border-gray-400'
                }`}>
                  {selectedOption === 'generic' && (
                    <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                  )}
                </div>
                <div className="ml-3">
                  <h4 className="text-md font-medium text-gray-800">Generic Placeholders</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Set up placeholders for benefits you already provide through external providers.
                  </p>
                  
                  {selectedOption === 'generic' && (
                    <div className="mt-3 p-3 bg-gray-100 rounded-md">
                      <p className="text-sm text-gray-600 mb-2">
                        Enter the benefits you already provide:
                      </p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Benefit Name
                          </label>
                          <input 
                            type="text" 
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="e.g., Health Insurance"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Deduction per Paycheck ($)
                          </label>
                          <input 
                            type="number" 
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none">
                          Add Benefit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div 
              className={`p-4 border rounded-md cursor-pointer ${
                selectedOption === 'none' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleOptionSelect('none')}
            >
              <div className="flex items-start">
                <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                  selectedOption === 'none' ? 'border-blue-600' : 'border-gray-400'
                }`}>
                  {selectedOption === 'none' && (
                    <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                  )}
                </div>
                <div className="ml-3">
                  <h4 className="text-md font-medium text-gray-800">No Benefits</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Select this option if your company doesn't provide benefits to employees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button 
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default BenefitsAdmin; 