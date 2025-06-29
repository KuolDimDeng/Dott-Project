'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { useSession } from '@/hooks/useSession-v2';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';
import { 
  CogIcon, 
  MapPinIcon, 
  SparklesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentCheckIcon,
  PencilIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export default function TaxSettings({ onNavigate }) {
  const { user, loading: sessionLoading } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Form state - initialized with user data
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: 'retail',
    country: '',
    stateProvince: '',
    city: '',
    postalCode: ''
  });
  
  // Tax data state
  const [taxSuggestions, setTaxSuggestions] = useState(null);
  const [customRates, setCustomRates] = useState({
    salesTaxRate: '',
    incomeTaxRate: '',
    payrollTaxRate: '',
    filingWebsite: '',
    filingAddress: '',
    filingDeadlines: ''
  });
  
  const [signature, setSignature] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  
  // Abuse control state
  const [apiUsage, setApiUsage] = useState({
    used: 0,
    limit: 5,
    resetsAt: null
  });
  const [lastSuggestionTime, setLastSuggestionTime] = useState(null);
  const [suggestionCooldown, setSuggestionCooldown] = useState(false);
  
  // Load existing tax settings
  const loadTaxSettings = useCallback(async (tenantId) => {
    try {
      const response = await fetch(`/api/taxes/settings?tenantId=${tenantId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.businessInfo) {
          setFormData(data.businessInfo);
        }
        if (data.taxRates) {
          setCustomRates(data.taxRates);
        }
      }
    } catch (error) {
      console.error('[TaxSettings] Error loading settings:', error);
    }
  }, []);
  
  // Load API usage information
  const loadApiUsage = useCallback(async (tenantId) => {
    try {
      const response = await fetch(`/api/taxes/usage?tenantId=${tenantId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiUsage({
          used: data.monthlyUsage || 0,
          limit: data.monthlyLimit || 5,
          resetsAt: data.resetsAt
        });
      }
    } catch (error) {
      console.error('[TaxSettings] Error loading API usage:', error);
    }
  }, []);
  
  // Initialize tenant ID and populate form with user data
  useEffect(() => {
    const initialize = async () => {
      try {
        const id = await getSecureTenantId();
        if (id) {
          setTenantId(id);
          
          // Pre-populate form with user data from session
          if (user) {
            setFormData(prev => ({
              ...prev,
              businessName: user.businessName || user.business_name || '',
              businessType: user.businessType || user.business_type || 'retail',
              country: user.country || '',
              stateProvince: user.stateProvince || user.state_province || user.state || '',
              city: user.city || '',
              postalCode: user.postalCode || user.postal_code || user.zip_code || ''
            }));
          }
          
          // Load existing tax settings and usage info
          await loadTaxSettings(id);
          await loadApiUsage(id);
        } else {
          toast.error('Failed to initialize. Please refresh the page.');
        }
      } catch (error) {
        console.error('[TaxSettings] Error during initialization:', error);
        toast.error('Failed to initialize. Please try again.');
      } finally {
        setIsInitialized(true);
      }
    };
    
    // Only initialize when session is loaded
    if (!sessionLoading) {
      initialize();
    }
  }, [user, sessionLoading, loadTaxSettings, loadApiUsage]);
  
  // Cooldown timer effect
  useEffect(() => {
    if (suggestionCooldown && lastSuggestionTime) {
      const timer = setTimeout(() => {
        setSuggestionCooldown(false);
      }, 60000); // 60 second cooldown
      
      return () => clearTimeout(timer);
    }
  }, [suggestionCooldown, lastSuggestionTime]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle custom rate changes
  const handleRateChange = (e) => {
    const { name, value } = e.target;
    setCustomRates(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Get tax suggestions from Claude API
  const getTaxSuggestions = async () => {
    // Field validation
    if (!formData.country || !formData.stateProvince || !formData.city) {
      toast.error('Please fill in all location fields first');
      return;
    }
    
    // Check API usage limits
    if (apiUsage.used >= apiUsage.limit) {
      toast.error(`Monthly limit reached (${apiUsage.limit} lookups). Please upgrade your plan or wait until ${new Date(apiUsage.resetsAt).toLocaleDateString()}`);
      return;
    }
    
    // Check cooldown period
    if (suggestionCooldown) {
      const remainingSeconds = Math.ceil((60000 - (Date.now() - lastSuggestionTime)) / 1000);
      toast.error(`Please wait ${remainingSeconds} seconds before requesting another suggestion`);
      return;
    }
    
    // Check if all fields are meaningful (prevent spam)
    const minFieldLength = 2;
    if (formData.country.length < minFieldLength || 
        formData.stateProvince.length < minFieldLength || 
        formData.city.length < minFieldLength) {
      toast.error('Please enter valid location information');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/taxes/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          businessInfo: formData
        })
      });
      
      if (response.status === 429) {
        const error = await response.json();
        toast.error(error.error || 'Too many requests. Please try again later.');
        return;
      }
      
      if (response.status === 503) {
        toast.error('Tax suggestions service is temporarily unavailable. Please try manual entry.');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to get tax suggestions');
      }
      
      const data = await response.json();
      setTaxSuggestions(data);
      
      // Pre-fill custom rates with suggestions
      if (data.suggestedRates) {
        setCustomRates(prev => ({
          ...prev,
          ...data.suggestedRates
        }));
      }
      
      // Update usage and set cooldown
      setApiUsage(prev => ({
        ...prev,
        used: prev.used + 1
      }));
      setLastSuggestionTime(Date.now());
      setSuggestionCooldown(true);
      
      // Reload usage info to get updated server counts
      loadApiUsage(tenantId);
      
      toast.success('Tax suggestions retrieved successfully!');
    } catch (error) {
      console.error('[TaxSettings] Error getting suggestions:', error);
      toast.error('Failed to get tax suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save tax settings
  const saveTaxSettings = async () => {
    if (!signature || !agreedToTerms) {
      toast.error('Please provide your signature and agree to the terms');
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/taxes/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          businessInfo: formData,
          taxRates: customRates,
          signature,
          agreedAt: new Date().toISOString(),
          suggestions: taxSuggestions
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save tax settings');
      }
      
      toast.success('Tax settings saved and email confirmation sent!');
      setShowSignatureModal(false);
    } catch (error) {
      console.error('[TaxSettings] Error saving settings:', error);
      toast.error('Failed to save tax settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Render loading state
  if (sessionLoading || !isInitialized || !tenantId) {
    return <CenteredSpinner size="large" text="Initializing Tax Settings..." showText={true} />;
  }
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <CogIcon className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tax Settings</h1>
            <p className="text-gray-600">Configure your business tax information</p>
          </div>
        </div>
      </div>
      
      {/* Business Information Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPinIcon className="h-5 w-5 mr-2 text-gray-600" />
          Business Information
        </h2>
        
        {/* Info message about pre-populated fields */}
        {user && (user.businessName || user.country) && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <ExclamationCircleIcon className="h-4 w-4 inline mr-1" />
            Some fields are pre-populated from your business profile and cannot be edited here.
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name
            </label>
            <input
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
              placeholder="Your Business Name"
              readOnly
              title="This is pulled from your business profile"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Type
            </label>
            <select
              name="businessType"
              value={formData.businessType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
              disabled
              title="This is pulled from your business profile"
            >
              <option value="retail">Retail</option>
              <option value="service">Service</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="consulting">Consulting</option>
              <option value="restaurant">Restaurant</option>
              <option value="ecommerce">E-commerce</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg ${
                user?.country ? 'border-gray-200 bg-gray-50 text-gray-700' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }`}
              placeholder="e.g., United States"
              readOnly={!!user?.country}
              title={user?.country ? "This is pulled from your business profile" : "Enter your country"}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State/Province
            </label>
            <input
              type="text"
              name="stateProvince"
              value={formData.stateProvince}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., California"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., San Francisco"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code
            </label>
            <input
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 94105"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={getTaxSuggestions}
              disabled={isLoading || suggestionCooldown || apiUsage.used >= apiUsage.limit}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <StandardSpinner size="small" className="mr-2" />
                  Getting Suggestions...
                </>
              ) : suggestionCooldown ? (
                <>
                  <ClockIcon className="h-5 w-5 mr-2" />
                  Cooldown Active...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Get Tax Suggestions
                </>
              )}
            </button>
            
            {/* Usage Display */}
            <div className="text-right">
              <p className="text-sm text-gray-500">AI Lookups This Month</p>
              <p className="text-lg font-semibold">
                <span className={apiUsage.used >= apiUsage.limit ? 'text-red-600' : 'text-gray-900'}>
                  {apiUsage.used}
                </span>
                <span className="text-gray-500"> / {apiUsage.limit}</span>
              </p>
              {apiUsage.resetsAt && (
                <p className="text-xs text-gray-500">
                  Resets {new Date(apiUsage.resetsAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          
          {/* Warning Messages */}
          {apiUsage.used >= apiUsage.limit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <ExclamationCircleIcon className="h-4 w-4 inline mr-1" />
              Monthly limit reached. Upgrade your plan for more AI lookups or enter tax rates manually.
            </div>
          )}
          
          {suggestionCooldown && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              <ClockIcon className="h-4 w-4 inline mr-1" />
              Please wait before requesting another suggestion. This helps prevent abuse and reduces costs.
            </div>
          )}
        </div>
      </div>
      
      {/* Tax Rates Configuration */}
      {(taxSuggestions || customRates.salesTaxRate) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Tax Rates Configuration
          </h2>
          
          {taxSuggestions && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">AI-Powered Suggestions</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Based on your location, we've suggested the following tax rates. 
                    You can accept these or modify them as needed.
                  </p>
                  {taxSuggestions.confidenceScore && (
                    <div className="mt-2 flex items-center">
                      <span className="text-xs text-blue-600">Confidence: </span>
                      <div className="ml-2 flex-1 max-w-xs bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${taxSuggestions.confidenceScore}%` }}
                        />
                      </div>
                      <span className="ml-2 text-xs text-blue-600">{taxSuggestions.confidenceScore}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales Tax Rate (%)
              </label>
              <input
                type="number"
                name="salesTaxRate"
                value={customRates.salesTaxRate}
                onChange={handleRateChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 8.75"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Income Tax Rate (%)
              </label>
              <input
                type="number"
                name="incomeTaxRate"
                value={customRates.incomeTaxRate}
                onChange={handleRateChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 28.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payroll Tax Rate (%)
              </label>
              <input
                type="number"
                name="payrollTaxRate"
                value={customRates.payrollTaxRate}
                onChange={handleRateChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 15.30"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filing Website
              </label>
              <input
                type="url"
                name="filingWebsite"
                value={customRates.filingWebsite}
                onChange={handleRateChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filing Address
              </label>
              <textarea
                name="filingAddress"
                value={customRates.filingAddress}
                onChange={handleRateChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tax filing office address..."
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filing Deadlines
              </label>
              <textarea
                name="filingDeadlines"
                value={customRates.filingDeadlines}
                onChange={handleRateChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Important tax filing deadlines..."
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowSignatureModal(true)}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <DocumentCheckIcon className="h-5 w-5 mr-2" />
              Review & Save
            </button>
          </div>
        </div>
      )}
      
      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Tax Settings
            </h3>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Summary:</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Sales Tax Rate: {customRates.salesTaxRate}%</p>
                <p>Income Tax Rate: {customRates.incomeTaxRate}%</p>
                <p>Payroll Tax Rate: {customRates.payrollTaxRate}%</p>
                <p>Location: {formData.city}, {formData.stateProvince}, {formData.country}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Digital Signature (Type your full name)
              </label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your Full Name"
              />
            </div>
            
            <div className="mb-6">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 mr-2"
                />
                <span className="text-sm text-gray-600">
                  I confirm that the tax information provided above is accurate to the best of my knowledge. 
                  I understand that these rates will be used throughout the application for tax calculations.
                </span>
              </label>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSignatureModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={saveTaxSettings}
                disabled={!signature || !agreedToTerms || isSaving}
                className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <StandardSpinner size="small" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Save & Send Confirmation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}