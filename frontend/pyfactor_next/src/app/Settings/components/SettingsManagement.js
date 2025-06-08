'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
// Removed AWS Cognito dependency - now using Auth0
import { Button, TextField } from '@/components/ui/TailwindComponents';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { extractTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { employeeApi } from '@/utils/apiClient';
import api from '@/utils/api';
import usersApi from '@/utils/api/usersApi';
import UserMenuPrivileges from './UserMenuPrivileges';
import UserPagePrivileges from './UserPagePrivileges';
import { useProfile } from '@/hooks/useProfile';
import { 
  UserGroupIcon, 
  BuildingOfficeIcon, 
  UsersIcon, 
  UserIcon, 
  ClockIcon,
  IdentificationIcon,
  DocumentTextIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

const SettingsManagement = () => {
  console.log('[SettingsManagement] Component rendering');
  const { user } = useAuth();
  const { profileData, loading: profileLoading, fetchProfile } = useProfile();
  
  // Log component initialization with user data
  console.log('[SettingsManagement] Component initialized with user data:', { 
    hasUser: !!user, 
    hasAttributes: !!(user && user.attributes),
    userRole: user?.attributes?.['custom:userrole'],
    hasProfileData: !!profileData,
    profileTenantId: profileData?.tenantId
  });
  
  const { notifySuccess, notifyError } = useNotification();
  const isMounted = useRef(true);
  
  // Track profile data fetch attempts
  const [profileFetchAttempts, setProfileFetchAttempts] = useState(0);
  const maxProfileFetchAttempts = 3;
  
  // State for managing user list and form
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for top-level tabs
  const [activeTab, setActiveTab] = useState('userManagement');
  
  // State for user management sub-tabs
  const [activeUserTab, setActiveUserTab] = useState('usersList');
  
  // State for user details sub-tabs
  const [activeDetailsTab, setActiveDetailsTab] = useState('profileInfo');
  
  // New user form state
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'employee'
  });
  
  // Access logs state
  const [accessLogs, setAccessLogs] = useState([]);
  
  // User details state
  const [userDetails, setUserDetails] = useState(null);
  
  // Check if user has owner permissions
  const isOwner = useCallback(() => {
    console.log('[SettingsManagement] Checking if user is owner:', {
      hasUser: !!user, 
      hasAttributes: !!(user && user.attributes),
      role: user?.attributes?.['custom:userrole'],
      email: user?.attributes?.email,
      attributesList: user?.attributes ? Object.keys(user.attributes) : [],
      profileData: profileData ? {
        role: profileData.role,
        tenantId: profileData.tenantId,
        hasProfile: true
      } : 'No profile data'
    });
    
    // COMPREHENSIVE SOLUTION for owner role checking
    
    // First try to check from profileData which should be complete
    if (profileData && profileData.role) {
      // Check for various owner role formats in profile data
      const profileRole = profileData.role.toUpperCase();
      if (profileRole.includes('OWNER') || 
          profileRole === 'OWNR' || 
          profileRole === 'OWN' || 
          profileRole === 'ADMIN' ||
          profileRole === 'ADMINISTRATOR') {
        console.log('[SettingsManagement] User is owner based on profile data role:', profileRole);
        return true;
      }
    }
    
    // Fall back to checking Cognito attributes if available
    if (user && user.attributes) {
      // For safe access, get keys in lowercase for case-insensitive comparison
      const attributeKeys = Object.keys(user.attributes).map(k => k.toLowerCase());
      
      // Look for role attribute with various possible names
      const roleKeys = ['custom:userrole', 'userrole', 'custom:role', 'role'];
      
      for (const roleKey of roleKeys) {
        // Try both the original case and lowercase
        const roleValue = user.attributes[roleKey] || user.attributes[roleKey.toLowerCase()];
        
        if (roleValue) {
          const role = roleValue.toUpperCase();
          if (role.includes('OWNER') || 
              role === 'OWNR' || 
              role === 'OWN' || 
              role === 'ADMIN' ||
              role === 'ADMINISTRATOR') {
            console.log('[SettingsManagement] User is owner based on Cognito attribute:', { key: roleKey, value: roleValue });
            return true;
          }
        }
      }
      
      // Check email domain as a last resort - if email is from the company domain
      const email = user.attributes.email || '';
      if (email.endsWith('@dottapps.com')) {
        console.log('[SettingsManagement] User is owner based on company email domain:', email);
        return true;
      }
    }
    
    // For development environment, allow adding users even without owner role
    // You can uncomment this if needed during development
    if (process.env.NODE_ENV === 'development') {
      console.log('[SettingsManagement] Bypassing owner check in development environment');
      return true;
    }
    
    console.log('[SettingsManagement] User is NOT an owner');
    return false;
  }, [user, profileData]);
  
  // Add effect to handle retrying profile fetch if needed
  useEffect(() => {
    // If we don't have profile data and we're not loading and haven't exceeded max attempts
    if (!profileData && !profileLoading && profileFetchAttempts < maxProfileFetchAttempts) {
      const retryDelay = 1000 * (profileFetchAttempts + 1); // Incremental backoff
      logger.info(`[SettingsManagement] Profile data not available, retry attempt ${profileFetchAttempts + 1} in ${retryDelay}ms`);
      
      const timer = setTimeout(() => {
        if (isMounted.current) {
          setProfileFetchAttempts(prev => prev + 1);
          // Try to get tenant ID from user attributes as fallback
          let tenantId = null;
          if (user && user.attributes) {
            tenantId = user.attributes.tenant_id || 
                     user.attributes.business_id ||
                     user.attributes['custom:tenant_ID'] ||
                     user.attributes['custom:businessid'];
          }
          // Also check localStorage for Auth0 compatibility
          if (!tenantId && typeof window !== 'undefined') {
            tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('business_id');
          }
          // Force refresh profile data
          fetchProfile(tenantId, true);
        }
      }, retryDelay);
      
      return () => clearTimeout(timer);
    }
  }, [profileData, profileLoading, profileFetchAttempts, fetchProfile, user]);
  
  // Fetch users from Cognito with the same tenant ID as the current user
  const fetchCognitoUsers = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      
      // Wait for profile data to be loaded
      if (profileLoading) {
        logger.info('[SettingsManagement] Waiting for profile data to load...');
        // Return without setting error - we'll rely on the useEffect dependency to retry
        return;
      }
      
      // Get current user's tenant ID - TRY MULTIPLE SOURCES INCLUDING PROFILE DATA
      let currentTenantId = null;
      
      // Check if we have profile data first (more complete)
      if (profileData && profileData.tenantId) {
        currentTenantId = profileData.tenantId;
        logger.info('[SettingsManagement] Using tenant ID from profileData:', currentTenantId);
      } 
      // Fall back to user attributes if profile data doesn't have tenant ID
      else if (user && user.attributes) {
        // Try to get tenant ID from multiple possible attributes
        logger.info('[SettingsManagement] User attributes:', user.attributes);
        
        // Try all possible attribute formats for tenant ID
        currentTenantId = user.attributes.tenant_id || 
                         user.attributes.business_id ||
                         user.attributes['custom:tenant_ID'] ||
                         user.attributes['custom:tenantId'] ||
                         user.attributes['custom:tenantID'] ||
                         user.attributes['custom:tenant_id'] ||
                         user.attributes['custom:businessid'];
        
        // Also check localStorage for Auth0 compatibility
        if (!currentTenantId && typeof window !== 'undefined') {
          currentTenantId = localStorage.getItem('tenant_id') || localStorage.getItem('business_id');
        }
      } else {
        logger.error('[SettingsManagement] No user or profile data available');
        setError('User not authenticated');
        setLoading(false);
        return;
      }
      
      logger.info('[SettingsManagement] Final currentTenantId value:', currentTenantId);
      
      if (!currentTenantId) {
        setError('Tenant ID not found');
        logger.error('[SettingsManagement] CRITICAL ERROR: Tenant ID not found in any attribute location');
        setLoading(false);
        return;
      }
      
      logger.info('[SettingsManagement] Fetching users with tenant ID:', currentTenantId);
      
      try {
        // Use the usersApi client to fetch users by tenant ID
        const users = await usersApi.getUsersByTenantId(currentTenantId);
        logger.info(`[SettingsManagement] Received ${users.length} users from API`);
        
        if (users.length > 0) {
          setUsers(users);
          setError(null);
        } else {
          setUsers([]);
          setError('No users found');
        }
      } catch (error) {
        logger.error('[SettingsManagement] Error fetching users from API:', error);
        
        // Check for specific error types and provide better messages
        let errorMessage = '';
        if (error.message.includes('500')) {
          errorMessage = 'The server encountered an error. This may be due to missing API implementation or permissions issues.';
          // Try to get the current user profile directly
          try {
            const currentUser = await usersApi.getCurrentUser();
            if (currentUser) {
              // If we can get the current user, add them as a fallback
              setUsers([{
                id: currentUser.id || 'current-user',
                email: currentUser.email || profileData.email || 'Current User',
                first_name: currentUser.firstName || profileData.firstName || 'Current',
                last_name: currentUser.lastName || profileData.lastName || 'User',
                role: currentUser.role || profileData.role || 'user',
                is_active: true,
                last_login: 'Now',
                date_joined: new Date().toISOString()
              }]);
              setError(null);
              setLoading(false);
              return;
            }
          } catch (userError) {
            logger.error('[SettingsManagement] Also failed to get current user profile:', userError);
          }
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage = 'You do not have permission to view users. Please log in again or contact your administrator.';
        } else if (error.message.includes('Network Error')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = `Failed to load users: ${error.message}`;
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    } catch (err) {
      logger.error('[SettingsManagement] Error in fetchCognitoUsers:', err);
      if (isMounted.current) {
        setError('Failed to load users');
      }
      setLoading(false);
    }
  }, [user, notifyError, profileData, profileLoading]);
  
  // Fetch employees on mount and when profile data updates
  useEffect(() => {
    fetchCognitoUsers();
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchCognitoUsers]);
  
  // Handle form input changes
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);
  
  // Function to add a new user
  const handleAddUser = async (e) => {
    if (e) e.preventDefault();
    
    // Check owner status first
    const ownerStatus = isOwner();
    console.log('[SettingsManagement] Owner status check for adding user:', { isOwner: ownerStatus });
    
    if (!ownerStatus) {
      notifyError('Only owners can add users');
      return;
    }
    
    if (!newUser.email) {
      notifyError('Email is required');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Log invitation request for debugging
      console.log('[SettingsManagement] Inviting user with data:', {
        ...newUser,
        tenantId: profileData?.tenantId
      });
      
      // Call the API to invite the user
      const response = await fetch('/api/hr/employees/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await fetchAuthSession()).tokens.idToken.toString()}`
        },
        body: JSON.stringify({
          ...newUser,
          tenantId: profileData?.tenantId,
          companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Your Company'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite user');
      }
      
      // Handle success case
      if (data.success) {
        // Reset form
        setNewUser({
          email: '',
          firstName: '',
          lastName: '',
          role: 'employee',
        });
        setShowAddUserForm(false);
        
        // Check if verification URL is returned (email sending failed)
        if (data.verificationUrl) {
          console.log('[SettingsManagement] Email sending failed, but user was created. Manual verification URL:', data.verificationUrl);
          // Show a different message with the verification URL
          notifySuccess(
            <div>
              <p>User added successfully but email could not be sent.</p>
              <p>Please share this verification link with the user:</p>
              <div className="mt-2 p-2 bg-gray-100 border border-gray-300 rounded text-sm break-all">
                <a href={data.verificationUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {data.verificationUrl}
                </a>
              </div>
              <button 
                className="mt-2 text-sm text-white bg-blue-600 px-2 py-1 rounded"
                onClick={() => {
                  navigator.clipboard.writeText(data.verificationUrl);
                  notifySuccess('Verification URL copied to clipboard!');
                }}
              >
                Copy link
              </button>
            </div>,
            10000 // Show for 10 seconds
          );
        } else {
          // Standard success message
          notifySuccess('User invited successfully. An email has been sent to the user.');
        }
        
        // Refresh the users list
        fetchCognitoUsers();
      }
    } catch (error) {
      console.error('[SettingsManagement] Error inviting user:', error);
      notifyError(`Failed to invite user: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle adding an existing employee as a user
  const handleAddExistingEmployee = useCallback(async (employee) => {
    // This function is no longer needed as we're using Cognito directly
    // Kept for compatibility
    notifyError('This feature is now handled through Cognito user management');
  }, [notifyError]);

  // Handle viewing user details
  const handleViewUserDetails = (user) => {
    setSelectedUser(user);
    setUserDetails(user);
    setActiveUserTab('userDetails');
    setActiveDetailsTab('profileInfo');
  };

  // Function to handle user status toggle
  const handleToggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    
    try {
      setIsSubmitting(true);
      
      // TODO: Implement Auth0 user status toggle
      // For now, we'll just update the local state
      logger.warn('[SettingsManagement] User status toggle not yet implemented for Auth0');
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? {...user, is_active: newStatus === 'Active'} : user
        )
      );
      
      notifySuccess(`User status changed to ${newStatus} (local only - Auth0 integration pending)`);
      
      // Refresh the user list
      fetchCognitoUsers();
    } catch (error) {
      logger.error('[SettingsManagement] Error toggling user status:', error);
      notifyError(`Failed to change user status: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render User List Tab
  const renderUsersList = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Users List</h2>
        <Button
          onClick={() => setShowAddUserForm(true)}
          color="primary"
        >
          Add New User
        </Button>
      </div>
      
      {showAddUserForm && (
        <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Add New User</h3>
            <button
              onClick={() => setShowAddUserForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="First Name"
                name="firstName"
                value={newUser.firstName}
                onChange={handleInputChange}
                placeholder="Enter first name"
              />
              <TextField
                label="Last Name"
                name="lastName"
                value={newUser.lastName}
                onChange={handleInputChange}
                placeholder="Enter last name"
              />
            </div>
            <TextField
              label="Email Address"
              name="email"
              type="email"
              value={newUser.email}
              onChange={handleInputChange}
              placeholder="Enter email address"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Role
              </label>
              <select
                name="role"
                value={newUser.role}
                onChange={handleInputChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="employee">User</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                color="primary"
              >
                {isSubmitting ? 'Adding...' : 'Add User'}
              </Button>
            </div>
          </form>
        </div>
      )}
      
      {/* Search/Filter Bar */}
      <div className="mb-4">
        <TextField
          placeholder="Search by name or email"
          className="w-full md:w-1/2"
        />
      </div>
      
      {/* Users Table with better loading states */}
      {profileLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading profile data...</span>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading users...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm leading-5 text-red-700">{error}</p>
              <button 
                onClick={() => fetchCognitoUsers()} 
                className="mt-2 text-sm text-red-700 underline hover:text-red-900"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-md border border-gray-200">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no users associated with your tenant. Add your first user to get started.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddUserForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Add your first user
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-md shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username/Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.role === 'owner' ? 'Owner' : 'User'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.last_login || 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewUserDetails(user)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleViewUserDetails(user)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleUserStatus(user.id, user.is_active ? 'Active' : 'Suspended')}
                      className={user.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                    >
                      {user.is_active ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Render User Details Tab
  const renderUserDetails = () => {
    if (!userDetails) {
      return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">Please select a user from the Users List to view details.</p>
        </div>
      );
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">User Details</h2>
            <p className="text-gray-500">Managing {userDetails.first_name} {userDetails.last_name}</p>
          </div>
          <Button
            onClick={() => setActiveUserTab('usersList')}
            color="secondary"
          >
            Back to Users List
          </Button>
        </div>

        {/* User Details Sub Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveDetailsTab('profileInfo')}
              className={`${
                activeDetailsTab === 'profileInfo'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <span className="flex items-center"><IdentificationIcon className="w-5 h-5 mr-2" /> Profile Information</span>
            </button>
            <button
              onClick={() => setActiveDetailsTab('pageAccess')}
              className={`${
                activeDetailsTab === 'pageAccess'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <span className="flex items-center"><DocumentTextIcon className="w-5 h-5 mr-2" /> Page Access</span>
            </button>
            <button
              onClick={() => setActiveDetailsTab('managementPermissions')}
              className={`${
                activeDetailsTab === 'managementPermissions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <span className="flex items-center"><KeyIcon className="w-5 h-5 mr-2" /> Management Permissions</span>
            </button>
          </nav>
        </div>

        {/* Sub Tab Content */}
        {activeDetailsTab === 'profileInfo' && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Full Name</label>
                    <div className="mt-1 text-sm text-gray-900">{userDetails.first_name} {userDetails.last_name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email Address</label>
                    <div className="mt-1 text-sm text-gray-900">{userDetails.email}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">User Role</label>
                    <div className="mt-1 text-sm text-gray-900">{userDetails.role || 'User'}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Account Status</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        userDetails.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {userDetails.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Last Login</label>
                    <div className="mt-1 text-sm text-gray-900">{userDetails.last_login || 'Never'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Account Created</label>
                    <div className="mt-1 text-sm text-gray-900">{userDetails.date_joined || 'Unknown'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <Button
                color="secondary"
                onClick={() => setActiveUserTab('usersList')}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onClick={() => console.log('Edit profile')}
              >
                Edit Profile
              </Button>
            </div>
          </div>
        )}

        {activeDetailsTab === 'pageAccess' && (
          <div>
            <UserPagePrivileges />
          </div>
        )}

        {activeDetailsTab === 'managementPermissions' && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-4">Management Permissions</h3>
            
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="can-manage-users"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="can-manage-users" className="ml-2 block text-sm text-gray-700">
                  Can manage users
                </label>
              </div>
              
              <div className="ml-6">
                <p className="text-sm text-gray-600 mb-2">Pages this user can grant access to:</p>
                <select
                  multiple
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  size="6"
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="sales">Sales</option>
                  <option value="inventory">Inventory</option>
                  <option value="reports">Reports</option>
                  <option value="billing">Billing</option>
                  <option value="settings">Settings</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple pages</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                color="secondary"
              >
                Cancel
              </Button>
              <Button
                color="primary"
              >
                Save Permissions
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Access Logs Tab
  const renderAccessLogs = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Access Logs</h2>
      </div>
      
      {/* Search/Filter for logs */}
      <div className="mb-4 flex space-x-4">
        <TextField
          placeholder="Search by user or action"
          className="w-full md:w-1/2"
        />
        <TextField
          type="date"
          label="From Date"
          className="w-full md:w-1/4"
        />
        <TextField
          type="date"
          label="To Date"
          className="w-full md:w-1/4"
        />
      </div>
      
      {/* Sample Logs Table */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admin
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Affected User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Sample log entries - would normally come from API */}
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date().toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">Admin User</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">john.doe@example.com</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                Granted access to Dashboard page
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(Date.now() - 86400000).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">Admin User</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">jane.smith@example.com</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                Removed access to Reports page
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
  
  // Render User Management section
  const renderUserManagement = () => (
    <div>
      {/* User Management Sub Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveUserTab('usersList')}
            className={`${
              activeUserTab === 'usersList'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <span className="flex items-center"><UsersIcon className="w-5 h-5 mr-2" /> Users List</span>
          </button>
          <button
            onClick={() => setActiveUserTab('userDetails')}
            className={`${
              activeUserTab === 'userDetails'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <span className="flex items-center"><UserIcon className="w-5 h-5 mr-2" /> User Details</span>
          </button>
          <button
            onClick={() => setActiveUserTab('accessLogs')}
            className={`${
              activeUserTab === 'accessLogs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <span className="flex items-center"><ClockIcon className="w-5 h-5 mr-2" /> Access Logs</span>
          </button>
        </nav>
      </div>
      
      {/* Sub Tab Content */}
      {activeUserTab === 'usersList' && renderUsersList()}
      {activeUserTab === 'userDetails' && renderUserDetails()}
      {activeUserTab === 'accessLogs' && renderAccessLogs()}
    </div>
  );

  // Render Company Profile section
  const renderCompanyProfile = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Company Profile</h2>
      <p className="text-gray-600 mb-5">Manage your business information, addresses, and legal details.</p>
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-6 flex items-center justify-center h-40">
        <p className="text-gray-500">This section is under development</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 relative">
      {/* Add loading indicator while waiting for profile data */}
      {profileLoading ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading user profile data...</p>
        </div>
      ) : (
        <>
          {/* Main Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('userManagement')}
                className={`${
                  activeTab === 'userManagement'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                <span className="flex items-center"><UserGroupIcon className="w-5 h-5 mr-2" /> User Management</span>
              </button>
              <button
                onClick={() => setActiveTab('companyProfile')}
                className={`${
                  activeTab === 'companyProfile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                <span className="flex items-center"><BuildingOfficeIcon className="w-5 h-5 mr-2" /> Company Profile</span>
              </button>
            </nav>
          </div>
          
          {/* Main Tab Content */}
          <div className="mt-6">
            {activeTab === 'userManagement' && renderUserManagement()}
            {activeTab === 'companyProfile' && renderCompanyProfile()}
          </div>
        </>
      )}
      
      {/* Add a hidden element with high z-index to establish proper stacking context */}
      <div className="absolute inset-0 pointer-events-none z-0"></div>
    </div>
  );
};

export default SettingsManagement;