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
  }
];

const UserManagement = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'USER',
    permissions: []
  });
  const [expandedMenus, setExpandedMenus] = useState({});

  // Mock data for demonstration
  useEffect(() => {
    const mockUsers = [
      {
        id: '1',
        email: user?.email || 'owner@company.com',
        name: user?.name || 'Company Owner',
        role: 'OWNER',
        status: 'active',
        lastLogin: new Date().toISOString(),
        twoFactorEnabled: true,
        permissions: []
      },
      {
        id: '2',
        email: 'admin@company.com',
        name: 'Admin User',
        role: 'ADMIN',
        status: 'active',
        lastLogin: new Date(Date.now() - 86400000).toISOString(),
        twoFactorEnabled: true,
        permissions: []
      },
      {
        id: '3',
        email: 'user1@company.com',
        name: 'Regular User',
        role: 'USER',
        status: 'active',
        lastLogin: new Date(Date.now() - 172800000).toISOString(),
        twoFactorEnabled: false,
        permissions: ['dashboard', 'sales-dashboard', 'sales-products']
      },
      {
        id: '4',
        email: 'pending@company.com',
        name: 'Pending User',
        role: 'USER',
        status: 'pending',
        invitedDate: new Date(Date.now() - 259200000).toISOString(),
        twoFactorEnabled: false,
        permissions: ['dashboard', 'reports-dashboard']
      }
    ];
    setUsers(mockUsers);
    setFilteredUsers(mockUsers);
  }, [user]);

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(u => u.status === filterStatus);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, filterRole, filterStatus, users]);

  const handleInviteUser = async () => {
    if (!inviteData.email) {
      notifyError('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      notifySuccess(`Invitation sent to ${inviteData.email}`);
      setShowInviteModal(false);
      setInviteData({ email: '', role: 'USER', permissions: [] });
      
      // Add to pending users
      const newUser = {
        id: Date.now().toString(),
        email: inviteData.email,
        name: inviteData.email.split('@')[0],
        role: inviteData.role,
        status: 'pending',
        invitedDate: new Date().toISOString(),
        twoFactorEnabled: false,
        permissions: inviteData.permissions
      };
      setUsers([...users, newUser]);
    } catch (error) {
      logger.error('[UserManagement] Error inviting user:', error);
      notifyError('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this user?')) return;

    try {
      setLoading(true);
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUsers(users.filter(u => u.id !== userId));
      notifySuccess('User removed successfully');
    } catch (error) {
      notifyError('Failed to remove user');
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async (userId) => {
    try {
      setLoading(true);
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      notifySuccess('Invitation resent');
    } catch (error) {
      notifyError('Failed to resend invitation');
    } finally {
      setLoading(false);
    }
  };

  const toggleMenuExpansion = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const handlePermissionToggle = (permissionId) => {
    setInviteData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const stats = [
    {
      label: 'Total Users',
      value: users.length,
      icon: UserPlusIcon,
      color: 'blue'
    },
    {
      label: 'Active Users',
      value: users.filter(u => u.status === 'active').length,
      icon: CheckCircleIcon,
      color: 'green'
    },
    {
      label: 'Pending Invites',
      value: users.filter(u => u.status === 'pending').length,
      icon: EnvelopeIcon,
      color: 'yellow'
    },
    {
      label: '2FA Enabled',
      value: users.filter(u => u.twoFactorEnabled).length,
      icon: ShieldCheckIcon,
      color: 'purple'
    }
  ];

  const canManageUsers = isOwner || isAdmin;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage user access, roles, and permissions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <Icon className={`h-8 w-8 text-${stat.color}-500`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="USER">User</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          
          {canManageUsers && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Invite User
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
                Last Active
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                2FA
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((userItem) => (
              <tr key={userItem.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{userItem.name}</div>
                    <div className="text-sm text-gray-500">{userItem.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    userItem.role === 'OWNER' 
                      ? 'bg-purple-100 text-purple-800' 
                      : userItem.role === 'ADMIN'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {userItem.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    userItem.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : userItem.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {userItem.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {userItem.status === 'active' 
                    ? new Date(userItem.lastLogin).toLocaleDateString()
                    : userItem.invitedDate 
                    ? `Invited ${new Date(userItem.invitedDate).toLocaleDateString()}`
                    : '-'
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {userItem.twoFactorEnabled ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-gray-300" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canManageUsers && userItem.role !== 'OWNER' && (
                    <div className="flex items-center justify-end space-x-2">
                      {userItem.status === 'pending' && (
                        <button
                          onClick={() => handleResendInvite(userItem.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Resend Invite"
                        >
                          <EnvelopeIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => {}}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit Permissions"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(userItem.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Remove User"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite New User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                  <FieldTooltip content="User will receive an invitation email" />
                </label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                  <FieldTooltip content="Determines base access level" />
                </label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="USER">User</option>
                </select>
              </div>

              {inviteData.role === 'USER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Permissions
                    <FieldTooltip content="Select which pages this user can access" />
                  </label>
                  <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {MENU_STRUCTURE.map((menu) => (
                      <div key={menu.id} className="mb-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={menu.id}
                            checked={inviteData.permissions.includes(menu.id)}
                            onChange={() => handlePermissionToggle(menu.id)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                          />
                          <label htmlFor={menu.id} className="ml-2 font-medium text-gray-900">
                            {menu.icon} {menu.label}
                          </label>
                          {menu.subItems && (
                            <button
                              type="button"
                              onClick={() => toggleMenuExpansion(menu.id)}
                              className="ml-2"
                            >
                              {expandedMenus[menu.id] ? (
                                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                              )}
                            </button>
                          )}
                        </div>
                        
                        {menu.subItems && expandedMenus[menu.id] && (
                          <div className="ml-8 mt-2 space-y-2">
                            {menu.subItems.map((subItem) => (
                              <div key={subItem.id} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={subItem.id}
                                  checked={inviteData.permissions.includes(subItem.id)}
                                  onChange={() => handlePermissionToggle(subItem.id)}
                                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                />
                                <label htmlFor={subItem.id} className="ml-2 text-sm text-gray-700">
                                  {subItem.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;