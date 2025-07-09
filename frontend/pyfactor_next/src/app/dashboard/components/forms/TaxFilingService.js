'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { useSession } from '@/hooks/useSession-v2';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';
import { DEVELOPING_COUNTRIES } from '@/services/countryDetectionService';
import { 
  DocumentTextIcon,
  SparklesIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentCheckIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  UserGroupIcon,
  ComputerDesktopIcon,
  CogIcon
} from '@heroicons/react/24/outline';

const TAX_TYPES = {
  sales: {
    name: 'Sales Tax',
    icon: CurrencyDollarIcon,
    filingFrequency: ['Monthly', 'Quarterly', 'Annual'],
    description: 'State and local sales tax returns'
  },
  payroll: {
    name: 'Payroll Tax',
    icon: UserGroupIcon,
    filingFrequency: ['Quarterly', 'Annual'],
    forms: ['941', '940', 'W-2', 'W-3'],
    description: 'Federal and state payroll tax filings'
  },
  income: {
    name: 'Income Tax',
    icon: DocumentTextIcon,
    filingFrequency: ['Annual'],
    forms: ['1120', '1120S', '1065', '1040 Schedule C'],
    description: 'Business income tax returns'
  }
};

const SERVICE_PRICING = {
  sales: {
    fullService: {
      base: 75,
      quarterly: 75,
      annual: 300,
      multiState: 200,
      description: 'We handle everything - preparation, review, and filing',
      features: [
        'Tax form preparation by experts',
        'Accuracy guarantee',
        'E-filing included',
        'Audit support for 3 years',
        'Status tracking',
        'Filing confirmation'
      ]
    },
    selfService: {
      base: 35,
      quarterly: 35,
      annual: 140,
      multiState: 100,
      description: 'We guide you through the process step-by-step',
      features: [
        'Step-by-step guidance',
        'Form validation',
        'E-filing submission',
        'Basic support',
        'Filing confirmation'
      ]
    }
  },
  payroll: {
    fullService: {
      base: 125,
      quarterly941: 125,
      annual940: 150,
      completePackage: 450,
      description: 'Complete payroll tax filing service',
      features: [
        'Form 941/940 preparation',
        'State filing included',
        'E-filing and deposits',
        'Penalty protection',
        'Compliance guarantee'
      ]
    },
    selfService: {
      base: 65,
      quarterly941: 65,
      annual940: 85,
      completePackage: 250,
      description: 'Guided payroll tax filing',
      features: [
        'Step-by-step filing',
        'Auto-calculations',
        'E-filing support',
        'Basic compliance help'
      ]
    }
  },
  income: {
    fullService: {
      base: 250,
      soleProprietor: 250,
      llcSCorp: 395,
      cCorp: 595,
      perState: 75,
      description: 'Professional income tax preparation',
      features: [
        'Complete tax return preparation',
        'Deduction maximization',
        'Multi-state filing',
        'Tax planning included',
        'Audit representation'
      ]
    },
    selfService: {
      base: 125,
      soleProprietor: 125,
      llcSCorp: 195,
      cCorp: 295,
      perState: 50,
      description: 'Guided income tax filing',
      features: [
        'Interview-based filing',
        'Deduction finder',
        'Error checking',
        'E-filing included'
      ]
    }
  },
  yearEnd: {
    fullService: {
      base: 0,
      perForm: 2,
      minimum: 25,
      description: 'W-2/1099 generation and filing',
      features: [
        'W-2/1099 preparation',
        'E-filing to IRS/SSA',
        'State filing',
        'Employee distribution'
      ]
    },
    selfService: {
      base: 0,
      perForm: 1,
      minimum: 15,
      description: 'DIY W-2/1099 generation',
      features: [
        'Form generation',
        'E-filing support',
        'Bulk processing'
      ]
    }
  }
};

