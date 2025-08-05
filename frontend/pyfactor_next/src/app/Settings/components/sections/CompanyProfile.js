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
import CurrencyPreferencesV2 from './CurrencyPreferencesV2';
import AccountingStandards from './AccountingStandards';

const CompanyProfile = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  console.log('[CompanyProfile] === COMPONENT RENDERED v2 ===');
  console.log('[CompanyProfile] Props:', { 
    hasUser: !!user, 
    hasProfileData: !!profileData, 
    isOwner, 
    isAdmin, 
    hasNotifySuccess: !!notifySuccess, 
    hasNotifyError: !!notifyError 
  });
  
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
  const [uploadError, setUploadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
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
      county: '',
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
          county: '',
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
            county: profileData.address?.county || profileData.tenant?.address?.county || profileData.county || '',
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

  const handleLogoUpload = async (event, isRetry = false) => {
    console.log('[CompanyProfile] handleLogoUpload called with event:', event, 'isRetry:', isRetry);
    
    const file = event.target?.files?.[0] || event; // Support direct file or event
    console.log('[CompanyProfile] Selected file:', file);
    
    if (!file) {
      console.log('[CompanyProfile] No file selected, returning');
      return;
    }

    // Clear previous error
    setUploadError(null);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      const error = 'Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.';
      setUploadError(error);
      safeNotifyError(error);
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      const error = 'File size exceeds 5MB limit.';
      setUploadError(error);
      safeNotifyError(error);
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
      
      const response = await fetch('/api/business/logo/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('[CompanyProfile] Upload response received, status:', response.status);
      
      let data;
      try {
        data = await response.json();
        console.log('[CompanyProfile] Upload response data:', data);
      } catch (jsonError) {
        console.error('[CompanyProfile] Failed to parse response as JSON:', jsonError);
        throw new Error('Invalid response format from server');
      }
      
      if (response.ok && data.success) {
        safeNotifySuccess('Logo uploaded successfully');
        setRetryCount(0);
        setUploadError(null);
        
        // Use the logo URL from the response directly
        if (data.logo_url) {
          console.log('[CompanyProfile] Setting logo URL from upload response:', data.logo_url.substring(0, 100) + '...');
          setLogoUrl(data.logo_url);
          
          // Emit a custom event to notify DashAppBar to refresh
          window.dispatchEvent(new CustomEvent('businessLogoUpdated', {
            detail: { logoUrl: data.logo_url }
          }));
        }
      } else {
        const error = data.error || 'Failed to upload logo';
        console.error('[CompanyProfile] Upload failed with response:', data);
        setUploadError(error);
        safeNotifyError(error);
      }
    } catch (error) {
      console.error('[CompanyProfile] Exception during logo upload:', error);
      
      let errorMessage = 'Failed to upload logo';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error: Unable to connect to server';
      } else {
        errorMessage = error.message;
      }
      
      setUploadError(errorMessage);
      safeNotifyError(errorMessage);
    } finally {
      setUploadingLogo(false);
      // Reset file input only if not a retry
      if (!isRetry && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRetryUpload = () => {
    if (fileInputRef.current?.files?.[0]) {
      setRetryCount(prev => prev + 1);
      handleLogoUpload(fileInputRef.current.files[0], true);
    } else {
      // No file to retry, prompt for new file
      fileInputRef.current?.click();
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
        
        // Emit event to notify DashAppBar to clear logo
        window.dispatchEvent(new CustomEvent('businessLogoUpdated', {
          detail: { logoUrl: null }
        }));
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
            
            {/* Logo Upload Area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                uploadingLogo 
                  ? 'border-blue-300 bg-blue-50' 
                  : uploadError
                    ? 'border-red-300 bg-red-50'
                    : logoUrl 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-300 hover:border-blue-400 cursor-pointer'
              }`}
              onClick={() => {
                if (!uploadingLogo && !uploadError && canEdit) {
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className="text-center">
                {logoUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="h-20 w-20 bg-white rounded-lg border-2 border-gray-200 flex items-center justify-center mb-3 overflow-hidden">
                      <img 
                        src={logoUrl} 
                        alt="" 
                        className="h-18 w-18 object-contain"
                      />
                    </div>
                    <CheckCircleIcon className="h-8 w-8 text-green-500 mb-2" />
                    <p className="text-sm font-medium text-gray-900">Logo uploaded successfully</p>
                    <p className="text-xs text-gray-500 mt-1">
                      This logo appears before your business name in the dashboard header
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Tip: Use 300×100px or 3:1 aspect ratio for best results
                    </p>
                  </div>
                ) : (
                  <div>
                    {uploadingLogo ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-sm font-medium text-blue-600">Uploading logo...</p>
                        {retryCount > 0 && (
                          <p className="text-xs text-gray-500 mt-1">Attempt {retryCount + 1}</p>
                        )}
                      </div>
                    ) : uploadError ? (
                      <div className="flex flex-col items-center">
                        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mb-4" />
                        <p className="text-sm font-medium text-red-600 mb-2">Upload failed</p>
                        <p className="text-xs text-red-500 text-center mb-4 max-w-xs">
                          {uploadError}
                        </p>
                        {canEdit && (
                          <button
                            onClick={handleRetryUpload}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Try again
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-900">
                            {canEdit ? 'Click to upload your business logo' : 'No logo uploaded'}
                          </p>
                          {canEdit && (
                            <p className="text-sm text-gray-500 mt-1">
                              or drag and drop
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF, WebP up to 5MB
                        </p>
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                          Recommended: 300×100px or 3:1 aspect ratio
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>

            {/* Action Buttons */}
            {logoUrl && canEdit && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogoDelete();
                  }}
                  disabled={uploadingLogo}
                  className="flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Remove Logo
                </button>
              </div>
            )}

            {/* Logo Preview in Header Context */}
            {logoUrl && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-2">Preview in header:</p>
                <div className="bg-blue-600 rounded-lg p-3 inline-flex items-center">
                  <div className="h-8 w-18 mr-2 bg-white rounded flex items-center justify-center flex-shrink-0">
                    <img 
                      src={logoUrl} 
                      alt="" 
                      className="h-7 w-17 object-contain p-0.5"
                    />
                  </div>
                  <span className="text-white font-semibold text-sm">{companyData.businessName}</span>
                  <span className="mx-2 h-4 w-px bg-white/30"></span>
                  <span className="text-white text-xs">Professional</span>
                </div>
              </div>
            )}
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
                  value={companyData.address.county}
                  onChange={(e) => setCompanyData({ 
                    ...companyData, 
                    address: { ...companyData.address, county: e.target.value }
                  })}
                  placeholder="County"
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
            ) : (
              <div className="flex items-start p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <MapPinIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div className="text-gray-900">
                  {companyData.address.street ? (
                    <>
                      <p>{companyData.address.street}</p>
                      <p>
                        {companyData.address.city}
                        {companyData.address.county && `, ${companyData.address.county}`}
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

          {/* Currency Preferences Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <CurrencyPreferencesV2 />
          </div>

          {/* Accounting Standards Section */}
          <div className="mt-6">
            <AccountingStandards />
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