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
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const MyAccount = ({ userData }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const fileInputRef = useRef(null);
  
  const router = useRouter();
  const { notifySuccess, notifyError } = useNotification();
  
  // Log the userData to see what we're working with
  useEffect(() => {
    console.log('[MyAccount] Component mounted with userData:', userData);
  }, [userData]);

  // Fetch profile data on mount
  useEffect(() => {
    fetchProfileData();
    if (selectedTab === 1) {
      fetchLoginSessions();
    }
  }, [selectedTab]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        console.log('[MyAccount] Profile data fetched:', data);
        setProfileData(data);
        setProfilePhoto(data.profilePhoto || data.profile_photo || data.picture);
      } else {
        console.error('[MyAccount] Profile fetch failed:', response.status, response.statusText);
        // If the new endpoint fails, try to use userData
        if (userData) {
          console.log('[MyAccount] Using userData fallback:', userData);
          setProfileData(userData);
          setProfilePhoto(userData.picture || userData.profilePhoto);
        }
      }
    } catch (error) {
      console.error('[MyAccount] Error fetching profile:', error);
      // Use userData as fallback
      if (userData) {
        console.log('[MyAccount] Using userData fallback due to error:', userData);
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
    { id: 2, label: 'Preferences', icon: CogIcon },
    { id: 3, label: 'Legal', icon: ScaleIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
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
          {selectedTab === 1 && renderSecurityTab()}
          {selectedTab === 2 && renderPreferencesTab()}
          {selectedTab === 3 && renderLegalTab()}
        </div>
      </div>
    </div>
  );
};

export default MyAccount;