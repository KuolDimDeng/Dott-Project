'use client';

import React, { useState, useEffect } from 'react';
import { useNotification } from '@/context/NotificationContext';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { CurrencyDollarIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

// US States data
const US_STATES = [
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

const TaxSettings = () => {
  const { notifySuccess, notifyError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taxSettings, setTaxSettings] = useState(null);
  const [source, setSource] = useState('none'); // 'global', 'tenant', 'none'
  const [isEditing, setIsEditing] = useState(false);
  const [editedSettings, setEditedSettings] = useState({});
  
  // Fetch current tax settings
  useEffect(() => {
    fetchTaxSettings();
  }, []);
  
  const fetchTaxSettings = async () => {
    try {
      setLoading(true);
      console.log('🎯 [TaxSettings] Fetching tax settings...');
      
      const response = await fetch('/api/settings/taxes');
      console.log('🎯 [TaxSettings] Response status:', response.status);
      console.log('🎯 [TaxSettings] Response headers:', response.headers);
      
      const data = await response.json();
      console.log('🎯 [TaxSettings] Response data:', data);
      
      if (!response.ok) {
        console.error('🎯 [TaxSettings] Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error
        });
        throw new Error(data.error || `Failed to fetch tax settings (${response.status})`);
      }
      
      console.log('🎯 [TaxSettings] Success - Received:', {
        source: data.source,
        rate: data.settings?.sales_tax_rate,
        fullSettings: data.settings
      });
      
      setSource(data.source);
      setTaxSettings(data.settings);
      setEditedSettings(data.settings || {});
    } catch (error) {
      console.error('🎯 [TaxSettings] Error:', error);
      console.error('🎯 [TaxSettings] Error details:', {
        message: error.message,
        stack: error.stack
      });
      notifyError(`Failed to load tax settings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('🎯 [TaxSettings] Saving:', editedSettings);
      
      const response = await fetch('/api/settings/taxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedSettings),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save tax settings');
      }
      
      setSource('tenant');
      setTaxSettings(data.settings);
      setIsEditing(false);
      notifySuccess('Tax settings saved successfully');
    } catch (error) {
      console.error('🎯 [TaxSettings] Save error:', error);
      notifyError(error.message || 'Failed to save tax settings');
    } finally {
      setSaving(false);
    }
  };
  
  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to global defaults? Your custom settings will be deleted.')) {
      return;
    }
    
    try {
      setSaving(true);
      
      const response = await fetch(`/api/settings/taxes?country=${taxSettings.country}&region_code=${taxSettings.region_code || ''}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset tax settings');
      }
      
      notifySuccess('Tax settings reset to global defaults');
      fetchTaxSettings(); // Reload settings
    } catch (error) {
      console.error('🎯 [TaxSettings] Reset error:', error);
      notifyError(error.message || 'Failed to reset tax settings');
    } finally {
      setSaving(false);
    }
  };
  
  const handleRateChange = (value) => {
    // Convert percentage to decimal (e.g., 8.75 -> 0.0875)
    const percentage = parseFloat(value) || 0;
    const decimal = percentage / 100;
    
    setEditedSettings({
      ...editedSettings,
      sales_tax_rate: decimal,
      rate_percentage: percentage
    });
  };
  
  const handleStateChange = async (stateCode) => {
    console.log('🎯 [TaxSettings] State changed to:', stateCode);
    
    // Update the state code
    setEditedSettings({
      ...editedSettings,
      region_code: stateCode,
      region_name: US_STATES.find(s => s.code === stateCode)?.name || ''
    });
    
    // If a state is selected, fetch the global rate for that state
    if (stateCode && taxSettings.country === 'US') {
      try {
        const response = await fetch(`/api/settings/taxes/global-rates?country=US`);
        const data = await response.json();
        
        if (response.ok && data.rates) {
          // Find the rate for the selected state
          const stateRate = data.rates.find(r => r.region_code === stateCode);
          if (stateRate) {
            console.log('🎯 [TaxSettings] Found state rate:', stateRate);
            
            // Auto-populate the rate from global data
            setEditedSettings({
              ...editedSettings,
              region_code: stateCode,
              region_name: stateRate.region_name,
              sales_tax_rate: stateRate.rate,
              rate_percentage: stateRate.rate * 100,
              sales_tax_type: stateRate.tax_type,
              original_global_rate: stateRate.rate
            });
            
            notifySuccess(`Tax rate updated to ${stateRate.region_name} rate: ${(stateRate.rate * 100).toFixed(2)}%`);
          }
        }
      } catch (error) {
        console.error('🎯 [TaxSettings] Error fetching state rate:', error);
      }
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <StandardSpinner size="medium" />
      </div>
    );
  }
  
  if (!taxSettings) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Unable to load tax settings. Please try again later.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tax Settings</h2>
        <p className="text-gray-600 mt-1">Configure sales tax rates for your business location</p>
      </div>
      
      {/* Status Banner */}
      <div className={`border rounded-lg p-4 ${
        source === 'global' ? 'bg-blue-50 border-blue-200' : 
        source === 'tenant' ? 'bg-green-50 border-green-200' : 
        'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5 text-blue-600" />
          <div>
            <p className={`font-medium ${
              source === 'global' ? 'text-blue-900' : 
              source === 'tenant' ? 'text-green-900' : 
              'text-yellow-900'
            }`}>
              {source === 'global' && 'Using global default tax rate'}
              {source === 'tenant' && 'Using custom tax rate'}
              {source === 'none' && 'No tax rate configured'}
            </p>
            <p className={`text-sm mt-1 ${
              source === 'global' ? 'text-blue-700' : 
              source === 'tenant' ? 'text-green-700' : 
              'text-yellow-700'
            }`}>
              {source === 'global' && 'This rate is automatically maintained and updated based on your location.'}
              {source === 'tenant' && 'You have customized the tax rate for your business.'}
              {source === 'none' && 'Please configure a tax rate for your location.'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Sales Tax Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Sales Tax</h3>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Location Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Country</label>
              <p className="mt-1 text-sm text-gray-900">{taxSettings.country_name || taxSettings.country}</p>
            </div>
            
            {/* State selector for US businesses */}
            {taxSettings.country === 'US' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">State</label>
                {isEditing ? (
                  <select
                    value={editedSettings.region_code || ''}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select a state</option>
                    {US_STATES.map(state => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 text-sm text-gray-900">
                    {taxSettings.region_name || 'No state selected'}
                  </p>
                )}
              </div>
            )}
            
            {/* Show region for non-US countries */}
            {taxSettings.country !== 'US' && taxSettings.region_name && (
              <div>
                <label className="block text-sm font-medium text-gray-700">State/Region</label>
                <p className="mt-1 text-sm text-gray-900">{taxSettings.region_name}</p>
              </div>
            )}
          </div>
          
          {/* Tax Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sales Tax Rate
            </label>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="100"
                  value={isEditing ? (editedSettings.rate_percentage || 0) : (taxSettings.rate_percentage || 0)}
                  onChange={(e) => handleRateChange(e.target.value)}
                  disabled={!isEditing}
                  className={`block w-32 pr-8 rounded-md shadow-sm ${
                    isEditing 
                      ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  } sm:text-sm`}
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
                  %
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Type:</span>
                <span className="text-sm font-medium text-gray-900">
                  {taxSettings.sales_tax_type?.toUpperCase() || 'Sales Tax'}
                </span>
              </div>
            </div>
            
            {/* AI Confidence Score */}
            {source === 'global' && taxSettings.ai_confidence_score && (
              <p className="mt-2 text-xs text-gray-500">
                AI Confidence: {(taxSettings.ai_confidence_score * 100).toFixed(0)}%
                {taxSettings.manually_verified && ' • Manually verified'}
              </p>
            )}
          </div>
          
          {/* Warning for US businesses without state */}
          {taxSettings.country === 'US' && !taxSettings.region_code && !isEditing && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Action Required:</strong> Please select your state to set the correct sales tax rate.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Warning for editing */}
          {isEditing && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> Ensure the tax rate is accurate for your location. 
                    Incorrect tax rates may result in compliance issues.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Additional Settings */}
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isEditing ? editedSettings.sales_tax_enabled : taxSettings.sales_tax_enabled}
                onChange={(e) => setEditedSettings({
                  ...editedSettings,
                  sales_tax_enabled: e.target.checked
                })}
                disabled={!isEditing}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Enable sales tax calculation</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isEditing ? editedSettings.show_tax_on_receipts : taxSettings.show_tax_on_receipts}
                onChange={(e) => setEditedSettings({
                  ...editedSettings,
                  show_tax_on_receipts: e.target.checked
                })}
                disabled={!isEditing}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Show tax breakdown on receipts</span>
            </label>
          </div>
          
          {/* Tax Registration Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tax Registration Number (optional)
            </label>
            <input
              type="text"
              value={isEditing ? (editedSettings.tax_registration_number || '') : (taxSettings.tax_registration_number || '')}
              onChange={(e) => setEditedSettings({
                ...editedSettings,
                tax_registration_number: e.target.value
              })}
              disabled={!isEditing}
              placeholder="VAT/GST registration number"
              className={`mt-1 block w-full rounded-md shadow-sm ${
                isEditing 
                  ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500' 
                  : 'border-gray-200 bg-gray-50 cursor-not-allowed'
              } sm:text-sm`}
            />
          </div>
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <div>
            {source === 'tenant' && !isEditing && (
              <button
                onClick={handleReset}
                disabled={saving}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Reset to global default
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedSettings(taxSettings);
                  }}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Edit Settings
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Help Text */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">About Tax Settings</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Tax rates are pre-populated based on your business location</li>
          <li>• For US businesses: Select your state to get the correct state sales tax rate</li>
          <li>• Rates are automatically updated weekly to ensure compliance</li>
          <li>• You can override the default rate if needed for your specific situation</li>
          <li>• These settings apply to POS sales and invoices</li>
          <li>• Note: Local city/county taxes are not included in state rates</li>
        </ul>
      </div>
    </div>
  );
};

export default TaxSettings;