export default function TaxFilingService({ onNavigate }) {
  const { user, loading: sessionLoading } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  
  // Eligibility state
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [eligibilityResults, setEligibilityResults] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  
  // Service selection state
  const [selectedTaxType, setSelectedTaxType] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [filingDetails, setFilingDetails] = useState({
    period: '',
    dueDate: '',
    estimatedRefund: null,
    estimatedOwed: null,
    formType: '',
    formCount: 0
  });
  
  // Tax settings from configuration
  const [taxSettings, setTaxSettings] = useState(null);
  
  // Pricing state
  const [pricingDisplay, setPricingDisplay] = useState({
    fullService: { loading: false, price: 0, originalPrice: 0, discount: 0 },
    selfService: { loading: false, price: 0, originalPrice: 0, discount: 0 }
  });
  
  // Initialize
  useEffect(() => {
    const initialize = async () => {
      try {
        const id = await getSecureTenantId();
        if (id) {
          setTenantId(id);
          await loadTaxSettings(id);
        }
      } catch (error) {
        console.error('[TaxFilingService] Error during initialization:', error);
        toast.error('Failed to initialize tax filing service');
      }
    };
    
    if (!sessionLoading) {
      initialize();
    }
  }, [sessionLoading]);
  
  // Load tax settings
  const loadTaxSettings = async (tenantId) => {
    try {
      const response = await fetch(`/api/taxes/settings?tenantId=${tenantId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTaxSettings(data);
      }
    } catch (error) {
      console.error('[TaxFilingService] Error loading tax settings:', error);
    }
  };
  
  // Check eligibility with Claude AI
  const checkEligibility = async () => {
    setCheckingEligibility(true);
    
    try {
      const response = await fetch('/api/taxes/filing/eligibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          taxSettings,
          businessInfo: {
            type: user?.businessType,
            structure: user?.businessStructure,
            state: user?.stateProvince,
            country: user?.country
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to check eligibility');
      }
      
      const results = await response.json();
      setEligibilityResults(results);
      setEligibilityChecked(true);
      
      if (results.eligible) {
        toast.success('Great news! You\'re eligible for direct filing.');
      } else {
        toast.info('Direct filing not available for all tax types.');
      }
      
    } catch (error) {
      console.error('[TaxFilingService] Error checking eligibility:', error);
      toast.error('Failed to check filing eligibility');
    } finally {
      setCheckingEligibility(false);
    }
  };
  
  // Get user's country and check if eligible for developing country discount
  const getUserCountryAndDiscount = useCallback(async () => {
    try {
      // First check if we have business country info
      const response = await fetch('/api/user/business', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const businessData = await response.json();
        const country = businessData.country || 'US';
        
        // Check if country is in developing countries list
        const isDeveloping = DEVELOPING_COUNTRIES.includes(country);
        
        return { country, isDeveloping, discount: isDeveloping ? 0.5 : 1.0 };
      }
    } catch (error) {
      console.error('[TaxFilingService] Error fetching country info:', error);
    }
    
    // Default to US with no discount
    return { country: 'US', isDeveloping: false, discount: 1.0 };
  }, []);

  // Calculate pricing based on tax type, service type, and complexity
  const calculatePricing = useCallback(async (taxType, serviceType) => {
    // Get country discount
    const { discount, isDeveloping } = await getUserCountryAndDiscount();
    
    // Get base pricing for the specific tax type and service
    const pricingCategory = SERVICE_PRICING[taxType]?.[serviceType];
    if (!pricingCategory) {
      console.error('[TaxFilingService] Invalid tax type or service type:', taxType, serviceType);
      return 0;
    }
    
    let basePrice = pricingCategory.base;
    let complexityMultiplier = 1;
    
    // Specific pricing based on tax type and filing details
    if (taxType === 'sales') {
      if (filingDetails.period === 'quarterly') {
        basePrice = pricingCategory.quarterly;
      } else if (filingDetails.period === 'annual') {
        basePrice = pricingCategory.annual;
      } else if (eligibilityResults?.multiState) {
        basePrice = pricingCategory.multiState;
      }
    }
    
    if (taxType === 'payroll') {
      if (filingDetails.formType === '941') {
        basePrice = pricingCategory.quarterly941;
      } else if (filingDetails.formType === '940') {
        basePrice = pricingCategory.annual940;
      } else if (filingDetails.formType === 'complete') {
        basePrice = pricingCategory.completePackage;
      }
    }
    
    if (taxType === 'income') {
      const businessStructure = user?.businessStructure || 'sole_proprietor';
      if (businessStructure === 'sole_proprietor') {
        basePrice = pricingCategory.soleProprietor;
      } else if (businessStructure === 'llc' || businessStructure === 's_corp') {
        basePrice = pricingCategory.llcSCorp;
      } else if (businessStructure === 'c_corp') {
        basePrice = pricingCategory.cCorp;
      }
      
      // Add per-state charges for multi-state
      if (eligibilityResults?.multiState && eligibilityResults?.stateCount > 1) {
        basePrice += (eligibilityResults.stateCount - 1) * pricingCategory.perState;
      }
    }
    
    if (taxType === 'yearEnd') {
      const formCount = filingDetails.formCount || 10;
      basePrice = Math.max(
        formCount * pricingCategory.perForm,
        pricingCategory.minimum
      );
    }
    
    // Apply complexity multipliers
    if (eligibilityResults?.highComplexity) {
      complexityMultiplier = 1.5;
    } else if (eligibilityResults?.mediumComplexity) {
      complexityMultiplier = 1.2;
    }
    
    // Calculate final price with discount
    const finalPrice = Math.round(basePrice * complexityMultiplier * discount);
    
    return {
      basePrice: Math.round(basePrice),
      complexityMultiplier,
      discount: isDeveloping ? 50 : 0,
      finalPrice,
      isDeveloping
    };
  }, [user, eligibilityResults, filingDetails, getUserCountryAndDiscount]);
  
  // Start filing process
  const startFiling = async () => {
    if (!selectedTaxType || !selectedService) {
      toast.error('Please select a tax type and service option');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Calculate pricing with discount
      const pricingInfo = await calculatePricing(selectedTaxType, selectedService);
      
      const response = await fetch('/api/taxes/filing/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          taxType: selectedTaxType,
          serviceType: selectedService,
          price: pricingInfo.finalPrice,
          basePrice: pricingInfo.basePrice,
          complexityMultiplier: pricingInfo.complexityMultiplier,
          discountPercentage: pricingInfo.discount,
          isDeveloping: pricingInfo.isDeveloping,
          period: filingDetails.period,
          dueDate: filingDetails.dueDate,
          formType: filingDetails.formType,
          formCount: filingDetails.formCount
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to initiate filing');
      }
      
      const result = await response.json();
      
      // Redirect to payment or filing workflow
      if (result.paymentRequired) {
        window.location.href = result.paymentUrl;
      } else {
        onNavigate('taxFilingWorkflow', { filingId: result.filingId });
      }
      
    } catch (error) {
      console.error('[TaxFilingService] Error starting filing:', error);
      toast.error('Failed to start filing process');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update pricing display when tax type or details change
  useEffect(() => {
    const updatePricingDisplay = async () => {
      if (!selectedTaxType) return;
      
      setPricingDisplay(prev => ({
        fullService: { ...prev.fullService, loading: true },
        selfService: { ...prev.selfService, loading: true }
      }));
      
      try {
        // Calculate pricing for both service types
        const [fullServicePricing, selfServicePricing] = await Promise.all([
          calculatePricing(selectedTaxType, 'fullService'),
          calculatePricing(selectedTaxType, 'selfService')
        ]);
        
        setPricingDisplay({
          fullService: {
            loading: false,
            price: fullServicePricing.finalPrice,
            originalPrice: fullServicePricing.basePrice,
            discount: fullServicePricing.discount
          },
          selfService: {
            loading: false,
            price: selfServicePricing.finalPrice,
            originalPrice: selfServicePricing.basePrice,
            discount: selfServicePricing.discount
          }
        });
      } catch (error) {
        console.error('[TaxFilingService] Error updating pricing display:', error);
        setPricingDisplay(prev => ({
          fullService: { ...prev.fullService, loading: false },
          selfService: { ...prev.selfService, loading: false }
        }));
      }
    };
    
    updatePricingDisplay();
  }, [selectedTaxType, filingDetails, eligibilityResults, calculatePricing]);
  
  if (sessionLoading || !tenantId) {
    return <CenteredSpinner size="large" text="Loading tax filing service..." showText={true} />;
  }
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <DocumentCheckIcon className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tax Filing Service</h1>
            <p className="text-gray-600">File your taxes with confidence - AI-powered assistance</p>
          </div>
        </div>
      </div>
      
      {/* Tax Settings Completeness Check */}
      {!taxSettings && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mt-1 mr-3" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-yellow-900 mb-2">
                Tax Settings Required
              </h3>
              <p className="text-yellow-700 mb-4">
                Before you can file your taxes, you need to complete your tax settings configuration. 
                This ensures we have all the necessary information for accurate filing.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-yellow-700">
                  <span className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></span>
                  Business information and location
                </div>
                <div className="flex items-center text-yellow-700">
                  <span className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></span>
                  Tax rates for your jurisdiction
                </div>
                <div className="flex items-center text-yellow-700">
                  <span className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></span>
                  Benefits and payroll tax configuration
                </div>
                <div className="flex items-center text-yellow-700">
                  <span className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></span>
                  Filing information and deadlines
                </div>
              </div>
              <button
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('tax-settings');
                  }
                }}
                className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                <CogIcon className="h-5 w-5 mr-2" />
                Complete Tax Settings First
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Eligibility Check */}
      {taxSettings && !eligibilityChecked && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="text-center py-8">
            <SparklesIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Check Your Filing Eligibility
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Our AI will analyze your tax configuration to determine which tax types you can file directly through our platform.
            </p>
            
            <button
              onClick={checkEligibility}
              disabled={checkingEligibility}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {checkingEligibility ? (
                <>
                  <StandardSpinner size="small" className="mr-2" />
                  Checking Eligibility...
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-5 w-5 mr-2" />
                  Check Eligibility
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Eligibility Results */}
      {taxSettings && eligibilityResults && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600" />
            Eligibility Results
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(TAX_TYPES).map(([key, type]) => {
              const eligible = eligibilityResults.taxTypes?.[key]?.eligible;
              const Icon = type.icon;
              
              return (
                <div
                  key={key}
                  className={`p-4 rounded-lg border-2 ${
                    eligible 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-6 w-6 ${eligible ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      eligible 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {eligible ? 'Eligible' : 'Not Available'}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900">{type.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  
                  {eligible && eligibilityResults.taxTypes[key].nextDeadline && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      Due: {new Date(eligibilityResults.taxTypes[key].nextDeadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          
          {eligibilityResults.warnings && eligibilityResults.warnings.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 mb-2">Important Notes:</p>
              <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                {eligibilityResults.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Step 2: Select Tax Type and Service */}
      {eligibilityChecked && eligibilityResults?.eligible && (
        <>
          {/* Tax Type Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Select Tax Type to File
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(TAX_TYPES).map(([key, type]) => {
                if (!eligibilityResults.taxTypes?.[key]?.eligible) return null;
                
                const Icon = type.icon;
                const isSelected = selectedTaxType === key;
                
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedTaxType(key)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                    <h3 className="font-medium text-gray-900">{type.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Service Type Selection */}
          {taxSettings && selectedTaxType && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Choose Your Service Level
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Service Option */}
                <div
                  className={`rounded-lg border-2 p-6 cursor-pointer transition-all ${
                    selectedService === 'fullService'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedService('fullService')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <UserGroupIcon className="h-8 w-8 text-blue-600" />
                    <div className="text-right">
                      {pricingDisplay.fullService.loading ? (
                        <StandardSpinner size="small" />
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-gray-900">
                            ${pricingDisplay.fullService.price}
                            {pricingDisplay.fullService.discount > 0 && (
                              <span className="text-sm text-green-600 ml-2">
                                ({pricingDisplay.fullService.discount}% off)
                              </span>
                            )}
                          </p>
                          {pricingDisplay.fullService.discount > 0 && (
                            <p className="text-sm text-gray-500 line-through">
                              ${pricingDisplay.fullService.originalPrice}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">per filing</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Full Service Filing
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {SERVICE_PRICING.fullService.description}
                  </p>
                  
                  <ul className="space-y-2">
                    {SERVICE_PRICING.fullService.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-700 font-medium">
                      Recommended for complex filings or first-time filers
                    </p>
                  </div>
                </div>
                
                {/* Self Service Option */}
                <div
                  className={`rounded-lg border-2 p-6 cursor-pointer transition-all ${
                    selectedService === 'selfService'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedService('selfService')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <ComputerDesktopIcon className="h-8 w-8 text-purple-600" />
                    <div className="text-right">
                      {pricingDisplay.selfService.loading ? (
                        <StandardSpinner size="small" />
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-gray-900">
                            ${pricingDisplay.selfService.price}
                            {pricingDisplay.selfService.discount > 0 && (
                              <span className="text-sm text-green-600 ml-2">
                                ({pricingDisplay.selfService.discount}% off)
                              </span>
                            )}
                          </p>
                          {pricingDisplay.selfService.discount > 0 && (
                            <p className="text-sm text-gray-500 line-through">
                              ${pricingDisplay.selfService.originalPrice}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">per filing</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Self Service Filing
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {SERVICE_PRICING.selfService.description}
                  </p>
                  
                  <ul className="space-y-2">
                    {SERVICE_PRICING.selfService.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-700 font-medium">
                      Perfect for experienced filers who want guidance
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Pricing Note */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 flex items-start">
                  <InformationCircleIcon className="h-4 w-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                  Pricing may vary based on business complexity, number of forms, and multi-state filing requirements.
                </p>
              </div>
            </div>
          )}
          
          {/* Action Button */}
          {selectedTaxType && selectedService && (
            <div className="flex justify-end">
              <button
                onClick={startFiling}
                disabled={isLoading}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <StandardSpinner size="small" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Filing
                    <ArrowRightIcon className="h-5 w-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}