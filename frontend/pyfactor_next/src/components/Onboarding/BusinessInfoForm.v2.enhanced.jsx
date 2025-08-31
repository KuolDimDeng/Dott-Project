'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { countries } from 'countries-list';
import { businessTypes, legalStructures } from '@/app/utils/businessData';
import { MARKETPLACE_CATEGORIES, DELIVERY_SCOPE_OPTIONS } from '@/app/utils/simplifiedBusinessData';
import { logger } from '@/utils/logger';
import { getCurrencyForCountry } from '@/utils/simpleCurrencyUtils';
import { CURRENCIES } from '@/utils/currencies'; // Import currency list

/**
 * Enhanced Business Information Form with Currency Detection
 * Auto-detects currency based on country selection
 */
export default function BusinessInfoFormV2Enhanced({ initialData = {}, onSubmit, submitting, error: parentError }) {
  const { t } = useTranslation('onboarding');
  
  // Initialize with detected currency if country is provided
  const initialCurrency = initialData.country ? 
    getCurrencyForCountry(initialData.country) : 
    (initialData.currency || 'USD');
  
  const [formData, setFormData] = useState({
    businessName: initialData.businessName || '',
    businessType: initialData.businessType || '',
    marketplaceCategory: initialData.marketplaceCategory || '',
    deliveryScope: initialData.deliveryScope || 'local',
    legalStructure: initialData.legalStructure || '',
    country: initialData.country || 'US',
    currency: initialCurrency, // Add currency field
    dateFounded: initialData.dateFounded || new Date().toISOString().split('T')[0]
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [currencyAutoDetected, setCurrencyAutoDetected] = useState(true);

  // Convert countries object to array for dropdown
  const countryOptions = useMemo(() => {
    return Object.entries(countries).map(([code, country]) => ({
      value: code,
      label: country.name,
      code: code
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, []);
  
  // Format currency options for dropdown
  const currencyOptions = useMemo(() => {
    return CURRENCIES.map(curr => ({
      value: curr.code,
      label: `${curr.code} - ${curr.name}`,
      symbol: curr.symbol
    }));
  }, []);
  
  // Format marketplace categories for dropdown
  const marketplaceCategoryOptions = useMemo(() => {
    return MARKETPLACE_CATEGORIES.map(category => ({
      value: category.value,
      label: category.label
    }));
  }, []);
  
  // Format delivery scope options for dropdown
  const deliveryScopeOptions = useMemo(() => {
    return DELIVERY_SCOPE_OPTIONS.map(scope => ({
      value: scope.value,
      label: scope.label
    }));
  }, []);
  
  // Format legalStructures for dropdown
  const legalStructureOptions = useMemo(() => {
    return legalStructures.map(structure => ({
      value: structure,
      label: structure
    }));
  }, []);

  // Auto-detect currency when country changes
  useEffect(() => {
    if (formData.country && currencyAutoDetected) {
      const detectedCurrency = getCurrencyForCountry(formData.country);
      logger.info(`[BusinessInfoForm] Auto-detected currency for ${formData.country}: ${detectedCurrency}`);
      setFormData(prev => ({ ...prev, currency: detectedCurrency }));
    }
  }, [formData.country, currencyAutoDetected]);

  // Update form data when initial data changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    console.log(`[BusinessInfoForm] Field change: ${field} = "${value}"`);
    
    // Special handling for currency to track if user manually changed it
    if (field === 'currency') {
      setCurrencyAutoDetected(false); // User manually selected, stop auto-detection
    }
    
    // Special handling for country to auto-update currency
    if (field === 'country' && currencyAutoDetected) {
      const detectedCurrency = getCurrencyForCountry(value);
      setFormData(prev => ({
        ...prev,
        [field]: value,
        currency: detectedCurrency
      }));
      console.log(`[BusinessInfoForm] Auto-detected currency for ${value}: ${detectedCurrency}`);
    } else {
      setFormData(prev => {
        const updated = { ...prev, [field]: value };
        console.log('[BusinessInfoForm] Updated form data:', updated);
        return updated;
      });
    }
    
    // Clear field error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle field blur
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field);
  };

  // Validate single field
  const validateField = (field) => {
    const newErrors = {};
    
    switch (field) {
      case 'businessName':
        if (!formData.businessName.trim()) {
          newErrors.businessName = t('businessInfo.errors.businessNameRequired');
        } else if (formData.businessName.length < 2) {
          newErrors.businessName = t('businessInfo.errors.businessNameTooShort', { defaultValue: 'Business name must be at least 2 characters' });
        }
        break;
      case 'marketplaceCategory':
        if (!formData.marketplaceCategory) {
          newErrors.marketplaceCategory = 'Please select a marketplace category';
        }
        break;
      case 'deliveryScope':
        if (!formData.deliveryScope) {
          newErrors.deliveryScope = 'Please select a delivery scope';
        }
        break;
      case 'legalStructure':
        if (!formData.legalStructure) {
          newErrors.legalStructure = t('businessInfo.errors.legalStructureRequired');
        }
        break;
      case 'country':
        if (!formData.country) {
          newErrors.country = t('businessInfo.errors.countryRequired');
        }
        break;
      case 'currency':
        if (!formData.currency) {
          newErrors.currency = 'Please select a currency';
        }
        break;
    }
    
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  // Validate all fields
  const validateAll = () => {
    const newErrors = {};
    
    if (!formData.businessName.trim()) {
      newErrors.businessName = t('businessInfo.errors.businessNameRequired');
    }
    if (!formData.marketplaceCategory) {
      newErrors.marketplaceCategory = 'Please select a marketplace category';
    }
    if (!formData.deliveryScope) {
      newErrors.deliveryScope = 'Please select a delivery scope';
    }
    if (!formData.legalStructure) {
      newErrors.legalStructure = t('businessInfo.errors.legalStructureRequired');
    }
    if (!formData.country) {
      newErrors.country = t('businessInfo.errors.countryRequired');
    }
    if (!formData.currency) {
      newErrors.currency = 'Please select a currency';
    }
    
    setErrors(newErrors);
    setTouched({
      businessName: true,
      marketplaceCategory: true,
      deliveryScope: true,
      legalStructure: true,
      country: true,
      currency: true
    });
    
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateAll()) {
      logger.warn('[BusinessInfoForm] Validation failed', errors);
      return;
    }
    
    logger.info('[BusinessInfoForm] Submitting business info with currency', formData);
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">{t('businessInfo.subtitle')}</h2>
      
      {/* Error display */}
      {parentError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {parentError}
        </div>
      )}

      <div className="space-y-4">
        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('businessInfo.businessNameLabel')} *
          </label>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => handleInputChange('businessName', e.target.value)}
            onBlur={() => handleBlur('businessName')}
            placeholder={t('businessInfo.businessNamePlaceholder')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.businessName && touched.businessName ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={submitting}
          />
          {errors.businessName && touched.businessName && (
            <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
          )}
        </div>

        {/* Marketplace Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Marketplace Category *
          </label>
          <select
            value={formData.marketplaceCategory}
            onChange={(e) => handleInputChange('marketplaceCategory', e.target.value)}
            onBlur={() => handleBlur('marketplaceCategory')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.marketplaceCategory && touched.marketplaceCategory ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={submitting}
          >
            <option value="">Select a category</option>
            {marketplaceCategoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.marketplaceCategory && touched.marketplaceCategory && (
            <p className="mt-1 text-sm text-red-600">{errors.marketplaceCategory}</p>
          )}
        </div>

        {/* Delivery Scope */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delivery Scope *
          </label>
          <select
            value={formData.deliveryScope}
            onChange={(e) => handleInputChange('deliveryScope', e.target.value)}
            onBlur={() => handleBlur('deliveryScope')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.deliveryScope && touched.deliveryScope ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={submitting}
          >
            {deliveryScopeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.deliveryScope && touched.deliveryScope && (
            <p className="mt-1 text-sm text-red-600">{errors.deliveryScope}</p>
          )}
          <p className="mt-1 text-sm text-gray-600">
            Choose how far you can deliver your products or services
          </p>
        </div>

        {/* Legal Structure */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('businessInfo.legalStructureLabel')} *
          </label>
          <select
            value={formData.legalStructure}
            onChange={(e) => handleInputChange('legalStructure', e.target.value)}
            onBlur={() => handleBlur('legalStructure')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.legalStructure && touched.legalStructure ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={submitting}
          >
            <option value="">{t('businessInfo.legalStructurePlaceholder')}</option>
            {legalStructureOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.legalStructure && touched.legalStructure && (
            <p className="mt-1 text-sm text-red-600">{errors.legalStructure}</p>
          )}
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('businessInfo.countryLabel')} *
          </label>
          <select
            value={formData.country}
            onChange={(e) => handleInputChange('country', e.target.value)}
            onBlur={() => handleBlur('country')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.country && touched.country ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={submitting}
          >
            <option value="">{t('businessInfo.countryPlaceholder')}</option>
            {countryOptions.map(option => (
              <option key={option.code} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.country && touched.country && (
            <p className="mt-1 text-sm text-red-600">{errors.country}</p>
          )}
        </div>

        {/* Currency - Auto-detected based on country */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Currency *
            {currencyAutoDetected && (
              <span className="ml-2 text-xs text-green-600">(Auto-detected)</span>
            )}
          </label>
          <select
            value={formData.currency}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            onBlur={() => handleBlur('currency')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.currency && touched.currency ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={submitting}
          >
            {currencyOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.currency && touched.currency && (
            <p className="mt-1 text-sm text-red-600">{errors.currency}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Currency was auto-detected based on your country. You can change it if needed.
          </p>
        </div>

        {/* Date Founded */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('businessInfo.dateFoundedLabel')}
          </label>
          <input
            type="date"
            value={formData.dateFounded}
            onChange={(e) => handleInputChange('dateFounded', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          />
        </div>
      </div>

      {/* Submit button */}
      <div className="mt-6">
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3 px-4 font-medium rounded-md transition-colors ${
            submitting
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {submitting ? t('businessInfo.saving', { defaultValue: 'Saving...' }) : t('businessInfo.nextButton')}
        </button>
      </div>
    </form>
  );
}