'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { countries } from 'countries-list';
import { legalStructures } from '@/app/utils/businessData';
import { BUSINESS_CATEGORIES } from '@/app/utils/simplifiedBusinessData';
import { logger } from '@/utils/logger';

/**
 * Simplified Business Information Form
 * Uses categorized business types for new users
 */
export default function SimplifiedBusinessInfoForm({ initialData = {}, onSubmit, submitting, error: parentError }) {
  const { t } = useTranslation('onboarding');
  const [formData, setFormData] = useState({
    businessName: initialData.businessName || '',
    businessType: initialData.businessType || '',
    simplifiedBusinessType: initialData.simplifiedBusinessType || '',
    legalStructure: initialData.legalStructure || '',
    country: initialData.country || 'US',
    dateFounded: initialData.dateFounded || new Date().toISOString().split('T')[0]
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Convert countries object to array for dropdown
  const countryOptions = useMemo(() => {
    return Object.entries(countries).map(([code, country]) => ({
      value: code,
      label: country.name,
      code: code
    })).sort((a, b) => a.label.localeCompare(b.label));
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
    logger.info(`[SimplifiedBusinessInfoForm] Field change: ${field} = "${value}"`);
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // When simplified business type is selected, set the old business type to a generic value
      if (field === 'simplifiedBusinessType') {
        updated.businessType = 'Other'; // Default value for legacy field
      }
      
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
          newErrors.businessName = t('businessInfo.errors.businessNameTooShort');
        }
        break;
      case 'simplifiedBusinessType':
        if (!formData.simplifiedBusinessType) {
          newErrors.simplifiedBusinessType = t('businessInfo.errors.businessTypeRequired');
        }
        break;
      case 'legalStructure':
        if (!formData.legalStructure) {
          newErrors.legalStructure = t('businessInfo.errors.legalStructureRequired');
        }
        break;
    }
    
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  // Validate entire form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.businessName.trim()) {
      newErrors.businessName = t('businessInfo.errors.businessNameRequired');
    }
    if (!formData.simplifiedBusinessType) {
      newErrors.simplifiedBusinessType = t('businessInfo.errors.businessTypeRequired');
    }
    if (!formData.legalStructure) {
      newErrors.legalStructure = t('businessInfo.errors.legalStructureRequired');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Submit form data
    await onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">{t('businessInfo.title')}</h2>
        <p className="text-gray-600">{t('businessInfo.subtitle')}</p>
      </div>

      {/* Error display */}
      {parentError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {parentError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Business Name */}
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
            {t('businessInfo.fields.businessName.label')}
          </label>
          <input
            id="businessName"
            type="text"
            value={formData.businessName}
            onChange={(e) => handleInputChange('businessName', e.target.value)}
            onBlur={() => handleBlur('businessName')}
            className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
              errors.businessName && touched.businessName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={t('businessInfo.fields.businessName.placeholder')}
          />
          {errors.businessName && touched.businessName && (
            <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
          )}
        </div>

        {/* Business Type with Categories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('businessInfo.fields.businessType.label', 'What type of business do you run?')}
          </label>
          
          <div className="space-y-6">
            {Object.entries(BUSINESS_CATEGORIES).map(([categoryKey, category]) => (
              <div key={categoryKey} className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-1">{category.label}</h4>
                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                
                <div className="grid grid-cols-1 gap-2">
                  {category.types.map((type) => (
                    <label key={type.value} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="simplifiedBusinessType"
                        value={type.value}
                        checked={formData.simplifiedBusinessType === type.value}
                        onChange={(e) => handleInputChange('simplifiedBusinessType', e.target.value)}
                        className="form-radio h-4 w-4 text-blue-600"
                      />
                      <span className="text-gray-700">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {errors.simplifiedBusinessType && touched.simplifiedBusinessType && (
            <p className="mt-1 text-sm text-red-600">{errors.simplifiedBusinessType}</p>
          )}
        </div>

        {/* Legal Structure */}
        <div>
          <label htmlFor="legalStructure" className="block text-sm font-medium text-gray-700 mb-1">
            {t('businessInfo.fields.legalStructure.label')}
          </label>
          <select
            id="legalStructure"
            value={formData.legalStructure}
            onChange={(e) => handleInputChange('legalStructure', e.target.value)}
            onBlur={() => handleBlur('legalStructure')}
            className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
              errors.legalStructure && touched.legalStructure ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">{t('businessInfo.fields.legalStructure.placeholder')}</option>
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
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
            {t('businessInfo.fields.country.label')}
          </label>
          <select
            id="country"
            value={formData.country}
            onChange={(e) => handleInputChange('country', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {countryOptions.map(option => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Founded */}
        <div>
          <label htmlFor="dateFounded" className="block text-sm font-medium text-gray-700 mb-1">
            {t('businessInfo.fields.dateFounded.label')}
          </label>
          <input
            id="dateFounded"
            type="date"
            value={formData.dateFounded}
            onChange={(e) => handleInputChange('dateFounded', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              submitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {submitting ? t('common.processing') : t('common.continue')}
          </button>
        </div>
      </form>
    </div>
  );
}