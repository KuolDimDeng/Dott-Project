'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { useSession } from '@/hooks/useSession-v2';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';
import { getCountryName } from '@/utils/countryMapping';
import { 
  CogIcon, 
  MapPinIcon, 
  SparklesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentCheckIcon,
  PencilIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  BuildingOfficeIcon,
  UserIcon
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
    street: '',
    stateProvince: '',
    city: '',
    postalCode: '',
    emailForDocuments: '',
    phone: ''
  });
  
  // Tax data state
  const [taxSuggestions, setTaxSuggestions] = useState(null);
  const [additionalTaxFields, setAdditionalTaxFields] = useState({}); // For dynamic fields from API
  const [customRates, setCustomRates] = useState({
    // Sales Tax breakdown
    stateSalesTaxRate: '',
    localSalesTaxRate: '',
    totalSalesTaxRate: '',
    
    // Personal Income Tax - Progressive Brackets
    personalIncomeTaxBrackets: [],
    hasProgressiveTax: false,
    
    // Corporate Income Tax
    corporateIncomeTaxRate: '',
    
    // Social Insurance
    healthInsuranceRate: '',
    healthInsuranceEmployerRate: '',
    socialSecurityRate: '',
    socialSecurityEmployerRate: '',
    
    // Payroll Tax breakdown
    federalPayrollTaxRate: '',
    statePayrollTaxRate: '',
    
    // Filing information
    stateTaxWebsite: '',
    stateTaxAddress: '',
    localTaxWebsite: '',
    localTaxAddress: '',
    federalTaxWebsite: '',
    
    // Deadlines
    filingDeadlines: {
      salesTax: '',
      incomeTax: '',
      payrollTax: '',
      corporateTax: ''
    }
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
          // Only update fields that aren't already populated from user data
          setFormData(prev => ({
            ...prev,
            // Keep user data for core fields, only update additional fields
            street: data.businessInfo.street || prev.street,
            emailForDocuments: data.businessInfo.emailForDocuments || prev.emailForDocuments,
            phone: data.businessInfo.phone || prev.phone
          }));
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
            // Get country from onboardingProgress (primary) or fallback locations
            const countryCode = user.onboardingProgress?.country || 
                               user.country || 
                               user.business_country || 
                               user.businessCountry ||
                               user.userCountry ||
                               user.profile?.country ||
                               user.business?.country ||
                               user.businessDetails?.country ||
                               '';
            
            const countryName = getCountryName(countryCode);
            
            // Get business info from onboarding progress if available
            const onboarding = user.onboardingProgress || {};
            
            const initialFormData = {
              businessName: onboarding.businessName || user.businessName || user.business_name || '',
              businessType: onboarding.businessType || user.businessType || user.business_type || 'retail',
              country: countryName,
              street: user.street || user.address || onboarding.address || '',
              stateProvince: user.stateProvince || user.state_province || user.state || onboarding.state || '',
              city: user.city || onboarding.city || '',
              postalCode: user.postalCode || user.postal_code || user.zip_code || onboarding.postalCode || '',
              emailForDocuments: user.email || '',
              phone: user.phone || onboarding.phone || ''
            };
            
            setFormData(prev => ({
              ...prev,
              ...initialFormData
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
    setCustomRates(prev => {
      const updated = {
        ...prev,
        [name]: value
      };
      
      // Auto-calculate totals when individual rates change
      if (name === 'stateSalesTaxRate' || name === 'localSalesTaxRate') {
        const stateRate = parseFloat(name === 'stateSalesTaxRate' ? value : prev.stateSalesTaxRate) || 0;
        const localRate = parseFloat(name === 'localSalesTaxRate' ? value : prev.localSalesTaxRate) || 0;
        updated.totalSalesTaxRate = (stateRate + localRate).toFixed(2);
      }
      
      if (name === 'federalIncomeTaxRate' || name === 'stateIncomeTaxRate') {
        const federalRate = parseFloat(name === 'federalIncomeTaxRate' ? value : prev.federalIncomeTaxRate) || 0;
        const stateRate = parseFloat(name === 'stateIncomeTaxRate' ? value : prev.stateIncomeTaxRate) || 0;
        updated.totalIncomeTaxRate = (federalRate + stateRate).toFixed(2);
      }
      
      return updated;
    });
  };
  
  // Handle income tax bracket changes
  const handleBracketChange = (index, field, value) => {
    setCustomRates(prev => {
      const newBrackets = [...prev.personalIncomeTaxBrackets];
      newBrackets[index] = {
        ...newBrackets[index],
        [field]: value
      };
      return {
        ...prev,
        personalIncomeTaxBrackets: newBrackets
      };
    });
  };
  
  // Add new income tax bracket
  const addBracket = () => {
    setCustomRates(prev => ({
      ...prev,
      personalIncomeTaxBrackets: [
        ...prev.personalIncomeTaxBrackets,
        { 
          minIncome: '', 
          maxIncome: '', 
          rate: '', 
          description: '' 
        }
      ]
    }));
  };
  
  // Remove income tax bracket
  const removeBracket = (index) => {
    setCustomRates(prev => ({
      ...prev,
      personalIncomeTaxBrackets: prev.personalIncomeTaxBrackets.filter((_, i) => i !== index)
    }));
  };
  
  // Toggle progressive tax system
  const toggleProgressiveTax = () => {
    setCustomRates(prev => ({
      ...prev,
      hasProgressiveTax: !prev.hasProgressiveTax,
      personalIncomeTaxBrackets: !prev.hasProgressiveTax ? [
        { minIncome: '0', maxIncome: '', rate: '', description: 'First bracket' }
      ] : []
    }));
  };

  // Get tax suggestions from Claude API
  const getTaxSuggestions = async () => {
    console.log('[TaxSettings] getTaxSuggestions called');
    console.log('[TaxSettings] Form data:', formData);
    
    // Field validation
    if (!formData.country || !formData.stateProvince || !formData.city) {
      toast.error('Please fill in Country, State/Province, and City fields first');
      console.log('[TaxSettings] Validation failed - missing fields:', {
        country: formData.country,
        stateProvince: formData.stateProvince,
        city: formData.city
      });
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
    
    console.log('[TaxSettings] Validation passed, making API call');
    setIsLoading(true);
    try {
      console.log('[TaxSettings] Calling API with:', { tenantId, businessInfo: formData });
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
      
      console.log('[TaxSettings] API response status:', response.status);
      
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
        // Known fields that map to our form
        const knownFields = [
          'stateSalesTaxRate', 'localSalesTaxRate', 'totalSalesTaxRate',
          'corporateIncomeTaxRate', 'healthInsuranceRate', 'healthInsuranceEmployerRate',
          'socialSecurityRate', 'socialSecurityEmployerRate', 'federalPayrollTaxRate',
          'statePayrollTaxRate', 'stateTaxWebsite', 'stateTaxAddress', 'localTaxWebsite',
          'localTaxAddress', 'federalTaxWebsite', 'filingDeadlines', 'hasProgressiveTax',
          'personalIncomeTaxBrackets'
        ];
        
        // Separate known and unknown fields
        const knownRates = {};
        const unknownFields = {};
        
        Object.keys(data.suggestedRates).forEach(key => {
          if (knownFields.includes(key)) {
            knownRates[key] = data.suggestedRates[key];
          } else {
            unknownFields[key] = data.suggestedRates[key];
          }
        });
        
        // Update known fields
        setCustomRates(prev => ({
          ...prev,
          ...knownRates,
          // Calculate totals if not provided
          totalSalesTaxRate: knownRates.totalSalesTaxRate || 
            (parseFloat(knownRates.stateSalesTaxRate || prev.stateSalesTaxRate || 0) + 
             parseFloat(knownRates.localSalesTaxRate || prev.localSalesTaxRate || 0)).toFixed(2)
        }));
        
        // Store unknown fields for dynamic rendering
        if (Object.keys(unknownFields).length > 0) {
          setAdditionalTaxFields(unknownFields);
          console.log('[TaxSettings] Additional tax fields from API:', unknownFields);
        }
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
        {user && (user.businessName || user.onboardingProgress?.businessName) && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <ExclamationCircleIcon className="h-4 w-4 inline mr-1" />
            Business name and type are from your business profile. Country can be updated if needed for tax purposes.
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
              Country *
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., United States"
              required
              title="Country where your business is located for tax purposes"
            />
            <p className="text-xs text-gray-500 mt-1">
              Pre-filled from your business profile. Update if needed for tax purposes.
            </p>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 123 Main Street, Suite 100"
              required
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
              required
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
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postal/Zip Code
            </label>
            <input
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 94105"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email for Tax Documents
            </label>
            <input
              type="email"
              name="emailForDocuments"
              value={formData.emailForDocuments}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tax@company.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                console.log('[TaxSettings] Button clicked');
                getTaxSuggestions();
              }}
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
          
          {/* Sales Tax Section */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-800 mb-3 border-b pb-2">Sales Tax Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State Sales Tax (%)
                </label>
                <input
                  type="number"
                  name="stateSalesTaxRate"
                  value={customRates.stateSalesTaxRate}
                  onChange={handleRateChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 4.85"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Local Sales Tax (%)
                </label>
                <input
                  type="number"
                  name="localSalesTaxRate"
                  value={customRates.localSalesTaxRate}
                  onChange={handleRateChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 2.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Sales Tax (%)
                </label>
                <input
                  type="number"
                  name="totalSalesTaxRate"
                  value={customRates.totalSalesTaxRate}
                  onChange={handleRateChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="Auto-calculated"
                  readOnly
                />
              </div>
            </div>
          </div>
          
          {/* Corporate Income Tax Section */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-800 mb-3 border-b pb-2 flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 mr-2 text-gray-600" />
              Corporate Income Tax
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Corporate Income Tax Rate (%)
                </label>
                <input
                  type="number"
                  name="corporateIncomeTaxRate"
                  value={customRates.corporateIncomeTaxRate}
                  onChange={handleRateChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 21.00"
                />
              </div>
            </div>
          </div>
          
          {/* Personal Income Tax Section */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-800 mb-3 border-b pb-2 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-gray-600" />
              Personal Income Tax
            </h3>
            
            {/* Toggle for Progressive Tax System */}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={customRates.hasProgressiveTax}
                  onChange={toggleProgressiveTax}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">This country uses a progressive tax system (tax brackets)</span>
              </label>
            </div>
            
            {customRates.hasProgressiveTax ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-gray-600">Define income tax brackets (e.g., Kenya, USA)</p>
                  <button
                    type="button"
                    onClick={addBracket}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Bracket
                  </button>
                </div>
                
                {customRates.personalIncomeTaxBrackets.map((bracket, index) => (
                  <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Bracket {index + 1}</h4>
                      {customRates.personalIncomeTaxBrackets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBracket(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">From (Monthly)</label>
                        <input
                          type="number"
                          value={bracket.minIncome}
                          onChange={(e) => handleBracketChange(index, 'minIncome', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">To (Monthly)</label>
                        <input
                          type="number"
                          value={bracket.maxIncome}
                          onChange={(e) => handleBracketChange(index, 'maxIncome', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="24000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Tax Rate (%)</label>
                        <input
                          type="number"
                          value={bracket.rate}
                          onChange={(e) => handleBracketChange(index, 'rate', e.target.value)}
                          step="0.1"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="10"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Description</label>
                        <input
                          type="text"
                          value={bracket.description}
                          onChange={(e) => handleBracketChange(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="First KES 24,000"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {customRates.personalIncomeTaxBrackets.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No brackets defined. Click "Add Bracket" to start.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Flat Personal Income Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    name="flatPersonalIncomeTaxRate"
                    value={customRates.flatPersonalIncomeTaxRate || ''}
                    onChange={handleRateChange}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 30.00"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Social Insurance Section */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-800 mb-3 border-b pb-2">Social Insurance & Benefits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Health Insurance</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Employee Rate (%)</label>
                    <input
                      type="number"
                      name="healthInsuranceRate"
                      value={customRates.healthInsuranceRate}
                      onChange={handleRateChange}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 2.75"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Employer Rate (%)</label>
                    <input
                      type="number"
                      name="healthInsuranceEmployerRate"
                      value={customRates.healthInsuranceEmployerRate}
                      onChange={handleRateChange}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 2.75"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Social Security</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Employee Rate (%)</label>
                    <input
                      type="number"
                      name="socialSecurityRate"
                      value={customRates.socialSecurityRate}
                      onChange={handleRateChange}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 6.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Employer Rate (%)</label>
                    <input
                      type="number"
                      name="socialSecurityEmployerRate"
                      value={customRates.socialSecurityEmployerRate}
                      onChange={handleRateChange}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 6.00"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Payroll Tax Section */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-800 mb-3 border-b pb-2">Payroll Tax Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Federal Payroll Tax (%)
                </label>
                <input
                  type="number"
                  name="federalPayrollTaxRate"
                  value={customRates.federalPayrollTaxRate}
                  onChange={handleRateChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 15.30"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State Payroll Tax (%)
                </label>
                <input
                  type="number"
                  name="statePayrollTaxRate"
                  value={customRates.statePayrollTaxRate}
                  onChange={handleRateChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 3.00"
                />
              </div>
            </div>
          </div>
          
          {/* Filing Information Section */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-800 mb-3 border-b pb-2">Tax Filing Information</h3>
            
            {/* Federal Tax Filing */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Federal Tax Filing</h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    IRS Website
                  </label>
                  <input
                    type="url"
                    name="federalTaxWebsite"
                    value={customRates.federalTaxWebsite}
                    onChange={handleRateChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://www.irs.gov"
                  />
                </div>
              </div>
            </div>
            
            {/* State Tax Filing */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">State Tax Filing</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    State Tax Website
                  </label>
                  <input
                    type="url"
                    name="stateTaxWebsite"
                    value={customRates.stateTaxWebsite}
                    onChange={handleRateChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., https://tax.utah.gov"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    State Tax Office Address
                  </label>
                  <input
                    type="text"
                    name="stateTaxAddress"
                    value={customRates.stateTaxAddress}
                    onChange={handleRateChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Physical address..."
                  />
                </div>
              </div>
            </div>
            
            {/* Local Tax Filing */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Local Tax Filing</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Local Tax Website
                  </label>
                  <input
                    type="url"
                    name="localTaxWebsite"
                    value={customRates.localTaxWebsite}
                    onChange={handleRateChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City/County tax website..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Local Tax Office Address
                  </label>
                  <input
                    type="text"
                    name="localTaxAddress"
                    value={customRates.localTaxAddress}
                    onChange={handleRateChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Physical address..."
                  />
                </div>
              </div>
            </div>
            
            {/* Filing Deadlines */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Filing Deadlines</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Sales Tax Deadline
                  </label>
                  <input
                    type="text"
                    name="salesTaxDeadline"
                    value={customRates.filingDeadlines?.salesTax || ''}
                    onChange={(e) => {
                      setCustomRates(prev => ({
                        ...prev,
                        filingDeadlines: {
                          ...prev.filingDeadlines,
                          salesTax: e.target.value
                        }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Monthly, 20th"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Income Tax Deadline
                  </label>
                  <input
                    type="text"
                    name="incomeTaxDeadline"
                    value={customRates.filingDeadlines?.incomeTax || ''}
                    onChange={(e) => {
                      setCustomRates(prev => ({
                        ...prev,
                        filingDeadlines: {
                          ...prev.filingDeadlines,
                          incomeTax: e.target.value
                        }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., April 15"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Payroll Tax Deadline
                  </label>
                  <input
                    type="text"
                    name="payrollTaxDeadline"
                    value={customRates.filingDeadlines?.payrollTax || ''}
                    onChange={(e) => {
                      setCustomRates(prev => ({
                        ...prev,
                        filingDeadlines: {
                          ...prev.filingDeadlines,
                          payrollTax: e.target.value
                        }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Quarterly"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Dynamic Additional Tax Fields from API */}
          {Object.keys(additionalTaxFields).length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-800 mb-3 border-b pb-2">Additional Tax Information</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-yellow-800">
                  <ExclamationCircleIcon className="h-4 w-4 inline mr-1" />
                  The following fields were suggested by our tax AI but are not yet fully integrated into the form. 
                  Please review and note these for manual entry if needed.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(additionalTaxFields).map(([key, value]) => (
                  <div key={key} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {/* Convert camelCase to Title Case */}
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </label>
                    <div className="text-sm text-gray-900">
                      {typeof value === 'object' ? (
                        <pre className="text-xs overflow-auto">{JSON.stringify(value, null, 2)}</pre>
                      ) : (
                        <span>{value}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
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
                <p><strong>Sales Tax:</strong> {customRates.stateSalesTaxRate}% (State) + {customRates.localSalesTaxRate}% (Local) = {customRates.totalSalesTaxRate}% Total</p>
                <p><strong>Corporate Income Tax:</strong> {customRates.corporateIncomeTaxRate}%</p>
                <p><strong>Personal Income Tax:</strong> {customRates.hasProgressiveTax ? `Progressive (${customRates.personalIncomeTaxBrackets.length} brackets)` : `Flat rate: ${customRates.flatPersonalIncomeTaxRate || 'N/A'}%`}</p>
                <p><strong>Health Insurance:</strong> {customRates.healthInsuranceRate}% (Employee) + {customRates.healthInsuranceEmployerRate}% (Employer)</p>
                <p><strong>Social Security:</strong> {customRates.socialSecurityRate}% (Employee) + {customRates.socialSecurityEmployerRate}% (Employer)</p>
                <p><strong>Payroll Tax:</strong> {customRates.federalPayrollTaxRate}% (Federal) + {customRates.statePayrollTaxRate}% (State)</p>
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