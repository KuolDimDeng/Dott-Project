'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { useSession } from '@/hooks/useSession-v2';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';
import { getCountryName } from '@/utils/countryMapping';
import { locationApi } from '@/utils/apiClient';
import { 
  CogIcon, 
  MapPinIcon, 
  SparklesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentCheckIcon,
  ClockIcon,
  BuildingOfficeIcon,
  UserIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  CalendarIcon,
  InformationCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

// Step indicator component
const StepIndicator = ({ currentStep, totalSteps, stepTitles }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {[...Array(totalSteps)].map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div key={stepNumber} className="flex-1 relative">
              <div className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${isCompleted ? 'bg-green-600 text-white' : 
                    isCurrent ? 'bg-blue-600 text-white' : 
                    'bg-gray-200 text-gray-600'}
                `}>
                  {isCompleted ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    stepNumber
                  )}
                </div>
                {index < totalSteps - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
              <div className="mt-2">
                <p className={`text-xs font-medium ${
                  isCurrent ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {stepTitles[index]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Tooltip component for field help
const FieldTooltip = ({ text }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        <InformationCircleIcon className="w-4 h-4 text-gray-400 hover:text-gray-600" />
      </div>
      
      {showTooltip && (
        <div className="absolute z-50 bottom-full mb-2 left-0 w-72">
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className="absolute top-full left-4">
                <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                  <path d="M0 0l4 4 4-4z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function TaxSettingsWizard({ onNavigate }) {
  const { user, loading: sessionLoading } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [apiUsage, setApiUsage] = useState({ used: 0, limit: 5, resetsAt: null });
  
  // Step states - each step saves its own data
  const [businessInfo, setBusinessInfo] = useState(null);
  const [taxRates, setTaxRates] = useState(null);
  const [benefits, setBenefits] = useState(null);
  const [filingInfo, setFilingInfo] = useState(null);
  const [finalReview, setFinalReview] = useState(null);
  
  // Claude suggestions state
  const [suggestions, setSuggestions] = useState({});
  
  const totalSteps = 5;
  const stepTitles = [
    'Business Information',
    'Tax Rates',
    'Benefits & Insurance',
    'Filing Information',
    'Review & Confirm'
  ];
  
  // Form data for current step
  const [formData, setFormData] = useState({
    // Step 1: Business Information
    businessName: '',
    businessType: 'retail',
    country: '',
    street: '',
    stateProvince: '',
    city: '',
    postalCode: '',
    emailForDocuments: '',
    phone: '',
    
    // Step 2: Tax Rates
    stateSalesTaxRate: '',
    localSalesTaxRate: '',
    totalSalesTaxRate: '',
    corporateIncomeTaxRate: '',
    personalIncomeTaxBrackets: [],
    hasProgressiveTax: false,
    flatPersonalIncomeTaxRate: '',
    
    // Step 3: Benefits & Insurance
    healthInsuranceRate: '',
    healthInsuranceEmployerRate: '',
    socialSecurityRate: '',
    socialSecurityEmployerRate: '',
    federalPayrollTaxRate: '',
    statePayrollTaxRate: '',
    
    // Step 4: Filing Information
    stateTaxWebsite: '',
    stateTaxAddress: '',
    localTaxWebsite: '',
    localTaxAddress: '',
    federalTaxWebsite: '',
    filingDeadlines: {
      salesTax: '',
      incomeTax: '',
      payrollTax: '',
      corporateTax: ''
    }
  });
  
  // Load API usage
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
      console.error('[TaxSettingsWizard] Error loading API usage:', error);
    }
  }, []);
  
  // Load saved progress
  const loadSavedProgress = useCallback(async (tenantId) => {
    try {
      const response = await fetch(`/api/taxes/wizard-progress?tenantId=${tenantId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.businessInfo) setBusinessInfo(data.businessInfo);
        if (data.taxRates) setTaxRates(data.taxRates);
        if (data.benefits) setBenefits(data.benefits);
        if (data.filingInfo) setFilingInfo(data.filingInfo);
        
        // Jump to the next incomplete step
        if (data.currentStep) {
          setCurrentStep(data.currentStep);
        }
      }
    } catch (error) {
      console.error('[TaxSettingsWizard] Error loading progress:', error);
    }
  }, []);
  
  // Initialize
  useEffect(() => {
    const initialize = async () => {
      try {
        const id = await getSecureTenantId();
        if (id) {
          setTenantId(id);
          
          // Pre-populate form with user data from session
          if (user) {
            const countryCode = user.onboardingProgress?.country || 
                               user.country || 
                               user.business_country || 
                               'US';
            
            const countryName = getCountryName(countryCode);
            
            setFormData(prev => ({
              ...prev,
              businessName: user.onboardingProgress?.businessName || 
                           user.businessName || 
                           user.business_name || '',
              businessType: user.onboardingProgress?.businessType || 
                           user.businessType || 
                           user.business_type || 'retail',
              country: countryName,
              street: user.street || user.address || '',
              stateProvince: user.stateProvince || user.state || '',
              city: user.city || '',
              postalCode: user.postalCode || user.postal_code || '',
              emailForDocuments: user.email || '',
              phone: user.phone || ''
            }));
          }
          
          await loadApiUsage(id);
          await loadSavedProgress(id);
        }
      } catch (error) {
        console.error('[TaxSettingsWizard] Error during initialization:', error);
        toast.error('Failed to initialize. Please try again.');
      } finally {
        setIsInitialized(true);
      }
    };
    
    if (!sessionLoading) {
      initialize();
    }
  }, [user, sessionLoading, loadApiUsage, loadSavedProgress]);
  
  // Get Claude suggestions for current step
  const getStepSuggestions = async (stepData, stepType) => {
    if (apiUsage.used >= apiUsage.limit) {
      toast.error(`Monthly limit reached. Please upgrade your plan or enter data manually.`);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/taxes/wizard-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          stepType,
          stepData,
          previousSteps: {
            businessInfo,
            taxRates,
            benefits,
            filingInfo
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }
      
      const data = await response.json();
      setSuggestions(prev => ({
        ...prev,
        [stepType]: data
      }));
      
      // Apply suggestions to form
      if (data.suggestedData) {
        setFormData(prev => ({
          ...prev,
          ...data.suggestedData
        }));
      }
      
      // Update usage
      setApiUsage(prev => ({
        ...prev,
        used: prev.used + 1
      }));
      
      loadApiUsage(tenantId);
      
      toast.success('AI suggestions retrieved successfully!');
    } catch (error) {
      console.error('[TaxSettingsWizard] Error getting suggestions:', error);
      toast.error('Failed to get suggestions. Please enter data manually.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save current step data
  const saveStepData = async () => {
    let stepData = {};
    let stepKey = '';
    
    switch (currentStep) {
      case 1:
        stepData = {
          businessName: formData.businessName,
          businessType: formData.businessType,
          country: formData.country,
          street: formData.street,
          stateProvince: formData.stateProvince,
          city: formData.city,
          postalCode: formData.postalCode,
          emailForDocuments: formData.emailForDocuments,
          phone: formData.phone
        };
        stepKey = 'businessInfo';
        setBusinessInfo(stepData);
        break;
        
      case 2:
        stepData = {
          stateSalesTaxRate: formData.stateSalesTaxRate,
          localSalesTaxRate: formData.localSalesTaxRate,
          totalSalesTaxRate: formData.totalSalesTaxRate,
          corporateIncomeTaxRate: formData.corporateIncomeTaxRate,
          personalIncomeTaxBrackets: formData.personalIncomeTaxBrackets,
          hasProgressiveTax: formData.hasProgressiveTax,
          flatPersonalIncomeTaxRate: formData.flatPersonalIncomeTaxRate
        };
        stepKey = 'taxRates';
        setTaxRates(stepData);
        break;
        
      case 3:
        stepData = {
          healthInsuranceRate: formData.healthInsuranceRate,
          healthInsuranceEmployerRate: formData.healthInsuranceEmployerRate,
          socialSecurityRate: formData.socialSecurityRate,
          socialSecurityEmployerRate: formData.socialSecurityEmployerRate,
          federalPayrollTaxRate: formData.federalPayrollTaxRate,
          statePayrollTaxRate: formData.statePayrollTaxRate
        };
        stepKey = 'benefits';
        setBenefits(stepData);
        break;
        
      case 4:
        stepData = {
          stateTaxWebsite: formData.stateTaxWebsite,
          stateTaxAddress: formData.stateTaxAddress,
          localTaxWebsite: formData.localTaxWebsite,
          localTaxAddress: formData.localTaxAddress,
          federalTaxWebsite: formData.federalTaxWebsite,
          filingDeadlines: formData.filingDeadlines
        };
        stepKey = 'filingInfo';
        setFilingInfo(stepData);
        break;
    }
    
    // Save to backend
    try {
      const response = await fetch('/api/taxes/wizard-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          currentStep,
          [stepKey]: stepData
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save progress');
      }
      
      toast.success('Progress saved!');
    } catch (error) {
      console.error('[TaxSettingsWizard] Error saving progress:', error);
      toast.error('Failed to save progress. Please try again.');
    }
  };
  
  // Handle navigation
  const handleNext = async () => {
    // Validate current step
    if (!validateCurrentStep()) {
      return;
    }
    
    // Save current step data
    await saveStepData();
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Validate current step
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.country || !formData.stateProvince || !formData.city) {
          toast.error('Please fill in all required fields');
          return false;
        }
        break;
      case 2:
        if (!formData.stateSalesTaxRate && !formData.corporateIncomeTaxRate) {
          toast.error('Please enter at least one tax rate');
          return false;
        }
        break;
    }
    return true;
  };
  
  // Final submission
  const handleFinalSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/taxes/wizard-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          businessInfo,
          taxRates,
          benefits,
          filingInfo,
          suggestions
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save tax settings');
      }
      
      toast.success('Tax settings saved successfully! You are now ready for tax filing.');
      
      // Navigate to tax filing or dashboard
      if (onNavigate) {
        onNavigate('taxFiling');
      }
    } catch (error) {
      console.error('[TaxSettingsWizard] Error saving final settings:', error);
      toast.error('Failed to save tax settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render loading state
  if (sessionLoading || !isInitialized || !tenantId) {
    return <CenteredSpinner size="large" />;
  }
  
  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MapPinIcon className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>
              <p className="text-gray-600 mt-2">Let's start with your business location and contact details</p>
            </div>
            
            {suggestions.businessInfo && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">AI Assistant Says:</p>
                    <p className="text-sm text-blue-700 mt-1">{suggestions.businessInfo.explanation}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                  <FieldTooltip text="Your registered business name" />
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type
                  <FieldTooltip text="Your primary business activity" />
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
                  disabled
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
                  <FieldTooltip text="Country where your business operates" />
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province *
                  <FieldTooltip text="State or province for tax jurisdiction" />
                </label>
                <input
                  type="text"
                  value={formData.stateProvince}
                  onChange={(e) => setFormData({ ...formData, stateProvince: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                  <FieldTooltip text="City for local tax rates" />
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal/Zip Code
                  <FieldTooltip text="Postal code for precise tax determination" />
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                  <FieldTooltip text="Your business street address" />
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email for Tax Documents
                  <FieldTooltip text="Email where tax documents will be sent" />
                </label>
                <input
                  type="email"
                  value={formData.emailForDocuments}
                  onChange={(e) => setFormData({ ...formData, emailForDocuments: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                  <FieldTooltip text="Contact phone for tax matters" />
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CurrencyDollarIcon className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-gray-900">Tax Rates</h2>
              <p className="text-gray-600 mt-2">We'll help you identify the correct tax rates for your location</p>
            </div>
            
            <div className="mb-6">
              <button
                onClick={() => getStepSuggestions(businessInfo, 'taxRates')}
                disabled={isLoading || apiUsage.used >= apiUsage.limit}
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <StandardSpinner size="small" className="mr-2" />
                    Getting Tax Rates...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    Get AI Tax Rate Suggestions
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                {apiUsage.used} of {apiUsage.limit} AI lookups used this month
              </p>
            </div>
            
            {suggestions.taxRates && (
              <div className="mb-6 space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">AI-Suggested Tax Rates</p>
                      <p className="text-sm text-blue-700 mt-1">{suggestions.taxRates.explanation}</p>
                      {suggestions.taxRates.confidence && (
                        <div className="mt-2 flex items-center">
                          <span className="text-xs text-blue-600">Confidence: </span>
                          <div className="ml-2 flex-1 max-w-xs bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${suggestions.taxRates.confidence}%` }}
                            />
                          </div>
                          <span className="ml-2 text-xs text-blue-600">{suggestions.taxRates.confidence}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {suggestions.taxRates.sources && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                      <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                      Sources
                    </h4>
                    <div className="space-y-1">
                      {suggestions.taxRates.sources.map((source, idx) => (
                        <div key={idx} className="text-xs text-gray-600">
                          • {source.name}
                          {source.url && (
                            <a href={source.url} target="_blank" rel="noopener noreferrer" 
                               className="ml-1 text-blue-600 hover:underline">
                              View Source
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-6">
              {/* Sales Tax */}
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-3">Sales Tax Rates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State Sales Tax (%)
                    </label>
                    <input
                      type="number"
                      value={formData.stateSalesTaxRate}
                      onChange={(e) => {
                        const state = parseFloat(e.target.value) || 0;
                        const local = parseFloat(formData.localSalesTaxRate) || 0;
                        setFormData({
                          ...formData,
                          stateSalesTaxRate: e.target.value,
                          totalSalesTaxRate: (state + local).toFixed(2)
                        });
                      }}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Local Sales Tax (%)
                    </label>
                    <input
                      type="number"
                      value={formData.localSalesTaxRate}
                      onChange={(e) => {
                        const state = parseFloat(formData.stateSalesTaxRate) || 0;
                        const local = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          localSalesTaxRate: e.target.value,
                          totalSalesTaxRate: (state + local).toFixed(2)
                        });
                      }}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Sales Tax (%)
                    </label>
                    <input
                      type="number"
                      value={formData.totalSalesTaxRate}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              
              {/* Corporate Income Tax */}
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-3">Corporate Income Tax</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Corporate Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      value={formData.corporateIncomeTaxRate}
                      onChange={(e) => setFormData({ ...formData, corporateIncomeTaxRate: e.target.value })}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              
              {/* Personal Income Tax */}
              {formData.hasProgressiveTax !== undefined && (
                <div>
                  <h3 className="text-md font-medium text-gray-800 mb-3">Personal Income Tax</h3>
                  {formData.hasProgressiveTax ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">Progressive tax system with brackets</p>
                      {/* Progressive tax brackets UI here */}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Flat Tax Rate (%)
                        </label>
                        <input
                          type="number"
                          value={formData.flatPersonalIncomeTaxRate}
                          onChange={(e) => setFormData({ ...formData, flatPersonalIncomeTaxRate: e.target.value })}
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <BriefcaseIcon className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-gray-900">Benefits & Insurance</h2>
              <p className="text-gray-600 mt-2">Configure social insurance and payroll tax rates</p>
            </div>
            
            <div className="mb-6">
              <button
                onClick={() => getStepSuggestions({ businessInfo, taxRates }, 'benefits')}
                disabled={isLoading || apiUsage.used >= apiUsage.limit}
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <StandardSpinner size="small" className="mr-2" />
                    Getting Benefits Info...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    Get AI Benefits Suggestions
                  </>
                )}
              </button>
            </div>
            
            {suggestions.benefits && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">AI-Suggested Benefits Rates</p>
                    <p className="text-sm text-blue-700 mt-1">{suggestions.benefits.explanation}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-6">
              {/* Health Insurance */}
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-3">Health Insurance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee Rate (%)
                    </label>
                    <input
                      type="number"
                      value={formData.healthInsuranceRate}
                      onChange={(e) => setFormData({ ...formData, healthInsuranceRate: e.target.value })}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employer Rate (%)
                    </label>
                    <input
                      type="number"
                      value={formData.healthInsuranceEmployerRate}
                      onChange={(e) => setFormData({ ...formData, healthInsuranceEmployerRate: e.target.value })}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              
              {/* Social Security */}
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-3">Social Security</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee Rate (%)
                    </label>
                    <input
                      type="number"
                      value={formData.socialSecurityRate}
                      onChange={(e) => setFormData({ ...formData, socialSecurityRate: e.target.value })}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employer Rate (%)
                    </label>
                    <input
                      type="number"
                      value={formData.socialSecurityEmployerRate}
                      onChange={(e) => setFormData({ ...formData, socialSecurityEmployerRate: e.target.value })}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              
              {/* Payroll Tax */}
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-3">Payroll Tax</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Federal Payroll Tax (%)
                    </label>
                    <input
                      type="number"
                      value={formData.federalPayrollTaxRate}
                      onChange={(e) => setFormData({ ...formData, federalPayrollTaxRate: e.target.value })}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State Payroll Tax (%)
                    </label>
                    <input
                      type="number"
                      value={formData.statePayrollTaxRate}
                      onChange={(e) => setFormData({ ...formData, statePayrollTaxRate: e.target.value })}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CalendarIcon className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-gray-900">Filing Information</h2>
              <p className="text-gray-600 mt-2">Tax filing websites, addresses, and deadlines</p>
            </div>
            
            <div className="mb-6">
              <button
                onClick={() => getStepSuggestions({ businessInfo, taxRates, benefits }, 'filingInfo')}
                disabled={isLoading || apiUsage.used >= apiUsage.limit}
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <StandardSpinner size="small" className="mr-2" />
                    Getting Filing Info...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    Get AI Filing Information
                  </>
                )}
              </button>
            </div>
            
            {suggestions.filingInfo && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">AI-Suggested Filing Information</p>
                    <p className="text-sm text-blue-700 mt-1">{suggestions.filingInfo.explanation}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-6">
              {/* Federal Tax Filing */}
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-3">Federal Tax Filing</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Federal Tax Website
                    </label>
                    <input
                      type="url"
                      value={formData.federalTaxWebsite}
                      onChange={(e) => setFormData({ ...formData, federalTaxWebsite: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
              
              {/* State Tax Filing */}
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-3">State Tax Filing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State Tax Website
                    </label>
                    <input
                      type="url"
                      value={formData.stateTaxWebsite}
                      onChange={(e) => setFormData({ ...formData, stateTaxWebsite: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State Tax Office Address
                    </label>
                    <input
                      type="text"
                      value={formData.stateTaxAddress}
                      onChange={(e) => setFormData({ ...formData, stateTaxAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Physical address..."
                    />
                  </div>
                </div>
              </div>
              
              {/* Local Tax Filing */}
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-3">Local Tax Filing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Local Tax Website
                    </label>
                    <input
                      type="url"
                      value={formData.localTaxWebsite}
                      onChange={(e) => setFormData({ ...formData, localTaxWebsite: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Local Tax Office Address
                    </label>
                    <input
                      type="text"
                      value={formData.localTaxAddress}
                      onChange={(e) => setFormData({ ...formData, localTaxAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Physical address..."
                    />
                  </div>
                </div>
              </div>
              
              {/* Filing Deadlines */}
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-3">Filing Deadlines</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sales Tax Deadline
                    </label>
                    <input
                      type="text"
                      value={formData.filingDeadlines.salesTax}
                      onChange={(e) => setFormData({
                        ...formData,
                        filingDeadlines: { ...formData.filingDeadlines, salesTax: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Monthly, 20th"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Income Tax Deadline
                    </label>
                    <input
                      type="text"
                      value={formData.filingDeadlines.incomeTax}
                      onChange={(e) => setFormData({
                        ...formData,
                        filingDeadlines: { ...formData.filingDeadlines, incomeTax: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., April 15"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payroll Tax Deadline
                    </label>
                    <input
                      type="text"
                      value={formData.filingDeadlines.payrollTax}
                      onChange={(e) => setFormData({
                        ...formData,
                        filingDeadlines: { ...formData.filingDeadlines, payrollTax: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Quarterly"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Corporate Tax Deadline
                    </label>
                    <input
                      type="text"
                      value={formData.filingDeadlines.corporateTax}
                      onChange={(e) => setFormData({
                        ...formData,
                        filingDeadlines: { ...formData.filingDeadlines, corporateTax: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., March 15"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <DocumentCheckIcon className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-gray-900">Review & Confirm</h2>
              <p className="text-gray-600 mt-2">Review all your tax information before finalizing</p>
            </div>
            
            <div className="space-y-6">
              {/* Business Information Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2 text-gray-600" />
                  Business Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Business Name:</span>
                    <span className="ml-2 text-gray-900">{businessInfo?.businessName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 text-gray-900">{businessInfo?.businessType}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Location:</span>
                    <span className="ml-2 text-gray-900">
                      {businessInfo?.city}, {businessInfo?.stateProvince}, {businessInfo?.country}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tax Email:</span>
                    <span className="ml-2 text-gray-900">{businessInfo?.emailForDocuments}</span>
                  </div>
                </div>
              </div>
              
              {/* Tax Rates Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <CurrencyDollarIcon className="h-5 w-5 mr-2 text-gray-600" />
                  Tax Rates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Sales Tax:</span>
                    <span className="ml-2 text-gray-900 font-medium">{taxRates?.totalSalesTaxRate}%</span>
                    <span className="text-xs text-gray-500 ml-1">
                      ({taxRates?.stateSalesTaxRate}% state + {taxRates?.localSalesTaxRate}% local)
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Corporate Tax:</span>
                    <span className="ml-2 text-gray-900 font-medium">{taxRates?.corporateIncomeTaxRate}%</span>
                  </div>
                  {taxRates?.hasProgressiveTax !== undefined && (
                    <div>
                      <span className="text-gray-600">Personal Income Tax:</span>
                      <span className="ml-2 text-gray-900 font-medium">
                        {taxRates?.hasProgressiveTax 
                          ? `Progressive (${taxRates?.personalIncomeTaxBrackets?.length || 0} brackets)`
                          : `Flat ${taxRates?.flatPersonalIncomeTaxRate}%`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Benefits Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <BriefcaseIcon className="h-5 w-5 mr-2 text-gray-600" />
                  Benefits & Insurance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Health Insurance:</span>
                    <span className="ml-2 text-gray-900">
                      {benefits?.healthInsuranceRate}% employee + {benefits?.healthInsuranceEmployerRate}% employer
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Social Security:</span>
                    <span className="ml-2 text-gray-900">
                      {benefits?.socialSecurityRate}% employee + {benefits?.socialSecurityEmployerRate}% employer
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Payroll Tax:</span>
                    <span className="ml-2 text-gray-900">
                      {benefits?.federalPayrollTaxRate}% federal + {benefits?.statePayrollTaxRate}% state
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Filing Information Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2 text-gray-600" />
                  Filing Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Key Deadlines:</span>
                    <ul className="mt-1 ml-4 space-y-1">
                      <li className="text-gray-900">
                        Sales Tax: {filingInfo?.filingDeadlines?.salesTax || 'Not specified'}
                      </li>
                      <li className="text-gray-900">
                        Income Tax: {filingInfo?.filingDeadlines?.incomeTax || 'Not specified'}
                      </li>
                      <li className="text-gray-900">
                        Payroll Tax: {filingInfo?.filingDeadlines?.payrollTax || 'Not specified'}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Confirmation */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-start">
                  <ExclamationCircleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900">Important Notice</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      By confirming, you acknowledge that this tax information will be used throughout the application 
                      for calculations and filing. You are responsible for ensuring all rates are accurate and compliant 
                      with current tax laws in your jurisdiction.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <CogIcon className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tax Settings Setup Wizard</h1>
            <p className="text-gray-600">Let's configure your tax settings step by step</p>
          </div>
        </div>
      </div>
      
      {/* Step Indicator */}
      <StepIndicator 
        currentStep={currentStep} 
        totalSteps={totalSteps} 
        stepTitles={stepTitles}
      />
      
      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {renderStepContent()}
      </div>
      
      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="flex items-center px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Previous
        </button>
        
        <div className="flex items-center space-x-3">
          {currentStep < totalSteps ? (
            <>
              <button
                onClick={() => saveStepData()}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Save Progress
              </button>
              <button
                onClick={handleNext}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </button>
            </>
          ) : (
            <button
              onClick={handleFinalSubmit}
              disabled={isLoading}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <StandardSpinner size="small" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Complete Setup
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}