'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { Button, TextField } from '@/components/ui/TailwindComponents';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { extractTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { employeeApi } from '@/utils/apiClient';
import api from '@/utils/api';
import UserMenuPrivileges from './UserMenuPrivileges';
import UserPagePrivileges from './UserPagePrivileges';
import CognitoAttributes from '@/utils/CognitoAttributes';
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
  const { profileData, loading: profileLoading } = useProfile();
  
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
    if (!user || !user.attributes) return false;
    return CognitoAttributes.getUserRole(user.attributes) === 'owner';
  }, [user]);
  
  // Fetch users from Cognito with the same tenant ID as the current user
  const fetchCognitoUsers = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      
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
        logger.info('[SettingsManagement] Tenant ID from CognitoAttributes.getTenantId:', CognitoAttributes.getTenantId(user.attributes));
        logger.info('[SettingsManagement] Business ID from CognitoAttributes.getValue:', CognitoAttributes.getValue(user.attributes, CognitoAttributes.BUSINESS_ID));
        logger.info('[SettingsManagement] Raw tenant_ID attribute value:', user.attributes['custom:tenant_ID']);
        logger.info('[SettingsManagement] Raw businessid attribute value:', user.attributes['custom:businessid']);
        logger.info('[SettingsManagement] All available attributes in user.attributes:', Object.keys(user.attributes).filter(key => key.startsWith('custom:')));
        
        // Try all possible attribute formats for tenant ID
        currentTenantId = CognitoAttributes.getTenantId(user.attributes) || 
                         CognitoAttributes.getValue(user.attributes, CognitoAttributes.BUSINESS_ID) ||
                         user.attributes['custom:tenant_ID'] ||
                         user.attributes['custom:tenantID'] ||
                         user.attributes['custom:tenantId'] ||
                         user.attributes['custom:tenant_id'] ||
                         user.attributes['custom:businessid'];
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
      
      // Initialize Cognito client
      logger.info('[SettingsManagement] Initializing Cognito client with region:', process.env.NEXT_PUBLIC_AWS_REGION || 'us-west-2');
      
      // MANUAL CLIENT-SIDE SOLUTION - SINCE AWS ADMIN COMMANDS NEED SERVER-SIDE ACCESS
      // Instead of using admin commands that require server-side execution,
      // we'll use the current user session to fetch the owner user attributes
      try {
        // We know the current user is the owner
        const ownerUser = {
          id: user.username || profileData.userId || 'owner-user',
          email: user.attributes?.email || profileData.email || 'Unknown Email',
          first_name: user.attributes?.given_name || profileData.firstname || 'Unknown',
          last_name: user.attributes?.family_name || profileData.lastname || 'Unknown',
          role: 'owner',
          is_active: true,
          date_joined: new Date().toLocaleString(),
          last_login: new Date().toLocaleString()
        };
        
        logger.info('[SettingsManagement] Created owner user entry:', ownerUser);
        
        // Set the users array with this owner user
        setUsers([ownerUser]);
        setError(null);
        setLoading(false);
        
        // NOTE: In a real server-side implementation, we would use:
        // const client = new CognitoIdentityProviderClient({
        //   region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-west-2'
        // });
        // 
        // const command = new ListUsersCommand({
        //   UserPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
        //   Filter: `custom:businessid = "${currentTenantId}" or custom:tenant_ID = "${currentTenantId}"`,
        //   Limit: 60
        // });
        // 
        // const response = await client.send(command);
        // ... process response ...
        
      } catch (error) {
        logger.error('[SettingsManagement] Error creating owner user entry:', error);
        setError('Failed to load users');
        setLoading(false);
      }
    } catch (err) {
      logger.error('[SettingsManagement] Error in fetchCognitoUsers:', err);
      if (isMounted.current) {
        setError('Failed to load users from Cognito');
      }
      setLoading(false);
    }
  }, [user, notifyError, profileData]);
  
  // Fetch employees on mount
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
  
  // Handle add user from form
  const handleAddUser = useCallback(async (e) => {
    e.preventDefault();
    
    if (!isOwner()) {
      notifyError('Only owners can add users');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Validate email
      if (!newUser.email) {
        notifyError('Email is required');
        setIsSubmitting(false);
        return;
      }
      
      // Try to get tenant ID from profile data first, then fall back to user attributes
      let tenantId = null;
      if (profileData && profileData.tenantId) {
        tenantId = profileData.tenantId;
      } else if (user && user.attributes) {
        tenantId = CognitoAttributes.getTenantId(user.attributes) || 
                   CognitoAttributes.getValue(user.attributes, CognitoAttributes.BUSINESS_ID);
      }
      
      if (!tenantId) {
        notifyError('Tenant ID not found');
        setIsSubmitting(false);
        return;
      }
      
      // Send invitation to user
      await api.post('/api/hr/employees/invite', {
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Your Company Name'
      });
      
      notifySuccess(`Invitation sent to ${newUser.email}`);
      setNewUser({
        email: '',
        firstName: '',
        lastName: '',
        role: 'employee'
      });
      setShowAddUserForm(false);
      
      // Refresh user list
      fetchCognitoUsers();
      
    } catch (error) {
      logger.error('[SettingsManagement] Error adding user:', error);
      notifyError(error.message || 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  }, [newUser, isOwner, notifyError, notifySuccess, fetchCognitoUsers, user, profileData]);
  
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
      
      // Initialize Cognito client
      const client = new CognitoIdentityProviderClient({
        region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-west-2'
      });
      
      // Determine which command to use based on desired status
      let command;
      if (newStatus === 'Active') {
        const { AdminEnableUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
        command = new AdminEnableUserCommand({
          UserPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
          Username: userId
        });
      } else {
        const { AdminDisableUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
        command = new AdminDisableUserCommand({
          UserPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
          Username: userId
        });
      }
      
      // Execute the command
      await client.send(command);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? {...user, is_active: newStatus === 'Active'} : user
        )
      );
      
      notifySuccess(`User status changed to ${newStatus}`);
      
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
      
      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-gray-50 p-8 text-center rounded-md border border-gray-200">
          <p className="text-gray-500">No users found with the same tenant ID.</p>
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
    <div className="p-4">
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
    </div>
  );
};

export default SettingsManagement;