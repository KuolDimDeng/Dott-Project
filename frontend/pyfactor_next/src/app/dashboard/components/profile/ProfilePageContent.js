'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { useNotification } from '@/context/NotificationContext';
import Image from 'next/image';
import EmployeeInfo from '@/app/profile/components/EmployeeInfo';
import TimesheetTab from '@/app/profile/components/TimesheetTab';
import SupervisorApprovals from '@/components/Timesheet/SupervisorApprovals';
import PayStubViewer from '@/components/PayStubViewer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
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
  BanknotesIcon,
  DocumentIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

/**
 * ProfilePageContent - Renders only the content for a specific tab without the tab navigation
 * This is extracted from the original ProfilePage to allow displaying content without tabs
 */
export default function ProfilePageContent({ activeTab = 'profile', hideTabNavigation = true }) {
  const { t } = useTranslation('profile');
  const { session, loading } = useSession();
  const { notifySuccess, notifyError } = useNotification();
  const [employee, setEmployee] = useState(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef(null);
  
  // Security tab states
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
  
  // Organization tab states
  const [organizationData, setOrganizationData] = useState([]);
  const [loadingOrganization, setLoadingOrganization] = useState(false);
  const [hoveredEmployee, setHoveredEmployee] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const orgChartRef = useRef(null);
  
  // Pay tab states
  const [bankInfo, setBankInfo] = useState({});
  const [taxInfo, setTaxInfo] = useState({});
  const [showFullSSN, setShowFullSSN] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    banking: false,
    tax: false,
    pay: false,
    benefits: false
  });

  // Load employee data
  useEffect(() => {
    if (session?.employee?.id && session?.tenantId) {
      loadEmployeeData();
    }
  }, [session]);
  
  // Initialize profile data
  useEffect(() => {
    if (session?.user) {
      const user = session.user;
      setProfileData(user);
      setProfilePhoto(user.picture || user.profilePhoto || user.profile_photo);
      
      const firstName = user.first_name || user.firstName || user.given_name || '';
      const lastName = user.last_name || user.lastName || user.family_name || '';
      
      setEditedData({
        firstName: firstName,
        lastName: lastName,
        email: user.email || '',
        phone_number: user.phone_number || ''
      });
    }
  }, [session]);
  
  // Load data based on selected tab
  useEffect(() => {
    if (loading) return;
    
    if (activeTab === 'security') {
      fetchLoginSessions();
      fetchMFASettings();
    } else if (activeTab === 'organization') {
      fetchOrganizationData();
    }
  }, [activeTab, loading]);

  const loadEmployeeData = async () => {
    setLoadingEmployee(true);
    try {
      const response = await fetch(`/api/hr/employees/${session.employee.id}/`, {
        headers: {
          'X-Tenant-ID': session.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployee(data);
        setBankInfo(data.bank_info || {});
        setTaxInfo(data.tax_info || {});
        
        // Check if this employee is a supervisor (has team members)
        setIsSupervisor(data.is_supervisor || false);
      } else {
        toast.error(t('errors.loadEmployeeFailed', 'Failed to load employee data'));
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
      toast.error(t('errors.loadEmployeeError', 'Error loading employee data'));
    } finally {
      setLoadingEmployee(false);
    }
  };
  
  // Profile Management Methods
  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notifyError('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notifyError('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/user/upload-photo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const data = await response.json();
      setProfilePhoto(data.photoUrl);
      notifySuccess('Profile photo updated successfully');
    } catch (error) {
      console.error('Photo upload error:', error);
      notifyError('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };
  
  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedData = await response.json();
      setProfileData(updatedData);
      setEditMode(false);
      notifySuccess('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      notifyError('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };
  
  // Security Methods
  const fetchLoginSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await fetch('/api/auth/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load login sessions');
    } finally {
      setLoadingSessions(false);
    }
  };
  
  const fetchMFASettings = async () => {
    setLoadingMFA(true);
    try {
      const response = await fetch('/api/auth/mfa/settings');
      if (response.ok) {
        const data = await response.json();
        setMfaSettings(data);
      }
    } catch (error) {
      console.error('Error fetching MFA settings:', error);
      toast.error('Failed to load security settings');
    } finally {
      setLoadingMFA(false);
    }
  };
  
  const handleToggleMFA = async (enable) => {
    setUpdatingMFA(true);
    try {
      const response = await fetch('/api/auth/mfa/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enable, method: mfaSettings.preferredMethod }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setMfaSettings(data);
        notifySuccess(enable ? 'MFA enabled successfully' : 'MFA disabled successfully');
      } else {
        throw new Error('Failed to update MFA settings');
      }
    } catch (error) {
      console.error('Error updating MFA:', error);
      notifyError('Failed to update security settings');
    } finally {
      setUpdatingMFA(false);
    }
  };
  
  const handleRevokeSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
        notifySuccess('Session revoked successfully');
      } else {
        throw new Error('Failed to revoke session');
      }
    } catch (error) {
      console.error('Error revoking session:', error);
      notifyError('Failed to revoke session');
    }
  };
  
  // Organization Methods
  const fetchOrganizationData = async () => {
    setLoadingOrganization(true);
    try {
      const response = await fetch('/api/organization/chart');
      if (response.ok) {
        const data = await response.json();
        setOrganizationData(data);
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
      toast.error('Failed to load organization chart');
    } finally {
      setLoadingOrganization(false);
    }
  };
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Tab Content Renderers
  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Profile Photo Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
          <CardDescription>Update your profile picture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6">
            <Avatar className="w-24 h-24">
              {profilePhoto ? (
                <Image
                  src={profilePhoto}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="rounded-full"
                />
              ) : (
                <AvatarFallback className="text-2xl">
                  {profileData?.firstName?.[0]}{profileData?.lastName?.[0]}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handlePhotoUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <CameraIcon className="w-4 h-4" />
                {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your basic profile details</CardDescription>
            </div>
            <button
              onClick={() => editMode ? handleSaveProfile() : setEditMode(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editMode ? (savingProfile ? 'Saving...' : 'Save') : 'Edit'}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <input
                type="text"
                value={editedData.firstName || ''}
                onChange={(e) => setEditedData({ ...editedData, firstName: e.target.value })}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <input
                type="text"
                value={editedData.lastName || ''}
                onChange={(e) => setEditedData({ ...editedData, lastName: e.target.value })}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
              />
            </div>
            <div>
              <Label>Email</Label>
              <input
                type="email"
                value={editedData.email || ''}
                onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <input
                type="tel"
                value={editedData.phone_number || ''}
                onChange={(e) => setEditedData({ ...editedData, phone_number: e.target.value })}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Information */}
      {employee && <EmployeeInfo employee={employee} />}
    </div>
  );

  const renderPayTab = () => (
    <div className="space-y-6">
      <PayStubViewer employeeId={session?.employee?.id} />
      
      {/* Banking Information */}
      <Card>
        <CardHeader 
          className="cursor-pointer"
          onClick={() => toggleSection('banking')}
        >
          <div className="flex justify-between items-center">
            <CardTitle>Banking Information</CardTitle>
            {expandedSections.banking ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
          </div>
        </CardHeader>
        {expandedSections.banking && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Bank Name</Label>
                <p className="text-gray-700">{bankInfo.bank_name || 'Not provided'}</p>
              </div>
              <div>
                <Label>Account Number</Label>
                <p className="text-gray-700">****{bankInfo.account_last_four || '****'}</p>
              </div>
              <div>
                <Label>Routing Number</Label>
                <p className="text-gray-700">{bankInfo.routing_number || 'Not provided'}</p>
              </div>
              <div>
                <Label>Account Type</Label>
                <p className="text-gray-700">{bankInfo.account_type || 'Not provided'}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tax Information */}
      <Card>
        <CardHeader 
          className="cursor-pointer"
          onClick={() => toggleSection('tax')}
        >
          <div className="flex justify-between items-center">
            <CardTitle>Tax Information</CardTitle>
            {expandedSections.tax ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
          </div>
        </CardHeader>
        {expandedSections.tax && (
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Social Security Number</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-700">
                      {showFullSSN ? taxInfo.ssn || 'Not provided' : `***-**-${taxInfo.ssn_last_four || '****'}`}
                    </p>
                    <button
                      onClick={() => setShowFullSSN(!showFullSSN)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {showFullSSN ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Filing Status</Label>
                  <p className="text-gray-700">{taxInfo.filing_status || 'Single'}</p>
                </div>
                <div>
                  <Label>Allowances</Label>
                  <p className="text-gray-700">{taxInfo.allowances || '0'}</p>
                </div>
                <div>
                  <Label>Additional Withholding</Label>
                  <p className="text-gray-700">${taxInfo.additional_withholding || '0.00'}</p>
                </div>
                <div>
                  <Label>State</Label>
                  <p className="text-gray-700">{taxInfo.state || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );

  const renderDocumentsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Employment Documents</CardTitle>
          <CardDescription>Access your important documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <DocumentIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No documents available</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTimesheetTab = () => (
    <TimesheetTab employeeId={session?.employee?.id} />
  );

  const renderOrganizationTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Organization Chart</CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                -
              </button>
              <span className="text-sm text-gray-600">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                +
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingOrganization ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : organizationData.length > 0 ? (
            <div 
              ref={orgChartRef}
              className="overflow-auto"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
            >
              {/* Organization chart visualization would go here */}
              <div className="text-center py-8 text-gray-500">
                <UserGroupIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Organization chart visualization coming soon</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No organization data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </div>
            <ShieldCheckIcon className="w-6 h-6 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Status</p>
                <p className="text-sm text-gray-500">
                  {mfaSettings?.enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <button
                onClick={() => handleToggleMFA(!mfaSettings?.enabled)}
                disabled={updatingMFA}
                className={`px-4 py-2 rounded-lg ${
                  mfaSettings?.enabled
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {updatingMFA ? 'Updating...' : (mfaSettings?.enabled ? 'Disable' : 'Enable')}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Login History */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Login History</CardTitle>
              <CardDescription>
                Manage your active sessions and see recent login activity
              </CardDescription>
            </div>
            <ClockIcon className="w-6 h-6 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
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
                  {!session.is_current && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <LockClosedIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No active sessions found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Render the appropriate tab content
  switch (activeTab) {
    case 'profile':
      return renderProfileTab();
    case 'pay':
      return renderPayTab();
    case 'documents':
      return renderDocumentsTab();
    case 'timesheet':
      return renderTimesheetTab();
    case 'organization':
      return renderOrganizationTab();
    case 'security':
      return renderSecurityTab();
    default:
      return renderProfileTab();
  }
}