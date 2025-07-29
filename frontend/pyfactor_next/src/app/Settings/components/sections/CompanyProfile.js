'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  PencilIcon,
  PhotoIcon,
  TrashIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { FieldTooltip } from '@/components/ui/FieldTooltip';
import { logger } from '@/utils/logger';

const CompanyProfile = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  // Wrap notifyError to ensure it exists
  const safeNotifyError = notifyError || ((msg) => {
    console.error('[CompanyProfile] Error notification:', msg);
    alert(msg);
  });
  
  const safeNotifySuccess = notifySuccess || ((msg) => {
    console.log('[CompanyProfile] Success notification:', msg);
  });
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);
  const [companyData, setCompanyData] = useState({
    businessName: '',
    businessType: '',
    legalStructure: '',
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
    description: '',
    displayLegalStructure: true // Default to true
  });

  const [editMode, setEditMode] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadCompanyData();
    loadBusinessLogo();
  }, [profileData, user]);

  const loadBusinessLogo = async () => {
    try {
      const response = await fetch('/api/business/logo');
      if (response.ok) {
        const data = await response.json();
        if (data.logo_url) {
          // Convert backend URL to full URL if needed
          const fullUrl = data.logo_url.startsWith('http') 
            ? data.logo_url 
            : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}${data.logo_url}`;
          setLogoUrl(fullUrl);
        }
      }
    } catch (error) {
      console.error('Error loading business logo:', error);
    }
  };

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      
      // Debug log to see what data we have
      console.log('[CompanyProfile] Loading with data:', { user, profileData });
      
      // First try to get data from profileData
      let businessData = {
        businessName: '',
        businessType: '',
        legalStructure: '',
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
        description: '',
        displayLegalStructure: true
      };

      // Check multiple sources for business data
      if (profileData) {
        businessData = {
          businessName: profileData.businessName || profileData.tenant?.businessName || profileData.business_name || '',
          businessType: profileData.businessType || profileData.tenant?.businessType || profileData.business_type || '',
          legalStructure: profileData.legalStructure || profileData.tenant?.legalStructure || profileData.legal_structure || '',
          email: profileData.email || profileData.tenant?.email || user?.email || '',
          phone: profileData.phone || profileData.tenant?.phone || profileData.phone_number || '',
          website: profileData.website || profileData.tenant?.website || '',
          address: {
            street: profileData.address?.street || profileData.tenant?.address?.street || '',
            city: profileData.address?.city || profileData.tenant?.address?.city || '',
            state: profileData.address?.state || profileData.tenant?.address?.state || '',
            zipCode: profileData.address?.zipCode || profileData.tenant?.address?.zipCode || '',
            country: profileData.address?.country || profileData.tenant?.address?.country || 'US'
          },
          taxId: profileData.taxId || profileData.tenant?.taxId || '',
          registrationNumber: profileData.registrationNumber || profileData.tenant?.registrationNumber || '',
          yearEstablished: profileData.yearEstablished || profileData.tenant?.yearEstablished || '',
          industry: profileData.industry || profileData.tenant?.industry || '',
          description: profileData.description || profileData.tenant?.description || '',
          displayLegalStructure: profileData.displayLegalStructure !== undefined ? profileData.displayLegalStructure : true
        };
      }

      // Always try to fetch complete business data from dedicated business API
      try {
        console.log('[CompanyProfile] Fetching business data from /api/tenant/business-info');
        const businessResponse = await fetch('/api/tenant/business-info');
        if (businessResponse.ok) {
          const businessApiData = await businessResponse.json();
          console.log('[CompanyProfile] Business API data received:', businessApiData);
          
          if (businessApiData && !businessApiData.error) {
            // Use business API data as the primary source
            businessData = {
              businessName: businessApiData.businessName || businessData.businessName,
              businessType: businessApiData.businessType || businessApiData.business_type || businessData.businessType,
              legalStructure: businessApiData.legalStructure || businessApiData.legal_structure || businessData.legalStructure,
              email: businessApiData.email || businessData.email,
              phone: businessApiData.phone || businessApiData.phoneNumber || businessApiData.phone_number || businessData.phone,
              website: businessApiData.website || businessData.website,
              address: businessApiData.address || businessData.address,
              taxId: businessApiData.taxId || businessData.taxId,
              registrationNumber: businessApiData.registrationNumber || businessData.registrationNumber,
              yearEstablished: businessApiData.yearEstablished || businessData.yearEstablished,
              industry: businessApiData.industry || businessData.industry,
              description: businessApiData.description || businessData.description,
              displayLegalStructure: businessApiData.displayLegalStructure !== undefined ? businessApiData.displayLegalStructure : businessData.displayLegalStructure
            };
            console.log('[CompanyProfile] Updated business data from API:', businessData);
          }
        } else {
          console.warn('[CompanyProfile] Business API request failed:', businessResponse.status);
          console.log('[CompanyProfile] Business API error details:', await businessResponse.text().catch(() => 'Could not read error'));
          
          // Fallback to profile API if business API fails
          console.log('[CompanyProfile] Falling back to profile API');
          const profileResponse = await fetch('/api/user/profile');
          if (profileResponse.ok) {
            const userData = await profileResponse.json();
            console.log('[CompanyProfile] Profile API data received:', userData);
            if (userData) {
              businessData = {
                ...businessData,
                businessName: userData.businessName || userData.business_name || businessData.businessName,
                businessType: userData.businessType || userData.business_type || businessData.businessType,
                legalStructure: userData.legalStructure || userData.legal_structure || businessData.legalStructure,
                email: userData.email || businessData.email,
                phone: userData.phone || userData.phone_number || businessData.phone,
                website: userData.website || businessData.website,
                industry: userData.industry || businessData.industry,
                description: userData.description || businessData.description,
                taxId: userData.taxId || businessData.taxId,
                registrationNumber: userData.registrationNumber || businessData.registrationNumber,
                yearEstablished: userData.yearEstablished || businessData.yearEstablished,
                address: userData.address || businessData.address,
                displayLegalStructure: userData.displayLegalStructure !== undefined ? userData.displayLegalStructure : businessData.displayLegalStructure
              };
              console.log('[CompanyProfile] Updated business data from profile API:', businessData);
            }
          } else {
            console.error('[CompanyProfile] Profile API also failed:', profileResponse.status);
          }
        }
      } catch (apiError) {
        logger.error('[CompanyProfile] Error fetching business data:', apiError);
        console.error('[CompanyProfile] API Error details:', apiError);
      }

      // Also check user object for business data - this should come from the user session
      if (user) {
        console.log('[CompanyProfile] Checking user object for business data:', user);
        businessData.businessName = businessData.businessName || user.businessName || user.business_name || user['custom:businessname'] || '';
        businessData.businessType = businessData.businessType || user.business_type || user['custom:businesstype'] || '';
        businessData.legalStructure = businessData.legalStructure || user.legalStructure || user.legal_structure || '';
        businessData.email = businessData.email || user.email || '';
        businessData.phone = businessData.phone || user.phone_number || user.phoneNumber || '';
        if (user.displayLegalStructure !== undefined) {
          businessData.displayLegalStructure = user.displayLegalStructure;
        }
      }
      
      // Additional fallback: try to get user session data directly from session context
      try {
        console.log('[CompanyProfile] Attempting to get session data for business info');
        const sessionResponse = await fetch('/api/auth/session-v2');
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          console.log('[CompanyProfile] Session data received:', sessionData);
          if (sessionData?.user) {
            const sessionUser = sessionData.user;
            businessData = {
              ...businessData,
              businessName: businessData.businessName || sessionUser.businessName || sessionUser.business_name || '',
              businessType: businessData.businessType || sessionUser.businessType || sessionUser.business_type || '',
              legalStructure: businessData.legalStructure || sessionUser.legalStructure || sessionUser.legal_structure || '',
              email: businessData.email || sessionUser.email || '',
              phone: businessData.phone || sessionUser.phone_number || sessionUser.phoneNumber || '',
              displayLegalStructure: sessionUser.displayLegalStructure !== undefined ? sessionUser.displayLegalStructure : businessData.displayLegalStructure
            };
            console.log('[CompanyProfile] Updated business data from session:', businessData);
          }
        }
      } catch (sessionError) {
        console.warn('[CompanyProfile] Could not fetch session data:', sessionError);
      }

      setCompanyData(businessData);
    } catch (error) {
      logger.error('[CompanyProfile] Error loading company data:', error);
      safeNotifyError('Failed to load company information');
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

  const handleLogoUpload = async (event) => {
    console.log('[CompanyProfile] handleLogoUpload called with event:', event);
    console.log('[CompanyProfile] Event target:', event.target);
    console.log('[CompanyProfile] Files:', event.target.files);
    
    const file = event.target.files?.[0];
    console.log('[CompanyProfile] Selected file:', file);
    
    if (!file) {
      console.log('[CompanyProfile] No file selected, returning');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.log('[CompanyProfile] Invalid file type:', file.type);
      safeNotifyError('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log('[CompanyProfile] File too large:', file.size);
      safeNotifyError('File size exceeds 5MB limit.');
      return;
    }

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      console.log('[CompanyProfile] Starting logo upload...');
      console.log('[CompanyProfile] File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      
      console.log('[CompanyProfile] Making fetch request to /api/business/logo/upload');
      
      const response = await fetch('/api/business/logo/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('[CompanyProfile] Upload response received, status:', response.status);
      console.log('[CompanyProfile] Response headers:', Object.fromEntries(response.headers.entries()));
      
      let data;
      try {
        data = await response.json();
        console.log('[CompanyProfile] Upload response data:', data);
      } catch (jsonError) {
        console.error('[CompanyProfile] Failed to parse response as JSON:', jsonError);
        // Don't try to read response body again after json() failed
        throw new Error('Invalid response format from server');
      }
      
      if (response.ok && data.success) {
        safeNotifySuccess('Logo uploaded successfully');
        await loadBusinessLogo(); // Reload the logo
      } else {
        console.error('[CompanyProfile] Upload failed with response:', data);
        safeNotifyError(data.error || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('[CompanyProfile] Exception during logo upload:', error);
      console.error('[CompanyProfile] Error stack:', error.stack);
      console.error('[CompanyProfile] Error type:', error.constructor.name);
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        safeNotifyError('Network error: Unable to connect to server');
      } else {
        safeNotifyError('Failed to upload logo: ' + error.message);
      }
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogoDelete = async () => {
    if (!confirm('Are you sure you want to delete the business logo?')) {
      return;
    }

    setUploadingLogo(true);
    try {
      const response = await fetch('/api/business/logo', {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        safeNotifySuccess('Logo deleted successfully');
        setLogoUrl(null);
      } else {
        safeNotifyError(data.error || 'Failed to delete logo');
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
      safeNotifyError('Failed to delete logo');
    } finally {
      setUploadingLogo(false);
    }
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
          businessName: undefined,
          legalStructure: companyData.legalStructure,
          displayLegalStructure: companyData.displayLegalStructure
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update company information');
      }

      safeNotifySuccess('Company information updated successfully');
      setEditMode(false);
    } catch (error) {
      logger.error('[CompanyProfile] Error saving company data:', error);
      safeNotifyError('Failed to update company information');
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
    'Retail', 'E-commerce', 'Professional Services', 'Healthcare',
    'Technology', 'Manufacturing', 'Food & Beverage', 'Education',
    'Construction', 'Real Estate', 'Transportation', 'Finance',
    'Entertainment', 'Non-Profit', 'Other'
  ];

  const legalStructures = [
    'Sole Proprietorship',
    'General Partnership (GP)',
    'Limited Partnership (LP)',
    'Limited Liability Company (LLC)',
    'Corporation (Inc., Corp.)',
    'Limited Company (Ltd.)',
    'S-Corporation',
    'Non-Profit Organization (NPO)',
    'Other'
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Business Profile</h2>
          <p className="text-sm text-gray-500 mt-1">
            View and manage your business information
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

          {/* Business Logo Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Business Logo</h3>
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Business logo" 
                    className="h-24 w-24 rounded-lg object-contain bg-gray-50 border border-gray-200"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <PhotoIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-3">
                  Upload your business logo. Maximum file size: 5MB. Supported formats: JPG, PNG, GIF, WebP.
                </p>
                <div className="flex items-center space-x-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => {
                      console.log('[CompanyProfile] Upload button clicked');
                      console.log('[CompanyProfile] fileInputRef.current:', fileInputRef.current);
                      console.log('[CompanyProfile] uploadingLogo:', uploadingLogo);
                      console.log('[CompanyProfile] canEdit:', canEdit);
                      fileInputRef.current?.click();
                    }}
                    disabled={uploadingLogo || !canEdit}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </button>
                  {logoUrl && (
                    <button
                      onClick={handleLogoDelete}
                      disabled={uploadingLogo || !canEdit}
                      className="flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This logo will be displayed in your dashboard, invoices, emails, and WhatsApp messages.
                </p>
              </div>
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
                <FieldTooltip content="Type of business you operate" />
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
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">{companyData.businessType || 'Not specified'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Legal Structure
                <FieldTooltip content="Legal structure of your business" />
              </label>
              {editMode ? (
                <select
                  value={companyData.legalStructure}
                  onChange={(e) => setCompanyData({ ...companyData, legalStructure: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select legal structure</option>
                  {legalStructures.map(structure => (
                    <option key={structure} value={structure}>{structure}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <IdentificationIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">{companyData.legalStructure || 'Not specified'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={companyData.displayLegalStructure}
                  onChange={(e) => setCompanyData({ ...companyData, displayLegalStructure: e.target.checked })}
                  disabled={!editMode}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Display legal structure in header
                  <FieldTooltip content="Show your legal structure (LLC, Corp, Ltd) after your business name in the navigation bar" />
                </span>
              </label>
              <p className="mt-1 ml-7 text-xs text-gray-500">
                {companyData.displayLegalStructure ? 
                  `Will display as: ${companyData.businessName}${companyData.legalStructure && ['LLC', 'Limited Liability Company (LLC)', 'Corporation (Inc., Corp.)', 'Limited Company (Ltd.)'].some(suffix => companyData.legalStructure.includes(suffix)) ? ', ' + companyData.legalStructure.match(/\((.*?)\)/)?.[1] || companyData.legalStructure : ''}` :
                  'Legal structure will not be shown in header'
                }
              </p>
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