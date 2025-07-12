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
  ArrowPathIcon,
  PlusIcon,
  HomeIcon,
  CalendarIcon,
  ShoppingCartIcon,
  CubeIcon,
  CreditCardIcon,
  UserGroupIcon,
  BuildingLibraryIcon,
  ShoppingBagIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  ChartBarIcon,
  LightBulbIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';
import { usePermissions } from '@/hooks/usePermissions';
import { FieldTooltip } from '@/components/ui/FieldTooltip';

// Define the complete menu structure based on listItems.js
const MENU_STRUCTURE = [
  {
    id: 'create-new',
    label: 'Create New',
    icon: PlusIcon,
    subItems: [
      { id: 'create-new-transaction', label: 'Transaction', path: '/dashboard/transactions/new' },
      { id: 'create-new-pos', label: 'Point of Sale', path: '/dashboard/pos' },
      { id: 'create-new-product', label: 'Product', path: '/dashboard/products/new' },
      { id: 'create-new-service', label: 'Service', path: '/dashboard/services/new' },
      { id: 'create-new-invoice', label: 'Invoice', path: '/dashboard/invoices/new' },
      { id: 'create-new-bill', label: 'Bill', path: '/dashboard/bills/new' },
      { id: 'create-new-estimate', label: 'Estimate', path: '/dashboard/estimates/new' },
      { id: 'create-new-customer', label: 'Customer', path: '/dashboard/customers/new' },
      { id: 'create-new-vendor', label: 'Vendor', path: '/dashboard/vendors/new' }
    ]
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: HomeIcon,
    path: '/dashboard',
    permissions: ['view']
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: CalendarIcon,
    path: '/dashboard/calendar',
    permissions: ['view', 'create', 'edit', 'delete']
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: ShoppingCartIcon,
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
    icon: CubeIcon,
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
    icon: CreditCardIcon,
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
    icon: UserGroupIcon,
    subItems: [
      { id: 'hr-dashboard', label: 'Dashboard', path: '/dashboard/hr' },
      { id: 'hr-employees', label: 'Employees', path: '/dashboard/employees' },
      { id: 'hr-timesheets', label: 'Timesheets', path: '/dashboard/timesheets' },
      { id: 'hr-benefits', label: 'Benefits', path: '/dashboard/benefits' },
      { id: 'hr-performance', label: 'Performance', path: '/dashboard/performance' }
    ]
  },
  {
    id: 'banking',
    label: 'Banking',
    icon: BuildingLibraryIcon,
    subItems: [
      { id: 'banking-dashboard', label: 'Dashboard', path: '/dashboard/banking' },
      { id: 'banking-connect', label: 'Connect Bank', path: '/dashboard/banking/connect' },
      { id: 'banking-transactions', label: 'Transactions', path: '/dashboard/banking/transactions' },
      { id: 'banking-reconciliation', label: 'Reconciliation', path: '/dashboard/banking/reconciliation' },
      { id: 'banking-reports', label: 'Bank Reports', path: '/dashboard/banking/bank-reports' }
    ]
  },
  {
    id: 'purchases',
    label: 'Purchases',
    icon: ShoppingBagIcon,
    subItems: [
      { id: 'purchases-dashboard', label: 'Dashboard', path: '/dashboard/purchases' },
      { id: 'purchases-orders', label: 'Purchase Orders', path: '/dashboard/purchases/orders' },
      { id: 'purchases-bills', label: 'Bills', path: '/dashboard/bills' },
      { id: 'purchases-expenses', label: 'Expenses', path: '/dashboard/expenses' },
      { id: 'purchases-vendors', label: 'Vendors', path: '/dashboard/vendors' },
      { id: 'purchases-reports', label: 'Purchase Reports', path: '/dashboard/purchases/reports' }
    ]
  },
  {
    id: 'payroll',
    label: 'Payroll',
    icon: BriefcaseIcon,
    subItems: [
      { id: 'payroll-dashboard', label: 'Dashboard', path: '/dashboard/payroll' },
      { id: 'payroll-run', label: 'Run Payroll', path: '/dashboard/payroll/run' },
      { id: 'payroll-schedule', label: 'Payroll Schedule', path: '/dashboard/payroll/schedule' },
      { id: 'payroll-settings', label: 'Payroll Settings', path: '/dashboard/payroll/settings' },
      { id: 'payroll-reports', label: 'Payroll Reports', path: '/dashboard/payroll/reports' },
      { id: 'payroll-export', label: 'Export Reports', path: '/dashboard/payroll/export-report' }
    ]
  },
  {
    id: 'taxes',
    label: 'Taxes',
    icon: DocumentTextIcon,
    subItems: [
      { id: 'taxes-dashboard', label: 'Dashboard', path: '/dashboard/taxes' },
      { id: 'taxes-forms', label: 'Tax Forms', path: '/dashboard/taxes/forms' },
      { id: 'taxes-filing', label: 'Tax Filing', path: '/dashboard/taxes/filing' },
      { id: 'taxes-deadlines', label: 'Tax Deadlines', path: '/dashboard/taxes/deadlines' },
      { id: 'taxes-settings', label: 'Tax Settings', path: '/dashboard/taxes/settings' },
      { id: 'taxes-reports', label: 'Tax Reports', path: '/dashboard/taxes/reports' }
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: ChartPieIcon,
    subItems: [
      { id: 'analytics-dashboard', label: 'Dashboard', path: '/dashboard/analytics' },
      { id: 'analytics-business', label: 'Business Analytics', path: '/dashboard/analytics/business' },
      { id: 'analytics-financial', label: 'Financial Analytics', path: '/dashboard/analytics/financial' },
      { id: 'analytics-sales', label: 'Sales Analytics', path: '/dashboard/analytics/sales' },
      { id: 'analytics-customer', label: 'Customer Analytics', path: '/dashboard/analytics/customer' },
      { id: 'analytics-inventory', label: 'Inventory Analytics', path: '/dashboard/analytics/inventory' }
    ]
  },
  {
    id: 'smart-insights',
    label: 'Smart Insights',
    icon: LightBulbIcon,
    subItems: [
      { id: 'smart-insights-dashboard', label: 'Dashboard', path: '/dashboard/smart-insights' },
      { id: 'smart-insights-claude', label: 'Claude AI Assistant', path: '/dashboard/smart-insights/claude' },
      { id: 'smart-insights-query', label: 'Query Builder', path: '/dashboard/smart-insights/query' },
      { id: 'smart-insights-packages', label: 'Credit Packages', path: '/dashboard/smart-insights/packages' },
      { id: 'smart-insights-credits', label: 'Credit Usage', path: '/dashboard/smart-insights/credits' },
      { id: 'smart-insights-purchase', label: 'Purchase Credits', path: '/dashboard/smart-insights/purchase' }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: ChartBarIcon,
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
    permissions: [],
    createEmployee: false,
    linkEmployee: false,
    selectedEmployeeId: '',
    employeeData: {
      department: '',
      jobTitle: '',
      employmentType: 'FT'
    }
  });
  const [expandedMenus, setExpandedMenus] = useState({});
  const [existingEmployees, setExistingEmployees] = useState([]);

  // Fetch real user data
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch users from the proper User Management API (not HR employees)
      const response = await fetch('/api/user-management/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Ensure cookies are sent
      });

      if (!response.ok) {
        // Log the actual error for debugging
        const errorText = await response.text().catch(() => 'No error details');
        logger.error('[UserManagement] API error:', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorText 
        });
        
        // If the API doesn't exist yet, fall back to current user only
        if (response.status === 404) {
          throw new Error('User management API not implemented yet');
        } else if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform the API data to match our component structure
      const apiUsers = Array.isArray(data) ? data : (data.users || data.results || []);
      
      const transformedUsers = apiUsers.map(apiUser => ({
        id: apiUser.id || apiUser.user_id || apiUser.auth0_id,
        email: apiUser.email,
        name: apiUser.name || apiUser.full_name || apiUser.email,
        role: apiUser.role || 'USER',
        status: apiUser.status || (apiUser.active ? 'active' : 'inactive'),
        lastLogin: apiUser.last_login || apiUser.last_active || apiUser.updated_at,
        twoFactorEnabled: apiUser.mfa_enabled || apiUser.two_factor_enabled || false,
        permissions: apiUser.permissions || apiUser.page_permissions || [],
        invitedDate: apiUser.invited_at || apiUser.created_at,
        inviteStatus: apiUser.invite_status || (apiUser.email_verified ? 'accepted' : 'pending')
      }));

      // Always include the current user if not already in the list
      if (user) {
        const currentUserExists = transformedUsers.some(u => 
          u.email === user.email || u.id === user.sub || u.id === user.id
        );
        
        if (!currentUserExists) {
          transformedUsers.unshift({
            id: user.sub || user.id,
            email: user.email,
            name: user.name || user.email,
            role: isOwner ? 'OWNER' : isAdmin ? 'ADMIN' : 'USER',
            status: 'active',
            lastLogin: new Date().toISOString(),
            twoFactorEnabled: user.mfa_enabled || false,
            permissions: [],
            inviteStatus: 'accepted'
          });
        }
      }

      setUsers(transformedUsers);
      setFilteredUsers(transformedUsers);
      
    } catch (error) {
      logger.error('[UserManagement] Error fetching users:', error);
      
      // Fallback to showing at least the current user
      if (user) {
        const fallbackUser = {
          id: user.sub || user.id,
          email: user.email,
          name: user.name || user.email,
          role: isOwner ? 'OWNER' : isAdmin ? 'ADMIN' : 'USER',
          status: 'active',
          lastLogin: new Date().toISOString(),
          twoFactorEnabled: user.mfa_enabled || false,
          permissions: [],
          inviteStatus: 'accepted'
        };
        setUsers([fallbackUser]);
        setFilteredUsers([fallbackUser]);
      }
      
      notifyError('Failed to load users. Showing current user only.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees without user accounts
  const fetchEmployeesWithoutUsers = async () => {
    try {
      const response = await fetch('/api/hr/v2/employees', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      const data = await response.json();
      const employees = Array.isArray(data) ? data : (data.data || data.employees || data.results || []);
      
      // Filter employees that don't have a user_id
      const employeesWithoutUsers = employees.filter(emp => !emp.user_id && !emp.user);
      setExistingEmployees(employeesWithoutUsers);
      
    } catch (error) {
      logger.error('[UserManagement] Error fetching employees:', error);
      // Don't show error to user, just set empty array
      setExistingEmployees([]);
    }
  };

  // Fetch employees when modal opens
  useEffect(() => {
    if (showInviteModal) {
      fetchEmployeesWithoutUsers();
    }
  }, [showInviteModal]);

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

  const handleAddUser = async () => {
    if (!inviteData.email) {
      notifyError('Please enter an email address');
      return;
    }

    if (inviteData.linkEmployee && !inviteData.selectedEmployeeId) {
      notifyError('Please select an employee to link');
      return;
    }

    try {
      setLoading(true);
      
      // Call the updated API to create user directly
      const response = await fetch('/api/user-management/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteData.email,
          role: inviteData.role,
          permissions: inviteData.permissions,
          create_employee: inviteData.createEmployee,
          link_employee: inviteData.linkEmployee,
          employee_id: inviteData.selectedEmployeeId,
          employee_data: inviteData.createEmployee ? inviteData.employeeData : null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      const result = await response.json();
      
      notifySuccess(`User created successfully. Password reset email sent to ${inviteData.email}`);
      setShowInviteModal(false);
      setInviteData({ 
        email: '', 
        role: 'USER', 
        permissions: [], 
        createEmployee: false,
        linkEmployee: false,
        selectedEmployeeId: '',
        employeeData: {
          department: '',
          jobTitle: '',
          employmentType: 'FT'
        }
      });
      
      // Refresh the users list to show the new user
      await fetchUsers();
      
    } catch (error) {
      logger.error('[UserManagement] Error creating user:', error);
      notifyError(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this user?')) return;

    try {
      setLoading(true);
      
      const response = await fetch(`/api/user-management/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove user');
      }
      
      notifySuccess('User removed successfully');
      
      // Refresh the users list
      await fetchUsers();
      
    } catch (error) {
      logger.error('[UserManagement] Error deleting user:', error);
      notifyError(error.message || 'Failed to remove user');
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async (userId) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/user-management/users/${userId}/resend-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to resend invitation');
      }
      
      notifySuccess('Invitation resent successfully');
    } catch (error) {
      logger.error('[UserManagement] Error resending invitation:', error);
      notifyError(error.message || 'Failed to resend invitation');
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
    setInviteData(prev => {
      const currentPermissions = prev.permissions;
      const isCurrentlyChecked = currentPermissions.includes(permissionId);
      
      if (isCurrentlyChecked) {
        // Unchecking: remove this permission and handle parent/child logic
        let newPermissions = currentPermissions.filter(p => p !== permissionId);
        
        // Find if this is a parent menu
        const parentMenu = MENU_STRUCTURE.find(menu => menu.id === permissionId);
        if (parentMenu && parentMenu.subItems) {
          // If unchecking a parent, remove all its children
          const childIds = parentMenu.subItems.map(sub => sub.id);
          newPermissions = newPermissions.filter(p => !childIds.includes(p));
        }
        
        // Find if this is a child menu and check if parent should be unchecked
        const parentOfChild = MENU_STRUCTURE.find(menu => 
          menu.subItems && menu.subItems.some(sub => sub.id === permissionId)
        );
        if (parentOfChild) {
          // Check if any other children of this parent are still checked
          const siblingIds = parentOfChild.subItems.map(sub => sub.id);
          const hasOtherCheckedSiblings = siblingIds.some(id => 
            id !== permissionId && newPermissions.includes(id)
          );
          
          // If no other children are checked, uncheck the parent
          if (!hasOtherCheckedSiblings) {
            newPermissions = newPermissions.filter(p => p !== parentOfChild.id);
          }
        }
        
        return {
          ...prev,
          permissions: newPermissions
        };
      } else {
        // Checking: add this permission and handle parent/child logic
        let newPermissions = [...currentPermissions, permissionId];
        
        // Find if this is a parent menu
        const parentMenu = MENU_STRUCTURE.find(menu => menu.id === permissionId);
        if (parentMenu && parentMenu.subItems) {
          // If checking a parent, add all its children
          const childIds = parentMenu.subItems.map(sub => sub.id);
          childIds.forEach(childId => {
            if (!newPermissions.includes(childId)) {
              newPermissions.push(childId);
            }
          });
        }
        
        // Find if this is a child menu and auto-check parent
        const parentOfChild = MENU_STRUCTURE.find(menu => 
          menu.subItems && menu.subItems.some(sub => sub.id === permissionId)
        );
        if (parentOfChild && !newPermissions.includes(parentOfChild.id)) {
          newPermissions.push(parentOfChild.id);
        }
        
        return {
          ...prev,
          permissions: newPermissions
        };
      }
    });
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
              Add User
            </button>
          )}
        </div>
      </div>

      {/* Inline Add User Form */}
      {showInviteModal && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Add New User</h3>
            <button
              onClick={() => {
                setShowInviteModal(false);
                setInviteData({
                  email: '',
                  role: 'USER',
                  permissions: [],
                  createEmployee: false,
                  linkEmployee: false,
                  selectedEmployeeId: '',
                  employeeData: {
                    department: '',
                    jobTitle: '',
                    employmentType: 'FT'
                  }
                });
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                  <FieldTooltip content="User will receive a password reset email to set their password" />
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
              
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee Record
                  <FieldTooltip content="Link user account to employee record for HR and payroll features" />
                </label>
                
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="employeeOption"
                      value="none"
                      checked={!inviteData.createEmployee && !inviteData.linkEmployee}
                      onChange={() => setInviteData({ 
                        ...inviteData, 
                        createEmployee: false, 
                        linkEmployee: false,
                        selectedEmployeeId: ''
                      })}
                      className="h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">No employee record needed</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="employeeOption"
                      value="create"
                      checked={inviteData.createEmployee}
                      onChange={() => setInviteData({ 
                        ...inviteData, 
                        createEmployee: true, 
                        linkEmployee: false,
                        selectedEmployeeId: ''
                      })}
                      className="h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Create new employee record</span>
                  </label>
                  
                  {existingEmployees.length > 0 && (
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="employeeOption"
                        value="link"
                        checked={inviteData.linkEmployee}
                        onChange={() => setInviteData({ 
                          ...inviteData, 
                          createEmployee: false, 
                          linkEmployee: true
                        })}
                        className="h-4 w-4 text-blue-600 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Link to existing employee</span>
                    </label>
                  )}
                </div>
                
                {inviteData.linkEmployee && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Employee
                    </label>
                    <select
                      value={inviteData.selectedEmployeeId}
                      onChange={(e) => setInviteData({ ...inviteData, selectedEmployeeId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select an employee</option>
                      {existingEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} - {emp.job_title || 'No title'} ({emp.department || 'No dept'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {inviteData.createEmployee && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department
                      </label>
                      <select
                        value={inviteData.employeeData.department}
                        onChange={(e) => setInviteData({
                          ...inviteData,
                          employeeData: { ...inviteData.employeeData, department: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Department</option>
                        <option value="Human Resources">Human Resources</option>
                        <option value="Accounting">Accounting</option>
                        <option value="Sales">Sales</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Operations">Operations</option>
                        <option value="IT">IT</option>
                        <option value="Customer Service">Customer Service</option>
                        <option value="Engineering">Engineering</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={inviteData.employeeData.jobTitle}
                        onChange={(e) => setInviteData({
                          ...inviteData,
                          employeeData: { ...inviteData.employeeData, jobTitle: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Sales Manager, Accountant"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employment Type
                      </label>
                      <select
                        value={inviteData.employeeData.employmentType}
                        onChange={(e) => setInviteData({
                          ...inviteData,
                          employeeData: { ...inviteData.employeeData, employmentType: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="FT">Full Time</option>
                        <option value="PT">Part Time</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Permissions */}
            {inviteData.role === 'USER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Permissions
                  <FieldTooltip content="Select which pages this user can access" />
                </label>
                <div className="border border-gray-200 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                  {MENU_STRUCTURE.map((menu) => (
                    <div key={menu.id} className="mb-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`inline-${menu.id}`}
                          checked={inviteData.permissions.includes(menu.id)}
                          onChange={() => handlePermissionToggle(menu.id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                        <label htmlFor={`inline-${menu.id}`} className="ml-2 font-medium text-gray-900 flex items-center">
                          <menu.icon className="h-4 w-4 text-gray-600 mr-2" />
                          {menu.label}
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
                                id={`inline-${subItem.id}`}
                                checked={inviteData.permissions.includes(subItem.id)}
                                onChange={() => handlePermissionToggle(subItem.id)}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                              />
                              <label htmlFor={`inline-${subItem.id}`} className="ml-2 text-sm text-gray-700">
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

            {/* Admin message for admin role */}
            {inviteData.role === 'ADMIN' && (
              <div className="flex items-center justify-center">
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <ShieldCheckIcon className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">Admin Access</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Admins have full access to all features except owner-specific settings
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-3 border-t border-gray-200 pt-4">
            <button
              onClick={() => {
                setShowInviteModal(false);
                setInviteData({
                  email: '',
                  role: 'USER',
                  permissions: [],
                  createEmployee: false,
                  linkEmployee: false,
                  selectedEmployeeId: '',
                  employeeData: {
                    department: '',
                    jobTitle: '',
                    employmentType: 'FT'
                  }
                });
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleAddUser}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading || !inviteData.email}
            >
              {loading ? 'Adding User...' : 'Add User'}
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default UserManagement;