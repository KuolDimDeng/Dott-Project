'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  UserPlusIcon, 
  MagnifyingGlassIcon, 
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  LockClosedIcon,
  KeyIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';
import { usePermissions } from '@/hooks/usePermissions';
import { FieldTooltip } from '@/components/ui/FieldTooltip';

// Define the complete menu structure based on listItems.js
const MENU_STRUCTURE = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    path: '/dashboard',
    permissions: ['view']
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: '📅',
    path: '/dashboard/calendar',
    permissions: ['view', 'create', 'edit', 'delete']
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: '💰',
    subItems: [
      { id: 'sales-dashboard', label: 'Dashboard', path: '/dashboard/sales' },
      { id: 'sales-products', label: 'Products', path: '/dashboard/products' },
      { id: 'sales-services', label: 'Services', path: '/dashboard/services' },
      { id: 'sales-customers', label: 'Customers', path: '/dashboard/customers' },
      { id: 'sales-estimates', label: 'Estimates', path: '/dashboard/estimates' },
      { id: 'sales-orders', label: 'Orders', path: '/dashboard/orders' },
      { id: 'sales-invoices', label: 'Invoices', path: '/dashboard/invoices' },
      { id: 'sales-reports', label: 'Reports', path: '/dashboard/sales/reports' }
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: '📦',
    subItems: [
      { id: 'inventory-dashboard', label: 'Dashboard', path: '/dashboard/inventory' },
      { id: 'inventory-stock', label: 'Stock Adjustments', path: '/dashboard/inventory/stock' },
      { id: 'inventory-locations', label: 'Locations', path: '/dashboard/inventory/locations' },
      { id: 'inventory-suppliers', label: 'Suppliers', path: '/dashboard/inventory/suppliers' },
      { id: 'inventory-reports', label: 'Reports', path: '/dashboard/inventory/reports' }
    ]
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: '💳',
    subItems: [
      { id: 'payments-dashboard', label: 'Dashboard', path: '/dashboard/payments' },
      { id: 'payments-receive', label: 'Receive Payments', path: '/dashboard/payments/receive' },
      { id: 'payments-make', label: 'Make Payments', path: '/dashboard/payments/make' },
      { id: 'payments-methods', label: 'Payment Methods', path: '/dashboard/payments/methods' },
      { id: 'payments-recurring', label: 'Recurring Payments', path: '/dashboard/payments/recurring' },
      { id: 'payments-refunds', label: 'Refunds', path: '/dashboard/payments/refunds' }
    ]
  },
  {
    id: 'hr',
    label: 'HR',
    icon: '👥',
    subItems: [
      { id: 'hr-dashboard', label: 'Dashboard', path: '/dashboard/hr' },
      { id: 'hr-employees', label: 'Employees', path: '/dashboard/employees' },
      { id: 'hr-timesheets', label: 'Timesheets', path: '/dashboard/timesheets' },
      { id: 'hr-benefits', label: 'Benefits', path: '/dashboard/benefits' },
      { id: 'hr-performance', label: 'Performance', path: '/dashboard/performance' }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: '📈',
    subItems: [
      { id: 'reports-dashboard', label: 'Dashboard', path: '/dashboard/reports' },
      { id: 'reports-financial', label: 'Financial Reports', path: '/dashboard/reports/financial' },
      { id: 'reports-sales', label: 'Sales Reports', path: '/dashboard/reports/sales' },
      { id: 'reports-inventory', label: 'Inventory Reports', path: '/dashboard/reports/inventory' },
      { id: 'reports-custom', label: 'Custom Reports', path: '/dashboard/reports/custom' }
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: '📊',
    path: '/dashboard/analytics',
    permissions: ['view']
  }
];

const UserManagement = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  const { canAccessRoute } = usePermissions();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [bulkSelection, setBulkSelection] = useState([]);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'USER',
    department: '',
    jobTitle: '',
    phoneNumber: '',
    temporaryPassword: '',
    sendWelcomeEmail: true,
    pagePermissions: {}
  });

  // Role options with detailed descriptions
  const roleOptions = [
    { 
      value: 'OWNER', 
      label: 'Owner', 
      description: 'Full access to all features and settings',
      color: 'purple',
      capabilities: ['All permissions', 'User management', 'Billing control', 'Delete organization']
    },
    { 
      value: 'ADMIN', 
      label: 'Admin', 
      description: 'Can manage users and most settings',
      color: 'blue',
      capabilities: ['User management', 'Most settings', 'All business features', 'Cannot delete organization']
    },
    { 
      value: 'USER', 
      label: 'User', 
      description: 'Standard access to business features',
      color: 'gray',
      capabilities: ['Assigned features only', 'Personal settings', 'No user management']
    }
  ];

  // Mock data for demonstration
  useEffect(() => {
    const mockUsers = [
      {
        id: '1',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'ADMIN',
        status: 'active',
        lastLogin: '2024-01-01T10:00:00Z',
        department: 'Sales',
        jobTitle: 'Sales Manager',
        createdAt: '2023-06-01T10:00:00Z',
        twoFactorEnabled: true
      },
      {
        id: '2',
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'USER',
        status: 'active',
        lastLogin: '2024-01-02T10:00:00Z',
        department: 'Accounting',
        jobTitle: 'Accountant',
        createdAt: '2023-07-01T10:00:00Z',
        twoFactorEnabled: false
      },
      {
        id: '3',
        email: 'pending.user@example.com',
        firstName: 'Pending',
        lastName: 'User',
        role: 'USER',
        status: 'pending',
        lastLogin: null,
        department: 'HR',
        jobTitle: 'HR Specialist',
        createdAt: '2024-01-01T10:00:00Z',
        twoFactorEnabled: false
      }
    ];
    
    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 1000);
  }, []);

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Handle permission toggle
  const handlePermissionToggle = (itemId, permission) => {
    setInviteForm(prev => ({
      ...prev,
      pagePermissions: {
        ...prev.pagePermissions,
        [itemId]: {
          ...prev.pagePermissions[itemId],
          [permission]: !prev.pagePermissions[itemId]?.[permission]
        }
      }
    }));
  };

  // Toggle all permissions for a section
  const toggleSectionPermissions = (section, permission) => {
    const newPermissions = { ...inviteForm.pagePermissions };
    const shouldEnable = !allSubitemsHavePermission(section, permission);
    
    if (section.subItems) {
      section.subItems.forEach(subItem => {
        if (!newPermissions[subItem.id]) {
          newPermissions[subItem.id] = {};
        }
        newPermissions[subItem.id][permission] = shouldEnable;
      });
    } else {
      if (!newPermissions[section.id]) {
        newPermissions[section.id] = {};
      }
      newPermissions[section.id][permission] = shouldEnable;
    }

    setInviteForm(prev => ({
      ...prev,
      pagePermissions: newPermissions
    }));
  };

  // Check if all subitems have a permission
  const allSubitemsHavePermission = (section, permission) => {
    if (!section.subItems) {
      return inviteForm.pagePermissions[section.id]?.[permission] || false;
    }
    return section.subItems.every(subItem => 
      inviteForm.pagePermissions[subItem.id]?.[permission]
    );
  };

  // Send invitation
  const handleInviteUser = async () => {
    try {
      setSubmitting(true);
      
      // Validate form
      if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName) {
        notifyError('Please fill in all required fields');
        return;
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      notifySuccess(`Invitation sent to ${inviteForm.email}`);
      setShowInviteModal(false);
      setInviteForm({
        email: '',
        firstName: '',
        lastName: '',
        role: 'USER',
        department: '',
        jobTitle: '',
        phoneNumber: '',
        temporaryPassword: '',
        sendWelcomeEmail: true,
        pagePermissions: {}
      });
      
      // Add new user to list as pending
      const newUser = {
        id: Date.now().toString(),
        email: inviteForm.email,
        firstName: inviteForm.firstName,
        lastName: inviteForm.lastName,
        role: inviteForm.role,
        status: 'pending',
        lastLogin: null,
        department: inviteForm.department,
        jobTitle: inviteForm.jobTitle,
        createdAt: new Date().toISOString(),
        twoFactorEnabled: false
      };
      setUsers(prev => [...prev, newUser]);
    } catch (error) {
      logger.error('[UserManagement] Error inviting user:', error);
      notifyError('Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  // Update user role
  const handleUpdateRole = async (userId, newRole) => {
    try {
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      
      notifySuccess('User role updated successfully');
    } catch (error) {
      logger.error('[UserManagement] Error updating user role:', error);
      notifyError('Failed to update user role');
    } finally {
      setSubmitting(false);
    }
  };

  // Resend invitation
  const handleResendInvitation = async (userId) => {
    try {
      setSubmitting(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      notifySuccess('Invitation resent successfully');
    } catch (error) {
      notifyError('Failed to resend invitation');
    } finally {
      setSubmitting(false);
    }
  };

  // Remove user
  const handleRemoveUser = async (userId, userEmail) => {
    if (!confirm(`Are you sure you want to remove ${userEmail} from your organization?`)) {
      return;
    }

    try {
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUsers(prev => prev.filter(u => u.id !== userId));
      notifySuccess('User removed successfully');
    } catch (error) {
      logger.error('[UserManagement] Error removing user:', error);
      notifyError('Failed to remove user');
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk actions
  const handleBulkAction = async (action) => {
    if (bulkSelection.length === 0) {
      notifyError('Please select users first');
      return;
    }

    switch (action) {
      case 'activate':
        // Activate selected users
        break;
      case 'deactivate':
        // Deactivate selected users
        break;
      case 'delete':
        if (confirm(`Are you sure you want to remove ${bulkSelection.length} users?`)) {
          setUsers(prev => prev.filter(u => !bulkSelection.includes(u.id)));
          setBulkSelection([]);
          notifySuccess('Users removed successfully');
        }
        break;
    }
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      u.email?.toLowerCase().includes(searchLower) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchLower) ||
      u.department?.toLowerCase().includes(searchLower) ||
      u.jobTitle?.toLowerCase().includes(searchLower);
    
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Permission modal for existing users
  const PermissionsModal = ({ user, onClose }) => {
    const [userPermissions, setUserPermissions] = useState({});
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Manage Permissions - {user.firstName} {user.lastName}
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {/* Similar permission UI as invite modal */}
            <div className="space-y-4">
              {MENU_STRUCTURE.map(section => (
                <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{section.label}</h4>
                    <div className="flex space-x-2">
                      <button className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                        Grant All
                      </button>
                      <button className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                        Revoke All
                      </button>
                    </div>
                  </div>
                  {/* Permission checkboxes */}
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                notifySuccess('Permissions updated successfully');
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header with stats */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">User Management</h2>
        <p className="text-sm text-gray-600 mb-4">
          Manage user access, roles, and permissions for your organization
        </p>
        
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
              <UserPlusIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.status === 'active').length}
                </p>
                <p className="text-sm text-gray-600">Active Users</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {users.filter(u => u.status === 'pending').length}
                </p>
                <p className="text-sm text-gray-600">Pending Invites</p>
              </div>
              <EnvelopeIcon className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {users.filter(u => u.twoFactorEnabled).length}
                </p>
                <p className="text-sm text-gray-600">2FA Enabled</p>
              </div>
              <ShieldCheckIcon className="h-8 w-8 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Filters */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            {roleOptions.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
          
          {/* Actions */}
          {isAdmin && (
            <>
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                Invite User
              </button>
              
              {bulkSelection.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {bulkSelection.length} selected
                  </span>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {isAdmin && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBulkSelection(filteredUsers.map(u => u.id));
                      } else {
                        setBulkSelection([]);
                      }
                    }}
                    checked={bulkSelection.length === filteredUsers.length && filteredUsers.length > 0}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Security
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              {isAdmin && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 6} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <ArrowPathIcon className="h-6 w-6 text-gray-400 animate-spin mr-2" />
                    <span className="text-gray-500">Loading users...</span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 6} className="px-6 py-12 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={bulkSelection.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkSelection(prev => [...prev, user.id]);
                          } else {
                            setBulkSelection(prev => prev.filter(id => id !== user.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.jobTitle && (
                          <div className="text-xs text-gray-400">{user.jobTitle}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id && isAdmin ? (
                      <select
                        value={user.role}
                        onChange={(e) => {
                          handleUpdateRole(user.id, e.target.value);
                          setEditingUser(null);
                        }}
                        onBlur={() => setEditingUser(null)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      >
                        {roleOptions.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {roleOptions.find(r => r.value === user.role)?.label || user.role}
                        </span>
                        {isAdmin && user.role !== 'OWNER' && (
                          <button
                            onClick={() => setEditingUser(user.id)}
                            className="ml-2 text-gray-400 hover:text-gray-600"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.status === 'active' ? (
                        <>
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                          <span className="text-sm text-green-700">Active</span>
                        </>
                      ) : user.status === 'pending' ? (
                        <>
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                          <span className="text-sm text-yellow-700">Pending</span>
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-500">Inactive</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {user.twoFactorEnabled ? (
                        <div className="flex items-center text-green-600" title="2FA Enabled">
                          <ShieldCheckIcon className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-400" title="2FA Disabled">
                          <ShieldCheckIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {user.role !== 'OWNER' && (
                        <div className="flex items-center justify-end space-x-2">
                          {user.role === 'USER' && (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowPermissionsModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Manage permissions"
                            >
                              <KeyIcon className="h-5 w-5" />
                            </button>
                          )}
                          {user.status === 'pending' && (
                            <button
                              onClick={() => handleResendInvitation(user.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Resend invitation"
                            >
                              <EnvelopeIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveUser(user.id, user.email)}
                            className="text-red-600 hover:text-red-900"
                            title="Remove user"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Invite New User</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                        <FieldTooltip content="User will receive an invitation at this email address" />
                      </label>
                      <input
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="user@example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                        <FieldTooltip content="Optional phone number for SMS notifications" />
                      </label>
                      <input
                        type="tel"
                        value={inviteForm.phoneNumber}
                        onChange={(e) => setInviteForm({ ...inviteForm, phoneNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                        <FieldTooltip content="User's first name" />
                      </label>
                      <input
                        type="text"
                        value={inviteForm.firstName}
                        onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                        <FieldTooltip content="User's last name" />
                      </label>
                      <input
                        type="text"
                        value={inviteForm.lastName}
                        onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department
                        <FieldTooltip content="User's department or team" />
                      </label>
                      <input
                        type="text"
                        value={inviteForm.department}
                        onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Sales, Engineering"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Title
                        <FieldTooltip content="User's position or role in the company" />
                      </label>
                      <input
                        type="text"
                        value={inviteForm.jobTitle}
                        onChange={(e) => setInviteForm({ ...inviteForm, jobTitle: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Account Manager"
                      />
                    </div>
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-4">
                    Role Selection
                    <FieldTooltip content="Choose the user's access level" />
                  </h4>
                  <div className="space-y-3">
                    {roleOptions.map(role => (
                      <label
                        key={role.value}
                        className={`relative flex cursor-pointer rounded-lg border p-4 ${
                          inviteForm.role === role.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          value={role.value}
                          checked={inviteForm.role === role.value}
                          onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                          className="sr-only"
                        />
                        <div className="flex flex-1">
                          <div className="flex flex-col">
                            <span className={`block text-sm font-medium ${
                              inviteForm.role === role.value ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {role.label}
                            </span>
                            <span className={`mt-1 flex items-center text-sm ${
                              inviteForm.role === role.value ? 'text-blue-700' : 'text-gray-500'
                            }`}>
                              {role.description}
                            </span>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {role.capabilities.map((cap, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    inviteForm.role === role.value
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {cap}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Page Permissions - Only show for USER role */}
                {inviteForm.role === 'USER' && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-4">
                      Page Permissions
                      <FieldTooltip content="Select which pages this user can access and what actions they can perform" />
                    </h4>
                    
                    <div className="space-y-4 border border-gray-200 rounded-lg p-4">
                      {MENU_STRUCTURE.map(section => (
                        <div key={section.id} className="space-y-2">
                          <div className="flex items-center justify-between py-2">
                            <div className="flex items-center">
                              {section.subItems && (
                                <button
                                  onClick={() => toggleSection(section.id)}
                                  className="mr-2"
                                >
                                  {expandedSections[section.id] ? (
                                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                                  )}
                                </button>
                              )}
                              <span className="text-sm font-medium text-gray-900">
                                {section.icon} {section.label}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={allSubitemsHavePermission(section, 'read')}
                                  onChange={() => toggleSectionPermissions(section, 'read')}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-xs text-gray-600">Read</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={allSubitemsHavePermission(section, 'write')}
                                  onChange={() => toggleSectionPermissions(section, 'write')}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-xs text-gray-600">Write</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={allSubitemsHavePermission(section, 'edit')}
                                  onChange={() => toggleSectionPermissions(section, 'edit')}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-xs text-gray-600">Edit</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={allSubitemsHavePermission(section, 'delete')}
                                  onChange={() => toggleSectionPermissions(section, 'delete')}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-xs text-gray-600">Delete</span>
                              </label>
                            </div>
                          </div>

                          {section.subItems && expandedSections[section.id] && (
                            <div className="pl-8 space-y-2">
                              {section.subItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between py-2">
                                  <span className="text-sm text-gray-700">{item.label}</span>
                                  <div className="flex items-center space-x-4">
                                    <label className="flex items-center">
                                      <input
                                        type="checkbox"
                                        checked={inviteForm.pagePermissions[item.id]?.read || false}
                                        onChange={() => handlePermissionToggle(item.id, 'read')}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                      <span className="ml-2 text-xs text-gray-600">Read</span>
                                    </label>
                                    <label className="flex items-center">
                                      <input
                                        type="checkbox"
                                        checked={inviteForm.pagePermissions[item.id]?.write || false}
                                        onChange={() => handlePermissionToggle(item.id, 'write')}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                      <span className="ml-2 text-xs text-gray-600">Write</span>
                                    </label>
                                    <label className="flex items-center">
                                      <input
                                        type="checkbox"
                                        checked={inviteForm.pagePermissions[item.id]?.edit || false}
                                        onChange={() => handlePermissionToggle(item.id, 'edit')}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                      <span className="ml-2 text-xs text-gray-600">Edit</span>
                                    </label>
                                    <label className="flex items-center">
                                      <input
                                        type="checkbox"
                                        checked={inviteForm.pagePermissions[item.id]?.delete || false}
                                        onChange={() => handlePermissionToggle(item.id, 'delete')}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                      <span className="ml-2 text-xs text-gray-600">Delete</span>
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invitation Options */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Invitation Options</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={inviteForm.sendWelcomeEmail}
                        onChange={(e) => setInviteForm({ ...inviteForm, sendWelcomeEmail: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Send welcome email with login instructions
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <div className="text-sm text-gray-500">
                * Required fields
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <PermissionsModal
          user={selectedUser}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;