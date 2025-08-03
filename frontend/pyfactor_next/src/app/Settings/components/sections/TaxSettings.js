'use client';

import React, { useState, useEffect } from 'react';
import { useNotification } from '@/context/NotificationContext';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { 
  CurrencyDollarIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline';

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
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' or 'payroll'
  
  // Sales Tax State
  const [salesTaxSettings, setSalesTaxSettings] = useState(null);
  const [salesTaxSource, setSalesTaxSource] = useState('none'); // 'global', 'custom', 'none'
  const [isEditingSales, setIsEditingSales] = useState(false);
  const [editedSalesSettings, setEditedSalesSettings] = useState({});
  
  // Payroll Tax State
  const [payrollTaxSettings, setPayrollTaxSettings] = useState(null);
  const [payrollTaxSource, setPayrollTaxSource] = useState('none');
  const [isEditingPayroll, setIsEditingPayroll] = useState(false);
  const [editedPayrollSettings, setEditedPayrollSettings] = useState({});
  
  // User/Business Info
  const [businessInfo, setBusinessInfo] = useState({
    country: '',
    state: '',
    country_name: ''
  });
  
  // Fetch all tax settings on mount
  useEffect(() => {
    fetchAllTaxSettings();
  }, []);
  
  const fetchAllTaxSettings = async () => {
    try {
      setLoading(true);
      console.log('🎯 [TaxSettings] Fetching all tax settings...');
      
      // Fetch both sales and payroll tax settings
      const [salesResponse, payrollResponse, businessResponse] = await Promise.all([
        fetch('/api/settings/taxes'),
        fetch('/api/settings/taxes/payroll'),
        fetch('/api/user/business')
      ]);
      
      const salesData = await salesResponse.json();
      const payrollData = await payrollResponse.json();
      const businessData = await businessResponse.json();
      
      console.log('🎯 [TaxSettings] Sales tax data:', salesData);
      console.log('🎯 [TaxSettings] Payroll tax data:', payrollData);
      console.log('🎯 [TaxSettings] Business data:', businessData);
      
      // Set business info
      setBusinessInfo({
        country: businessData.country || '',
        state: businessData.state || '',
        country_name: businessData.country_name || ''
      });
      
      // Set sales tax data
      if (salesResponse.ok) {
        setSalesTaxSource(salesData.source || 'none');
        setSalesTaxSettings(salesData.settings || null);
        setEditedSalesSettings(salesData.settings || {});
      }
      
      // Set payroll tax data
      if (payrollResponse.ok) {
        setPayrollTaxSource(payrollData.source || 'none');
        setPayrollTaxSettings(payrollData.settings || null);
        setEditedPayrollSettings(payrollData.settings || {});
      }
      
    } catch (error) {
      console.error('🎯 [TaxSettings] Error:', error);
      notifyError('Failed to load tax settings');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle state change - fetch rates for the selected state
  const handleStateChange = async (stateCode) => {
    console.log('🎯 [TaxSettings] State changed to:', stateCode);
    
    // Update business info
    setBusinessInfo(prev => ({ ...prev, state: stateCode }));
    
    // If US and state selected, fetch rates for that state
    if (businessInfo.country === 'US' && stateCode) {
      try {
        // Fetch sales tax rate for the state
        const salesResponse = await fetch(`/api/settings/taxes/rates?country=US&state=${stateCode}`);
        const salesData = await salesResponse.json();
        
        if (salesResponse.ok && salesData.rate) {
          setEditedSalesSettings(prev => ({
            ...prev,
            country: 'US',
            region_code: stateCode,
            region_name: US_STATES.find(s => s.code === stateCode)?.name || '',
            sales_tax_rate: salesData.rate.rate,
            sales_tax_type: salesData.rate.tax_type,
            rate_percentage: salesData.rate.rate * 100
          }));
          
          notifySuccess(`Sales tax rate updated to ${salesData.rate.region_name} rate: ${(salesData.rate.rate * 100).toFixed(2)}%`);
        }
        
        // Fetch payroll tax rates for the state
        const payrollResponse = await fetch(`/api/settings/taxes/payroll-rates?country=US&state=${stateCode}`);
        const payrollData = await payrollResponse.json();
        
        if (payrollResponse.ok && payrollData.rates) {
          setEditedPayrollSettings(prev => ({
            ...prev,
            country: 'US',
            region_code: stateCode,
            region_name: US_STATES.find(s => s.code === stateCode)?.name || '',
            ...payrollData.rates
          }));
        }
        
      } catch (error) {
        console.error('🎯 [TaxSettings] Error fetching state rates:', error);
      }
    }
  };
  
  // Save sales tax settings
  const handleSaveSalesTax = async () => {
    try {
      setSaving(true);
      console.log('🎯 [TaxSettings] Saving sales tax:', editedSalesSettings);
      
      // Add state to the settings
      const dataToSave = {
        ...editedSalesSettings,
        country: businessInfo.country,
        region_code: businessInfo.state || ''
      };
      
      const response = await fetch('/api/settings/taxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save sales tax settings');
      }
      
      setSalesTaxSource('custom');
      setSalesTaxSettings(data.settings);
      setIsEditingSales(false);
      notifySuccess('Sales tax settings saved successfully');
    } catch (error) {
      console.error('🎯 [TaxSettings] Save error:', error);
      notifyError(error.message || 'Failed to save sales tax settings');
    } finally {
      setSaving(false);
    }
  };
  
  // Save payroll tax settings
  const handleSavePayrollTax = async () => {
    try {
      setSaving(true);
      console.log('🎯 [TaxSettings] Saving payroll tax:', editedPayrollSettings);
      
      // Add state to the settings
      const dataToSave = {
        ...editedPayrollSettings,
        country: businessInfo.country,
        region_code: businessInfo.state || ''
      };
      
      const response = await fetch('/api/settings/taxes/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save payroll tax settings');
      }
      
      setPayrollTaxSource('custom');
      setPayrollTaxSettings(data.settings);
      setIsEditingPayroll(false);
      notifySuccess('Payroll tax settings saved successfully');
    } catch (error) {
      console.error('🎯 [TaxSettings] Save error:', error);
      notifyError(error.message || 'Failed to save payroll tax settings');
    } finally {
      setSaving(false);
    }
  };
  
  // Reset to global defaults
  const handleResetSalesTax = async () => {
    if (!confirm('Are you sure you want to reset to global defaults? Your custom settings will be deleted.')) {
      return;
    }
    
    try {
      setSaving(true);
      
      const response = await fetch(`/api/settings/taxes?country=${businessInfo.country}&region_code=${businessInfo.state || ''}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset tax settings');
      }
      
      notifySuccess('Sales tax settings reset to global defaults');
      fetchAllTaxSettings(); // Reload settings
    } catch (error) {
      console.error('🎯 [TaxSettings] Reset error:', error);
      notifyError(error.message || 'Failed to reset tax settings');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <StandardSpinner size="medium" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tax Settings</h2>
        <p className="text-gray-600 mt-1">Configure tax rates for your business</p>
      </div>
      
      {/* Warning Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-900">Important Tax Compliance Notice</p>
            <p className="text-sm mt-1 text-yellow-700">
              You are responsible for ensuring that your tax rates are accurate and up-to-date. 
              While we provide default rates based on your location, tax laws change frequently. 
              Please consult with a tax professional to verify your rates.
            </p>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('sales')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sales'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 mr-2" />
              Sales Tax
            </div>
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payroll'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-2" />
              Payroll Tax
            </div>
          </button>
        </nav>
      </div>
      
      {/* Sales Tax Section */}
      {activeTab === 'sales' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Sales Tax Configuration</h3>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  salesTaxSource === 'custom' 
                    ? 'bg-green-100 text-green-800' 
                    : salesTaxSource === 'global'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {salesTaxSource === 'custom' ? 'Custom Rate' : salesTaxSource === 'global' ? 'Global Default' : 'Not Configured'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Location Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <p className="mt-1 text-sm text-gray-900">{businessInfo.country_name || businessInfo.country || 'Not set'}</p>
              </div>
              
              {/* State selector for US businesses */}
              {businessInfo.country === 'US' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={businessInfo.state || ''}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    disabled={!isEditingSales}
                  >
                    <option value="">Select State</option>
                    {US_STATES.map(state => (
                      <option key={state.code} value={state.code}>{state.name}</option>
                    ))}
                  </select>
                  {businessInfo.country === 'US' && !businessInfo.state && (
                    <p className="mt-1 text-sm text-red-600">State is required for US businesses</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Tax Rate Configuration */}
            {(salesTaxSettings || isEditingSales) && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Sales Tax Rate (%)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="100"
                        value={isEditingSales ? (editedSalesSettings.rate_percentage || 0) : ((salesTaxSettings?.sales_tax_rate || 0) * 100)}
                        onChange={(e) => {
                          const percentage = parseFloat(e.target.value) || 0;
                          setEditedSalesSettings({
                            ...editedSalesSettings,
                            sales_tax_rate: percentage / 100,
                            rate_percentage: percentage
                          });
                        }}
                        disabled={!isEditingSales}
                        className="block w-full pr-10 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tax Type</label>
                    <select
                      value={isEditingSales ? (editedSalesSettings.sales_tax_type || 'sales_tax') : (salesTaxSettings?.sales_tax_type || 'sales_tax')}
                      onChange={(e) => setEditedSalesSettings({
                        ...editedSalesSettings,
                        sales_tax_type: e.target.value
                      })}
                      disabled={!isEditingSales}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                    >
                      <option value="sales_tax">Sales Tax</option>
                      <option value="vat">VAT</option>
                      <option value="gst">GST</option>
                      <option value="consumption_tax">Consumption Tax</option>
                      <option value="none">No Tax</option>
                    </select>
                  </div>
                </div>
                
                {/* Information Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5 text-blue-600" />
                    <div className="text-sm text-blue-700">
                      <p>This tax rate will be automatically applied to all sales transactions in your POS and invoices.</p>
                      {salesTaxSource === 'global' && (
                        <p className="mt-1">Currently using the default rate for your location. You can customize it if needed.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex justify-between">
              <div>
                {salesTaxSource === 'custom' && !isEditingSales && (
                  <button
                    onClick={handleResetSalesTax}
                    className="text-sm text-red-600 hover:text-red-500"
                  >
                    Reset to Global Default
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                {isEditingSales ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingSales(false);
                        setEditedSalesSettings(salesTaxSettings || {});
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveSalesTax}
                      disabled={saving || (businessInfo.country === 'US' && !businessInfo.state)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingSales(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Edit Sales Tax
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Payroll Tax Section */}
      {activeTab === 'payroll' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Payroll Tax Configuration</h3>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  payrollTaxSource === 'custom' 
                    ? 'bg-green-100 text-green-800' 
                    : payrollTaxSource === 'global'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {payrollTaxSource === 'custom' ? 'Custom Rates' : payrollTaxSource === 'global' ? 'Global Default' : 'Not Configured'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Location Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <p className="mt-1 text-sm text-gray-900">{businessInfo.country_name || businessInfo.country || 'Not set'}</p>
              </div>
              
              {businessInfo.country === 'US' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {businessInfo.state ? US_STATES.find(s => s.code === businessInfo.state)?.name : 'Not selected'}
                  </p>
                </div>
              )}
            </div>
            
            {/* Payroll Tax Rates */}
            {(payrollTaxSettings || isEditingPayroll) && (
              <div className="space-y-6">
                {/* Employee Taxes */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    Employee Taxes (Withheld from Employee)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Social Security / Pension (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="100"
                        value={isEditingPayroll ? ((editedPayrollSettings.employee_social_security_rate || 0) * 100) : ((payrollTaxSettings?.employee_social_security_rate || 0) * 100)}
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value) || 0;
                          setEditedPayrollSettings({
                            ...editedPayrollSettings,
                            employee_social_security_rate: rate / 100
                          });
                        }}
                        disabled={!isEditingPayroll}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Medicare / Healthcare (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="100"
                        value={isEditingPayroll ? ((editedPayrollSettings.employee_medicare_rate || 0) * 100) : ((payrollTaxSettings?.employee_medicare_rate || 0) * 100)}
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value) || 0;
                          setEditedPayrollSettings({
                            ...editedPayrollSettings,
                            employee_medicare_rate: rate / 100
                          });
                        }}
                        disabled={!isEditingPayroll}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Employer Taxes */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                    <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                    Employer Taxes (Paid by Employer)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Social Security / Pension (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="100"
                        value={isEditingPayroll ? ((editedPayrollSettings.employer_social_security_rate || 0) * 100) : ((payrollTaxSettings?.employer_social_security_rate || 0) * 100)}
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value) || 0;
                          setEditedPayrollSettings({
                            ...editedPayrollSettings,
                            employer_social_security_rate: rate / 100
                          });
                        }}
                        disabled={!isEditingPayroll}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Medicare / Healthcare (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="100"
                        value={isEditingPayroll ? ((editedPayrollSettings.employer_medicare_rate || 0) * 100) : ((payrollTaxSettings?.employer_medicare_rate || 0) * 100)}
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value) || 0;
                          setEditedPayrollSettings({
                            ...editedPayrollSettings,
                            employer_medicare_rate: rate / 100
                          });
                        }}
                        disabled={!isEditingPayroll}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Unemployment Insurance (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="100"
                        value={isEditingPayroll ? ((editedPayrollSettings.employer_unemployment_rate || 0) * 100) : ((payrollTaxSettings?.employer_unemployment_rate || 0) * 100)}
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value) || 0;
                          setEditedPayrollSettings({
                            ...editedPayrollSettings,
                            employer_unemployment_rate: rate / 100
                          });
                        }}
                        disabled={!isEditingPayroll}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Total Tax Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <CalculatorIcon className="h-4 w-4 mr-2" />
                    Total Tax Burden Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Employee Tax:</span>
                      <span className="ml-2 font-medium">
                        {((
                          (isEditingPayroll ? editedPayrollSettings.employee_social_security_rate : payrollTaxSettings?.employee_social_security_rate) || 0) * 100 +
                          ((isEditingPayroll ? editedPayrollSettings.employee_medicare_rate : payrollTaxSettings?.employee_medicare_rate) || 0) * 100
                        ).toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Employer Tax:</span>
                      <span className="ml-2 font-medium">
                        {((
                          (isEditingPayroll ? editedPayrollSettings.employer_social_security_rate : payrollTaxSettings?.employer_social_security_rate) || 0) * 100 +
                          ((isEditingPayroll ? editedPayrollSettings.employer_medicare_rate : payrollTaxSettings?.employer_medicare_rate) || 0) * 100 +
                          ((isEditingPayroll ? editedPayrollSettings.employer_unemployment_rate : payrollTaxSettings?.employer_unemployment_rate) || 0) * 100
                        ).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Coming Soon Notice for Payroll */}
            {!payrollTaxSettings && !isEditingPayroll && (
              <div className="text-center py-12">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Payroll Tax Configuration</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure payroll tax rates for accurate withholding calculations.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setIsEditingPayroll(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Configure Payroll Tax
                  </button>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            {(payrollTaxSettings || isEditingPayroll) && (
              <div className="flex justify-end space-x-3">
                {isEditingPayroll ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingPayroll(false);
                        setEditedPayrollSettings(payrollTaxSettings || {});
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePayrollTax}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Payroll Tax'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingPayroll(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Edit Payroll Tax
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxSettings;