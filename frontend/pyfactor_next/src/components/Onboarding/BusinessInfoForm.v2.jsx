'use client';

import { useState, useMemo, useEffect } from 'react';
import { countries } from 'countries-list';
import { businessTypes, legalStructures } from '@/app/utils/businessData';
import { logger } from '@/utils/logger';

/**
 * Business Information Form Component v2
 * Integrates with the state machine and session manager
 */
export default function BusinessInfoFormV2({ initialData = {}, onSubmit, submitting, error: parentError }) {
  const [formData, setFormData] = useState({
    businessName: initialData.businessName || '',
    businessType: initialData.businessType || '',
    legalStructure: initialData.legalStructure || '',
    country: initialData.country || 'United States',
    dateFounded: initialData.dateFounded || new Date().toISOString().split('T')[0]
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Convert countries object to array for dropdown
  const countryOptions = useMemo(() => {
    return Object.entries(countries).map(([code, country]) => ({
      value: country.name,
      label: country.name,
      code: code
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, []);
  
  // Format businessTypes for dropdown
  const businessTypeOptions = useMemo(() => {
    return businessTypes.map(type => ({
      value: type,
      label: type
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
    setFormData(prev => ({ ...prev, [field]: value }));
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
          newErrors.businessName = 'Business name is required';
        } else if (formData.businessName.length < 2) {
          newErrors.businessName = 'Business name must be at least 2 characters';
        }
        break;
      case 'businessType':
        if (!formData.businessType) {
          newErrors.businessType = 'Please select a business type';
        }
        break;
      case 'legalStructure':
        if (!formData.legalStructure) {
          newErrors.legalStructure = 'Please select a legal structure';
        }
        break;
      case 'country':
        if (!formData.country) {
          newErrors.country = 'Please select a country';
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
      newErrors.businessName = 'Business name is required';
    }
    if (!formData.businessType) {
      newErrors.businessType = 'Please select a business type';
    }
    if (!formData.legalStructure) {
      newErrors.legalStructure = 'Please select a legal structure';
    }
    if (!formData.country) {
      newErrors.country = 'Please select a country';
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
      return;
    }
    
    logger.info('[BusinessInfoForm] Submitting business info', formData);
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Tell us about your business</h2>
      
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
            Business Name *
          </label>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => handleInputChange('businessName', e.target.value)}
            onBlur={() => handleBlur('businessName')}
            placeholder="Enter your business name"
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
            Business Type *
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
            <option value="">Select business type</option>
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
            Legal Structure *
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
            <option value="">Select legal structure</option>
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
            Country *
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
            <option value="">Select country</option>
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
            Date Founded
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
          {submitting ? 'Saving...' : 'Continue to Choose Plan'}
        </button>
      </div>
    </form>
  );
}