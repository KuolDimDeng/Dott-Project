'use client';

import React, { useState, useEffect } from 'react';
import { 
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  IdentificationIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { FieldTooltip } from '@/components/ui/FieldTooltip';
import { logger } from '@/utils/logger';

const CompanyProfile = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState({
    businessName: '',
    businessType: '',
    email: '',
    phone: '',
    website: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    taxId: '',
    registrationNumber: '',
    yearEstablished: '',
    industry: '',
    description: ''
  });

  const [editMode, setEditMode] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadCompanyData();
  }, [profileData]);

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      
      if (profileData?.tenant) {
        setCompanyData({
          businessName: profileData.tenant.businessName || profileData.businessName || '',
          businessType: profileData.tenant.businessType || profileData.businessType || '',
          email: profileData.tenant.email || profileData.email || user?.email || '',
          phone: profileData.tenant.phone || profileData.phone || '',
          website: profileData.tenant.website || '',
          address: {
            street: profileData.tenant.address?.street || '',
            city: profileData.tenant.address?.city || '',
            state: profileData.tenant.address?.state || '',
            zipCode: profileData.tenant.address?.zipCode || '',
            country: profileData.tenant.address?.country || 'US'
          },
          taxId: profileData.tenant.taxId || '',
          registrationNumber: profileData.tenant.registrationNumber || '',
          yearEstablished: profileData.tenant.yearEstablished || '',
          industry: profileData.tenant.industry || '',
          description: profileData.tenant.description || ''
        });
      }
    } catch (error) {
      logger.error('[CompanyProfile] Error loading company data:', error);
      notifyError('Failed to load company information');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!companyData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(companyData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (companyData.phone && !/^\+?[\d\s()-]+$/.test(companyData.phone)) {
      newErrors.phone = 'Invalid phone format';
    }
    
    if (companyData.website && !/^https?:\/\/.+/.test(companyData.website)) {
      newErrors.website = 'Website must start with http:// or https://';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/tenant/business-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...companyData,
          businessName: undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update company information');
      }

      notifySuccess('Company information updated successfully');
      setEditMode(false);
    } catch (error) {
      logger.error('[CompanyProfile] Error saving company data:', error);
      notifyError('Failed to update company information');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = isOwner || isAdmin;

  const industryOptions = [
    'Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing',
    'Education', 'Real Estate', 'Construction', 'Hospitality', 'Transportation',
    'Professional Services', 'Non-Profit', 'Government', 'Other'
  ];

  const businessTypes = [
    'Sole Proprietorship', 'Partnership', 'LLC', 'Corporation', 
    'S-Corporation', 'Non-Profit', 'Other'
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Company Profile</h2>
          <p className="text-sm text-gray-500 mt-1">
            View and manage your company information
          </p>
        </div>
        {canEdit && !editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Information
          </button>
        )}
      </div>

      {loading && !companyData.businessName ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Business Name Cannot Be Changed</p>
              <p className="mt-1">
                Your business name "{companyData.businessName}" is permanently set and cannot be modified. 
                Contact support if you need assistance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
                <FieldTooltip content="Your registered business name (cannot be changed)" />
              </label>
              <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-900">{companyData.businessName}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
                <FieldTooltip content="Legal structure of your business" />
              </label>
              {editMode ? (
                <select
                  value={companyData.businessType}
                  onChange={(e) => setCompanyData({ ...companyData, businessType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select business type</option>
                  {businessTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <IdentificationIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">{companyData.businessType || 'Not specified'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email
                <FieldTooltip content="Primary email for business communications" />
              </label>
              {editMode ? (
                <div>
                  <input
                    type="email"
                    value={companyData.email}
                    onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">{companyData.email}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
                <FieldTooltip content="Business contact phone number" />
              </label>
              {editMode ? (
                <div>
                  <input
                    type="tel"
                    value={companyData.phone}
                    onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">{companyData.phone || 'Not specified'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
                <FieldTooltip content="Your business website URL" />
              </label>
              {editMode ? (
                <div>
                  <input
                    type="url"
                    value={companyData.website}
                    onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                    placeholder="https://example.com"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
                      errors.website ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.website && (
                    <p className="mt-1 text-sm text-red-600">{errors.website}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">{companyData.website || 'Not specified'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
                <FieldTooltip content="Primary industry your business operates in" />
              </label>
              {editMode ? (
                <select
                  value={companyData.industry}
                  onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select industry</option>
                  {industryOptions.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">{companyData.industry || 'Not specified'}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Address
              <FieldTooltip content="Primary business location address" />
            </label>
            {editMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={companyData.address.street}
                  onChange={(e) => setCompanyData({ 
                    ...companyData, 
                    address: { ...companyData.address, street: e.target.value }
                  })}
                  placeholder="Street address"
                  className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  value={companyData.address.city}
                  onChange={(e) => setCompanyData({ 
                    ...companyData, 
                    address: { ...companyData.address, city: e.target.value }
                  })}
                  placeholder="City"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={companyData.address.state}
                    onChange={(e) => setCompanyData({ 
                      ...companyData, 
                      address: { ...companyData.address, state: e.target.value }
                    })}
                    placeholder="State"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={companyData.address.zipCode}
                    onChange={(e) => setCompanyData({ 
                      ...companyData, 
                      address: { ...companyData.address, zipCode: e.target.value }
                    })}
                    placeholder="ZIP code"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-start p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <MapPinIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div className="text-gray-900">
                  {companyData.address.street ? (
                    <>
                      <p>{companyData.address.street}</p>
                      <p>
                        {companyData.address.city}
                        {companyData.address.state && `, ${companyData.address.state}`}
                        {companyData.address.zipCode && ` ${companyData.address.zipCode}`}
                      </p>
                    </>
                  ) : (
                    <span className="text-gray-500">Not specified</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax ID / EIN
                <FieldTooltip content="Federal tax identification number" />
              </label>
              {editMode ? (
                <input
                  type="text"
                  value={companyData.taxId}
                  onChange={(e) => setCompanyData({ ...companyData, taxId: e.target.value })}
                  placeholder="XX-XXXXXXX"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <IdentificationIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">
                    {companyData.taxId ? '••••••' + companyData.taxId.slice(-4) : 'Not specified'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Registration Number
                <FieldTooltip content="State business registration number" />
              </label>
              {editMode ? (
                <input
                  type="text"
                  value={companyData.registrationNumber}
                  onChange={(e) => setCompanyData({ ...companyData, registrationNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <IdentificationIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">{companyData.registrationNumber || 'Not specified'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year Established
                <FieldTooltip content="Year your business was founded" />
              </label>
              {editMode ? (
                <input
                  type="number"
                  value={companyData.yearEstablished}
                  onChange={(e) => setCompanyData({ ...companyData, yearEstablished: e.target.value })}
                  min="1900"
                  max={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">{companyData.yearEstablished || 'Not specified'}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Description
              <FieldTooltip content="Brief description of your business activities" />
            </label>
            {editMode ? (
              <textarea
                value={companyData.description}
                onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe your business..."
              />
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-900">
                  {companyData.description || <span className="text-gray-500">No description provided</span>}
                </p>
              </div>
            )}
          </div>

          {editMode && (
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setEditMode(false);
                  setErrors({});
                  loadCompanyData();
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyProfile;