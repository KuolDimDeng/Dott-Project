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
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';
import usersApi from '@/utils/api/usersApi';
import { FieldTooltip } from '@/components/ui/FieldTooltip';

// Define the full menu structure from listItems.js
const MENU_STRUCTURE = {
  'Dashboard': {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    subItems: []
  },
  'Calendar': {
    id: 'calendar',
    label: 'Calendar',
    path: '/dashboard/calendar',
    subItems: []
  },
  'Sales': {
    id: 'sales',
    label: 'Sales',
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
  'Inventory': {
    id: 'inventory',
    label: 'Inventory',
    subItems: [
      { id: 'inventory-dashboard', label: 'Dashboard', path: '/dashboard/inventory' },
      { id: 'inventory-stock-adjustments', label: 'Stock Adjustments', path: '/dashboard/inventory/stock-adjustments' },
      { id: 'inventory-locations', label: 'Locations', path: '/dashboard/inventory/locations' },
      { id: 'inventory-suppliers', label: 'Suppliers', path: '/dashboard/inventory/suppliers' },
      { id: 'inventory-reports', label: 'Reports', path: '/dashboard/inventory/reports' }
    ]
  },
  'Payments': {
    id: 'payments',
    label: 'Payments',
    subItems: [
      { id: 'payments-dashboard', label: 'Dashboard', path: '/dashboard/payments' },
      { id: 'payments-receive', label: 'Receive Payments', path: '/dashboard/payments/receive' },
      { id: 'payments-make', label: 'Make Payments', path: '/dashboard/payments/make' },
      { id: 'payments-methods', label: 'Payment Methods', path: '/dashboard/payments/methods' },
      { id: 'payments-recurring', label: 'Recurring Payments', path: '/dashboard/payments/recurring' },
      { id: 'payments-refunds', label: 'Refunds', path: '/dashboard/payments/refunds' },
      { id: 'payments-reconciliation', label: 'Payment Reconciliation', path: '/dashboard/payments/reconciliation' },
      { id: 'payments-gateways', label: 'Payment Gateways', path: '/dashboard/payments/gateways' },
      { id: 'payments-reports', label: 'Reports', path: '/dashboard/payments/reports' }
    ]
  },
  'Purchases': {
    id: 'purchases',
    label: 'Purchases',
    subItems: [
      { id: 'purchases-dashboard', label: 'Dashboard', path: '/dashboard/purchases' },
      { id: 'purchases-vendors', label: 'Vendors', path: '/dashboard/purchases/vendors' },
      { id: 'purchases-orders', label: 'Purchase Orders', path: '/dashboard/purchases/orders' },
      { id: 'purchases-bills', label: 'Bills', path: '/dashboard/purchases/bills' },
      { id: 'purchases-expenses', label: 'Expenses', path: '/dashboard/purchases/expenses' },
      { id: 'purchases-returns', label: 'Purchase Returns', path: '/dashboard/purchases/returns' },
      { id: 'purchases-procurement', label: 'Procurement', path: '/dashboard/purchases/procurement' },
      { id: 'purchases-reports', label: 'Reports', path: '/dashboard/purchases/reports' }
    ]
  },
  'Accounting': {
    id: 'accounting',
    label: 'Accounting',
    subItems: [
      { id: 'accounting-dashboard', label: 'Dashboard', path: '/dashboard/accounting' },
      { id: 'accounting-chart-of-accounts', label: 'Chart of Accounts', path: '/dashboard/accounting/chart-of-accounts' },
      { id: 'accounting-journal-entries', label: 'Journal Entries', path: '/dashboard/accounting/journal-entries' },
      { id: 'accounting-general-ledger', label: 'General Ledger', path: '/dashboard/accounting/general-ledger' },
      { id: 'accounting-reconciliation', label: 'Reconciliation', path: '/dashboard/accounting/reconciliation' },
      { id: 'accounting-financial-statements', label: 'Financial Statements', path: '/dashboard/accounting/financial-statements' },
      { id: 'accounting-fixed-assets', label: 'Fixed Assets', path: '/dashboard/accounting/fixed-assets' },
      { id: 'accounting-reports', label: 'Reports', path: '/dashboard/accounting/reports' }
    ]
  },
  'Banking': {
    id: 'banking',
    label: 'Banking',
    subItems: [
      { id: 'banking-dashboard', label: 'Dashboard', path: '/dashboard/banking' },
      { id: 'banking-connect', label: 'Connect to Bank', path: '/dashboard/banking/connect' },
      { id: 'banking-transactions', label: 'Bank Transactions', path: '/dashboard/banking/transactions' },
      { id: 'banking-reconciliation', label: 'Bank Reconciliation', path: '/dashboard/banking/reconciliation' },
      { id: 'banking-reports', label: 'Reports', path: '/dashboard/banking/reports' },
      { id: 'banking-tools', label: 'Banking Tools', path: '/dashboard/banking/tools' }
    ]
  },
  'HR': {
    id: 'hr',
    label: 'HR',
    subItems: [
      { id: 'hr-dashboard', label: 'Dashboard', path: '/dashboard/hr' },
      { id: 'hr-employees', label: 'Employees', path: '/dashboard/employees' },
      { id: 'hr-timesheets', label: 'Timesheets', path: '/dashboard/timesheets' },
      { id: 'hr-pay', label: 'Pay', path: '/dashboard/pay' },
      { id: 'hr-benefits', label: 'Benefits', path: '/dashboard/benefits' },
      { id: 'hr-reports', label: 'Reports', path: '/dashboard/reports' },
      { id: 'hr-performance', label: 'Performance', path: '/dashboard/performance' }
    ]
  },
  'Payroll': {
    id: 'payroll',
    label: 'Payroll',
    subItems: [
      { id: 'payroll-dashboard', label: 'Dashboard', path: '/dashboard/payroll' },
      { id: 'payroll-run', label: 'Run Payroll', path: '/dashboard/payroll/run' },
      { id: 'payroll-transactions', label: 'Payroll Transactions', path: '/dashboard/payroll/transactions' },
      { id: 'payroll-reports', label: 'Reports', path: '/dashboard/payroll/reports' }
    ]
  },
  'Taxes': {
    id: 'taxes',
    label: 'Taxes',
    subItems: [
      { id: 'taxes-dashboard', label: 'Dashboard', path: '/dashboard/taxes' },
      { id: 'taxes-settings', label: 'Tax Settings', path: '/dashboard/taxes/settings' },
      { id: 'taxes-filing', label: 'Tax Filing', path: '/dashboard/taxes/filing' },
      { id: 'taxes-reports', label: 'Reports', path: '/dashboard/taxes/reports' }
    ]
  },
  'Reports': {
    id: 'reports',
    label: 'Reports',
    subItems: [
      { id: 'reports-dashboard', label: 'Dashboard', path: '/dashboard/reports' },
      { id: 'reports-income-statement', label: 'Profit & Loss Statement', path: '/dashboard/reports/income-statement' },
      { id: 'reports-balance-sheet', label: 'Balance Sheet', path: '/dashboard/reports/balance-sheet' },
      { id: 'reports-cash-flow', label: 'Cash Flow', path: '/dashboard/reports/cash-flow' },
      { id: 'reports-sales-tax', label: 'Sales Tax', path: '/dashboard/reports/sales-tax' },
      { id: 'reports-payroll-tax', label: 'Payroll Wage Tax', path: '/dashboard/reports/payroll-tax' },
      { id: 'reports-income-by-customer', label: 'Income by Customer', path: '/dashboard/reports/income-by-customer' },
      { id: 'reports-aged-receivables', label: 'Aged Receivables', path: '/dashboard/reports/aged-receivables' },
      { id: 'reports-purchases-by-vendor', label: 'Purchases by Vendor', path: '/dashboard/reports/purchases-by-vendor' },
      { id: 'reports-aged-payables', label: 'Aged Payables', path: '/dashboard/reports/aged-payables' },
      { id: 'reports-account-balances', label: 'Account Balances', path: '/dashboard/reports/account-balances' },
      { id: 'reports-trial-balance', label: 'Trial Balances', path: '/dashboard/reports/trial-balance' },
      { id: 'reports-general-ledger', label: 'General Ledger', path: '/dashboard/reports/general-ledger' }
    ]
  },
  'Analytics': {
    id: 'analytics',
    label: 'Analytics',
    path: '/dashboard/analytics',
    subItems: []
  },
  'Smart Insight': {
    id: 'smart-insight',
    label: 'Smart Insight',
    path: '/dashboard/smart-insight',
    subItems: []
  }
};

const UserManagementEnhanced = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'USER',
    pagePermissions: {}
  });

  // State for expanded menu sections
  const [expandedSections, setExpandedSections] = useState({});

  // Role options
  const roleOptions = [
    { value: 'OWNER', label: 'Owner', description: 'Full access to all features and settings' },
    { value: 'ADMIN', label: 'Admin', description: 'Can manage users and most settings' },
    { value: 'USER', label: 'User', description: 'Standard access to business features' }
  ];

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const tenantId = profileData?.tenantId || user?.attributes?.tenant_id;
      
      if (!tenantId) {
        notifyError('Unable to fetch users: Tenant ID not found');
        return;
      }

      const response = await usersApi.getUsersByTenantId(tenantId);
      setUsers(response);
    } catch (error) {
      logger.error('[UserManagement] Error fetching users:', error);
      notifyError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [user, profileData, notifyError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  // Check if all subitems have a specific permission
  const allSubitemsHavePermission = (menuItem, permission) => {
    if (!menuItem.subItems || menuItem.subItems.length === 0) return false;
    return menuItem.subItems.every(subItem => 
      inviteForm.pagePermissions[subItem.id]?.[permission]
    );
  };

  // Toggle all subitems for a menu section
  const toggleAllSubitems = (menuItem, permission) => {
    const newPermissions = { ...inviteForm.pagePermissions };
    const shouldEnable = !allSubitemsHavePermission(menuItem, permission);
    
    menuItem.subItems.forEach(subItem => {
      if (!newPermissions[subItem.id]) {
        newPermissions[subItem.id] = {};
      }
      newPermissions[subItem.id][permission] = shouldEnable;
    });

    setInviteForm(prev => ({
      ...prev,
      pagePermissions: newPermissions
    }));
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

      // Prepare page permissions data
      const pagePermissionsArray = Object.entries(inviteForm.pagePermissions)
        .filter(([_, permissions]) => permissions.read || permissions.write || permissions.edit || permissions.delete)
        .map(([pageId, permissions]) => ({
          page_id: pageId,
          can_read: permissions.read || false,
          can_write: permissions.write || false,
          can_edit: permissions.edit || false,
          can_delete: permissions.delete || false
        }));

      // Call Auth0 Management API through backend
      const response = await fetch('/api/auth/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteForm.email,
          firstName: inviteForm.firstName,
          lastName: inviteForm.lastName,
          role: inviteForm.role,
          tenantId: profileData?.tenantId,
          page_permissions: inviteForm.role === 'USER' ? pagePermissionsArray : []
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }

      notifySuccess(`Invitation sent to ${inviteForm.email}`);
      setShowInviteModal(false);
      setInviteForm({ email: '', firstName: '', lastName: '', role: 'USER', pagePermissions: {} });
      fetchUsers(); // Refresh user list
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
      
      const response = await fetch('/api/auth/update-user-role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          role: newRole
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      notifySuccess('User role updated successfully');
      fetchUsers();
    } catch (error) {
      logger.error('[UserManagement] Error updating user role:', error);
      notifyError('Failed to update user role');
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
      
      const response = await fetch('/api/auth/remove-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to remove user');
      }

      notifySuccess('User removed successfully');
      fetchUsers();
    } catch (error) {
      logger.error('[UserManagement] Error removing user:', error);
      notifyError('Failed to remove user');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(u => {
    const searchLower = searchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(searchLower) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchLower)
    );
  });

  // Render permission checkboxes
  const renderPermissionCheckboxes = (item) => (
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
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">User Management</h2>
        <p className="text-sm text-gray-600">
          Manage user access and permissions for your organization
        </p>
      </div>

      {/* Auth0 Integration Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Auth0 Integration</p>
            <p>Users will receive an email invitation to set up their account. They'll create their own password and enable two-factor authentication if required.</p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {isAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Invite User
          </button>
        )}
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
                <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                  Loading users...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
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
                          <span className="text-sm text-yellow-700">Pending Invitation</span>
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-500">Inactive</span>
                        </>
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
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Invite New User</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
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
                      Last Name
                      <FieldTooltip content="User's last name" />
                    </label>
                    <input
                      type="text"
                      value={inviteForm.lastName}
                      onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                    <FieldTooltip content="Determines user's access level and permissions" />
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {roleOptions.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Page Permissions - Only show for USER role */}
                {inviteForm.role === 'USER' && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">
                      Page Permissions
                      <FieldTooltip content="Select which pages this user can access and what actions they can perform" />
                    </h4>
                    
                    <div className="space-y-4 border border-gray-200 rounded-lg p-4">
                      {Object.entries(MENU_STRUCTURE).map(([menuKey, menuItem]) => (
                        <div key={menuItem.id} className="space-y-2">
                          {/* Menu Section Header */}
                          <div className="flex items-center justify-between py-2">
                            <div className="flex items-center">
                              {menuItem.subItems && menuItem.subItems.length > 0 && (
                                <button
                                  onClick={() => toggleSection(menuItem.id)}
                                  className="mr-2"
                                >
                                  {expandedSections[menuItem.id] ? (
                                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                                  )}
                                </button>
                              )}
                              <span className="font-medium text-gray-900">{menuItem.label}</span>
                            </div>
                            {menuItem.subItems && menuItem.subItems.length > 0 && (
                              <div className="flex items-center space-x-4">
                                <button
                                  onClick={() => toggleAllSubitems(menuItem, 'read')}
                                  className={`text-xs px-2 py-1 rounded ${
                                    allSubitemsHavePermission(menuItem, 'read')
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  All Read
                                </button>
                                <button
                                  onClick={() => toggleAllSubitems(menuItem, 'write')}
                                  className={`text-xs px-2 py-1 rounded ${
                                    allSubitemsHavePermission(menuItem, 'write')
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  All Write
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Single items without subitems */}
                          {(!menuItem.subItems || menuItem.subItems.length === 0) && (
                            <div className="pl-6 py-2 flex items-center justify-between">
                              <span className="text-sm text-gray-700">{menuItem.label}</span>
                              {renderPermissionCheckboxes(menuItem)}
                            </div>
                          )}

                          {/* Subitems */}
                          {menuItem.subItems && menuItem.subItems.length > 0 && expandedSections[menuItem.id] && (
                            <div className="pl-8 space-y-2">
                              {menuItem.subItems.map(subItem => (
                                <div key={subItem.id} className="flex items-center justify-between py-2">
                                  <span className="text-sm text-gray-700">{subItem.label}</span>
                                  {renderPermissionCheckboxes(subItem)}
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
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementEnhanced;