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
  PencilIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  BuildingOfficeIcon,
  UserIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  BuildingStorefrontIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
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
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function TaxSettings({ onNavigate }) {
  const { user, loading: sessionLoading } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Location-based tax support
  const [locations, setLocations] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [locationTaxProfiles, setLocationTaxProfiles] = useState({});
  const [loadingLocations, setLoadingLocations] = useState(false);
  
  // Industry-specific tax settings
  const [industrySpecificSettings, setIndustrySpecificSettings] = useState({});
  const [showIndustrySettings, setShowIndustrySettings] = useState(false);
  
  // Validation and compliance
  const [validationErrors, setValidationErrors] = useState({});
  const [complianceWarnings, setComplianceWarnings] = useState([]);
  
  // Historical rate tracking
  const [taxHistory, setTaxHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // UI State - Progressive disclosure
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    sales: false,
    income: false,
    payroll: false,
    insurance: false,
    filing: false,
    multiLocation: false,
    industrySpecific: false,
    history: false
  });
  
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
  
  // Manual override and feedback
  const [manualOverrideMode, setManualOverrideMode] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    type: '',
    details: '',
    inaccurateFields: [],
    suggestedSources: ''
  });
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
            // Keep user data for core fields, only update additional fields if empty
            country: data.businessInfo.country || prev.country,
            street: data.businessInfo.street || prev.street,
            stateProvince: data.businessInfo.stateProvince || prev.stateProvince,
            city: data.businessInfo.city || prev.city,
            postalCode: data.businessInfo.postalCode || prev.postalCode,
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
  
  // Load locations for multi-location support
  const loadLocations = useCallback(async () => {
    try {
      setLoadingLocations(true);
      const data = await locationApi.getAll();
      let locationsList = [];
      
      if (Array.isArray(data)) {
        locationsList = data;
      } else if (data && Array.isArray(data.results)) {
        locationsList = data.results;
      } else if (data && Array.isArray(data.data)) {
        locationsList = data.data;
      }
      
      setLocations(locationsList.filter(loc => loc.is_active));
    } catch (error) {
      console.error('[TaxSettings] Error loading locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setLoadingLocations(false);
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
            console.log('[TaxSettings] Initializing with user data:', user);
            
            // Try to get additional profile data first
            let profileData = null;
            try {
              const profileResponse = await fetch('/api/user/profile');
              if (profileResponse.ok) {
                profileData = await profileResponse.json();
                console.log('[TaxSettings] Profile data loaded:', profileData);
              }
            } catch (profileError) {
              console.warn('[TaxSettings] Could not load profile data:', profileError);
            }
            
            // Get country from multiple possible locations with more comprehensive search
            const countryCode = user.onboardingProgress?.country || 
                               user.country || 
                               user.business_country || 
                               user.businessCountry ||
                               user.userCountry ||
                               user.profile?.country ||
                               user.business?.country ||
                               user.businessDetails?.country ||
                               user.address?.country ||
                               user.business_address?.country ||
                               user.businessAddress?.country ||
                               profileData?.address?.country ||
                               profileData?.country ||
                               profileData?.business_country ||
                               profileData?.tenant?.address?.country ||
                               'US'; // Default to US if no country found
            
            const countryName = getCountryName(countryCode);
            console.log('[TaxSettings] Country resolved:', { countryCode, countryName });
            
            // Get business info from onboarding progress if available
            const onboarding = user.onboardingProgress || {};
            
            // Enhanced address resolution
            const addressData = user.address || profileData?.address || {};
            
            const initialFormData = {
              businessName: onboarding.businessName || 
                           user.businessName || 
                           user.business_name || 
                           profileData?.businessName || 
                           profileData?.business_name || '',
              businessType: onboarding.businessType || 
                           user.businessType || 
                           user.business_type || 
                           profileData?.businessType || 
                           profileData?.business_type || 'retail',
              country: countryName,
              street: user.street || 
                     user.address || 
                     addressData.street || 
                     onboarding.address || 
                     profileData?.address?.street || '',
              stateProvince: user.stateProvince || 
                            user.state_province || 
                            user.state || 
                            addressData.state || 
                            onboarding.state || 
                            profileData?.address?.state || '',
              city: user.city || 
                   addressData.city || 
                   onboarding.city || 
                   profileData?.address?.city || '',
              postalCode: user.postalCode || 
                         user.postal_code || 
                         user.zip_code || 
                         addressData.zipCode || 
                         addressData.zip_code || 
                         onboarding.postalCode || 
                         profileData?.address?.zipCode || '',
              emailForDocuments: user.email || profileData?.email || '',
              phone: user.phone || 
                    user.phone_number || 
                    onboarding.phone || 
                    profileData?.phone || 
                    profileData?.phone_number || ''
            };
            
            console.log('[TaxSettings] Initial form data:', initialFormData);
            
            setFormData(prev => ({
              ...prev,
              ...initialFormData
            }));
          }
          
          // Load existing tax settings and usage info
          await loadTaxSettings(id);
          await loadApiUsage(id);
          await loadLocations();
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
  }, [user, sessionLoading, loadTaxSettings, loadApiUsage, loadLocations]);
  
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
  
  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Handle location selection
  const handleLocationToggle = (locationId) => {
    setSelectedLocations(prev => {
      if (prev.includes(locationId)) {
        // Remove location and its tax profile
        const newLocations = prev.filter(id => id !== locationId);
        setLocationTaxProfiles(profiles => {
          const newProfiles = { ...profiles };
          delete newProfiles[locationId];
          return newProfiles;
        });
        return newLocations;
      } else {
        // Add location and initialize tax profile
        setLocationTaxProfiles(profiles => ({
          ...profiles,
          [locationId]: {
            inheritFromMain: true,
            customRates: {}
          }
        }));
        return [...prev, locationId];
      }
    });
  };
  
  // Validate tax rates
  const validateTaxRates = useCallback(() => {
    const errors = {};
    const warnings = [];
    
    // Sales tax validation
    const totalSales = parseFloat(customRates.totalSalesTaxRate) || 0;
    if (totalSales > 15) {
      warnings.push({
        type: 'sales',
        message: 'Total sales tax rate exceeds 15%. Please verify this is correct for your jurisdiction.'
      });
    }
    
    // Corporate tax validation
    const corpRate = parseFloat(customRates.corporateIncomeTaxRate) || 0;
    if (corpRate > 40) {
      warnings.push({
        type: 'corporate',
        message: 'Corporate tax rate exceeds 40%. This is unusually high - please verify.'
      });
    }
    
    // Payroll tax validation
    const federalPayroll = parseFloat(customRates.federalPayrollTaxRate) || 0;
    const statePayroll = parseFloat(customRates.statePayrollTaxRate) || 0;
    if (federalPayroll + statePayroll > 30) {
      warnings.push({
        type: 'payroll',
        message: 'Combined payroll tax exceeds 30%. Please verify these rates.'
      });
    }
    
    // Progressive tax bracket validation
    if (customRates.hasProgressiveTax && customRates.personalIncomeTaxBrackets) {
      customRates.personalIncomeTaxBrackets.forEach((bracket, idx) => {
        if (!bracket.minIncome || !bracket.rate) {
          errors[`bracket_${idx}`] = 'Income bracket missing required fields';
        }
        if (idx > 0) {
          const prevBracket = customRates.personalIncomeTaxBrackets[idx - 1];
          if (parseFloat(bracket.minIncome) <= parseFloat(prevBracket.maxIncome || 0)) {
            errors[`bracket_${idx}_overlap`] = 'Income brackets overlap';
          }
        }
      });
    }
    
    setValidationErrors(errors);
    setComplianceWarnings(warnings);
    
    return Object.keys(errors).length === 0;
  }, [customRates]);
  
  // Export tax configuration
  const exportTaxConfiguration = () => {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      businessInfo: formData,
      taxRates: customRates,
      locations: selectedLocations.map(locId => {
        const location = locations.find(l => l.id === locId);
        return {
          id: locId,
          name: location?.name,
          address: location?.address,
          taxProfile: locationTaxProfiles[locId]
        };
      }),
      industrySettings: industrySpecificSettings,
      metadata: {
        lastModified: new Date().toISOString(),
        exportedBy: user?.email
      }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `tax-config-${formData.businessName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Tax configuration exported successfully');
  };
  
  // Import tax configuration
  const importTaxConfiguration = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        
        // Validate import data
        if (!importData.version || !importData.taxRates) {
          throw new Error('Invalid tax configuration file');
        }
        
        // Import business info (partial)
        setFormData(prev => ({
          ...prev,
          street: importData.businessInfo?.street || prev.street,
          stateProvince: importData.businessInfo?.stateProvince || prev.stateProvince,
          city: importData.businessInfo?.city || prev.city,
          postalCode: importData.businessInfo?.postalCode || prev.postalCode
        }));
        
        // Import tax rates
        setCustomRates(importData.taxRates);
        
        // Import location settings
        if (importData.locations) {
          const locationIds = importData.locations.map(loc => loc.id);
          setSelectedLocations(locationIds);
          
          const profiles = {};
          importData.locations.forEach(loc => {
            profiles[loc.id] = loc.taxProfile;
          });
          setLocationTaxProfiles(profiles);
        }
        
        // Import industry settings
        if (importData.industrySettings) {
          setIndustrySpecificSettings(importData.industrySettings);
        }
        
        toast.success('Tax configuration imported successfully');
      } catch (error) {
        console.error('[TaxSettings] Import error:', error);
        toast.error('Failed to import tax configuration. Please check the file format.');
      }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = null;
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
  
  // No toggle needed - Claude determines tax system automatically

  // Get tax suggestions from Claude API
  const getTaxSuggestions = async () => {
    console.log('[TaxSettings] Button clicked');
    console.log('[TaxSettings] getTaxSuggestions called');
    console.log('[TaxSettings] Form data:', formData);
    console.log('[TaxSettings] Tenant ID:', tenantId);
    console.log('[TaxSettings] Is Loading:', isLoading);
    console.log('[TaxSettings] Suggestion Cooldown:', suggestionCooldown);
    
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
      console.log('[TaxSettings] Full API response:', JSON.stringify(data, null, 2));
      console.log('[TaxSettings] Response data keys:', Object.keys(data));
      console.log('[TaxSettings] Response suggestedRates:', data.suggestedRates);
      
      setTaxSuggestions(data);
      
      // Pre-fill custom rates with suggestions
      if (data.suggestedRates) {
        console.log('[TaxSettings] Processing suggested rates...');
        console.log('[TaxSettings] All suggested rates:', JSON.stringify(data.suggestedRates, null, 2));
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
        
        // Update known fields - ensure numeric values are properly formatted
        const formattedKnownRates = {};
        Object.keys(knownRates).forEach(key => {
          const value = knownRates[key];
          // Format numeric values to ensure they display properly
          if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
            formattedKnownRates[key] = String(value);
          } else {
            formattedKnownRates[key] = value;
          }
        });
        
        console.log('[TaxSettings] Known rates:', knownRates);
        console.log('[TaxSettings] Formatted known rates:', formattedKnownRates);
        console.log('[TaxSettings] Unknown fields:', unknownFields);
        
        setCustomRates(prev => {
          const newRates = {
            ...prev,
            ...formattedKnownRates,
            // Calculate totals if not provided
            totalSalesTaxRate: formattedKnownRates.totalSalesTaxRate || 
              (parseFloat(formattedKnownRates.stateSalesTaxRate || prev.stateSalesTaxRate || 0) + 
               parseFloat(formattedKnownRates.localSalesTaxRate || prev.localSalesTaxRate || 0)).toFixed(2)
          };
          console.log('[TaxSettings] Setting custom rates to:', newRates);
          return newRates;
        });
        
        // Store unknown fields for dynamic rendering
        if (Object.keys(unknownFields).length > 0) {
          setAdditionalTaxFields(unknownFields);
          console.log('[TaxSettings] Additional tax fields from API:', unknownFields);
        }
        
        // Also log if we got any non-zero values
        const nonZeroFields = Object.entries(formattedKnownRates).filter(([key, value]) => {
          const numValue = parseFloat(value);
          return !isNaN(numValue) && numValue > 0;
        });
        console.log('[TaxSettings] Non-zero tax rates found:', nonZeroFields);
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
    return <CenteredSpinner size="large" />;
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
                          style={{ width: `${taxSuggestions.confidenceScore * 100}%` }}
                        />
                      </div>
                      <span className="ml-2 text-xs text-blue-600">{(taxSuggestions.confidenceScore * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Source Citations and Actions Section */}
          {taxSuggestions && (
            <div className="mb-6 space-y-4">
              {/* Source Citations */}
              {taxSuggestions.sourceCitations && taxSuggestions.sourceCitations.length > 0 && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                    <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                    Sources Used
                  </h4>
                  <div className="space-y-2">
                    {taxSuggestions.sourceCitations.map((citation, idx) => (
                      <div key={idx} className="text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2 ${
                          citation.type === 'official' ? 'bg-green-100 text-green-800' :
                          citation.type === 'government' ? 'bg-blue-100 text-blue-800' :
                          citation.type === 'reliable' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {citation.type}
                        </span>
                        <span className="text-gray-700">{citation.source}</span>
                        {citation.url && (
                          <a 
                            href={citation.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:text-blue-800 underline"
                          >
                            Visit Source
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    // Enable manual override mode
                    setManualOverrideMode(!manualOverrideMode);
                  }}
                  className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                    manualOverrideMode 
                      ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  {manualOverrideMode ? 'Exit Override Mode' : 'Override Rates'}
                </button>
                
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                  Report Inaccuracy
                </button>
                
                {/* Verification Links */}
                <div className="flex items-center text-sm text-gray-600">
                  <ShieldCheckIcon className="h-4 w-4 mr-1" />
                  <span className="mr-2">Verify rates:</span>
                  <a 
                    href={`https://www.google.com/search?q="${formData.country}"+revenue+authority+tax+rates`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline mr-3"
                  >
                    Search Government Sites
                  </a>
                </div>
              </div>
              
              {/* Manual Override Notice */}
              {manualOverrideMode && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start">
                    <ExclamationCircleIcon className="h-5 w-5 text-orange-600 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-orange-900">Manual Override Mode Active</p>
                      <p className="text-sm text-orange-700 mt-1">
                        You can now manually edit any tax rates below. Your changes will be saved as corrections 
                        and used for future suggestions in this location.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Sales Tax Section */}
          <div className="mb-6">
            <div 
              className="flex items-center justify-between cursor-pointer py-2"
              onClick={() => toggleSection('sales')}
            >
              <h3 className="text-md font-medium text-gray-800 border-b pb-2 flex-1 flex items-center">
                Sales Tax Rates
                {validationErrors.sales && (
                  <ExclamationCircleIcon className="h-5 w-5 ml-2 text-red-500" />
                )}
              </h3>
              {expandedSections.sales ? (
                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
            {expandedSections.sales && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State Sales Tax (%)
                </label>
                <input
                  type="number"
                  name="stateSalesTaxRate"
                  value={customRates.stateSalesTaxRate || ''}
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
                  value={customRates.localSalesTaxRate || ''}
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
                  value={customRates.totalSalesTaxRate || ''}
                  onChange={handleRateChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="Auto-calculated"
                  readOnly
                />
              </div>
            </div>
            )}
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
                  value={customRates.corporateIncomeTaxRate || ''}
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
            
            {/* System automatically detects if country uses progressive or flat tax */}
            {taxSuggestions && customRates.hasProgressiveTax !== undefined && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <SparklesIcon className="h-4 w-4 inline mr-1" />
                  {customRates.hasProgressiveTax 
                    ? `This location uses a progressive tax system with ${customRates.personalIncomeTaxBrackets?.length || 0} tax brackets.`
                    : `This location uses a flat personal income tax rate of ${customRates.flatPersonalIncomeTaxRate || 'N/A'}%.`
                  }
                </p>
              </div>
            )}
            
            {!taxSuggestions && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  <ExclamationCircleIcon className="h-4 w-4 inline mr-1" />
                  Click "Get Tax Suggestions" above to automatically detect the tax system for your location.
                </p>
              </div>
            )}
            
            {customRates.hasProgressiveTax ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-gray-600">Income tax brackets for your location</p>
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
            ) : customRates.hasProgressiveTax === false ? (
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
            ) : null}
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
                      value={customRates.healthInsuranceRate || ''}
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
                      value={customRates.healthInsuranceEmployerRate || ''}
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
                      value={customRates.socialSecurityRate || ''}
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
                      value={customRates.socialSecurityEmployerRate || ''}
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
                  value={customRates.federalPayrollTaxRate || ''}
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
                  value={customRates.statePayrollTaxRate || ''}
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
                <p><strong>Sales Tax:</strong> {customRates.stateSalesTaxRate || 0}% (State) + {customRates.localSalesTaxRate || 0}% (Local) = {customRates.totalSalesTaxRate || '0.00'}% Total</p>
                <p><strong>Corporate Income Tax:</strong> {customRates.corporateIncomeTaxRate || 0}%</p>
                <p><strong>Personal Income Tax:</strong> {customRates.hasProgressiveTax ? `Progressive (${customRates.personalIncomeTaxBrackets?.length || 0} brackets)` : `Flat rate: ${customRates.flatPersonalIncomeTaxRate || 'N/A'}%`}</p>
                <p><strong>Health Insurance:</strong> {customRates.healthInsuranceRate || 0}% (Employee) + {customRates.healthInsuranceEmployerRate || 0}% (Employer)</p>
                <p><strong>Social Security:</strong> {customRates.socialSecurityRate || 0}% (Employee) + {customRates.socialSecurityEmployerRate || 0}% (Employer)</p>
                <p><strong>Payroll Tax:</strong> {customRates.federalPayrollTaxRate || 0}% (Federal) + {customRates.statePayrollTaxRate || 0}% (State)</p>
                <p><strong>Location:</strong> {formData.city}, {formData.stateProvince}, {formData.country}</p>
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
                  <br /><br />
                  <strong className="text-red-600">Important Disclaimer:</strong> It is my sole responsibility to verify that all tax rates are correct and comply with current tax laws in my jurisdiction. 
                  The AI-powered suggestions are provided for convenience only and should not be relied upon as tax advice. 
                  I acknowledge that incorrect tax rates may result in legal and financial consequences for which I am fully responsible.
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
      
      {/* Tax History Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div 
          className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection('history')}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2 text-gray-600" />
              Tax Rate History
              {taxHistory.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                  {taxHistory.length} changes
                </span>
              )}
            </h2>
            {expandedSections.history ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
        
        {expandedSections.history && (
          <div className="border-t border-gray-200 p-6">
            {taxHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No tax rate changes recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {taxHistory.map((entry) => (
                  <div key={entry.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {entry.type === 'manual_update' ? 'Manual Update' : 'System Update'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(entry.date).toLocaleString()} by {entry.user}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          // Restore these settings
                          if (confirm('Restore these tax settings?')) {
                            setFormData(prev => ({
                              ...prev,
                              ...entry.changes.businessInfo
                            }));
                            setCustomRates(entry.changes.taxRates);
                            setSelectedLocations(entry.changes.locations || []);
                            toast.success('Tax settings restored from history');
                          }
                        }}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Restore
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      <p>Sales Tax: {entry.changes.taxRates.totalSalesTaxRate}%</p>
                      <p>Corporate Tax: {entry.changes.taxRates.corporateIncomeTaxRate}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Feedback Modal for reporting inaccuracies */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-orange-500" />
              Report Tax Rate Inaccuracy
            </h3>
            
            <div className="space-y-4">
              {/* Feedback Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What type of issue did you find?
                </label>
                <select
                  value={feedbackForm.type}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select issue type...</option>
                  <option value="inaccurate">Rates are completely wrong</option>
                  <option value="partially_accurate">Some rates are wrong</option>
                  <option value="missing_taxes">Missing some taxes</option>
                  <option value="outdated">Rates are outdated</option>
                </select>
              </div>
              
              {/* Specific Fields */}
              {feedbackForm.type === 'partially_accurate' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Which specific fields are incorrect?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(customRates).map(field => (
                      <label key={field} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={feedbackForm.inaccurateFields.includes(field)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFeedbackForm(prev => ({
                                ...prev,
                                inaccurateFields: [...prev.inaccurateFields, field]
                              }));
                            } else {
                              setFeedbackForm(prev => ({
                                ...prev,
                                inaccurateFields: prev.inaccurateFields.filter(f => f !== field)
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Please describe the issue and provide correct information if known
                </label>
                <textarea
                  value={feedbackForm.details}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, details: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Example: The sales tax rate should be 8.5%, not 7.25%. I found this on the official state revenue website..."
                />
              </div>
              
              {/* Suggested Sources */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sources for correct information (optional)
                </label>
                <textarea
                  value={feedbackForm.suggestedSources}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, suggestedSources: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Official website URLs, government documents, etc."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedbackForm({ type: '', details: '', inaccurateFields: [], suggestedSources: '' });
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/taxes/feedback', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        tenantId,
                        businessInfo: formData,
                        feedbackType: feedbackForm.type,
                        details: feedbackForm.details,
                        inaccurateFields: feedbackForm.inaccurateFields,
                        suggestedSources: feedbackForm.suggestedSources,
                        displayedRates: customRates,
                        aiConfidenceScore: taxSuggestions?.confidenceScore
                      })
                    });
                    
                    if (response.ok) {
                      toast.success('Thank you for your feedback! This helps us improve our tax suggestions.');
                      setShowFeedbackModal(false);
                      setFeedbackForm({ type: '', details: '', inaccurateFields: [], suggestedSources: '' });
                    } else {
                      throw new Error('Failed to submit feedback');
                    }
                  } catch (error) {
                    toast.error('Failed to submit feedback. Please try again.');
                  }
                }}
                disabled={!feedbackForm.type || !feedbackForm.details}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}