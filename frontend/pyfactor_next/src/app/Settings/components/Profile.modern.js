'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';
import { useSession } from '@/hooks/useSession-v2';
import Image from 'next/image';
import { 
  UserIcon,
  ShieldCheckIcon,
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
  BriefcaseIcon,
  BanknotesIcon,
  DocumentDuplicateIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  CreditCardIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  PlusIcon,
  MinusIcon,
  ArrowsPointingOutIcon,
  MagnifyingGlassIcon,
  DocumentIcon,
  BuildingOffice2Icon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import PayStubViewer from '@/components/PayStubViewer';
import InlineTimesheetManager from './timesheet/InlineTimesheetManager';
import SupervisorApprovalInterface from './timesheet/SupervisorApprovalInterface';

const Profile = ({ userData }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [mfaSettings, setMfaSettings] = useState({
    enabled: false,
    preferredMethod: 'totp',
    enrollments: [],
    availableMethods: ['totp', 'email', 'recovery-code'],
    hasActiveEnrollment: false
  });
  const [loadingMFA, setLoadingMFA] = useState(true);
  const [updatingMFA, setUpdatingMFA] = useState(false);
  const [showPayStubViewer, setShowPayStubViewer] = useState(false);
  const [organizationData, setOrganizationData] = useState([]);
  const [loadingOrganization, setLoadingOrganization] = useState(false);
  const [hoveredEmployee, setHoveredEmployee] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const orgChartRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Employment tab section visibility states
  const [expandedSections, setExpandedSections] = useState({
    banking: false,
    tax: false,
    pay: false,
    benefits: false,
    documents: false
  });
  
  const router = useRouter();
  const { notifySuccess, notifyError } = useNotification();
  
  // Get session data with user information
  const { session, loading: sessionLoading } = useSession();

  // Use session data to set profile data
  useEffect(() => {
    if (session?.user && !sessionLoading) {
      const sessionUser = session.user;
      setProfileData(sessionUser);
      setProfilePhoto(sessionUser.picture || sessionUser.profilePhoto || sessionUser.profile_photo);
      
      // Initialize edited data with current values
      const firstName = sessionUser.first_name || sessionUser.firstName || sessionUser.given_name || '';
      const lastName = sessionUser.last_name || sessionUser.lastName || sessionUser.family_name || '';
      const fullName = sessionUser.name || `${firstName} ${lastName}`.trim() || '';
      
      setEditedData({
        firstName: firstName,
        lastName: lastName,
        email: sessionUser.email || '',
        phone_number: sessionUser.phone_number || ''
      });
      
      setLoading(false);
    } else if (!sessionLoading) {
      // If no session user data, fetch from API as fallback
      fetchProfileData();
    }
  }, [session, sessionLoading]);
  
  // Fetch login sessions when security tab is selected
  useEffect(() => {
    console.log('[Profile] Selected tab changed to:', selectedTab);
    if (selectedTab === 1) {
      console.log('[Profile] Security tab selected, fetching data...');
      fetchLoginSessions();
      fetchMFASettings();
    }
  }, [selectedTab]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        // Handle different response structures
        const profile = data.profile || data;
        setProfileData(profile);
        setProfilePhoto(profile.profilePhoto || profile.profile_photo || profile.picture);
        
        // Initialize edited data
        const firstName = profile.first_name || profile.firstName || profile.given_name || '';
        const lastName = profile.last_name || profile.lastName || profile.family_name || '';
        
        setEditedData({
          firstName: firstName,
          lastName: lastName,
          email: profile.email || '',
          phone_number: profile.phone_number || ''
        });
      } else {
        notifyError('Failed to load profile data');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      notifyError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: editedData.firstName,
          lastName: editedData.lastName,
          phone_number: editedData.phone_number,
        }),
      });

      if (response.ok) {
        const updatedData = await response.json();
        
        // Update local state
        setProfileData({
          ...profileData,
          first_name: editedData.firstName,
          last_name: editedData.lastName,
          name: `${editedData.firstName} ${editedData.lastName}`.trim(),
          phone_number: editedData.phone_number,
        });
        
        setEditMode(false);
        notifySuccess('Profile updated successfully');
        
        // Refresh session data to reflect changes
        // TODO: Consider refreshing session data without full page reload
        // For now, we'll just update the local state
      } else {
        const error = await response.json();
        notifyError(error.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      notifyError('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset edited data to current profile data
    const user = {
      ...(userData || {}),
      ...(profileData || {}),
      ...(session?.user || {})
    };
    
    const firstName = user.first_name || user.firstName || user.given_name || '';
    const lastName = user.last_name || user.lastName || user.family_name || '';
    
    setEditedData({
      firstName: firstName,
      lastName: lastName,
      email: user.email || '',
      phone_number: user.phone_number || ''
    });
    
    setEditMode(false);
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
    const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
    const auth0ClientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '';
    window.location.href = `https://${auth0Domain}/dbconnections/change_password?client_id=${auth0ClientId}`;
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

  const fetchMFASettings = async () => {
    try {
      console.log('[MFA Settings] ========== FETCH STARTED ==========');
      console.log('[MFA Settings] Loading state before:', loadingMFA);
      setLoadingMFA(true);
      console.log('[MFA Settings] Making API call to /api/user/mfa...');
      
      const response = await fetch('/api/user/mfa');
      console.log('[MFA Settings] Response received - status:', response.status);
      console.log('[MFA Settings] Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[MFA Settings] Retrieved data:', data);
        setMfaSettings(data);
        console.log('[MFA Settings] MFA settings state updated');
      } else {
        const errorText = await response.text();
        console.error('[MFA Settings] API error:', response.status, errorText);
        console.error('[MFA Settings] Error response body:', errorText);
      }
    } catch (error) {
      console.error('[MFA Settings] ========== FETCH ERROR ==========');
      console.error('[MFA Settings] Error details:', error);
      console.error('[MFA Settings] Error message:', error.message);
      console.error('[MFA Settings] Error stack:', error.stack);
    } finally {
      console.log('[MFA Settings] ========== FETCH FINISHED ==========');
      console.log('[MFA Settings] Loading state set to false');
      setLoadingMFA(false);
    }
  };
  
  const handleToggleMFA = async (enabled) => {
    try {
      console.log('[MFA Toggle] ========== TOGGLE STARTED ==========');
      console.log('[MFA Toggle] Enabled:', enabled);
      console.log('[MFA Toggle] Current MFA settings:', mfaSettings);
      console.log('[MFA Toggle] Update state before:', updatingMFA);
      
      setUpdatingMFA(true);
      console.log('[MFA Toggle] Update state set to true');
      
      const requestBody = { 
        enabled, 
        preferredMethod: mfaSettings?.preferredMethod || 'totp' 
      };
      console.log('[MFA Toggle] Request body:', requestBody);
      console.log('[MFA Toggle] Making API call to /api/user/mfa...');
      
      const response = await fetch('/api/user/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('[MFA Toggle] Response received - status:', response.status);
      console.log('[MFA Toggle] Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[MFA Toggle] Response data:', data);
        notifySuccess(data.message);
        console.log('[MFA Toggle] Refreshing MFA settings...');
        await fetchMFASettings();
        
        if (enabled && !mfaSettings?.hasActiveEnrollment) {
          console.log('[MFA Toggle] Redirecting to Auth0 MFA enrollment...');
          // Redirect to Auth0 MFA enrollment
          setTimeout(() => {
            window.location.href = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/mfa`;
          }, 2000);
        }
      } else {
        const errorText = await response.text();
        console.error('[MFA Toggle] API error:', response.status, errorText);
        notifyError(`Failed to update MFA settings: ${response.status}`);
        throw new Error('Failed to update MFA settings');
      }
    } catch (error) {
      console.error('[MFA Toggle] ========== ERROR ==========');
      console.error('[MFA Toggle] Error details:', error);
      console.error('[MFA Toggle] Error message:', error.message);
      console.error('[MFA Toggle] Error stack:', error.stack);
      notifyError(`Failed to update MFA settings: ${error.message}`);
    } finally {
      console.log('[MFA Toggle] ========== TOGGLE FINISHED ==========');
      setUpdatingMFA(false);
      console.log('[MFA Toggle] Update state set to false');
    }
  };
  
  const handleMethodChange = async (method) => {
    try {
      setUpdatingMFA(true);
      const response = await fetch('/api/user/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: mfaSettings.enabled, 
          preferredMethod: method 
        })
      });
      
      if (response.ok) {
        notifySuccess('MFA method updated');
        fetchMFASettings();
      }
    } catch (error) {
      console.error('Error updating MFA method:', error);
      notifyError('Failed to update MFA method');
    } finally {
      setUpdatingMFA(false);
    }
  };
  
  const handleRemoveEnrollment = async (enrollmentId) => {
    if (!confirm('Are you sure you want to remove this MFA method?')) return;
    
    try {
      const response = await fetch('/api/user/mfa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId })
      });
      
      if (response.ok) {
        notifySuccess('MFA method removed');
        fetchMFASettings();
      }
    } catch (error) {
      console.error('Error removing enrollment:', error);
      notifyError('Failed to remove MFA method');
    }
  };

  const renderProfileTab = () => {
    if (loading || sessionLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    // Merge all available user data sources, prioritizing session data
    const user = {
      ...(userData || {}),
      ...(profileData || {}),
      ...(session?.user || {})
    };

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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={editMode ? editedData.firstName : user.first_name || user.firstName || user.given_name || ''}
                onChange={(e) => setEditedData({ ...editedData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                readOnly={!editMode}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={editMode ? editedData.lastName : user.last_name || user.lastName || user.family_name || ''}
                onChange={(e) => setEditedData({ ...editedData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                readOnly={!editMode}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={user.email || ''}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  readOnly
                  title="Email cannot be changed here for security reasons"
                />
                {user.email_verified && (
                  <CheckBadgeIcon className="absolute right-3 top-2.5 w-5 h-5 text-green-500" />
                )}
              </div>
              {!user.email_verified && (
                <p className="mt-1 text-sm text-amber-600 flex items-center">
                  <ExclamationCircleIcon className="w-4 h-4 mr-1" />
                  Email not verified
                </p>
              )}
              {editMode && (
                <p className="mt-1 text-xs text-gray-500">
                  Email cannot be changed here for security reasons
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="tel"
                value={editMode ? editedData.phone_number : user.phone_number || ''}
                onChange={(e) => setEditedData({ ...editedData, phone_number: e.target.value })}
                placeholder="Not provided"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                readOnly={!editMode}
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            {editMode ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={savingProfile}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSecurityTab = () => {
    const user = profileData || userData || {};
    
    console.log('[Security Tab] Rendering with states:', {
      loadingMFA,
      mfaSettings,
      updatingMFA,
      loadingSessions,
      sessions: sessions?.length || 0
    });
    
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
          
          <div className="mt-6 space-y-4">
            {loadingMFA && (
              <div className="mb-4 flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Loading MFA settings...</span>
              </div>
            )}
              {/* MFA Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={mfaSettings?.enabled || false}
                      onChange={(e) => {
                        console.log('[MFA Checkbox] Change event triggered');
                        console.log('[MFA Checkbox] Checked value:', e.target.checked);
                        console.log('[MFA Checkbox] Current mfaSettings:', mfaSettings);
                        console.log('[MFA Checkbox] Calling handleToggleMFA...');
                        handleToggleMFA(e.target.checked);
                      }}
                      disabled={updatingMFA}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm font-medium text-gray-900">
                    {mfaSettings?.enabled ? 'MFA Enabled' : 'MFA Disabled'}
                  </span>
                </div>
                {mfaSettings?.enabled && mfaSettings?.hasActiveEnrollment && (
                  <CheckBadgeIcon className="w-5 h-5 text-green-500" />
                )}
              </div>
              
              {/* MFA Methods */}
              {mfaSettings?.enabled && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Preferred Method</p>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="mfa-method"
                        value="totp"
                        checked={mfaSettings?.preferredMethod === 'totp'}
                        onChange={() => handleMethodChange('totp')}
                        disabled={updatingMFA}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Authenticator App</p>
                        <p className="text-xs text-gray-500">Use Google Authenticator, Authy, or similar</p>
                      </div>
                    </label>
                    
                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="mfa-method"
                        value="email"
                        checked={mfaSettings?.preferredMethod === 'email'}
                        onChange={() => handleMethodChange('email')}
                        disabled={updatingMFA}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Email</p>
                        <p className="text-xs text-gray-500">Receive codes via email</p>
                      </div>
                    </label>
                    
                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="mfa-method"
                        value="recovery-code"
                        checked={mfaSettings?.preferredMethod === 'recovery-code'}
                        onChange={() => handleMethodChange('recovery-code')}
                        disabled={updatingMFA}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Recovery Codes</p>
                        <p className="text-xs text-gray-500">One-time use backup codes</p>
                      </div>
                    </label>
                  </div>
                  
                  {/* Active Enrollments */}
                  {mfaSettings?.enrollments?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Active Methods</p>
                      <div className="space-y-2">
                        {mfaSettings.enrollments.map((enrollment) => (
                          <div key={enrollment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{enrollment.name || enrollment.type}</p>
                              <p className="text-xs text-gray-500">Added {new Date(enrollment.enrolledAt).toLocaleDateString()}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveEnrollment(enrollment.id)}
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Setup Button */}
                  {!mfaSettings?.hasActiveEnrollment && (
                    <button
                      onClick={() => {
                        console.log('[MFA Setup Button] Button clicked');
                        console.log('[MFA Setup Button] Current mfaSettings:', mfaSettings);
                        console.log('[MFA Setup Button] Calling handleToggleMFA(true)...');
                        handleToggleMFA(true);
                      }}
                      disabled={updatingMFA}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {updatingMFA ? 'Setting up...' : 'Set Up MFA'}
                    </button>
                  )}
                </div>
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



  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // New Pay Tab (renamed from Employment, without documents)
  const renderPayTab = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Banking Information */}
        <div className="border-b pb-6">
          <button
            onClick={() => toggleSection('banking')}
            className="w-full flex items-center justify-between mb-4 group hover:bg-gray-50 p-2 rounded-lg transition-colors"
          >
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BanknotesIcon className="w-5 h-5 mr-2 text-green-600" />
                Banking Information
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Direct deposit and payment details
              </p>
            </div>
            <div className="flex items-center text-gray-500">
              {expandedSections.banking ? (
                <>
                  <span className="text-xs mr-2">Hide</span>
                  <ChevronUpIcon className="w-5 h-5" />
                </>
              ) : (
                <>
                  <span className="text-xs mr-2">Show</span>
                  <ChevronDownIcon className="w-5 h-5" />
                </>
              )}
            </div>
          </button>
          
          {expandedSections.banking && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pl-7">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Bank Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter bank name"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Account Number</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••••"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Routing Number</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="•••••••••"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Account Type</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Checking</option>
                <option>Savings</option>
              </select>
            </div>
          </div>
          )}
        </div>

        {/* Tax Information */}
        <div className="border-b pb-6">
          <button
            onClick={() => toggleSection('tax')}
            className="w-full flex items-center justify-between mb-4 group hover:bg-gray-50 p-2 rounded-lg transition-colors"
          >
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <DocumentDuplicateIcon className="w-5 h-5 mr-2 text-blue-600" />
                Tax Information
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Social Security and tax withholding details
              </p>
            </div>
            <div className="flex items-center text-gray-500">
              {expandedSections.tax ? (
                <>
                  <span className="text-xs mr-2">Hide</span>
                  <ChevronUpIcon className="w-5 h-5" />
                </>
              ) : (
                <>
                  <span className="text-xs mr-2">Show</span>
                  <ChevronDownIcon className="w-5 h-5" />
                </>
              )}
            </div>
          </button>
          
          {expandedSections.tax && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pl-7">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Social Security / National Insurance Number
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="•••-••-••••"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Tax Filing Status</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Single</option>
                  <option>Married Filing Jointly</option>
                  <option>Married Filing Separately</option>
                  <option>Head of Household</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Federal Allowances (W-4)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">State Allowances</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Pay Information */}
        <div className="border-b pb-6">
          <button
            onClick={() => toggleSection('pay')}
            className="w-full flex items-center justify-between mb-4 group hover:bg-gray-50 p-2 rounded-lg transition-colors"
          >
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <CalendarDaysIcon className="w-5 h-5 mr-2 text-purple-600" />
                Pay Information
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                View your paystubs and payment history
              </p>
            </div>
            <div className="flex items-center text-gray-500">
              {expandedSections.pay ? (
                <>
                  <span className="text-xs mr-2">Hide</span>
                  <ChevronUpIcon className="w-5 h-5" />
                </>
              ) : (
                <>
                  <span className="text-xs mr-2">Show</span>
                  <ChevronDownIcon className="w-5 h-5" />
                </>
              )}
            </div>
          </button>
          
          {expandedSections.pay && (
            <div className="space-y-3 mt-4 pl-7">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Current Salary</p>
                  <p className="text-xl font-semibold text-gray-900">$0.00</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Pay Frequency</p>
                  <p className="text-xl font-semibold text-gray-900">Monthly</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Next Pay Date</p>
                  <p className="text-xl font-semibold text-gray-900">--</p>
                </div>
              </div>
              
              {/* PayStub Viewer Inline */}
              <div className="mt-6">
                <PayStubViewer isModal={false} />
              </div>
            </div>
          )}
        </div>

        {/* Benefits & Deductions */}
        <div className="border-b pb-6">
          <button
            onClick={() => toggleSection('benefits')}
            className="w-full flex items-center justify-between mb-4 group hover:bg-gray-50 p-2 rounded-lg transition-colors"
          >
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <CreditCardIcon className="w-5 h-5 mr-2 text-indigo-600" />
                Benefits & Deductions
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Manage your benefits enrollment and deductions
              </p>
            </div>
            <div className="flex items-center text-gray-500">
              {expandedSections.benefits ? (
                <>
                  <span className="text-xs mr-2">Hide</span>
                  <ChevronUpIcon className="w-5 h-5" />
                </>
              ) : (
                <>
                  <span className="text-xs mr-2">Show</span>
                  <ChevronDownIcon className="w-5 h-5" />
                </>
              )}
            </div>
          </button>
          
          {expandedSections.benefits && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pl-7">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Active Benefits</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Health Insurance</span>
                  <span className="text-gray-900">--</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dental Insurance</span>
                  <span className="text-gray-900">--</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">401(k) Contribution</span>
                  <span className="text-gray-900">--</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Time Off Balance</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vacation Days</span>
                  <span className="text-gray-900">0 days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sick Days</span>
                  <span className="text-gray-900">0 days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Personal Days</span>
                  <span className="text-gray-900">0 days</span>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Save Pay Information
          </button>
        </div>
      </div>
    );
  };

  // New Documents Tab (moved from Pay tab)
  const renderDocumentsTab = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <DocumentIcon className="w-6 h-6 mr-2 text-blue-600" />
            Employment Documents
          </h2>
          <p className="text-gray-600 mt-1">
            Access and download your important employment and tax documents
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="flex items-center justify-between p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left border border-gray-200 hover:border-blue-300">
            <div>
              <p className="font-semibold text-gray-900">W-2 Forms</p>
              <p className="text-sm text-gray-600 mt-1">Year-end tax statements</p>
              <p className="text-xs text-gray-500 mt-1">Download annual tax documents</p>
            </div>
            <span className="text-blue-600 text-xl">→</span>
          </button>
          
          <button className="flex items-center justify-between p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left border border-gray-200 hover:border-blue-300">
            <div>
              <p className="font-semibold text-gray-900">W-4 Form</p>
              <p className="text-sm text-gray-600 mt-1">Tax withholding certificate</p>
              <p className="text-xs text-gray-500 mt-1">Update tax withholding preferences</p>
            </div>
            <span className="text-blue-600 text-xl">→</span>
          </button>
          
          <button className="flex items-center justify-between p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left border border-gray-200 hover:border-blue-300">
            <div>
              <p className="font-semibold text-gray-900">I-9 Form</p>
              <p className="text-sm text-gray-600 mt-1">Employment eligibility verification</p>
              <p className="text-xs text-gray-500 mt-1">Verify work authorization status</p>
            </div>
            <span className="text-blue-600 text-xl">→</span>
          </button>
          
          <button className="flex items-center justify-between p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left border border-gray-200 hover:border-blue-300">
            <div>
              <p className="font-semibold text-gray-900">Direct Deposit Form</p>
              <p className="text-sm text-gray-600 mt-1">Payment authorization</p>
              <p className="text-xs text-gray-500 mt-1">Update banking information</p>
            </div>
            <span className="text-blue-600 text-xl">→</span>
          </button>
          
          <button className="flex items-center justify-between p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left border border-gray-200 hover:border-blue-300">
            <div>
              <p className="font-semibold text-gray-900">Pay Stubs</p>
              <p className="text-sm text-gray-600 mt-1">Current and historical pay stubs</p>
              <p className="text-xs text-gray-500 mt-1">View detailed payment history</p>
            </div>
            <span className="text-blue-600 text-xl">→</span>
          </button>
          
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div>
              <p className="font-semibold text-blue-900 mb-4">Pay Stubs</p>
              <p className="text-sm text-blue-700 mb-4">View your payment history</p>
              <PayStubViewer isModal={false} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // New Timesheet Tab (available for ALL employees, not just hourly)
  const renderTimesheetTab = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <ClockIcon className="w-6 h-6 mr-2 text-green-600" />
            Timesheet
          </h2>
          <p className="text-gray-600 mt-1">
            Track your time and manage attendance records
          </p>
        </div>

        {/* Inline Timesheet Manager - without approvals section */}
        <InlineTimesheetManager />
      </div>
    );
  };

  // New Approvals Tab (for supervisors, admins, and owners only)
  const renderApprovalsTab = () => {
    const isSupervisor = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER' || 
                         session?.employee?.is_supervisor === true;

    if (!isSupervisor) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Approval Access</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have permission to approve timesheets or time-off requests.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <UserGroupIcon className="w-6 h-6 mr-2 text-blue-600" />
            Approvals
          </h2>
          <p className="text-gray-600 mt-1">
            Manage timesheet and time-off approvals for your team
          </p>
        </div>

        {/* Supervisor Approval Interface */}
        <SupervisorApprovalInterface />
      </div>
    );
  };

  // Fetch organization data
  const fetchOrganizationData = async () => {
    setLoadingOrganization(true);
    try {
      const response = await fetch('/api/hr/v2/employees', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [OrgChart] Fetched employee data:', data);
        setOrganizationData(data.data || []);
      } else {
        notifyError('Failed to load organization data');
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
      notifyError('Error loading organization data');
    } finally {
      setLoadingOrganization(false);
    }
  };

  // Load organization data when tab is selected
  useEffect(() => {
    if (selectedTab === 5) { // Organization tab is at index 5
      fetchOrganizationData();
    }
  }, [selectedTab]);

  // Zoom control functions
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200)); // Max 200%
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 25)); // Min 25%
  };

  const resetZoom = () => {
    setZoomLevel(100);
  };

  const fitToScreen = () => {
    // For large organizations, start with a smaller zoom to fit more content
    const employeeCount = organizationData.length;
    if (employeeCount > 20) {
      setZoomLevel(50);
    } else if (employeeCount > 10) {
      setZoomLevel(75);
    } else {
      setZoomLevel(100);
    }
  };

  // Helper function to generate user initials
  const generateInitials = (firstName, lastName, fullName) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
    }
    if (fullName) {
      const parts = fullName.split(' ').filter(p => p.length > 0);
      if (parts.length >= 2) {
        return `${parts[0].charAt(0).toUpperCase()}${parts[parts.length - 1].charAt(0).toUpperCase()}`;
      }
      return parts[0]?.charAt(0).toUpperCase() || '?';
    }
    return firstName?.charAt(0).toUpperCase() || '?';
  };

  // Build organization hierarchy
  const buildOrganizationHierarchy = (employees) => {
    if (!employees || employees.length === 0) return [];

    console.log('🔍 [OrgChart] Building hierarchy with employees:', employees);
    console.log('🔍 [OrgChart] Supervisor relationships:', employees.map(e => ({
      id: e.id,
      name: `${e.first_name} ${e.last_name}`,
      supervisor_id: e.supervisor_id,
      supervisor_name: e.supervisor_name
    })));

    // Create a map of all employees
    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp.id] = { ...emp, children: [] };
    });

    // Build the hierarchy starting from supervisor relationships
    employees.forEach(emp => {
      if (emp.supervisor_id && employeeMap[emp.supervisor_id]) {
        // Add to supervisor's children
        employeeMap[emp.supervisor_id].children.push(employeeMap[emp.id]);
      }
    });

    // Find root employees (those without supervisors)
    const rootEmployees = employees.filter(emp => !emp.supervisor_id);
    
    // First, find the actual owner (user with role = 'OWNER')
    const owner = rootEmployees.find(emp => emp.user_role === 'OWNER' || emp.role === 'OWNER');
    
    // If we have an owner, put them first, then other root employees
    const hierarchy = [];
    if (owner) {
      hierarchy.push(employeeMap[owner.id]);
      // Add other root employees (but not the owner)
      rootEmployees.forEach(emp => {
        if (emp.id !== owner.id) {
          hierarchy.push(employeeMap[emp.id]);
        }
      });
    } else {
      // No owner found, just show all root employees
      rootEmployees.forEach(emp => {
        hierarchy.push(employeeMap[emp.id]);
      });
    }

    return hierarchy;
  };

  // Render a single employee card
  const renderEmployeeCard = (employee, isOwner = false) => {
    const initials = generateInitials(employee.first_name, employee.last_name, employee.full_name);
    const isHovered = hoveredEmployee === employee.id;
    
    return (
      <div key={employee.id} className="flex flex-col items-center">
        {/* Employee Card */}
        <div 
          className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 hover:border-blue-300 cursor-pointer relative ${
            isOwner ? 'border-blue-500 shadow-lg' : ''
          }`}
          onMouseEnter={() => setHoveredEmployee(employee.id)}
          onMouseLeave={() => setHoveredEmployee(null)}
          style={{ minWidth: '280px', maxWidth: '320px' }}
        >
          {/* Owner Badge */}
          {isOwner && (
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                Owner
              </span>
            </div>
          )}
          
          <div className="flex items-start space-x-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className={`w-12 h-12 bg-gradient-to-br ${
                isOwner ? 'from-yellow-500 to-orange-600' : 'from-blue-500 to-indigo-600'
              } rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
                {initials}
              </div>
            </div>
            
            {/* Employee Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {employee.first_name} {employee.last_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {employee.job_title || employee.position || 'Employee'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {employee.department || 'General'}
                  </p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>ID: {employee.employee_number || employee.id}</div>
                </div>
              </div>
              
              {/* Contact Information */}
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                {employee.email && (
                  <div className="flex items-center">
                    <EnvelopeIcon className="w-4 h-4 mr-1" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                )}
                {employee.phone_number && (
                  <div className="flex items-center">
                    <PhoneIcon className="w-4 h-4 mr-1" />
                    <span>{employee.phone_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hover Tooltip */}
          {isHovered && (
            <div className="absolute z-50 top-0 left-full ml-4 w-80 bg-gray-900 text-white text-sm rounded-lg p-4 shadow-xl">
              <div className="space-y-2">
                <div className="font-semibold border-b border-gray-700 pb-2">
                  {employee.first_name} {employee.last_name}
                  {isOwner && <span className="ml-2 text-yellow-400">(Owner)</span>}
                </div>
                <div><span className="text-gray-300">Position:</span> {employee.job_title || employee.position || 'Employee'}</div>
                <div><span className="text-gray-300">Department:</span> {employee.department || 'General'}</div>
                <div><span className="text-gray-300">Employee ID:</span> {employee.employee_number || employee.id}</div>
                {employee.email && (
                  <div><span className="text-gray-300">Email:</span> {employee.email}</div>
                )}
                {employee.phone_number && (
                  <div><span className="text-gray-300">Phone:</span> {employee.phone_number}</div>
                )}
                {employee.hire_date && (
                  <div><span className="text-gray-300">Hire Date:</span> {new Date(employee.hire_date).toLocaleDateString()}</div>
                )}
                {employee.children && employee.children.length > 0 && (
                  <div><span className="text-gray-300">Direct Reports:</span> {employee.children.length}</div>
                )}
              </div>
              {/* Tooltip Arrow */}
              <div className="absolute top-4 -left-2">
                <div className="w-2 h-2 bg-gray-900 transform rotate-45"></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Render children horizontally */}
        {employee.children && employee.children.length > 0 && (
          <div className="mt-8 flex flex-col items-center w-full">
            {/* Vertical line down from parent */}
            <div className="w-px bg-gray-300 h-8"></div>
            
            {/* Horizontal line across children */}
            <div className="relative flex justify-center">
              <div 
                className="h-px bg-gray-300 absolute top-0" 
                style={{ 
                  width: `${Math.max(employee.children.length * 350, 350)}px`,
                  left: '50%',
                  transform: 'translateX(-50%)'
                }}
              ></div>
              
              {/* Vertical lines down to each child */}
              <div 
                className="flex justify-between relative"
                style={{ width: `${Math.max(employee.children.length * 350, 350)}px` }}
              >
                {employee.children.map((_, index) => (
                  <div key={index} className="w-px bg-gray-300 h-8"></div>
                ))}
              </div>
            </div>
            
            {/* Children arranged horizontally */}
            <div 
              className="flex justify-between items-start mt-0 w-full"
              style={{ maxWidth: `${Math.max(employee.children.length * 350, 350)}px` }}
            >
              {employee.children.map(child => (
                <div key={child.id} className="flex-1 flex justify-center">
                  {renderEmployeeCard(child, child.user_role === 'OWNER' || child.role === 'OWNER')}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOrganizationTab = () => {
    if (loadingOrganization) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading organization chart...</span>
          </div>
        </div>
      );
    }

    const hierarchy = buildOrganizationHierarchy(organizationData);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <BuildingOfficeIcon className="w-6 h-6 mr-2 text-blue-600" />
                Organization Chart
              </h2>
              <p className="text-gray-600 mt-1">
                View your company's organizational structure and employee directory
              </p>
            </div>
            
            {/* Zoom Controls */}
            {hierarchy.length > 0 && (
              <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-2">
                <button
                  onClick={zoomOut}
                  disabled={zoomLevel <= 25}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom Out"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
                
                <span className="text-sm font-medium text-gray-700 min-w-12 text-center">
                  {zoomLevel}%
                </span>
                
                <button
                  onClick={zoomIn}
                  disabled={zoomLevel >= 200}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom In"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
                
                <div className="w-px h-6 bg-gray-300"></div>
                
                <button
                  onClick={fitToScreen}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                  title="Fit to Screen"
                >
                  <ArrowsPointingOutIcon className="w-4 h-4" />
                </button>
                
                <button
                  onClick={resetZoom}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                  title="Reset Zoom (100%)"
                >
                  <MagnifyingGlassIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {hierarchy.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Organization Data</h3>
            <p className="text-gray-600">
              No employees found. Contact your administrator to set up your organization.
            </p>
          </div>
        ) : (
          <div className="relative border border-gray-200 rounded-lg overflow-auto" style={{ minHeight: '400px', maxHeight: '600px' }}>
            <div 
              ref={orgChartRef}
              className="flex flex-col items-center p-8 transition-transform duration-300 ease-in-out"
              style={{ 
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                minWidth: 'fit-content'
              }}
            >
              {hierarchy.map(employee => {
                const isActualOwner = employee.user_role === 'OWNER' || employee.role === 'OWNER';
                return renderEmployeeCard(employee, isActualOwner);
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center">
          <button 
            onClick={fetchOrganizationData}
            disabled={loadingOrganization}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loadingOrganization ? 'Refreshing...' : 'Refresh Organization Chart'}
          </button>
          
          {hierarchy.length > 0 && (
            <div className="text-sm text-gray-500">
              Showing {organizationData.length} employees • Use zoom controls to navigate large organizations
            </div>
          )}
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 0, label: 'Profile', icon: UserIcon },
    { id: 1, label: 'Pay', icon: BanknotesIcon },
    { id: 2, label: 'Documents', icon: DocumentIcon },
    { id: 3, label: 'Timesheet', icon: ClockIcon },
    { id: 4, label: 'Approvals', icon: UserGroupIcon },
    { id: 5, label: 'Organization', icon: BuildingOfficeIcon },
    { id: 6, label: 'Security', icon: ShieldCheckIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <UserCircleIcon className="h-8 w-8 text-blue-600 mr-3" />
            Profile
          </h1>
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
                    onClick={() => setSelectedTab(tab.id)}
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
          {selectedTab === 1 && renderPayTab()}
          {selectedTab === 2 && renderDocumentsTab()}
          {selectedTab === 3 && renderTimesheetTab()}
          {selectedTab === 4 && renderApprovalsTab()}
          {selectedTab === 5 && renderOrganizationTab()}
          {selectedTab === 6 && renderSecurityTab()}
        </div>
      </div>

      {/* PayStub Viewer Modal - Removed as it's now inline */}
    </div>
  );
};

export default Profile;