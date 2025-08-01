'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';
import Image from 'next/image';
import EmployeeInfo from './components/EmployeeInfo';
import TimesheetTab from './components/TimesheetTab';
import SupervisorApprovals from '@/components/Timesheet/SupervisorApprovals';
import PayStubViewer from '@/components/PayStubViewer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  PlusIcon,
  MinusIcon,
  ArrowsPointingOutIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  EyeSlashIcon,
  IdentificationIcon,
  DocumentDuplicateIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function ProfilePage() {
  const { t } = useTranslation('profile');
  const { session, loading } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notifySuccess, notifyError } = useNotification();
  const [activeTab, setActiveTab] = useState('profile');
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

  // Handle tab parameter from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !session) {
      router.push('/auth/signin');
    }
  }, [session, loading, router]);

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
        setProfileData({
          ...profileData,
          first_name: editedData.firstName,
          last_name: editedData.lastName,
          name: `${editedData.firstName} ${editedData.lastName}`.trim(),
          phone_number: editedData.phone_number,
        });
        
        setEditMode(false);
        notifySuccess('Profile updated successfully');
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
    const user = session?.user || {};
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
  
  // Security Tab Methods
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
  
  const fetchMFASettings = async () => {
    try {
      setLoadingMFA(true);
      const response = await fetch('/api/user/mfa');
      if (response.ok) {
        const data = await response.json();
        setMfaSettings(data);
      }
    } catch (error) {
      console.error('Error fetching MFA settings:', error);
    } finally {
      setLoadingMFA(false);
    }
  };
  
  const handlePasswordChange = () => {
    const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
    const auth0ClientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '';
    window.location.href = `https://${auth0Domain}/dbconnections/change_password?client_id=${auth0ClientId}`;
  };
  
  const handleToggleMFA = async (enabled) => {
    try {
      setUpdatingMFA(true);
      const response = await fetch('/api/user/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled, 
          preferredMethod: mfaSettings?.preferredMethod || 'totp' 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        notifySuccess(data.message);
        await fetchMFASettings();
        
        if (enabled && !mfaSettings?.hasActiveEnrollment) {
          setTimeout(() => {
            window.location.href = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/mfa`;
          }, 2000);
        }
      } else {
        notifyError('Failed to update MFA settings');
      }
    } catch (error) {
      console.error('Error updating MFA:', error);
      notifyError('Failed to update MFA settings');
    } finally {
      setUpdatingMFA(false);
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
  
  // Organization Tab Methods
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
  
  // Zoom control functions
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 25));
  };

  const resetZoom = () => {
    setZoomLevel(100);
  };

  const fitToScreen = () => {
    const employeeCount = organizationData.length;
    if (employeeCount > 20) {
      setZoomLevel(50);
    } else if (employeeCount > 10) {
      setZoomLevel(75);
    } else {
      setZoomLevel(100);
    }
  };
  
  // Helper Functions
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
  
  const buildOrganizationHierarchy = (employees) => {
    if (!employees || employees.length === 0) return [];

    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp.id] = { ...emp, children: [] };
    });

    employees.forEach(emp => {
      if (emp.supervisor && employeeMap[emp.supervisor]) {
        employeeMap[emp.supervisor].children.push(employeeMap[emp.id]);
      }
    });

    const rootEmployees = employees.filter(emp => !emp.supervisor);
    const owner = rootEmployees.find(emp => emp.user_role === 'OWNER' || emp.role === 'OWNER');
    
    const hierarchy = [];
    if (owner) {
      hierarchy.push(employeeMap[owner.id]);
      rootEmployees.forEach(emp => {
        if (emp.id !== owner.id) {
          hierarchy.push(employeeMap[emp.id]);
        }
      });
    } else {
      rootEmployees.forEach(emp => {
        hierarchy.push(employeeMap[emp.id]);
      });
    }

    return hierarchy;
  };
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    const email = session?.user?.email || session?.employee?.email;
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };
  
  // Render Methods
  const renderProfileTab = () => {
    const user = {
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={employee?.employee_number || 'N/A'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  readOnly
                  title="Employee ID is system-generated and cannot be changed"
                />
                {!employee && (
                  <p className="mt-1 text-xs text-gray-500">
                    No employee record found
                  </p>
                )}
              </div>
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
                    onChange={(e) => handleToggleMFA(e.target.checked)}
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
                    onClick={() => handleToggleMFA(true)}
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
  
  const renderPayTab = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* SSN Section */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <IdentificationIcon className="w-5 h-5 mr-2" />
              Social Security Information
            </h3>
          </div>
          
          <div className="mt-4">
            {(employee?.ssn_last_4 || employee?.ssn_last_four) ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">SSN:</span>
                    <span className="font-mono text-sm">
                      {showFullSSN 
                        ? `XXX-XX-${employee.ssn_last_4 || employee.ssn_last_four}`
                        : `•••-••-${employee.ssn_last_4 || employee.ssn_last_four}`}
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
              </div>
            ) : (
              <p className="text-sm text-gray-500">No SSN on file</p>
            )}
          </div>
        </div>

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
            <EmployeeInfo employee={employee} />
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
            <div className="mt-6">
              <PayStubViewer isModal={false} />
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
        </div>
      </div>
    );
  };
  
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
  
  const renderOrganizationTree = (employees) => {
    if (!employees || employees.length === 0) return null;

    return (
      <div className="flex flex-col items-center">
        <div className="flex gap-8 justify-center">
          {employees.map((employee) => {
            const isActualOwner = employee.user_role === 'OWNER' || employee.role === 'OWNER';
            const hasChildren = employee.children && employee.children.length > 0;

            return (
              <div key={employee.id} className="flex flex-col items-center">
                {/* Employee Card */}
                <div 
                  className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 hover:border-blue-300 cursor-pointer relative ${
                    isActualOwner ? 'border-blue-500 shadow-lg' : ''
                  }`}
                  onMouseEnter={() => setHoveredEmployee(employee.id)}
                  onMouseLeave={() => setHoveredEmployee(null)}
                  style={{ minWidth: '280px', maxWidth: '320px' }}
                >
                  {/* Owner Badge */}
                  {isActualOwner && (
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
                        isActualOwner ? 'from-yellow-500 to-orange-600' : 'from-blue-500 to-indigo-600'
                      } rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
                        {generateInitials(employee.first_name, employee.last_name, employee.full_name)}
                      </div>
                    </div>
                    
                    {/* Employee Info */}
                    <div className="flex-1 min-w-0">
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
                  </div>

                  {/* Hover Details */}
                  {hoveredEmployee === employee.id && (
                    <div className="absolute z-50 top-0 left-full ml-4 w-80 bg-gray-900 text-white text-sm rounded-lg p-4 shadow-xl">
                      <div className="space-y-2">
                        <div className="font-semibold border-b border-gray-700 pb-2">
                          {employee.first_name} {employee.last_name}
                        </div>
                        <div><span className="text-gray-300">Employee ID:</span> {employee.employee_number || employee.id}</div>
                        {employee.email && (
                          <div><span className="text-gray-300">Email:</span> {employee.email}</div>
                        )}
                        {employee.phone_number && (
                          <div><span className="text-gray-300">Phone:</span> {employee.phone_number}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Render children if any */}
                {hasChildren && (
                  <>
                    {/* Vertical line to children */}
                    <div className="w-px bg-gray-300 h-8"></div>
                    
                    {/* Horizontal connector for multiple children */}
                    {employee.children.length > 1 && (
                      <div className="relative h-px bg-gray-300" style={{ width: `${(employee.children.length - 1) * 320}px` }}>
                        {/* Vertical lines to each child */}
                        {employee.children.map((_, index) => (
                          <div
                            key={index}
                            className="absolute top-0 w-px bg-gray-300 h-8"
                            style={{
                              left: `${(index / (employee.children.length - 1)) * 100}%`,
                              transform: 'translateX(-50%)'
                            }}
                          ></div>
                        ))}
                      </div>
                    )}
                    
                    {/* Recursive rendering of children */}
                    <div className="mt-8">
                      {renderOrganizationTree(employee.children)}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
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
          <div className="relative border border-gray-200 rounded-lg overflow-auto bg-gray-50" style={{ minHeight: '400px', maxHeight: '600px' }}>
            <div 
              ref={orgChartRef}
              className="p-8 transition-transform duration-300 ease-in-out"
              style={{ 
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                minWidth: 'max-content'
              }}
            >
              {/* Render the organization tree */}
              {renderOrganizationTree(hierarchy)}
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

  if (loading || loadingEmployee) {
    return (
      <div className="container mx-auto p-4 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">{t('title', 'My Profile')}</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`grid w-full ${isSupervisor ? 'grid-cols-7' : 'grid-cols-6'}`}>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {t('tabs.profile', 'Profile')}
          </TabsTrigger>
          <TabsTrigger value="pay" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('tabs.pay', 'Pay')}
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('tabs.documents', 'Documents')}
          </TabsTrigger>
          <TabsTrigger value="timesheet" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('tabs.timesheet', 'Timesheet')}
          </TabsTrigger>
          {isSupervisor && (
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('tabs.approvals', 'Approvals')}
            </TabsTrigger>
          )}
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <BuildingOfficeIcon className="h-4 w-4" />
            {t('tabs.organization', 'Organization')}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <ShieldCheckIcon className="h-4 w-4" />
            {t('tabs.security', 'Security')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          {renderProfileTab()}
        </TabsContent>
        
        <TabsContent value="pay">
          {renderPayTab()}
        </TabsContent>
        
        <TabsContent value="documents">
          {renderDocumentsTab()}
        </TabsContent>
        
        <TabsContent value="timesheet">
          <TimesheetTab employee={employee} session={session} />
        </TabsContent>
        
        {isSupervisor && (
          <TabsContent value="approvals">
            <SupervisorApprovals />
          </TabsContent>
        )}
        
        <TabsContent value="organization">
          {renderOrganizationTab()}
        </TabsContent>
        
        <TabsContent value="security">
          {renderSecurityTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
} 