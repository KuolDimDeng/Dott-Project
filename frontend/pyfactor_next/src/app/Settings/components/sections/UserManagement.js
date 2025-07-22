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

// Define pages that support read/write permissions
const PAGES_WITH_WRITE_ACCESS = [
  'create-new-product', 'create-new-service', 'create-new-customer', 'create-new-vendor',
  'sales-products', 'sales-services', 'sales-customers', 'sales-estimates', 'sales-orders', 'sales-invoices',
  'inventory-stock', 'inventory-locations', 'inventory-suppliers',
  'payments-receive', 'payments-make', 'payments-methods', 'payments-recurring', 'payments-refunds',
  'hr-employees', 'hr-timesheets', 'hr-benefits', 'hr-performance',
  'banking-transactions', 'banking-reconciliation',
  'purchases-orders', 'purchases-bills', 'purchases-expenses', 'purchases-vendors',
  'payroll-run', 'payroll-schedule',
  'taxes-forms', 'taxes-filing'
];

// Define the complete menu structure based on listItems.js
const MENU_STRUCTURE = [
  {
    id: 'create-new',
    label: 'Create New',
    icon: PlusIcon,
    subItems: [
      { id: 'create-new-transaction', label: 'Transaction', path: '/dashboard/transactions/new', hasWriteAccess: true },
      { id: 'create-new-pos', label: 'Point of Sale', path: '/dashboard/pos', hasWriteAccess: true },
      { id: 'create-new-product', label: 'Product', path: '/dashboard/products/new', hasWriteAccess: true },
      { id: 'create-new-service', label: 'Service', path: '/dashboard/services/new', hasWriteAccess: true },
      { id: 'create-new-invoice', label: 'Invoice', path: '/dashboard/invoices/new', hasWriteAccess: true },
      { id: 'create-new-bill', label: 'Bill', path: '/dashboard/bills/new', hasWriteAccess: true },
      { id: 'create-new-estimate', label: 'Estimate', path: '/dashboard/estimates/new', hasWriteAccess: true },
      { id: 'create-new-customer', label: 'Customer', path: '/dashboard/customers/new', hasWriteAccess: true },
      { id: 'create-new-vendor', label: 'Vendor', path: '/dashboard/vendors/new', hasWriteAccess: true }
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
      { id: 'sales-products', label: 'Products', path: '/dashboard/products', hasWriteAccess: true },
      { id: 'sales-services', label: 'Services', path: '/dashboard/services', hasWriteAccess: true },
      { id: 'sales-customers', label: 'Customers', path: '/dashboard/customers', hasWriteAccess: true },
      { id: 'sales-estimates', label: 'Estimates', path: '/dashboard/estimates', hasWriteAccess: true },
      { id: 'sales-orders', label: 'Orders', path: '/dashboard/orders', hasWriteAccess: true },
      { id: 'sales-invoices', label: 'Invoices', path: '/dashboard/invoices', hasWriteAccess: true },
      { id: 'sales-reports', label: 'Reports', path: '/dashboard/sales/reports' }
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: CubeIcon,
    subItems: [
      { id: 'inventory-dashboard', label: 'Dashboard', path: '/dashboard/inventory' },
      { id: 'inventory-stock', label: 'Stock Adjustments', path: '/dashboard/inventory/stock', hasWriteAccess: true },
      { id: 'inventory-locations', label: 'Locations', path: '/dashboard/inventory/locations', hasWriteAccess: true },
      { id: 'inventory-suppliers', label: 'Suppliers', path: '/dashboard/inventory/suppliers', hasWriteAccess: true },
      { id: 'inventory-reports', label: 'Reports', path: '/dashboard/inventory/reports' }
    ]
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: CreditCardIcon,
    subItems: [
      { id: 'payments-dashboard', label: 'Dashboard', path: '/dashboard/payments' },
      { id: 'payments-receive', label: 'Receive Payments', path: '/dashboard/payments/receive', hasWriteAccess: true },
      { id: 'payments-make', label: 'Make Payments', path: '/dashboard/payments/make', hasWriteAccess: true },
      { id: 'payments-methods', label: 'Payment Methods', path: '/dashboard/payments/methods', hasWriteAccess: true },
      { id: 'payments-recurring', label: 'Recurring Payments', path: '/dashboard/payments/recurring', hasWriteAccess: true },
      { id: 'payments-refunds', label: 'Refunds', path: '/dashboard/payments/refunds', hasWriteAccess: true }
    ]
  },
  {
    id: 'hr',
    label: 'HR',
    icon: UserGroupIcon,
    subItems: [
      { id: 'hr-dashboard', label: 'Dashboard', path: '/dashboard/hr' },
      { id: 'hr-employees', label: 'Employees', path: '/dashboard/employees', hasWriteAccess: true },
      { id: 'hr-timesheets', label: 'Timesheets', path: '/dashboard/timesheets', hasWriteAccess: true },
      { id: 'hr-benefits', label: 'Benefits', path: '/dashboard/benefits', hasWriteAccess: true },
      { id: 'hr-performance', label: 'Performance', path: '/dashboard/performance', hasWriteAccess: true }
    ]
  },
  {
    id: 'banking',
    label: 'Banking',
    icon: BuildingLibraryIcon,
    subItems: [
      { id: 'banking-dashboard', label: 'Dashboard', path: '/dashboard/banking' },
      { id: 'banking-connect', label: 'Connect Bank', path: '/dashboard/banking/connect' },
      { id: 'banking-transactions', label: 'Transactions', path: '/dashboard/banking/transactions', hasWriteAccess: true },
      { id: 'banking-reconciliation', label: 'Reconciliation', path: '/dashboard/banking/reconciliation', hasWriteAccess: true },
      { id: 'banking-reports', label: 'Bank Reports', path: '/dashboard/banking/bank-reports' }
    ]
  },
  {
    id: 'purchases',
    label: 'Purchases',
    icon: ShoppingBagIcon,
    subItems: [
      { id: 'purchases-dashboard', label: 'Dashboard', path: '/dashboard/purchases' },
      { id: 'purchases-orders', label: 'Purchase Orders', path: '/dashboard/purchases/orders', hasWriteAccess: true },
      { id: 'purchases-bills', label: 'Bills', path: '/dashboard/bills', hasWriteAccess: true },
      { id: 'purchases-expenses', label: 'Expenses', path: '/dashboard/expenses', hasWriteAccess: true },
      { id: 'purchases-vendors', label: 'Vendors', path: '/dashboard/vendors', hasWriteAccess: true },
      { id: 'purchases-reports', label: 'Purchase Reports', path: '/dashboard/purchases/reports' }
    ]
  },
  {
    id: 'payroll',
    label: 'Payroll',
    icon: BriefcaseIcon,
    subItems: [
      { id: 'payroll-dashboard', label: 'Dashboard', path: '/dashboard/payroll' },
      { id: 'payroll-run', label: 'Run Payroll', path: '/dashboard/payroll/run', hasWriteAccess: true },
      { id: 'payroll-schedule', label: 'Payroll Schedule', path: '/dashboard/payroll/schedule', hasWriteAccess: true },
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
      { id: 'taxes-forms', label: 'Tax Forms', path: '/dashboard/taxes/forms', hasWriteAccess: true },
      { id: 'taxes-filing', label: 'Tax Filing', path: '/dashboard/taxes/filing', hasWriteAccess: true },
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
  console.log('🔴 [UserManagement] Component rendering with props:', { user, isOwner, isAdmin });
  console.log('🔴 [UserManagement] notifyError function:', typeof notifyError, notifyError);
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
    permissions: {}, // Now stores { pageId: { canAccess: true, canWrite: false } }
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
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null); // For inline editing
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [editingPermissions, setEditingPermissions] = useState({}); // Now stores { userId: { pageId: { canAccess: true, canWrite: false } } }

  const fetchUsers = async () => {
    console.log('🔴 [UserManagement] === FETCH USERS CALLED ===');
    try {
      setLoading(true);
      
      // Log the request details
      console.log('🔴 [UserManagement] ========== FETCH USERS START ==========');
      logger.info('[UserManagement Frontend] ========== FETCH USERS START ==========');
      logger.info('[UserManagement Frontend] Document cookies:', document.cookie);
      logger.info('[UserManagement Frontend] Session storage:', JSON.stringify(sessionStorage.getItem('session') || 'null'));
      logger.info('[UserManagement Frontend] Local storage keys:', Object.keys(localStorage));
      logger.info('[UserManagement Frontend] About to fetch from: /api/user-management/users');
      
      // Test session endpoint first
      console.log('🔴 [UserManagement] Testing session endpoint first...');
      const sessionTest = await fetch('/api/auth/session-v2', {
        method: 'GET',
        credentials: 'include'
      });
      console.log('🔴 [UserManagement] Session test status:', sessionTest.status);
      const sessionData = await sessionTest.json().catch(() => ({}));
      console.log('🔴 [UserManagement] Session test data:', sessionData);
      
      // Fetch users from the proper User Management API (not HR employees)
      console.log('🔴 [UserManagement] About to fetch /api/user-management/users');
      console.log('🔴 [UserManagement] Request headers will include:', {
        'Content-Type': 'application/json'
      });
      console.log('🔴 [UserManagement] Cookies will be sent:', document.cookie);
      
      const response = await fetch('/api/user-management/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Ensure cookies are sent
      });
      console.log('🔴 [UserManagement] Fetch completed, status:', response.status);
      
      console.log('🔴 [UserManagement] Response object:', response);
      logger.info('[UserManagement Frontend] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔴 [UserManagement] API Error, status:', response.status);
        console.error('🔴 [UserManagement] Error text:', errorText);
        console.error('🔴 [UserManagement] Response headers:', Object.fromEntries(response.headers.entries()));
        logger.error('[UserManagement Frontend] API Error:', errorText);
        
        // If 401, let's try to manually get session info
        if (response.status === 401) {
          console.log('🔴 [UserManagement] 401 error - checking session manually...');
          try {
            const sessionCheck = await fetch('/api/auth/session-v2', {
              method: 'GET',
              credentials: 'include'
            });
            const sessionInfo = await sessionCheck.json().catch(() => ({}));
            console.log('🔴 [UserManagement] Session check result:', sessionInfo);
            console.log('🔴 [UserManagement] Session check status:', sessionCheck.status);
          } catch (sessionError) {
            console.error('🔴 [UserManagement] Session check failed:', sessionError);
          }
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🔴 [UserManagement] Response data received:', data);
      logger.info('[UserManagement Frontend] Response data:', data);
      
      // Transform the response data
      const apiUsers = data.users || [];
      console.log('🔴 [UserManagement] API Users:', apiUsers);
      logger.info('[UserManagement Frontend] API Users array:', apiUsers);
      logger.info('[UserManagement Frontend] Number of users from API:', apiUsers.length);
      
      // Transform users to match our expected format
      const transformedUsers = apiUsers.map(apiUser => {
        // Convert permissions from array to object format
        let permissions = {};
        const rawPermissions = apiUser.permissions || apiUser.page_permissions || [];
        
        if (Array.isArray(rawPermissions)) {
          rawPermissions.forEach(perm => {
            if (typeof perm === 'string') {
              permissions[perm] = { canAccess: true, canWrite: false };
            } else if (perm && typeof perm === 'object') {
              if (perm.page_id || perm.page) {
                const pageId = perm.page_id || perm.page;
                permissions[pageId] = {
                  canAccess: perm.can_read || true,
                  canWrite: perm.can_write || false
                };
              }
            }
          });
        } else if (typeof rawPermissions === 'object' && !Array.isArray(rawPermissions)) {
          permissions = rawPermissions;
        }
        
        return {
          id: apiUser.id || apiUser.user_id || apiUser.auth0_id,
          email: apiUser.email,
          name: apiUser.name || apiUser.full_name || apiUser.email,
          role: apiUser.role || 'USER',
          status: apiUser.status || (apiUser.is_active ? 'active' : 'inactive'),
          lastLogin: apiUser.last_login || apiUser.last_active || apiUser.updated_at,
          twoFactorEnabled: apiUser.mfa_enabled || apiUser.two_factor_enabled || false,
          permissions: permissions,
          invitedDate: apiUser.invited_at || apiUser.created_at,
          inviteStatus: apiUser.invite_status || (apiUser.email_verified ? 'accepted' : 'pending')
        };
      });

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
            permissions: {},
            inviteStatus: 'accepted'
          });
        }
      }

      setUsers(transformedUsers);
      setFilteredUsers(transformedUsers);
      
    } catch (error) {
      console.error('🔴 [UserManagement] ========== ERROR FETCHING USERS ==========');
      console.error('🔴 [UserManagement] Error:', error);
      console.error('🔴 [UserManagement] Error message:', error.message);
      console.error('🔴 [UserManagement] Error stack:', error.stack);
      logger.error('[UserManagement Frontend] ========== ERROR FETCHING USERS ==========');
      logger.error('[UserManagement Frontend] Error details:', error);
      logger.error('[UserManagement Frontend] Error message:', error.message);
      logger.error('[UserManagement Frontend] Error stack:', error.stack);
      logger.error('[UserManagement Frontend] Error type:', error.name);
      
      // Show error message to user
      if (notifyError) {
        notifyError('Failed to load users. Showing current user only.');
      }
      
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
          permissions: {},
          inviteStatus: 'accepted'
        };
        setUsers([fallbackUser]);
        setFilteredUsers([fallbackUser]);
      }
      
      notifyError('Failed to load users. Showing current user only.');
    } finally {
      setLoading(false);
      console.log('🔴 [UserManagement] === FETCH USERS END ===');
    }
  };

  // Fetch real user data
  useEffect(() => {
    console.log('🔴 [UserManagement] === useEffect RUNNING ===');
    console.log('🔴 [UserManagement] Component mounted, calling fetchUsers...');
    console.log('🔴 [UserManagement] fetchUsers function available?', typeof fetchUsers);
    try {
      fetchUsers();
      console.log('🔴 [UserManagement] fetchUsers called successfully');
    } catch (error) {
      console.error('🔴 [UserManagement] Error calling fetchUsers:', error);
    }
  }, []);


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

  // Function to handle editing user permissions inline
  const handleEditUserPermissions = async (userToEdit) => {
    try {
      setEditingUserId(userToEdit.id);
      
      // Fetch current permissions from backend to ensure accuracy
      const response = await fetch(`/api/user-management/users/${userToEdit.id}/permissions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const permissionsData = await response.json();
        
        // Convert permissions to new format if needed
        const formattedPermissions = {};
        const perms = permissionsData.permissions || [];
        
        if (Array.isArray(perms)) {
          perms.forEach(perm => {
            if (typeof perm === 'string') {
              formattedPermissions[perm] = { canAccess: true, canWrite: false };
            } else if (perm && typeof perm === 'object' && perm.page) {
              formattedPermissions[perm.page] = { 
                canAccess: perm.can_read || false, 
                canWrite: perm.can_write || false 
              };
            }
          });
        } else if (typeof perms === 'object') {
          Object.assign(formattedPermissions, perms);
        }
        
        setEditingPermissions({
          [userToEdit.id]: formattedPermissions
        });
      } else {
        // Fallback to local permissions if fetch fails
        const formattedPermissions = {};
        if (Array.isArray(userToEdit.permissions)) {
          userToEdit.permissions.forEach(perm => {
            formattedPermissions[perm] = { canAccess: true, canWrite: false };
          });
        } else if (userToEdit.permissions && typeof userToEdit.permissions === 'object') {
          Object.assign(formattedPermissions, userToEdit.permissions);
        }
        
        setEditingPermissions({
          [userToEdit.id]: formattedPermissions
        });
      }
    } catch (error) {
      logger.error('[UserManagement] Error fetching user permissions:', error);
      // Fallback to local permissions
      const formattedPermissions = {};
      if (Array.isArray(userToEdit.permissions)) {
        userToEdit.permissions.forEach(perm => {
          formattedPermissions[perm] = { canAccess: true, canWrite: false };
        });
      } else if (userToEdit.permissions && typeof userToEdit.permissions === 'object') {
        Object.assign(formattedPermissions, userToEdit.permissions);
      }
      
      setEditingPermissions({
        [userToEdit.id]: formattedPermissions
      });
    }
  };
  
  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingPermissions({});
  };
  
  const handleDeleteUser = (user) => {
    setDeleteConfirmUser(user);
    setDeleteConfirmText('');
  };
  
  const confirmDeleteUser = async () => {
    if (deleteConfirmText !== 'DELETE') {
      notifyError('Please type DELETE to confirm');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/user-management/users/${deleteConfirmUser.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove user');
      }
      
      notifySuccess(`User ${deleteConfirmUser.email} removed successfully`);
      setDeleteConfirmUser(null);
      setDeleteConfirmText('');
      fetchUsers(); // Refresh the list
    } catch (error) {
      logger.error('[UserManagement] Error deleting user:', error);
      notifyError(error.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle inline permission toggle
  const handleInlinePermissionToggle = (userId, permissionId) => {
    setEditingPermissions(prev => {
      const userPermissions = prev[userId] || {};
      const isChecked = userPermissions[permissionId]?.canAccess;
      
      let newPermissions = { ...userPermissions };
      if (isChecked) {
        // Unchecking
        delete newPermissions[permissionId];
        
        // Handle parent/child logic
        const parentMenu = MENU_STRUCTURE.find(menu => menu.id === permissionId);
        if (parentMenu && parentMenu.subItems) {
          parentMenu.subItems.forEach(sub => {
            delete newPermissions[sub.id];
          });
        }
        
        const parentOfChild = MENU_STRUCTURE.find(menu => 
          menu.subItems && menu.subItems.some(sub => sub.id === permissionId)
        );
        if (parentOfChild) {
          const siblingsChecked = parentOfChild.subItems.some(sub => 
            sub.id !== permissionId && newPermissions[sub.id]?.canAccess
          );
          if (!siblingsChecked) {
            delete newPermissions[parentOfChild.id];
          }
        }
      } else {
        // Checking
        newPermissions[permissionId] = { canAccess: true, canWrite: false };
        
        const parentMenu = MENU_STRUCTURE.find(menu => menu.id === permissionId);
        if (parentMenu && parentMenu.subItems) {
          parentMenu.subItems.forEach(sub => {
            if (!newPermissions[sub.id]) {
              newPermissions[sub.id] = { canAccess: true, canWrite: false };
            }
          });
        }
        
        const parentOfChild = MENU_STRUCTURE.find(menu => 
          menu.subItems && menu.subItems.some(sub => sub.id === permissionId)
        );
        if (parentOfChild && !newPermissions[parentOfChild.id]) {
          newPermissions[parentOfChild.id] = { canAccess: true, canWrite: false };
        }
      }
      
      return {
        ...prev,
        [userId]: newPermissions
      };
    });
  };

  // Handle inline permission level change (read/write)
  const handleInlinePermissionLevelChange = (userId, permissionId, level) => {
    setEditingPermissions(prev => {
      const userPermissions = prev[userId] || {};
      
      if (userPermissions[permissionId]) {
        const newPermissions = { ...userPermissions };
        newPermissions[permissionId] = {
          canAccess: true,
          canWrite: level === 'write'
        };
        
        // Update children if this is a parent
        const parentMenu = MENU_STRUCTURE.find(menu => menu.id === permissionId);
        if (parentMenu && parentMenu.subItems) {
          parentMenu.subItems.forEach(sub => {
            if (newPermissions[sub.id]) {
              newPermissions[sub.id] = {
                canAccess: true,
                canWrite: level === 'write'
              };
            }
          });
        }
        
        return { ...prev, [userId]: newPermissions };
      }
      
      return prev;
    });
  };
  
  // Save inline edited permissions
  const saveInlinePermissions = async (userId) => {
    try {
      setLoading(true);
      
      // Convert permissions to backend format
      const permissions = editingPermissions[userId] || {};
      const pagePermissions = [];
      
      Object.keys(permissions).forEach(pageId => {
        if (permissions[pageId].canAccess) {
          pagePermissions.push({
            page_id: pageId,
            can_read: true,
            can_write: permissions[pageId].canWrite || false,
            can_edit: permissions[pageId].canWrite || false,
            can_delete: permissions[pageId].canWrite || false
          });
        }
      });
      
      const response = await fetch(`/api/user-management/users/${userId}/update-permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          page_permissions: pagePermissions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user permissions');
      }

      const result = await response.json();
      
      // Update local state with the updated permissions
      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, permissions: permissions }
          : u
      ));
      
      setEditingUserId(null);
      setEditingPermissions({});
      notifySuccess('User permissions updated successfully');
      
      // Refresh users list to get latest permissions
      await fetchUsers();
      
    } catch (error) {
      logger.error('[UserManagement] Error updating user permissions:', error);
      notifyError(error.message || 'Failed to update user permissions');
    } finally {
      setLoading(false);
    }
  };

  // Function to update user permissions
  const updateUserPermissions = async () => {
    try {
      setLoading(true);
      
      // Call backend API to update user permissions
      const response = await fetch(`/api/user-management/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          permissions: editingUser.permissions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update user permissions');
      }

      // Update local state
      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...u, permissions: editingUser.permissions }
          : u
      ));
      
      setShowEditPermissionsModal(false);
      setEditingUser(null);
      notifySuccess('User permissions updated successfully');
      
    } catch (error) {
      logger.error('[UserManagement] Error updating user permissions:', error);
      notifyError('Failed to update user permissions');
    } finally {
      setLoading(false);
    }
  };

  // Handle permission change for editing user
  const handleEditPermissionChange = (permissionId) => {
    setEditingUser(prev => {
      const currentPermissions = prev.permissions || [];
      
      if (currentPermissions.includes(permissionId)) {
        // Unchecking: remove this permission and handle parent/child logic
        let newPermissions = currentPermissions.filter(p => p !== permissionId);
        
        // Find if this is a parent menu
        const parentMenu = MENU_STRUCTURE.find(menu => menu.id === permissionId);
        if (parentMenu && parentMenu.subItems) {
          // If unchecking a parent, remove all its children
          const childIds = parentMenu.subItems.map(sub => sub.id);
          newPermissions = newPermissions.filter(p => !childIds.includes(p));
        }
        
        // Find if this is a child menu and uncheck parent if no other children
        const parentOfChild = MENU_STRUCTURE.find(menu => 
          menu.subItems && menu.subItems.some(sub => sub.id === permissionId)
        );
        if (parentOfChild) {
          const siblingsChecked = parentOfChild.subItems.some(sub => 
            sub.id !== permissionId && newPermissions.includes(sub.id)
          );
          if (!siblingsChecked) {
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
      
      // Convert permissions to backend format
      const permissions = inviteData.permissions || {};
      const pagePermissions = [];
      
      Object.keys(permissions).forEach(pageId => {
        if (permissions[pageId].canAccess) {
          pagePermissions.push({
            page_id: pageId,
            can_read: true,
            can_write: permissions[pageId].canWrite || false,
            can_edit: permissions[pageId].canWrite || false,
            can_delete: permissions[pageId].canWrite || false
          });
        }
      });
      
      // Call the updated API to create user directly
      const response = await fetch('/api/user-management/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteData.email,
          role: inviteData.role,
          page_permissions: pagePermissions,
          create_employee: inviteData.createEmployee,
          link_employee: inviteData.linkEmployee,
          employee_id: inviteData.selectedEmployeeId,
          employee_data: inviteData.createEmployee ? inviteData.employeeData : null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Use user-friendly message if available, otherwise fall back to technical message
        const errorMessage = errorData.userFriendly && errorData.message 
          ? errorData.message 
          : (errorData.error || errorData.message || 'Failed to create user');
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      notifySuccess(`User created successfully. Password reset email sent to ${inviteData.email}`);
      setShowInviteModal(false);
      setInviteData({ 
        email: '', 
        role: 'USER', 
        permissions: {}, 
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
      const currentPermissions = { ...prev.permissions };
      const currentPermission = currentPermissions[permissionId];
      
      if (currentPermission && currentPermission.canAccess) {
        // Unchecking: remove this permission and handle parent/child logic
        delete currentPermissions[permissionId];
        
        // Find if this is a parent menu
        const parentMenu = MENU_STRUCTURE.find(menu => menu.id === permissionId);
        if (parentMenu && parentMenu.subItems) {
          // If unchecking a parent, remove all its children
          parentMenu.subItems.forEach(sub => {
            delete currentPermissions[sub.id];
          });
        }
        
        // Find if this is a child menu and check if parent should be unchecked
        const parentOfChild = MENU_STRUCTURE.find(menu => 
          menu.subItems && menu.subItems.some(sub => sub.id === permissionId)
        );
        if (parentOfChild) {
          // Check if any other children of this parent are still checked
          const hasOtherCheckedSiblings = parentOfChild.subItems.some(sub => 
            sub.id !== permissionId && currentPermissions[sub.id]?.canAccess
          );
          
          // If no other children are checked, uncheck the parent
          if (!hasOtherCheckedSiblings) {
            delete currentPermissions[parentOfChild.id];
          }
        }
      } else {
        // Checking: add this permission with default read-only access
        currentPermissions[permissionId] = {
          canAccess: true,
          canWrite: false
        };
        
        // Find if this is a parent menu
        const parentMenu = MENU_STRUCTURE.find(menu => menu.id === permissionId);
        if (parentMenu && parentMenu.subItems) {
          // If checking a parent, add all its children with same access level
          parentMenu.subItems.forEach(sub => {
            if (!currentPermissions[sub.id]) {
              currentPermissions[sub.id] = {
                canAccess: true,
                canWrite: false
              };
            }
          });
        }
        
        // Find if this is a child menu and auto-check parent
        const parentOfChild = MENU_STRUCTURE.find(menu => 
          menu.subItems && menu.subItems.some(sub => sub.id === permissionId)
        );
        if (parentOfChild && !currentPermissions[parentOfChild.id]) {
          currentPermissions[parentOfChild.id] = {
            canAccess: true,
            canWrite: false
          };
        }
      }
      
      return {
        ...prev,
        permissions: currentPermissions
      };
    });
  };

  const handlePermissionLevelChange = (permissionId, level) => {
    setInviteData(prev => {
      const currentPermissions = { ...prev.permissions };
      
      if (currentPermissions[permissionId]) {
        currentPermissions[permissionId] = {
          canAccess: true,
          canWrite: level === 'write'
        };
        
        // Update children if this is a parent
        const parentMenu = MENU_STRUCTURE.find(menu => menu.id === permissionId);
        if (parentMenu && parentMenu.subItems) {
          parentMenu.subItems.forEach(sub => {
            if (currentPermissions[sub.id]) {
              currentPermissions[sub.id] = {
                canAccess: true,
                canWrite: level === 'write'
              };
            }
          });
        }
      }
      
      return { ...prev, permissions: currentPermissions };
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
                  permissions: {},
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
                <div className="mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Email Address
                    <FieldTooltip content="User will receive a password reset email to set their password" />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the email address for the new user
                  </p>
                </div>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <div className="mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Role
                    <FieldTooltip content="Determines base access level" />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose the user's access level in the system
                  </p>
                </div>
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
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Page Permissions
                    <FieldTooltip content="Select which pages this user can access" />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Select which pages and features this user will have access to in the system
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                  {MENU_STRUCTURE.map((menu) => (
                    <div key={menu.id} className="mb-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`inline-${menu.id}`}
                          checked={!!inviteData.permissions[menu.id]?.canAccess}
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
                                checked={!!inviteData.permissions[subItem.id]?.canAccess}
                                onChange={() => handlePermissionToggle(subItem.id)}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                              />
                              <label htmlFor={`inline-${subItem.id}`} className="ml-2 text-sm text-gray-700 flex-1">
                                {subItem.label}
                              </label>
                              {subItem.hasWriteAccess && inviteData.permissions[subItem.id]?.canAccess && (
                                <select
                                  value={inviteData.permissions[subItem.id]?.canWrite ? 'write' : 'read'}
                                  onChange={(e) => handlePermissionLevelChange(subItem.id, e.target.value)}
                                  className="ml-2 text-xs px-2 py-1 border border-gray-300 rounded"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="read">Read Only</option>
                                  <option value="write">Read/Write</option>
                                </select>
                              )}
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
                  permissions: {},
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
              <React.Fragment key={userItem.id}>
                <tr className="hover:bg-gray-50">
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
                      {editingUserId === userItem.id ? (
                        <>
                          <button
                            onClick={() => saveInlinePermissions(userItem.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Save Changes"
                            disabled={loading}
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-900"
                            title="Cancel"
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditUserPermissions(userItem)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Edit Permissions"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(userItem)}
                            className="text-red-600 hover:text-red-900"
                            title="Remove User"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
              {/* Inline Permissions Edit Row */}
              {editingUserId === userItem.id && userItem.role === 'USER' && (
                <tr key={`${userItem.id}-edit`}>
                  <td colSpan="6" className="px-6 py-4 bg-gray-50">
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Edit Page Permissions for {userItem.name}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {MENU_STRUCTURE.map((menu) => {
                          const permissions = editingPermissions[userItem.id] || {};
                          const isParentChecked = !!permissions[menu.id]?.canAccess;
                          const Icon = menu.icon;
                          
                          return (
                            <div key={menu.id} className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center mb-2">
                                <input
                                  type="checkbox"
                                  id={`edit-${userItem.id}-${menu.id}`}
                                  checked={isParentChecked}
                                  onChange={() => handleInlinePermissionToggle(userItem.id, menu.id)}
                                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                />
                                <label 
                                  htmlFor={`edit-${userItem.id}-${menu.id}`} 
                                  className="ml-2 flex items-center cursor-pointer"
                                >
                                  <Icon className="h-4 w-4 text-gray-600 mr-1" />
                                  <span className="text-sm font-medium text-gray-900">{menu.label}</span>
                                </label>
                              </div>
                              
                              {menu.subItems && (
                                <div className="ml-6 space-y-1">
                                  {menu.subItems.map((subItem) => {
                                    const isSubChecked = !!permissions[subItem.id]?.canAccess;
                                    return (
                                      <div key={subItem.id} className="flex items-center">
                                        <input
                                          type="checkbox"
                                          id={`edit-${userItem.id}-${subItem.id}`}
                                          checked={isSubChecked}
                                          onChange={() => handleInlinePermissionToggle(userItem.id, subItem.id)}
                                          className="h-3 w-3 text-blue-600 rounded border-gray-300"
                                        />
                                        <label 
                                          htmlFor={`edit-${userItem.id}-${subItem.id}`} 
                                          className="ml-2 text-xs text-gray-700 cursor-pointer flex-1"
                                        >
                                          {subItem.label}
                                        </label>
                                        {subItem.hasWriteAccess && permissions[subItem.id]?.canAccess && (
                                          <select
                                            value={permissions[subItem.id]?.canWrite ? 'write' : 'read'}
                                            onChange={(e) => handleInlinePermissionLevelChange(userItem.id, subItem.id, e.target.value)}
                                            className="ml-2 text-xs px-2 py-0.5 border border-gray-300 rounded"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <option value="read">Read Only</option>
                                            <option value="write">Read/Write</option>
                                          </select>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveInlinePermissions(userItem.id)}
                          disabled={loading}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                Delete User Account
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the user account for:
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-2">
                  {deleteConfirmUser.email}
                </p>
                <p className="text-sm text-red-600 mt-4">
                  This action cannot be undone. To confirm, please type <span className="font-bold">DELETE</span> below:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  placeholder="Type DELETE to confirm"
                />
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => {
                    setDeleteConfirmUser(null);
                    setDeleteConfirmText('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md w-24 mr-2 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUser}
                  disabled={deleteConfirmText !== 'DELETE' || loading}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-24 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Permissions Modal - REMOVED as we now use inline editing */}
      {false && showEditPermissionsModal && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[90%] max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Edit Permissions for {editingUser.name}
              </h3>
              <button
                onClick={() => {
                  setShowEditPermissionsModal(false);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Select which pages and features {editingUser.name} can access. Checking a parent menu will automatically grant access to all its sub-items.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {MENU_STRUCTURE.map((menuItem) => {
                  const isParentChecked = editingUser.permissions?.includes(menuItem.id);
                  const Icon = menuItem.icon;
                  
                  return (
                    <div key={menuItem.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isParentChecked}
                            onChange={() => handleEditPermissionChange(menuItem.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <Icon className="h-5 w-5 ml-2 mr-2 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">{menuItem.label}</span>
                        </label>
                      </div>
                      
                      {menuItem.subItems && (
                        <div className="ml-6 space-y-2">
                          {menuItem.subItems.map((subItem) => {
                            const isSubChecked = editingUser.permissions?.includes(subItem.id);
                            return (
                              <label key={subItem.id} className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSubChecked}
                                  onChange={() => handleEditPermissionChange(subItem.id)}
                                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-xs text-gray-700">{subItem.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditPermissionsModal(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={updateUserPermissions}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;