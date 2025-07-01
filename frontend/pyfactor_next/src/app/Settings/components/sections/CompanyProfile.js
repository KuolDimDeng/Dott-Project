'use client';

import React, { useState, useEffect } from 'react';
import { 
  BuildingOfficeIcon,
  MapPinIcon,
  GlobeAltIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';
import { FieldTooltip } from '@/components/ui/FieldTooltip';
import { businessTypes, legalStructures } from '@/app/utils/businessData';

const CompanyProfile = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyData, setCompanyData] = useState({
    businessName: '',
    legalName: '',
    businessType: '',
    legalStructure: '',
    taxId: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
    email: '',
    website: '',
    founded: '',
    description: ''
  });

  const [originalData, setOriginalData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch company data
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/tenant/company-profile');
        
        if (!response.ok) {
          throw new Error('Failed to fetch company data');
        }

        const data = await response.json();
        setCompanyData(data);
        setOriginalData(data);
      } catch (error) {
        logger.error('[CompanyProfile] Error fetching company data:', error);
        notifyError('Failed to load company information');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [notifyError]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(companyData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [companyData, originalData]);

  // Handle input changes
  const handleChange = (field, value) => {
    setCompanyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate required fields
      if (!companyData.addressLine1 || !companyData.city || !companyData.state || !companyData.postalCode) {
        notifyError('Please fill in all required address fields');
        return;
      }

      const response = await fetch('/api/tenant/company-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(companyData)
      });

      if (!response.ok) {
        throw new Error('Failed to update company information');
      }

      const updatedData = await response.json();
      setCompanyData(updatedData);
      setOriginalData(updatedData);
      notifySuccess('Company information updated successfully');
    } catch (error) {
      logger.error('[CompanyProfile] Error saving company data:', error);
      notifyError('Failed to update company information');
    } finally {
      setSaving(false);
    }
  };

  // Reset changes
  const handleReset = () => {
    setCompanyData(originalData);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading company information...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Company Profile</h2>
        <p className="text-sm text-gray-600">
          View and manage your company information
        </p>
      </div>

      {/* Read-only Business Name Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <ExclamationCircleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Business Name Protection</p>
            <p>Your business name cannot be changed here for security reasons. Contact support if you need to update it.</p>
          </div>
        </div>
      </div>

      {/* Company Information Form */}
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BuildingOfficeIcon className="h-5 w-5 mr-2 text-gray-500" />
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name
                <FieldTooltip content="This is your primary business name used throughout the system" />
              </label>
              <input
                type="text"
                value={companyData.businessName}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Legal Name
                <FieldTooltip content="Your business's legal name as registered" />
              </label>
              <input
                type="text"
                value={companyData.legalName}
                onChange={(e) => handleChange('legalName', e.target.value)}
                disabled={!isAdmin}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Type
                <FieldTooltip content="Select your primary business category" />
              </label>
              <select
                value={companyData.businessType}
                onChange={(e) => handleChange('businessType', e.target.value)}
                disabled={!isAdmin}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="">Select business type</option>
                {businessTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Legal Structure
                <FieldTooltip content="Your business's legal structure for tax purposes" />
              </label>
              <select
                value={companyData.legalStructure}
                onChange={(e) => handleChange('legalStructure', e.target.value)}
                disabled={!isAdmin}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="">Select legal structure</option>
                {legalStructures.map(structure => (
                  <option key={structure.value} value={structure.value}>
                    {structure.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax ID (EIN)
                <FieldTooltip content="Your Federal Employer Identification Number" />
              </label>
              <input
                type="text"
                value={companyData.taxId}
                onChange={(e) => handleChange('taxId', e.target.value)}
                disabled={!isAdmin}
                placeholder="XX-XXXXXXX"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Founded Year
                <FieldTooltip content="The year your business was established" />
              </label>
              <input
                type="number"
                value={companyData.founded}
                onChange={(e) => handleChange('founded', e.target.value)}
                disabled={!isAdmin}
                placeholder="YYYY"
                min="1900"
                max={new Date().getFullYear()}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <MapPinIcon className="h-5 w-5 mr-2 text-gray-500" />
            Address Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1 *
                <FieldTooltip content="Street address, P.O. box, company name, c/o" />
              </label>
              <input
                type="text"
                value={companyData.addressLine1}
                onChange={(e) => handleChange('addressLine1', e.target.value)}
                disabled={!isAdmin}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
                <FieldTooltip content="Apartment, suite, unit, building, floor, etc." />
              </label>
              <input
                type="text"
                value={companyData.addressLine2}
                onChange={(e) => handleChange('addressLine2', e.target.value)}
                disabled={!isAdmin}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
                <FieldTooltip content="City where your business is located" />
              </label>
              <input
                type="text"
                value={companyData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                disabled={!isAdmin}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State/Province *
                <FieldTooltip content="State or province where your business is located" />
              </label>
              <input
                type="text"
                value={companyData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                disabled={!isAdmin}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code *
                <FieldTooltip content="ZIP or postal code" />
              </label>
              <input
                type="text"
                value={companyData.postalCode}
                onChange={(e) => handleChange('postalCode', e.target.value)}
                disabled={!isAdmin}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
                <FieldTooltip content="Country where your business is located" />
              </label>
              <select
                value={companyData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                disabled={!isAdmin}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="MX">Mexico</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <PhoneIcon className="h-5 w-5 mr-2 text-gray-500" />
            Contact Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
                <FieldTooltip content="Primary business phone number" />
              </label>
              <input
                type="tel"
                value={companyData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                disabled={!isAdmin}
                placeholder="(555) 123-4567"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
                <FieldTooltip content="Primary business email address" />
              </label>
              <input
                type="email"
                value={companyData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={!isAdmin}
                placeholder="contact@business.com"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
                <FieldTooltip content="Your business website URL" />
              </label>
              <input
                type="url"
                value={companyData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                disabled={!isAdmin}
                placeholder="https://www.yourbusiness.com"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Business Description */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <IdentificationIcon className="h-5 w-5 mr-2 text-gray-500" />
            Business Description
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              About Your Business
              <FieldTooltip content="Brief description of your business activities" />
            </label>
            <textarea
              value={companyData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={!isAdmin}
              rows={4}
              placeholder="Describe your business..."
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
            />
          </div>
        </div>

        {/* Action Buttons */}
        {isAdmin && (
          <div className="flex justify-end space-x-3">
            {hasChanges && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={saving}
              >
                Reset Changes
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                hasChanges && !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyProfile;