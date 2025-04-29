'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const IncomeTax = ({ incomeTax, userData }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    federalFilingStatus: '',
    multipleJobs: false,
    claimDependents: false,
    dependentAmount: 0,
    otherIncome: 0,
    deductions: 0,
    extraWithholding: 0,
    stateCode: '',
    stateFilingStatus: '',
    stateAllowances: 0,
    stateAdditionalWithholding: 0
  });

  // States for dropdown
  const states = [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' },
    { code: 'DC', name: 'District of Columbia' }
  ];
  
  useEffect(() => {
    // Load initial data
    if (incomeTax) {
      setFormData({
        federalFilingStatus: incomeTax.federalFilingStatus || 'Single',
        multipleJobs: incomeTax.multipleJobs || false,
        claimDependents: incomeTax.claimDependents || false,
        dependentAmount: incomeTax.dependentAmount || 0,
        otherIncome: incomeTax.otherIncome || 0,
        deductions: incomeTax.deductions || 0,
        extraWithholding: incomeTax.extraWithholding || 0,
        stateCode: incomeTax.stateCode || 'CA',
        stateFilingStatus: incomeTax.stateFilingStatus || 'Single',
        stateAllowances: incomeTax.stateAllowances || 0,
        stateAdditionalWithholding: incomeTax.stateAdditionalWithholding || 0
      });
    }
  }, [incomeTax]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseFloat(value) : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // In a real app, this would be an API call to update tax withholding
      console.log('[IncomeTax] Saving income tax withholding data:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Tax withholding information has been updated successfully!');
    } catch (error) {
      console.error('[IncomeTax] Error saving income tax data:', error);
      alert('Failed to update tax withholding information. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getStateNameByCode = (code) => {
    const state = states.find(s => s.code === code);
    return state ? state.name : code;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Federal W-4 Withholding
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Update your federal tax withholding information (IRS Form W-4)
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="federalFilingStatus" className="block text-sm font-medium text-gray-700 mb-1">
                Filing Status
              </label>
              <select
                id="federalFilingStatus"
                name="federalFilingStatus"
                value={formData.federalFilingStatus}
                onChange={handleInputChange}
                className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Single">Single or Married filing separately</option>
                <option value="Married">Married filing jointly</option>
                <option value="Head">Head of household</option>
              </select>
            </div>
            
            <div className="md:pt-7">
              <div className="flex items-center">
                <input
                  id="multipleJobs"
                  name="multipleJobs"
                  type="checkbox"
                  checked={formData.multipleJobs}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="multipleJobs" className="ml-2 block text-sm text-gray-700">
                  Multiple Jobs or Spouse Works (Step 2)
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center mb-2">
              <input
                id="claimDependents"
                name="claimDependents"
                type="checkbox"
                checked={formData.claimDependents}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="claimDependents" className="ml-2 block text-sm text-gray-700">
                Claim Dependents (Step 3)
              </label>
            </div>
            
            {formData.claimDependents && (
              <div className="ml-6 mt-2">
                <label htmlFor="dependentAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Total Annual Amount ($)
                </label>
                <input
                  id="dependentAmount"
                  name="dependentAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.dependentAmount}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="otherIncome" className="block text-sm font-medium text-gray-700 mb-1">
                Other Income (Step 4a) ($)
              </label>
              <input
                id="otherIncome"
                name="otherIncome"
                type="number"
                min="0"
                step="0.01"
                value={formData.otherIncome}
                onChange={handleInputChange}
                className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="deductions" className="block text-sm font-medium text-gray-700 mb-1">
                Deductions (Step 4b) ($)
              </label>
              <input
                id="deductions"
                name="deductions"
                type="number"
                min="0"
                step="0.01"
                value={formData.deductions}
                onChange={handleInputChange}
                className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="extraWithholding" className="block text-sm font-medium text-gray-700 mb-1">
                Extra Withholding (Step 4c) ($)
              </label>
              <input
                id="extraWithholding"
                name="extraWithholding"
                type="number"
                min="0"
                step="0.01"
                value={formData.extraWithholding}
                onChange={handleInputChange}
                className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">
              State Withholding
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="stateCode" className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <select
                  id="stateCode"
                  name="stateCode"
                  value={formData.stateCode}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {states.map(state => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="stateFilingStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  State Filing Status
                </label>
                <select
                  id="stateFilingStatus"
                  name="stateFilingStatus"
                  value={formData.stateFilingStatus}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Head">Head of Household</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="stateAllowances" className="block text-sm font-medium text-gray-700 mb-1">
                  State Allowances
                </label>
                <input
                  id="stateAllowances"
                  name="stateAllowances"
                  type="number"
                  min="0"
                  value={formData.stateAllowances}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="stateAdditionalWithholding" className="block text-sm font-medium text-gray-700 mb-1">
                  Additional State Withholding ($)
                </label>
                <input
                  id="stateAdditionalWithholding"
                  name="stateAdditionalWithholding"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.stateAdditionalWithholding}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6 border-t border-gray-200 pt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Tax Documents
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
            <div>
              <h4 className="font-medium">W-4 Form</h4>
              <p className="text-sm text-gray-500">Employee's Withholding Certificate</p>
            </div>
            <button 
              type="button"
              className="px-4 py-2 bg-gray-100 text-gray-800 text-sm rounded-md hover:bg-gray-200"
              onClick={() => alert('View W-4 Form - This would display or download your W-4 form')}
            >
              View
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
            <div>
              <h4 className="font-medium">State Withholding Form</h4>
              <p className="text-sm text-gray-500">
                {getStateNameByCode(formData.stateCode)} Tax Withholding Certificate
              </p>
            </div>
            <button 
              type="button"
              className="px-4 py-2 bg-gray-100 text-gray-800 text-sm rounded-md hover:bg-gray-200"
              onClick={() => alert('View State Form - This would display or download your state withholding form')}
            >
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeTax; 