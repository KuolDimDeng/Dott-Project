'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';
import { useSession } from '@/hooks/useSession-v2';
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
  BriefcaseIcon,
  BanknotesIcon,
  DocumentDuplicateIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  CreditCardIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

const MyAccount = ({ userData }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [mfaSettings, setMfaSettings] = useState({
    enabled: false,
    preferredMethod: 'totp',
    enrollments: [],
    availableMethods: ['totp', 'email', 'recovery-code'],
    hasActiveEnrollment: false
  });
  const [loadingMFA, setLoadingMFA] = useState(true);
  const [updatingMFA, setUpdatingMFA] = useState(false);
  const fileInputRef = useRef(null);
  
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
      setLoading(false);
    } else if (!sessionLoading) {
      // If no session user data, fetch from API as fallback
      fetchProfileData();
    }
  }, [session, sessionLoading]);
  
  // Fetch login sessions when security tab is selected
  useEffect(() => {
    console.log('[MyAccount] Selected tab changed to:', selectedTab);
    if (selectedTab === 1) {
      console.log('[MyAccount] Security tab selected, fetching data...');
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
    window.location.href = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/dbconnections/change_password?client_id=${process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}`;
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
                Full Name
              </label>
              <input
                type="text"
                value={
                  user.name || 
                  `${user.first_name || user.firstName || user.given_name || ''} ${user.last_name || user.lastName || user.family_name || ''}`.trim() || 
                  ''
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                readOnly
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={user.nickname || user.username || user.email?.split('@')[0] || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                readOnly
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
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  readOnly
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
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="tel"
                value={user.phone_number || ''}
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

  const renderEmploymentTab = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Banking Information */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BanknotesIcon className="w-5 h-5 mr-2 text-green-600" />
                Banking Information
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Direct deposit and payment details
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter account number"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Routing Number</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter routing number"
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
        </div>

        {/* Tax Information */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <DocumentDuplicateIcon className="w-5 h-5 mr-2 text-blue-600" />
                Tax Information
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Social Security and tax withholding details
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Social Security / National Insurance Number
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="XXX-XX-XXXX"
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
        </div>

        {/* Pay Information */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <CalendarDaysIcon className="w-5 h-5 mr-2 text-purple-600" />
                Pay Information
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                View your paystubs and payment history
              </p>
            </div>
            <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              View All Paystubs
            </button>
          </div>
          
          <div className="space-y-3">
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
            
            {/* Recent Paystubs */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Paystubs</h4>
              <p className="text-sm text-gray-500 text-center py-8">No paystubs available</p>
            </div>
          </div>
        </div>

        {/* Benefits & Deductions */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <CreditCardIcon className="w-5 h-5 mr-2 text-indigo-600" />
                Benefits & Deductions
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Manage your benefits enrollment and deductions
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Documents */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <AcademicCapIcon className="w-5 h-5 mr-2 text-orange-600" />
                Employment Documents
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Important employment and tax documents
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
              <div>
                <p className="font-medium text-gray-900">W-2 Forms</p>
                <p className="text-sm text-gray-600">Year-end tax statements</p>
              </div>
              <span className="text-gray-400">→</span>
            </button>
            <button className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
              <div>
                <p className="font-medium text-gray-900">W-4 Form</p>
                <p className="text-sm text-gray-600">Tax withholding certificate</p>
              </div>
              <span className="text-gray-400">→</span>
            </button>
            <button className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
              <div>
                <p className="font-medium text-gray-900">I-9 Form</p>
                <p className="text-sm text-gray-600">Employment eligibility</p>
              </div>
              <span className="text-gray-400">→</span>
            </button>
            <button className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
              <div>
                <p className="font-medium text-gray-900">Direct Deposit Form</p>
                <p className="text-sm text-gray-600">Payment authorization</p>
              </div>
              <span className="text-gray-400">→</span>
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Save Employment Information
          </button>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 0, label: 'Profile', icon: UserIcon },
    { id: 1, label: 'Employment', icon: BriefcaseIcon },
    { id: 2, label: 'Security', icon: ShieldCheckIcon },
    { id: 3, label: 'Preferences', icon: CogIcon },
    { id: 4, label: 'Legal', icon: ScaleIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          {selectedTab === 1 && renderEmploymentTab()}
          {selectedTab === 2 && renderSecurityTab()}
          {selectedTab === 3 && renderPreferencesTab()}
          {selectedTab === 4 && renderLegalTab()}
        </div>
      </div>
    </div>
  );
};

export default MyAccount;