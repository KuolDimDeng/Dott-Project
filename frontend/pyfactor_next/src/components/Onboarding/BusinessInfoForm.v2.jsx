'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { countries } from 'countries-list';
import { businessTypes, legalStructures } from '@/app/utils/businessData';
import { ALL_BUSINESS_TYPES } from '@/app/utils/simplifiedBusinessData';
import { logger } from '@/utils/logger';

/**
 * Business Information Form Component v2
 * Integrates with the state machine and session manager
 */
export default function BusinessInfoFormV2({ initialData = {}, onSubmit, submitting, error: parentError }) {
  const { t } = useTranslation('onboarding');
  const [formData, setFormData] = useState({
    businessName: initialData.businessName || '',
    businessType: initialData.businessType || '',
    legalStructure: initialData.legalStructure || '',
    country: initialData.country || 'US',  // Use country code
    dateFounded: initialData.dateFounded || new Date().toISOString().split('T')[0]
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Convert countries object to array for dropdown
  const countryOptions = useMemo(() => {
    return Object.entries(countries).map(([code, country]) => ({
      value: code,  // Use country code as value instead of name
      label: country.name,
      code: code
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, []);
  
  // Format businessTypes for dropdown - use simplified list
  const businessTypeOptions = useMemo(() => {
    return ALL_BUSINESS_TYPES.map(type => ({
      value: type.value,
      label: type.label
    }));
  }, []);
  
  // Format legalStructures for dropdown
  const legalStructureOptions = useMemo(() => {
    return legalStructures.map(structure => ({
      value: structure,
      label: structure
    }));
  }, []);

  // Update form data when initial data changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    console.log(`🚨 [BusinessInfoForm] Field change: ${field} = "${value}"`);
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      console.log('🚨 [BusinessInfoForm] Updated form data:', updated);
      return updated;
    });
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
      case 'businessType':
        if (!formData.businessType) {
          newErrors.businessType = t('businessInfo.errors.businessTypeRequired');
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
    if (!formData.businessType) {
      newErrors.businessType = t('businessInfo.errors.businessTypeRequired');
    }
    if (!formData.legalStructure) {
      newErrors.legalStructure = t('businessInfo.errors.legalStructureRequired');
    }
    if (!formData.country) {
      newErrors.country = t('businessInfo.errors.countryRequired');
    }
    
    setErrors(newErrors);
    setTouched({
      businessName: true,
      businessType: true,
      legalStructure: true,
      country: true
    });
    
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateAll()) {
      logger.warn('[BusinessInfoForm] Validation failed', errors);
      console.log('🚨 [BusinessInfoForm] Validation errors:', errors);
      return;
    }
    
    logger.info('[BusinessInfoForm] Submitting business info', formData);
    console.log('🚨 [BusinessInfoForm] Form data being submitted:', JSON.stringify(formData, null, 2));
    console.log('🚨 [BusinessInfoForm] Individual fields:', {
      businessName: formData.businessName,
      businessType: formData.businessType,
      country: formData.country,
      legalStructure: formData.legalStructure,
      dateFounded: formData.dateFounded
    });
    
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

        {/* Business Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('businessInfo.businessTypeLabel')} *
          </label>
          <select
            value={formData.businessType}
            onChange={(e) => handleInputChange('businessType', e.target.value)}
            onBlur={() => handleBlur('businessType')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.businessType && touched.businessType ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={submitting}
          >
            <option value="">{t('businessInfo.businessTypePlaceholder')}</option>
            {businessTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.businessType && touched.businessType && (
            <p className="mt-1 text-sm text-red-600">{errors.businessType}</p>
          )}
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