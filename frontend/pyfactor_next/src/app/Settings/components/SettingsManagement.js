'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  KeyIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
  ShieldCheckIcon,
  BellIcon,
  CreditCardIcon,
  DocumentDuplicateIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  BanknotesIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ServerIcon,
  ChartBarIcon,
  CogIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const SettingsManagement = () => {
  const { user } = useAuth();
  const { profileData, loading: profileLoading, fetchProfile } = useProfile();
  const { notifySuccess, notifyError } = useNotification();
  const isMounted = useRef(true);
  
  // State management
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Navigation state
  const [activeSection, setActiveSection] = useState('user-management');
  const [activeTab, setActiveTab] = useState('users');
  
  // New user form state
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'employee'
  });

  // Settings sections configuration
  const settingsSections = [
    {
      id: 'user-management',
      title: 'User Management',
      icon: UserGroupIcon,
      description: 'Manage users, roles, and permissions',
      tabs: [
        { id: 'users', label: 'Users', icon: UsersIcon },
        { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheckIcon },
        { id: 'activity', label: 'Activity Logs', icon: ClockIcon }
      ]
    },
    {
      id: 'company',
      title: 'Company Profile',
      icon: BuildingOfficeIcon,
      description: 'Business information and branding',
      tabs: [
        { id: 'info', label: 'Company Info', icon: IdentificationIcon },
        { id: 'branding', label: 'Branding', icon: AdjustmentsHorizontalIcon },
        { id: 'locations', label: 'Locations', icon: BuildingOfficeIcon }
      ]
    },
    {
      id: 'billing',
      title: 'Billing & Subscriptions',
      icon: CreditCardIcon,
      description: 'Manage your subscription and billing',
      tabs: [
        { id: 'subscription', label: 'Subscription', icon: CreditCardIcon },
        { id: 'invoices', label: 'Invoices', icon: DocumentDuplicateIcon },
        { id: 'payment', label: 'Payment Methods', icon: BanknotesIcon }
      ]
    },
    {
      id: 'integrations',
      title: 'Integrations',
      icon: ServerIcon,
      description: 'Connect with third-party services',
      tabs: [
        { id: 'connected', label: 'Connected Apps', icon: CheckCircleIcon },
        { id: 'available', label: 'Available', icon: PlusIcon },
        { id: 'api', label: 'API Keys', icon: KeyIcon }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: BellIcon,
      description: 'Email and notification preferences',
      tabs: [
        { id: 'email', label: 'Email Preferences', icon: BellIcon },
        { id: 'alerts', label: 'System Alerts', icon: ShieldCheckIcon },
        { id: 'templates', label: 'Email Templates', icon: DocumentTextIcon }
      ]
    },
    {
      id: 'security',
      title: 'Security',
      icon: ShieldCheckIcon,
      description: 'Security settings and compliance',
      tabs: [
        { id: 'auth', label: 'Authentication', icon: KeyIcon },
        { id: 'audit', label: 'Audit Trail', icon: DocumentTextIcon },
        { id: 'compliance', label: 'Compliance', icon: ShieldCheckIcon }
      ]
    }
  ];

  // Check if user has owner permissions
  const isOwner = useCallback(() => {
    if (profileData && profileData.role) {
      const profileRole = profileData.role.toUpperCase();
      return ['OWNER', 'OWNR', 'OWN', 'ADMIN', 'ADMINISTRATOR'].includes(profileRole);
    }
    return false;
  }, [profileData]);

  // Fetch users from backend
  const fetchUsers = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      
      if (profileLoading) {
        return;
      }
      
      let currentTenantId = profileData?.tenantId || user?.attributes?.tenant_id;
      
      if (!currentTenantId) {
        setError('Tenant ID not found');
        setLoading(false);
        return;
      }
      
      const users = await usersApi.getUsersByTenantId(currentTenantId);
      setUsers(users);
      setError(null);
    } catch (err) {
      logger.error('[SettingsManagement] Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [user, profileData, profileLoading]);

  useEffect(() => {
    fetchUsers();
    return () => {
      isMounted.current = false;
    };
  }, [fetchUsers]);

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || 
      (filterRole === 'owner' && user.role === 'owner') ||
      (filterRole === 'user' && user.role !== 'owner');
    
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Handle adding a new user
  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!isOwner()) {
      notifyError('Only owners can add users');
      return;
    }
    
    if (!newUser.email) {
      notifyError('Email is required');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/hr/employees/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newUser,
          tenantId: profileData?.tenantId,
          companyName: profileData?.businessName || 'Your Company'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite user');
      }
      
      setNewUser({ email: '', firstName: '', lastName: '', role: 'employee' });
      setShowAddUserForm(false);
      notifySuccess('User invited successfully');
      fetchUsers();
    } catch (error) {
      notifyError(`Failed to invite user: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the main content based on active section and tab
  const renderContent = () => {
    const section = settingsSections.find(s => s.id === activeSection);
    
    if (!section) return null;

    switch (activeSection) {
      case 'user-management':
        return renderUserManagement();
      case 'company':
        return renderCompanyProfile();
      case 'billing':
        return renderBillingSection();
      case 'integrations':
        return renderIntegrationsSection();
      case 'notifications':
        return renderNotificationsSection();
      case 'security':
        return renderSecuritySection();
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Select a section from the sidebar</p>
          </div>
        );
    }
  };

  // Render user management section
  const renderUserManagement = () => {
    switch (activeTab) {
      case 'users':
        return (
          <div className="space-y-6">
            {/* Header with search and filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="owner">Owners</option>
                  <option value="user">Users</option>
                </select>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                
                {isOwner() && (
                  <button
                    onClick={() => setShowAddUserForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add User
                  </button>
                )}
              </div>
            </div>

            {/* Add user form */}
            {showAddUserForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Invite New User</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddUserForm(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <XCircleIcon className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="employee">User</option>
                    <option value="owner">Owner</option>
                  </select>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddUserForm(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Inviting...' : 'Send Invitation'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Users table */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-700">{error}</p>
                <button 
                  onClick={fetchUsers} 
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-12 text-center">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-500">
                  {searchQuery || filterRole !== 'all' || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Add your first user to get started'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-600 font-medium">
                                {user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'owner' 
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role === 'owner' ? 'Owner' : 'User'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? (
                              <>
                                <CheckCircleIcon className="h-3 w-3" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircleIcon className="h-3 w-3" />
                                Inactive
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_login || 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
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
      
      case 'roles':
        return (
          <div className="space-y-6">
            <UserPagePrivileges />
          </div>
        );
      
      case 'activity':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Logs</h3>
            <p className="text-gray-500">Activity tracking coming soon...</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Render other sections (placeholder implementations)
  const renderCompanyProfile = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Company Profile</h3>
      <p className="text-gray-500">Company profile management coming soon...</p>
    </div>
  );

  const renderBillingSection = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Billing & Subscriptions</h3>
      <p className="text-gray-500">Billing management coming soon...</p>
    </div>
  );

  const renderIntegrationsSection = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Integrations</h3>
      <p className="text-gray-500">Integration management coming soon...</p>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
      <p className="text-gray-500">Notification preferences coming soon...</p>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Security</h3>
      <p className="text-gray-500">Security settings coming soon...</p>
    </div>
  );

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CogIcon className="h-8 w-8 text-blue-600" />
            Settings
          </h1>
        </div>
        
        <nav className="px-4 pb-6">
          {settingsSections.map((section) => (
            <div key={section.id} className="mb-1">
              <button
                onClick={() => {
                  setActiveSection(section.id);
                  setActiveTab(section.tabs[0].id);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <section.icon className="h-5 w-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{section.title}</div>
                  <div className="text-xs text-gray-500">{section.description}</div>
                </div>
                <ChevronRightIcon className={`h-4 w-4 transition-transform ${
                  activeSection === section.id ? 'rotate-90' : ''
                }`} />
              </button>
            </div>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Tabs */}
          <div className="bg-white border-b">
            <div className="px-6">
              <nav className="flex gap-6">
                {settingsSections
                  .find(s => s.id === activeSection)
                  ?.tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <tab.icon className="h-5 w-5" />
                      {tab.label}
                    </button>
                  ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* User details modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">User Details</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Name</h3>
                  <p className="text-gray-900">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                  <p className="text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Role</h3>
                  <p className="text-gray-900">
                    {selectedUser.role === 'owner' ? 'Owner' : 'User'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                  <p className="text-gray-900">
                    {selectedUser.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Last Login</h3>
                  <p className="text-gray-900">{selectedUser.last_login || 'Never'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Date Joined</h3>
                  <p className="text-gray-900">{selectedUser.date_joined || 'Unknown'}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
                {isOwner() && (
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Edit User
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsManagement;