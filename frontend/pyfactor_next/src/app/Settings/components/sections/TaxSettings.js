'use client';

import React, { useState, useEffect } from 'react';
import { useNotification } from '@/context/NotificationContext';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { validateTaxRate } from '@/utils/inputValidation';
import { 
  CurrencyDollarIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  CalculatorIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ChevronRightIcon,
  XMarkIcon
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
  
  // Tax Override Management State
  const [taxOverrides, setTaxOverrides] = useState([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [showCreateOverride, setShowCreateOverride] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingOverride, setEditingOverride] = useState(null);
  const [globalRates, setGlobalRates] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [newOverride, setNewOverride] = useState({
    country: 'US',
    region_code: '',
    region_name: '',
    locality: '',
    locality_name: '',
    country_rate: 0,
    state_rate: 0,
    county_rate: 0,
    override_reason: ''
  });
  
  // Payroll Tax State
  const [payrollTaxSettings, setPayrollTaxSettings] = useState(null);
  const [payrollTaxSource, setPayrollTaxSource] = useState('none');
  const [isEditingPayroll, setIsEditingPayroll] = useState(false);
  const [editedPayrollSettings, setEditedPayrollSettings] = useState({});
  
  // User/Business Info
  const [businessInfo, setBusinessInfo] = useState({
    country: '',
    state: '',
    county: '',
    country_name: ''
  });
  
  // County data
  const [availableCounties, setAvailableCounties] = useState([]);
  const [loadingCounties, setLoadingCounties] = useState(false);
  
  // Fetch all tax settings on mount
  useEffect(() => {
    fetchAllTaxSettings();
    fetchTaxOverrides();
  }, []);
  
  const fetchAllTaxSettings = async () => {
    try {
      setLoading(true);
      console.log('🎯 [TaxSettings] === START FETCHING TAX SETTINGS ===');
      
      // Fetch all required data
      console.log('🎯 [TaxSettings] Making API calls...');
      const apiCalls = [
        fetch('/api/settings/taxes', { credentials: 'include' }).then(res => ({ type: 'sales', response: res, data: res.json() })),
        fetch('/api/settings/taxes/payroll', { credentials: 'include' }).then(res => ({ type: 'payroll', response: res, data: res.json() })),
        fetch('/api/users/me', { credentials: 'include' }).then(res => ({ type: 'user', response: res, data: res.json() })),
        fetch('/api/tenant/business-info', { credentials: 'include' }).then(res => ({ type: 'business', response: res, data: res.json() })),
        fetch('/api/auth/session-v2', { credentials: 'include' }).then(res => ({ type: 'session', response: res, data: res.json() }))
      ];
      
      const results = await Promise.allSettled(apiCalls);
      console.log('🎯 [TaxSettings] API call results:', results.map(r => ({ 
        status: r.status, 
        success: r.status === 'fulfilled' && r.value?.response?.ok 
      })));
      
      let businessCountryFound = false;
      let businessInfoFromApi = {};
      
      // Process each result
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { type, response, data } = result.value;
          const resolvedData = await data;
          
          console.log(`🎯 [TaxSettings] ${type.toUpperCase()} API:`, {
            ok: response.ok,
            status: response.status,
            hasData: !!resolvedData,
            dataKeys: resolvedData ? Object.keys(resolvedData) : []
          });
          
          if (type === 'sales' && response.ok) {
            console.log('📊 [TaxSettings] Sales tax data:', resolvedData);
            setSalesTaxSource(resolvedData.source || 'none');
            setSalesTaxSettings(resolvedData.settings || null);
            setEditedSalesSettings(resolvedData.settings || {});
          }
          
          if (type === 'payroll' && response.ok) {
            console.log('💼 [TaxSettings] Payroll tax data:', resolvedData);
            setPayrollTaxSource(resolvedData.source || 'none');
            setPayrollTaxSettings(resolvedData.settings || null);
            setEditedPayrollSettings(resolvedData.settings || {});
          }
          
          if ((type === 'user' || type === 'business' || type === 'session') && response.ok && resolvedData) {
            console.log(`🏢 [TaxSettings] ${type.toUpperCase()} info:`, {
              country: resolvedData.country,
              country_name: resolvedData.country_name,
              state: resolvedData.state,
              business_name: resolvedData.business_name || resolvedData.businessName,
              user: resolvedData.user ? {
                country: resolvedData.user.country,
                businessCountry: resolvedData.user.business_country
              } : null
            });
            
            // Check if this source has country data
            const countryData = resolvedData.country || resolvedData.country_name || 
                              (resolvedData.user?.country) || (resolvedData.user?.business_country);
            
            if (countryData) {
              businessCountryFound = true;
              businessInfoFromApi = {
                country: resolvedData.country || resolvedData.user?.country || resolvedData.user?.business_country || businessInfoFromApi.country || '',
                state: resolvedData.state || resolvedData.user?.state || businessInfoFromApi.state || '',
                country_name: resolvedData.country_name || businessInfoFromApi.country_name || '',
                business_name: resolvedData.business_name || resolvedData.businessName || businessInfoFromApi.business_name || ''
              };
              
              console.log('🌍 [Country Debug] Business country found from', type, ':', {
                country_code: businessInfoFromApi.country,
                country_name: businessInfoFromApi.country_name,
                state: businessInfoFromApi.state,
                source: type,
                originalData: {
                  direct_country: resolvedData.country,
                  user_country: resolvedData.user?.country,
                  user_business_country: resolvedData.user?.business_country
                }
              });
            }
          }
        } else {
          console.error(`🚨 [TaxSettings] ${result.reason?.type || 'Unknown'} API failed:`, result.reason);
        }
      }
      
      // Set business info with comprehensive debugging
      console.log('🏢 [TaxSettings] Final business info:', {
        found: businessCountryFound,
        country: businessInfoFromApi.country,
        country_name: businessInfoFromApi.country_name,
        state: businessInfoFromApi.state,
        willShow: businessInfoFromApi.country ? businessInfoFromApi.country_name || businessInfoFromApi.country : 'Not set'
      });
      
      setBusinessInfo(businessInfoFromApi);
      
      if (!businessCountryFound) {
        console.warn('⚠️ [Country Debug] No business country found from any API source!');
        console.log('💡 [Country Debug] This will cause "Not set" to appear in Tax Settings');
      }
      
    } catch (error) {
      console.error('🚨 [TaxSettings] Error:', error);
      notifyError('Failed to load tax settings');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle state change - fetch rates for the selected state
  const handleStateChange = async (stateCode) => {
    console.log('🎯 [TaxSettings] State changed to:', stateCode);
    
    // Update business info and reset county
    setBusinessInfo(prev => ({ ...prev, state: stateCode, county: '' }));
    setAvailableCounties([]);
    
    // If US and state selected, fetch rates for that state
    if (businessInfo.country === 'US' && stateCode) {
      try {
        // Fetch sales tax rate for the state
        const salesResponse = await fetch(`/api/settings/taxes/rates?country=US&state=${stateCode}`, { 
          credentials: 'include' 
        });
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
        
        // Fetch available counties for this state
        await fetchCountiesForState(stateCode);
        
        // Fetch payroll tax rates for the state
        const payrollResponse = await fetch(`/api/settings/taxes/payroll-rates?country=US&state=${stateCode}`, { 
          credentials: 'include' 
        });
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
  
  // Fetch counties for a state
  const fetchCountiesForState = async (stateCode) => {
    if (!stateCode) return;
    
    try {
      setLoadingCounties(true);
      const response = await fetch(`/api/settings/taxes/counties?country=US&state=${stateCode}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableCounties(data.counties || []);
      }
    } catch (error) {
      console.error('Error fetching counties:', error);
    } finally {
      setLoadingCounties(false);
    }
  };
  
  // Handle county change
  const handleCountyChange = async (countyCode) => {
    console.log('🎯 [TaxSettings] County changed to:', countyCode);
    
    // Update business info
    setBusinessInfo(prev => ({ ...prev, county: countyCode }));
    
    // If county selected, fetch rate for that county
    if (businessInfo.country === 'US' && businessInfo.state && countyCode) {
      try {
        const response = await fetch(`/api/settings/taxes/rates?country=US&state=${businessInfo.state}&county=${countyCode}`, {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok && data.rate) {
          setEditedSalesSettings(prev => ({
            ...prev,
            locality: countyCode,
            sales_tax_rate: data.rate.rate,
            rate_percentage: data.rate.rate * 100
          }));
          
          const countyName = availableCounties.find(c => c.code === countyCode)?.name || countyCode;
          notifySuccess(`Sales tax rate updated to ${countyName} rate: ${(data.rate.rate * 100).toFixed(2)}%`);
        }
      } catch (error) {
        console.error('Error fetching county rate:', error);
      }
    }
  };
  
  // Save sales tax settings
  const handleSaveSalesTax = async () => {
    try {
      setSaving(true);
      console.log('🎯 [TaxSettings] Saving sales tax:', editedSalesSettings);
      
      // Add state and county to the settings
      const dataToSave = {
        ...editedSalesSettings,
        country: businessInfo.country,
        region_code: businessInfo.state || '',
        locality: businessInfo.county || ''
      };
      
      const response = await fetch('/api/settings/taxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: Include cookies for authentication
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
        credentials: 'include', // Important: Include cookies for authentication
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
        credentials: 'include', // Important: Include cookies for authentication
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
  
  // Fetch tax overrides
  const fetchTaxOverrides = async () => {
    try {
      setLoadingOverrides(true);
      const response = await fetch('/api/taxes/sales-tax-config/', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTaxOverrides(data.results || data || []);
      } else {
        console.warn('Failed to fetch tax overrides:', response.status);
      }
    } catch (error) {
      console.error('Error fetching tax overrides:', error);
    } finally {
      setLoadingOverrides(false);
    }
  };
  
  // Fetch global rates for comparison
  const fetchGlobalRates = async (country, region_code = '', locality = '') => {
    try {
      const params = new URLSearchParams({ country });
      if (region_code) params.append('region_code', region_code);
      if (locality) params.append('locality', locality);
      
      const response = await fetch(`/api/taxes/sales-tax-config/global_rates/?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setGlobalRates(data.global_rates);
        return data.global_rates;
      }
    } catch (error) {
      console.error('Error fetching global rates:', error);
    }
    return null;
  };
  
  // Preview tax calculation
  const previewTaxCalculation = async (overrideData) => {
    try {
      const response = await fetch('/api/taxes/sales-tax-config/preview_calculation/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...overrideData,
          sale_amount: 100 // Standard $100 preview
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data.preview);
        return data.preview;
      }
    } catch (error) {
      console.error('Error previewing calculation:', error);
    }
    return null;
  };
  
  // Create new tax override
  const handleCreateOverride = async () => {
    try {
      setSaving(true);
      
      // Validate required fields
      if (!newOverride.region_code) {
        notifyError('State is required');
        return;
      }
      
      if (!newOverride.override_reason.trim()) {
        notifyError('Override reason is required for audit compliance');
        return;
      }
      
      const response = await fetch('/api/taxes/sales-tax-config/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newOverride)
      });
      
      if (response.ok) {
        notifySuccess('Tax override created successfully');
        setShowCreateOverride(false);
        setNewOverride({
          country: 'US',
          region_code: '',
          region_name: '',
          locality: '',
          locality_name: '',
          country_rate: 0,
          state_rate: 0,
          county_rate: 0,
          override_reason: ''
        });
        fetchTaxOverrides();
      } else {
        const data = await response.json();
        notifyError(data.error || 'Failed to create tax override');
      }
    } catch (error) {
      console.error('Error creating override:', error);
      notifyError('Failed to create tax override');
    } finally {
      setSaving(false);
    }
  };
  
  // Update existing tax override
  const handleUpdateOverride = async (id, updatedData) => {
    try {
      setSaving(true);
      
      const response = await fetch(`/api/taxes/sales-tax-config/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedData)
      });
      
      if (response.ok) {
        notifySuccess('Tax override updated successfully');
        setEditingOverride(null);
        fetchTaxOverrides();
      } else {
        const data = await response.json();
        notifyError(data.error || 'Failed to update tax override');
      }
    } catch (error) {
      console.error('Error updating override:', error);
      notifyError('Failed to update tax override');
    } finally {
      setSaving(false);
    }
  };
  
  // Deactivate tax override
  const handleDeactivateOverride = async (id) => {
    if (!confirm('Are you sure you want to deactivate this tax override?')) {
      return;
    }
    
    try {
      setSaving(true);
      
      const response = await fetch(`/api/taxes/sales-tax-config/${id}/deactivate/`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        notifySuccess('Tax override deactivated successfully');
        fetchTaxOverrides();
      } else {
        const data = await response.json();
        notifyError(data.error || 'Failed to deactivate tax override');
      }
    } catch (error) {
      console.error('Error deactivating override:', error);
      notifyError('Failed to deactivate tax override');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle state change for new override
  const handleOverrideStateChange = async (stateCode) => {
    const state = US_STATES.find(s => s.code === stateCode);
    setNewOverride(prev => ({
      ...prev,
      region_code: stateCode,
      region_name: state?.name || '',
      locality: '',
      locality_name: ''
    }));
    
    // Fetch global rates for comparison
    if (stateCode) {
      await fetchGlobalRates('US', stateCode);
      await fetchCountiesForState(stateCode);
    }
  };
  
  // Handle county change for new override
  const handleOverrideCountyChange = async (countyCode) => {
    const county = availableCounties.find(c => c.code === countyCode);
    setNewOverride(prev => ({
      ...prev,
      locality: countyCode,
      locality_name: county?.name || ''
    }));
    
    // Fetch global rates for this specific location
    if (countyCode && newOverride.region_code) {
      await fetchGlobalRates('US', newOverride.region_code, countyCode);
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
        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Sales Tax Configuration</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowCreateOverride(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Create Override
                  </button>
                  <button
                    onClick={() => setShowPreview(true)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    Preview
                  </button>
                </div>
              </div>
            </div>
            
            {/* Feature 1: View Current Overrides by Jurisdiction */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">Current Tax Overrides</h4>
                {loadingOverrides && <StandardSpinner size="small" />}
              </div>
              
              {taxOverrides.length === 0 ? (
                <div className="text-center py-8">
                  <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Tax Overrides</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You're using global tax rates. Create an override to customize rates for specific jurisdictions.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Jurisdiction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Tax Breakdown
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Total Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {taxOverrides.map((override) => (
                        <tr key={override.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{override.jurisdiction_display}</div>
                              <div className="text-gray-500">
                                {override.country} {override.region_code && `• ${override.region_code}`} {override.locality && `• ${override.locality}`}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="space-y-1">
                              {override.formatted_rates.country !== '0.00%' && (
                                <div>Country: {override.formatted_rates.country}</div>
                              )}
                              {override.formatted_rates.state !== '0.00%' && (
                                <div>State: {override.formatted_rates.state}</div>
                              )}
                              {override.formatted_rates.county !== '0.00%' && (
                                <div>County: {override.formatted_rates.county}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-lg font-medium text-gray-900">
                              {override.formatted_rates.total}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              override.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {override.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingOverride(override)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeactivateOverride(override.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Feature 2: Create New Override Modal */}
          {showCreateOverride && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Create Tax Override</h3>
                  <button
                    onClick={() => setShowCreateOverride(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Country</label>
                    <select
                      value={newOverride.country}
                      onChange={(e) => setNewOverride({...newOverride, country: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="US">United States</option>
                    </select>
                  </div>
                  
                  {/* State */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newOverride.region_code}
                      onChange={(e) => handleOverrideStateChange(e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select State</option>
                      {US_STATES.map(state => (
                        <option key={state.code} value={state.code}>{state.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* County */}
                  {newOverride.region_code && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">County (Optional)</label>
                      <select
                        value={newOverride.locality}
                        onChange={(e) => handleOverrideCountyChange(e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        disabled={loadingCounties}
                      >
                        <option value="">Select County (Optional)</option>
                        {availableCounties.map(county => (
                          <option key={county.code} value={county.code}>{county.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Feature 5: Global Rates Comparison */}
                  {globalRates && globalRates.found && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Current Global Rate</h4>
                      <div className="text-sm text-blue-700">
                        <div>Total Rate: {(globalRates.total_rate * 100).toFixed(2)}%</div>
                        <div className="text-xs mt-1">Source: {globalRates.source}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Tax Rate Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">State Rate (%)</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="50"
                        value={newOverride.state_rate * 100}
                        onChange={(e) => setNewOverride({
                          ...newOverride,
                          state_rate: parseFloat(e.target.value) / 100 || 0
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">County Rate (%)</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="15"
                        value={newOverride.county_rate * 100}
                        onChange={(e) => setNewOverride({
                          ...newOverride,
                          county_rate: parseFloat(e.target.value) / 100 || 0
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Total Rate Display */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-900">
                      Total Rate: {((newOverride.country_rate + newOverride.state_rate + newOverride.county_rate) * 100).toFixed(3)}%
                    </div>
                  </div>
                  
                  {/* Feature 3: Override Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Override Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={newOverride.override_reason}
                      onChange={(e) => setNewOverride({...newOverride, override_reason: e.target.value})}
                      placeholder="Explain why this override is needed (required for audit compliance)"
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  {/* Feature 4: Preview Button */}
                  <button
                    onClick={() => previewTaxCalculation(newOverride)}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    Preview Calculation
                  </button>
                  
                  {/* Preview Results */}
                  {previewData && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-green-900 mb-2">Preview (on $100 sale)</h4>
                      <div className="text-sm text-green-700 space-y-1">
                        <div>Sale Amount: ${previewData.sale_amount.toFixed(2)}</div>
                        <div>Tax Amount: ${previewData.tax_amount.toFixed(2)}</div>
                        <div>Total: ${previewData.total_amount.toFixed(2)}</div>
                        <div className="text-xs">
                          Breakdown: State {previewData.breakdown.state_rate.toFixed(2)}% + County {previewData.breakdown.county_rate.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateOverride(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateOverride}
                    disabled={saving || !newOverride.region_code || !newOverride.override_reason.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Creating...' : 'Create Override'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feature 3: Edit Override Modal */}
          {editingOverride && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Edit Tax Override</h3>
                  <button
                    onClick={() => setEditingOverride(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-900">
                      {editingOverride.jurisdiction_display}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created: {new Date(editingOverride.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">State Rate (%)</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="50"
                        defaultValue={editingOverride.state_rate_percentage}
                        onChange={(e) => {
                          editingOverride.state_rate = parseFloat(e.target.value) / 100 || 0;
                        }}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">County Rate (%)</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="15"
                        defaultValue={editingOverride.county_rate_percentage}
                        onChange={(e) => {
                          editingOverride.county_rate = parseFloat(e.target.value) / 100 || 0;
                        }}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Update Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      defaultValue={editingOverride.override_reason}
                      onChange={(e) => {
                        editingOverride.override_reason = e.target.value;
                      }}
                      placeholder="Explain why this update is needed"
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setEditingOverride(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateOverride(editingOverride.id, editingOverride)}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Updating...' : 'Update Override'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feature 4: Preview Modal */}
          {showPreview && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Tax Calculation Preview</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <CalculatorIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Tax Preview</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Create an override above to see a preview of tax calculations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
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