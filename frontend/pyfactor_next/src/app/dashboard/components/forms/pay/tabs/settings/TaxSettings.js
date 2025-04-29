'use client';

import React, { useState, useEffect } from 'react';

/**
 * TaxSettings Component
 * Allows configuration of company tax settings for payroll processing
 * Used within the PaySettings parent component
 */
const TaxSettings = ({ userData }) => {
  const [loading, setLoading] = useState(true);
  const [taxSettings, setTaxSettings] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Load tax settings data
  useEffect(() => {
    const fetchTaxSettings = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          // Sample data - would be fetched from API in production
          const sampleTaxSettings = {
            // Company Tax Information
            companyEIN: '12-3456789',
            stateTaxID: 'ST-987654321',
            localTaxIDs: [{ jurisdiction: 'County', id: 'CTY-12345' }],
            
            // Default Withholding Settings
            defaultWithholding: {
              federal: true,
              state: true,
              local: false,
              fica: true,
              medicare: true,
              socialSecurity: true
            },
            
            // Tax Filing Configuration
            taxFiling: {
              frequency: 'quarterly',
              method: 'electronic',
              autoCalculate: true,
              autoFile: false
            },
            
            // Tax Rate Overrides
            taxRateOverrides: {
              useCustomRates: false,
              federalRate: 22,
              stateRate: 6,
              ficaRate: 6.2,
              medicareRate: 1.45
            }
          };
          
          setTaxSettings(sampleTaxSettings);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('[TaxSettings] Error fetching tax settings:', error);
        setLoading(false);
      }
    };
    
    fetchTaxSettings();
  }, []);
  
  const handleWithholdingChange = (setting, value) => {
    setTaxSettings(prev => ({
      ...prev,
      defaultWithholding: {
        ...prev.defaultWithholding,
        [setting]: value
      }
    }));
    
    // Clear success message when changes are made
    if (saveSuccess) {
      setSaveSuccess(false);
    }
  };
  
  const handleFilingSettingChange = (setting, value) => {
    setTaxSettings(prev => ({
      ...prev,
      taxFiling: {
        ...prev.taxFiling,
        [setting]: value
      }
    }));
    
    // Clear success message when changes are made
    if (saveSuccess) {
      setSaveSuccess(false);
    }
  };
  
  const handleRateOverrideChange = (setting, value) => {
    let parsedValue = value;
    
    // Handle numeric inputs
    if (setting !== 'useCustomRates') {
      parsedValue = parseFloat(value) || 0;
    }
    
    setTaxSettings(prev => ({
      ...prev,
      taxRateOverrides: {
        ...prev.taxRateOverrides,
        [setting]: parsedValue
      }
    }));
    
    // Clear success message when changes are made
    if (saveSuccess) {
      setSaveSuccess(false);
    }
  };
  
  const handleAddLocalTaxID = () => {
    setTaxSettings(prev => ({
      ...prev,
      localTaxIDs: [
        ...prev.localTaxIDs,
        { jurisdiction: '', id: '' }
      ]
    }));
  };
  
  const handleRemoveLocalTaxID = (index) => {
    setTaxSettings(prev => ({
      ...prev,
      localTaxIDs: prev.localTaxIDs.filter((_, i) => i !== index)
    }));
  };
  
  const handleLocalTaxIDChange = (index, field, value) => {
    setTaxSettings(prev => {
      const updatedLocalTaxIDs = [...prev.localTaxIDs];
      updatedLocalTaxIDs[index] = {
        ...updatedLocalTaxIDs[index],
        [field]: value
      };
      
      return {
        ...prev,
        localTaxIDs: updatedLocalTaxIDs
      };
    });
  };
  
  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsSaving(false);
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('[TaxSettings] Error saving tax settings:', error);
      setIsSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {saveSuccess && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Tax settings updated successfully</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Company Tax IDs */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Company Tax IDs</h3>
          <p className="mt-1 text-sm text-gray-500">Tax identification numbers used for reporting and filing</p>
        </div>
        <div className="px-4 py-5">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Federal EIN</label>
              <input
                type="text"
                value={taxSettings.companyEIN}
                onChange={(e) => setTaxSettings({...taxSettings, companyEIN: e.target.value})}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="XX-XXXXXXX"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">State Tax ID</label>
              <input
                type="text"
                value={taxSettings.stateTaxID}
                onChange={(e) => setTaxSettings({...taxSettings, stateTaxID: e.target.value})}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="State Tax ID"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Local Tax IDs</label>
            
            {taxSettings.localTaxIDs.map((taxId, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={taxId.jurisdiction}
                  onChange={(e) => handleLocalTaxIDChange(index, 'jurisdiction', e.target.value)}
                  className="block w-1/2 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Jurisdiction (e.g., City, County)"
                />
                <input
                  type="text"
                  value={taxId.id}
                  onChange={(e) => handleLocalTaxIDChange(index, 'id', e.target.value)}
                  className="block w-1/2 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Tax ID"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLocalTaxID(index)}
                  className="inline-flex items-center p-1.5 border border-transparent rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={handleAddLocalTaxID}
              className="mt-2 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Add Local Tax ID
            </button>
          </div>
        </div>
      </div>
      
      {/* Default Withholding Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Default Withholding Settings</h3>
          <p className="mt-1 text-sm text-gray-500">Default tax withholding settings for new employees</p>
        </div>
        <div className="px-4 py-5">
          <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="withholding-federal"
                  name="withholding-federal"
                  type="checkbox"
                  checked={taxSettings.defaultWithholding.federal}
                  onChange={(e) => handleWithholdingChange('federal', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="withholding-federal" className="font-medium text-gray-700">Federal Income Tax</label>
                <p className="text-gray-500">Withhold federal income tax</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="withholding-state"
                  name="withholding-state"
                  type="checkbox"
                  checked={taxSettings.defaultWithholding.state}
                  onChange={(e) => handleWithholdingChange('state', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="withholding-state" className="font-medium text-gray-700">State Income Tax</label>
                <p className="text-gray-500">Withhold state income tax</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="withholding-local"
                  name="withholding-local"
                  type="checkbox"
                  checked={taxSettings.defaultWithholding.local}
                  onChange={(e) => handleWithholdingChange('local', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="withholding-local" className="font-medium text-gray-700">Local Income Tax</label>
                <p className="text-gray-500">Withhold local income tax</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="withholding-fica"
                  name="withholding-fica"
                  type="checkbox"
                  checked={taxSettings.defaultWithholding.fica}
                  onChange={(e) => handleWithholdingChange('fica', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="withholding-fica" className="font-medium text-gray-700">FICA</label>
                <p className="text-gray-500">Federal Insurance Contributions Act</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="withholding-medicare"
                  name="withholding-medicare"
                  type="checkbox"
                  checked={taxSettings.defaultWithholding.medicare}
                  onChange={(e) => handleWithholdingChange('medicare', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="withholding-medicare" className="font-medium text-gray-700">Medicare</label>
                <p className="text-gray-500">Medicare contributions</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="withholding-ss"
                  name="withholding-ss"
                  type="checkbox"
                  checked={taxSettings.defaultWithholding.socialSecurity}
                  onChange={(e) => handleWithholdingChange('socialSecurity', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="withholding-ss" className="font-medium text-gray-700">Social Security</label>
                <p className="text-gray-500">Social security contributions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tax Filing Configuration */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Tax Filing Configuration</h3>
          <p className="mt-1 text-sm text-gray-500">Configure how tax forms are filed and processed</p>
        </div>
        <div className="px-4 py-5">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Filing Frequency</label>
              <select
                value={taxSettings.taxFiling.frequency}
                onChange={(e) => handleFilingSettingChange('frequency', e.target.value)}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Filing Method</label>
              <select
                value={taxSettings.taxFiling.method}
                onChange={(e) => handleFilingSettingChange('method', e.target.value)}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="electronic">Electronic</option>
                <option value="paper">Paper</option>
              </select>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="auto-calculate"
                  name="auto-calculate"
                  type="checkbox"
                  checked={taxSettings.taxFiling.autoCalculate}
                  onChange={(e) => handleFilingSettingChange('autoCalculate', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="auto-calculate" className="font-medium text-gray-700">Auto-Calculate Taxes</label>
                <p className="text-gray-500">Automatically calculate taxes based on payroll data</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="auto-file"
                  name="auto-file"
                  type="checkbox"
                  checked={taxSettings.taxFiling.autoFile}
                  onChange={(e) => handleFilingSettingChange('autoFile', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="auto-file" className="font-medium text-gray-700">Auto-File Tax Forms</label>
                <p className="text-gray-500">Automatically submit tax forms on the due date</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tax Rate Overrides */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Tax Rate Overrides</h3>
          <p className="mt-1 text-sm text-gray-500">Customize tax rates for special circumstances (use with caution)</p>
        </div>
        <div className="px-4 py-5">
          <div className="mb-4 flex items-start">
            <div className="flex items-center h-5">
              <input
                id="use-custom-rates"
                name="use-custom-rates"
                type="checkbox"
                checked={taxSettings.taxRateOverrides.useCustomRates}
                onChange={(e) => handleRateOverrideChange('useCustomRates', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="use-custom-rates" className="font-medium text-gray-700">Use Custom Tax Rates</label>
              <p className="text-gray-500">Override standard tax rates with custom values</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Federal Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxSettings.taxRateOverrides.federalRate}
                onChange={(e) => handleRateOverrideChange('federalRate', e.target.value)}
                disabled={!taxSettings.taxRateOverrides.useCustomRates}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">State Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxSettings.taxRateOverrides.stateRate}
                onChange={(e) => handleRateOverrideChange('stateRate', e.target.value)}
                disabled={!taxSettings.taxRateOverrides.useCustomRates}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">FICA Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxSettings.taxRateOverrides.ficaRate}
                onChange={(e) => handleRateOverrideChange('ficaRate', e.target.value)}
                disabled={!taxSettings.taxRateOverrides.useCustomRates}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Medicare Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxSettings.taxRateOverrides.medicareRate}
                onChange={(e) => handleRateOverrideChange('medicareRate', e.target.value)}
                disabled={!taxSettings.taxRateOverrides.useCustomRates}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>
          
          {taxSettings.taxRateOverrides.useCustomRates && (
            <div className="mt-4 rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Custom tax rates override standard calculations. Use with caution as incorrect rates may result in compliance issues.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSaveSettings}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default TaxSettings; 