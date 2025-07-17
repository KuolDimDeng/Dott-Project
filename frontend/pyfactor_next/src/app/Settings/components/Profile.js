'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';
import Image from 'next/image';
import { 
  UserIcon,
  ShieldCheckIcon,
  CogIcon,
  ScaleIcon,
  CameraIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  ClockIcon,
  GlobeAltIcon,
  MoonIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

const Profile = ({ userData }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const fileInputRef = useRef(null);
  
  // Employee profile data states
  const [employeeData, setEmployeeData] = useState(null);
  const [bankInfo, setBankInfo] = useState(null);
  const [taxInfo, setTaxInfo] = useState(null);
  const [loadingEmployeeData, setLoadingEmployeeData] = useState(false);
  const [savingBankInfo, setSavingBankInfo] = useState(false);
  const [savingTaxInfo, setSavingTaxInfo] = useState(false);
  const [showFullSSN, setShowFullSSN] = useState(false);
  
  const router = useRouter();
  const { notifySuccess, notifyError } = useNotification();
  
  // Log the userData to see what we're working with
  useEffect(() => {
    console.log('[Profile] Component mounted with userData:', userData);
  }, [userData]);

  // Fetch profile data on mount
  useEffect(() => {
    console.log('[Profile] useEffect triggered, selectedTab:', selectedTab);
    fetchProfileData();
    if (selectedTab === 1) {
      console.log('[Profile] Fetching login sessions for Security tab');
      fetchLoginSessions();
    }
    // Fetch employee data when Pay or Tax tabs are selected
    if (selectedTab === 2 || selectedTab === 3) {
      console.log('[Profile] Fetching employee data for Pay/Tax tab');
      fetchEmployeeProfileData();
    }
  }, [selectedTab]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        console.log('[Profile] Profile data fetched:', data);
        setProfileData(data);
        setProfilePhoto(data.profilePhoto || data.profile_photo || data.picture);
      } else {
        console.error('[Profile] Profile fetch failed:', response.status, response.statusText);
        // If the new endpoint fails, try to use userData
        if (userData) {
          console.log('[Profile] Using userData fallback:', userData);
          setProfileData(userData);
          setProfilePhoto(userData.picture || userData.profilePhoto);
        }
      }
    } catch (error) {
      console.error('[Profile] Error fetching profile:', error);
      // Use userData as fallback
      if (userData) {
        console.log('[Profile] Using userData fallback due to error:', userData);
        setProfileData(userData);
        setProfilePhoto(userData.picture || userData.profilePhoto);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginSessions = async () => {
    try {
      setLoadingSessions(true);
      const response = await fetch('/api/user/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchEmployeeProfileData = async () => {
    try {
      setLoadingEmployeeData(true);
      console.log('[Profile] Fetching employee profile data...');
      const response = await fetch('/api/hr/employee/profile');
      console.log('[Profile] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Profile] Employee profile data fetched:', data);
        setEmployeeData(data);
        setBankInfo(data.bank_info || {});
        setTaxInfo(data.tax_info || {});
      } else {
        const errorText = await response.text();
        console.error('[Profile] Failed to fetch employee profile:', response.status, errorText);
        
        // If 404, it means no employee record exists for this user
        if (response.status === 404) {
          notifyError('No employee record found. Please contact your administrator.');
        }
      }
    } catch (error) {
      console.error('[Profile] Error fetching employee profile:', error);
      notifyError('Failed to load employee information');
    } finally {
      setLoadingEmployeeData(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      notifyError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notifyError('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      
      // Create FormData
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/user/upload-photo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfilePhoto(data.photoUrl);
        notifySuccess('Profile photo updated successfully');
      } else {
        throw new Error('Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      notifyError('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePasswordChange = () => {
    // Redirect to Auth0 password reset
    window.location.href = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/dbconnections/change_password?client_id=${process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}`;
  };

  const handleEnable2FA = () => {
    // Redirect to Auth0 MFA setup
    router.push('/settings/security/mfa');
  };

  const handleEndSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/user/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        notifySuccess('Session ended successfully');
        fetchLoginSessions();
      }
    } catch (error) {
      console.error('Error ending session:', error);
      notifyError('Failed to end session');
    }
  };

  const renderProfileTab = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    const user = profileData || userData || {};

    return (
      <div className="space-y-6">
        {/* Profile Photo Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h3>
          
          <div className="flex items-start space-x-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                {profilePhoto ? (
                  <Image
                    src={profilePhoto}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <UserIcon className="w-12 h-12" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {uploadingPhoto ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <CameraIcon className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">
                Upload a profile photo. Recommended dimensions: 400x400px (square). 
                Maximum file size: 5MB. Accepted formats: JPG, PNG, GIF.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Change Photo
              </button>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={user.name || user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                readOnly
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={user.email || ''}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  readOnly
                />
                {(user.email_verified || user.emailVerified) && (
                  <CheckBadgeIcon className="absolute right-3 top-2.5 w-5 h-5 text-green-500" />
                )}
              </div>
              {!(user.email_verified || user.emailVerified) && user.email && (
                <p className="mt-1 text-sm text-amber-600 flex items-center">
                  <ExclamationCircleIcon className="w-4 h-4 mr-1" />
                  Email not verified
                </p>
              )}
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="tel"
                value={user.phone_number || user.phoneNumber || ''}
                placeholder="Not provided"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                readOnly
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => router.push('/settings/profile/edit')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSecurityTab = () => {
    const user = profileData || userData || {};
    
    return (
      <div className="space-y-6">
        {/* Password Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Password</h3>
              <p className="mt-1 text-sm text-gray-600">
                Ensure your account is using a strong password to stay secure
              </p>
            </div>
            <LockClosedIcon className="w-6 h-6 text-gray-400" />
          </div>
          
          <div className="mt-4">
            <button
              onClick={handlePasswordChange}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
              <p className="mt-1 text-sm text-gray-600">
                Add an extra layer of security to your account
              </p>
            </div>
            <ShieldCheckIcon className="w-6 h-6 text-gray-400" />
          </div>
          
          <div className="mt-4">
            {user.mfa_enabled || user.multifactor?.length > 0 ? (
              <div className="flex items-center space-x-2">
                <CheckBadgeIcon className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-700">2FA is enabled</span>
              </div>
            ) : (
              <button
                onClick={handleEnable2FA}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Enable 2FA
              </button>
            )}
          </div>
        </div>

        {/* Login History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Login History</h3>
              <p className="mt-1 text-sm text-gray-600">
                Manage your active sessions and see recent login activity
              </p>
            </div>
            <ClockIcon className="w-6 h-6 text-gray-400" />
          </div>
          
          {loadingSessions ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session, index) => (
                <div key={session.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {session.device_type === 'mobile' ? (
                      <DevicePhoneMobileIcon className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ComputerDesktopIcon className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {session.browser || 'Unknown Browser'} on {session.os || 'Unknown OS'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {session.location || 'Unknown Location'} • {session.last_active || 'Recently'}
                      </p>
                    </div>
                  </div>
                  {session.is_current ? (
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Current
                    </span>
                  ) : (
                    <button
                      onClick={() => handleEndSession(session.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      End Session
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No active sessions found</p>
          )}
        </div>
      </div>
    );
  };

  const renderPreferencesTab = () => {
    return (
      <div className="space-y-6">
        {/* Language & Region */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Language & Region</h3>
              <p className="mt-1 text-sm text-gray-600">
                Set your preferred language and regional settings
              </p>
            </div>
            <GlobeAltIcon className="w-6 h-6 text-gray-400" />
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Language and region preferences will be available soon. Stay tuned!
            </p>
          </div>
        </div>

        {/* Theme Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Theme & Display</h3>
              <p className="mt-1 text-sm text-gray-600">
                Customize how the application looks
              </p>
            </div>
            <MoonIcon className="w-6 h-6 text-gray-400" />
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Theme customization options coming soon. We're working on light/dark mode and more!
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderPayTab = () => {
    if (loadingEmployeeData) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* SSN Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Social Security Number</h3>
              <p className="mt-1 text-sm text-gray-600">
                Your SSN is securely stored and encrypted
              </p>
            </div>
            <DocumentTextIcon className="w-6 h-6 text-gray-400" />
          </div>
          
          {/* Debug Info */}
          {!employeeData && !loadingEmployeeData && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                No employee record found for your account ({userData?.email}).
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                An employee record must be created by an administrator to access Pay and Tax information.
              </p>
            </div>
          )}
          
          <div className="mt-4">
            {employeeData?.ssn_last_4 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">SSN:</span>
                    <span className="font-mono text-sm">
                      {showFullSSN 
                        ? `XXX-XX-${employeeData.ssn_last_4}`
                        : `•••-••-${employeeData.ssn_last_4}`}
                    </span>
                    <CheckBadgeIcon className="w-5 h-5 text-green-500" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullSSN(!showFullSSN)}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showFullSSN ? (
                      <>
                        <EyeSlashIcon className="w-4 h-4" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <EyeIcon className="w-4 h-4" />
                        <span>Show Format</span>
                      </>
                    )}
                  </button>
                </div>
                {showFullSSN && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                      <ShieldExclamationIcon className="inline w-4 h-4 mr-1" />
                      For security reasons, only the last 4 digits of your SSN are stored and displayed. 
                      The full SSN is encrypted and stored securely in our payment processor.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No SSN on file</p>
            )}
          </div>
        </div>

        {/* Bank Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Bank Information</h3>
              <p className="mt-1 text-sm text-gray-600">
                Add your bank details to receive direct deposit payments
              </p>
            </div>
            <BuildingLibraryIcon className="w-6 h-6 text-gray-400" />
          </div>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            setSavingBankInfo(true);
            
            const formData = new FormData(e.target);
            const bankData = {
              routing_number: formData.get('routing_number'),
              account_number: formData.get('account_number'),
              account_type: formData.get('account_type'),
              bank_name: formData.get('bank_name')
            };
            
            try {
              const response = await fetch('/api/hr/employee/bank-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bankData)
              });
              
              if (response.ok) {
                notifySuccess('Bank information saved successfully');
                fetchEmployeeProfileData();
              } else {
                const error = await response.json();
                notifyError(error.error || 'Failed to save bank information');
              }
            } catch (error) {
              notifyError('Failed to save bank information');
            } finally {
              setSavingBankInfo(false);
            }
          }} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bank_name"
                  defaultValue={bankInfo?.bank_name || ''}
                  placeholder="e.g., Chase Bank"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Type
                </label>
                <select
                  name="account_type"
                  defaultValue={bankInfo?.account_type || 'checking'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Routing Number
                </label>
                <input
                  type="text"
                  name="routing_number"
                  placeholder={bankInfo?.routing_last_4 ? `*****${bankInfo.routing_last_4}` : '123456789'}
                  maxLength="9"
                  pattern="[0-9]{9}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  name="account_number"
                  placeholder={bankInfo?.account_last_4 ? `******${bankInfo.account_last_4}` : 'Enter account number'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            
            {bankInfo?.account_last_4 && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <CheckBadgeIcon className="inline w-4 h-4 mr-1" />
                  Current account on file: ****{bankInfo.account_last_4} ({bankInfo.account_type})
                </p>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingBankInfo}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingBankInfo ? 'Saving...' : 'Save Bank Information'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderTaxTab = () => {
    if (loadingEmployeeData) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Tax Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tax Information</h3>
              <p className="mt-1 text-sm text-gray-600">
                Manage your tax withholding preferences
              </p>
            </div>
            <DocumentTextIcon className="w-6 h-6 text-gray-400" />
          </div>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            setSavingTaxInfo(true);
            
            const formData = new FormData(e.target);
            const taxData = {
              filing_status: formData.get('filing_status'),
              allowances: parseInt(formData.get('allowances')) || 0,
              additional_withholding: parseFloat(formData.get('additional_withholding')) || 0,
              state_filing_status: formData.get('state_filing_status'),
              state_allowances: parseInt(formData.get('state_allowances')) || 0,
              tax_id_number: formData.get('tax_id_number')
            };
            
            try {
              const response = await fetch('/api/hr/employee/tax-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taxData)
              });
              
              if (response.ok) {
                notifySuccess('Tax information saved successfully');
                fetchEmployeeProfileData();
              } else {
                const error = await response.json();
                notifyError(error.error || 'Failed to save tax information');
              }
            } catch (error) {
              notifyError('Failed to save tax information');
            } finally {
              setSavingTaxInfo(false);
            }
          }} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Federal Filing Status
                </label>
                <select
                  name="filing_status"
                  defaultValue={taxInfo?.filing_status || 'single'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="single">Single</option>
                  <option value="married_filing_jointly">Married Filing Jointly</option>
                  <option value="married_filing_separately">Married Filing Separately</option>
                  <option value="head_of_household">Head of Household</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Federal Allowances
                </label>
                <input
                  type="number"
                  name="allowances"
                  defaultValue={taxInfo?.allowances || 0}
                  min="0"
                  max="99"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Withholding
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    name="additional_withholding"
                    defaultValue={taxInfo?.additional_withholding || 0}
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID Number <span className="text-gray-400">(if different from SSN)</span>
                </label>
                <input
                  type="text"
                  name="tax_id_number"
                  placeholder={taxInfo?.tax_id_last_4 ? `*****${taxInfo.tax_id_last_4}` : 'Optional'}
                  maxLength="9"
                  pattern="[0-9]{9}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="border-t pt-4 mt-6">
              <h4 className="font-medium text-gray-900 mb-4">State Tax Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State Filing Status
                  </label>
                  <select
                    name="state_filing_status"
                    defaultValue={taxInfo?.state_filing_status || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Same as Federal</option>
                    <option value="single">Single</option>
                    <option value="married_filing_jointly">Married Filing Jointly</option>
                    <option value="married_filing_separately">Married Filing Separately</option>
                    <option value="head_of_household">Head of Household</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State Allowances
                  </label>
                  <input
                    type="number"
                    name="state_allowances"
                    defaultValue={taxInfo?.state_allowances || 0}
                    min="0"
                    max="99"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingTaxInfo}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingTaxInfo ? 'Saving...' : 'Save Tax Information'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderLegalTab = () => {
    return (
      <div className="space-y-6">
        {/* Help & Support */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Help & Support</h3>
              <p className="mt-1 text-sm text-gray-600">
                Get help when you need it
              </p>
            </div>
            <QuestionMarkCircleIcon className="w-6 h-6 text-gray-400" />
          </div>
          
          <div className="mt-4 space-y-3">
            <a
              href="/help-center"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900">Help Center</span>
              <span className="text-gray-400">→</span>
            </a>
            
            <a
              href="mailto:support@dottapps.com"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900">Email Support</span>
              <span className="text-gray-400">→</span>
            </a>
            
            <button
              onClick={() => window.Crisp?.push(['do', 'chat:open'])}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-sm font-medium text-gray-900">Live Chat</span>
              <span className="text-gray-400">→</span>
            </button>
          </div>
        </div>

        {/* Legal Documents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Legal</h3>
              <p className="mt-1 text-sm text-gray-600">
                Important legal information and policies
              </p>
            </div>
            <DocumentTextIcon className="w-6 h-6 text-gray-400" />
          </div>
          
          <div className="mt-4 space-y-3">
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900">Terms of Service</span>
              <span className="text-gray-400">↗</span>
            </a>
            
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900">Privacy Policy</span>
              <span className="text-gray-400">↗</span>
            </a>
            
            <a
              href="/cookies"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900">Cookie Policy</span>
              <span className="text-gray-400">↗</span>
            </a>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 0, label: 'Profile', icon: UserIcon },
    { id: 1, label: 'Security', icon: ShieldCheckIcon },
    { id: 2, label: 'Pay', icon: BanknotesIcon },
    { id: 3, label: 'Tax', icon: DocumentTextIcon },
    { id: 4, label: 'Preferences', icon: CogIcon },
    { id: 5, label: 'Legal', icon: ScaleIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="mt-2 text-gray-600">Manage your account settings and preferences</p>
        </div>
        
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    className={`
                      group relative min-w-0 flex-1 overflow-hidden py-4 px-4 text-sm font-medium text-center hover:bg-gray-50 focus:z-10 transition-all duration-200
                      ${selectedTab === tab.id
                        ? 'text-blue-600 bg-blue-50/50'
                        : 'text-gray-500 hover:text-gray-700'
                      }
                    `}
                    onClick={() => {
                      console.log('[Profile] Tab clicked:', tab.label, 'id:', tab.id);
                      setSelectedTab(tab.id);
                    }}
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <Icon className={`w-5 h-5 ${selectedTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span>{tab.label}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`
                        absolute inset-x-0 bottom-0 h-0.5 transition-all duration-200
                        ${selectedTab === tab.id ? 'bg-blue-600' : 'bg-transparent'}
                      `}
                    />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
        
        {/* Tab Content */}
        <div>
          {selectedTab === 0 && renderProfileTab()}
          {selectedTab === 1 && renderSecurityTab()}
          {selectedTab === 2 && renderPayTab()}
          {selectedTab === 3 && renderTaxTab()}
          {selectedTab === 4 && renderPreferencesTab()}
          {selectedTab === 5 && renderLegalTab()}
        </div>
      </div>
    </div>
  );
};

export default Profile;