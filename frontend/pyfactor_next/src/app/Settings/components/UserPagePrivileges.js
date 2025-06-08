'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/TailwindComponents';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { logger } from '@/utils/logger';
// Removed AWS Cognito utils import - now using Auth0
import { employeeApi } from '@/utils/apiClient';
import api from '@/utils/api';
import { getCacheValue } from '@/utils/appCache';

// Define all available pages grouped by category
const PAGE_CATEGORIES = [
  {
    name: 'Dashboard',
    pages: [{ id: 'dashboard', name: 'Dashboard Overview' }]
  },
  {
    name: 'Billing',
    pages: [
      { id: 'billing_invoices', name: 'Invoices' },
      { id: 'billing_estimates', name: 'Estimates' },
      { id: 'billing_payments', name: 'Payments' },
      { id: 'billing_subscriptions', name: 'Subscriptions' }
    ]
  },
  {
    name: 'Sales',
    pages: [
      { id: 'sales_orders', name: 'Orders' },
      { id: 'sales_customers', name: 'Customers' },
      { id: 'sales_quotes', name: 'Quotes' },
      { id: 'sales_promotions', name: 'Promotions' }
    ]
  },
  {
    name: 'Inventory',
    pages: [
      { id: 'inventory_products', name: 'Products' },
      { id: 'inventory_categories', name: 'Categories' },
      { id: 'inventory_stock', name: 'Stock Management' }
    ]
  },
  {
    name: 'CRM',
    pages: [
      { id: 'crm_contacts', name: 'Contacts' },
      { id: 'crm_leads', name: 'Leads' },
      { id: 'crm_deals', name: 'Deals' },
      { id: 'crm_activities', name: 'Activities' }
    ]
  },
  {
    name: 'HR',
    pages: [
      { id: 'hr_employees', name: 'Employees' },
      { id: 'hr_attendance', name: 'Attendance' },
      { id: 'hr_payroll', name: 'Payroll' }
    ]
  },
  {
    name: 'Reports',
    pages: [
      { id: 'reports_sales', name: 'Sales Reports' },
      { id: 'reports_financial', name: 'Financial Reports' },
      { id: 'reports_inventory', name: 'Inventory Reports' }
    ]
  },
  {
    name: 'Settings',
    pages: [
      { id: 'settings_business', name: 'Business Settings' },
      { id: 'settings_users', name: 'User Management' }
    ]
  }
];

// Flatten all page IDs for convenience
const ALL_PAGE_IDS = PAGE_CATEGORIES.flatMap(category => 
  category.pages.map(page => page.id)
);

const UserPagePrivileges = () => {
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const isMounted = useRef(true);
  
  // State for managing employees and page privileges
  const [employees, setEmployees] = useState([]);
  const [hrEmployees, setHrEmployees] = useState([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedPages, setSelectedPages] = useState([]);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Check if user has owner permissions
  const isOwner = useCallback(() => {
    if (!user || !user.attributes) return false;
    return user.attributes['custom:userrole']?.toLowerCase() === 'owner';
  }, [user]);
  
  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const data = await employeeApi.getAll();
        
        if (isMounted.current) {
          setEmployees(data || []);
          setError(null);
        }
      } catch (err) {
        logger.error('[UserPagePrivileges] Error fetching employees:', err);
        if (isMounted.current) {
          setError('Failed to load employees');
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };
    
    fetchEmployees();
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Fetch existing page privileges when employee is selected
  useEffect(() => {
    const fetchEmployeePrivileges = async () => {
      if (!selectedEmployee) return;
      
      try {
        setLoading(true);
        const response = await api.get(`/users/api/page-privileges/?user_id=${selectedEmployee.user_id}`);
        
        if (isMounted.current && response.data && response.data.length > 0) {
          setSelectedPages(response.data[0].page_access || []);
          setCanManageUsers(response.data[0].can_manage_users || false);
        } else {
          // If no privileges exist yet, set to empty array
          setSelectedPages([]);
          setCanManageUsers(false);
        }
      } catch (err) {
        logger.error('[UserPagePrivileges] Error fetching page privileges:', err);
        // If privileges don't exist yet, that's fine - just use empty array
        setSelectedPages([]);
        setCanManageUsers(false);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };
    
    fetchEmployeePrivileges();
  }, [selectedEmployee]);
  
  // Handle employee selection
  const handleEmployeeChange = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    setSelectedEmployee(employee || null);
  };
  
  // Handle page selection toggle
  const handlePageToggle = (pageId) => {
    // Find the category this page belongs to
    const category = PAGE_CATEGORIES.find(cat => 
      cat.pages.some(page => page.id === pageId)
    );
    
    if (!category) return;
    
    // Get all page IDs in this category
    const categoryPageIds = category.pages.map(page => page.id);
    
    // Remove any pages from this category that are already selected
    const filteredPages = selectedPages.filter(id => !categoryPageIds.includes(id));
    
    // Add the new page
    setSelectedPages([...filteredPages, pageId]);
  };
  
  // Handle category selection toggle (select/deselect all pages in a category)
  const handleCategoryToggle = (categoryPages) => {
    const pageIds = categoryPages.map(page => page.id);
    const allSelected = pageIds.every(pageId => selectedPages.includes(pageId));
    
    if (allSelected) {
      // If all pages in the category are selected, deselect them
      setSelectedPages(prevPages => prevPages.filter(pageId => !pageIds.includes(pageId)));
    } else {
      // If not all pages are selected, select all pages in the category
      setSelectedPages(prevPages => {
        // Remove any pages from this category that might already be selected
        const filtered = prevPages.filter(pageId => !pageIds.includes(pageId));
        // Add all pages from this category
        return [...filtered, ...pageIds];
      });
    }
  };
  
  // Handle form submission to save page privileges
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isOwner()) {
      notifyError('Only owners can set page privileges');
      return;
    }
    
    if (!selectedEmployee) {
      notifyError('Please select an employee');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Save page privileges
      await api.post('/users/api/page-privileges/set_privileges/', {
        user_id: selectedEmployee.user_id,
        page_access: selectedPages,
        can_manage_users: canManageUsers
      });
      
      notifySuccess('Page access privileges saved successfully');
    } catch (error) {
      logger.error('[UserPagePrivileges] Error saving page privileges:', error);
      notifyError(error.message || 'Failed to save page privileges');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Select/deselect all pages
  const handleSelectAll = () => {
    setSelectedPages(ALL_PAGE_IDS);
  };
  
  const handleDeselectAll = () => {
    setSelectedPages([]);
  };
  
  // Check if all pages in a category are selected
  const isCategorySelected = (categoryPages) => {
    const pageIds = categoryPages.map(page => page.id);
    return pageIds.every(pageId => selectedPages.includes(pageId));
  };
  
  // Check if some pages in a category are selected
  const isCategoryPartiallySelected = (categoryPages) => {
    const pageIds = categoryPages.map(page => page.id);
    return pageIds.some(pageId => selectedPages.includes(pageId)) && 
           !pageIds.every(pageId => selectedPages.includes(pageId));
  };
  
  // Render loading state
  if (loading && !selectedEmployee) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">User Page Access</h3>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">User Page Access</h3>
      
      {!isOwner() ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-yellow-700">Only business owners can manage page access privileges.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Employee Selection */}
          <div className="mb-6">
            <label htmlFor="employee-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Employee
            </label>
            <select
              id="employee-select"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              onChange={(e) => handleEmployeeChange(e.target.value)}
              value={selectedEmployee?.id || ''}
            >
              <option value="">-- Select an employee --</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name} ({employee.email})
                </option>
              ))}
            </select>
          </div>
          
          {/* Page Access Selection */}
          {selectedEmployee && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-gray-700">Select Page Access</h4>
                <div className="space-x-2">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800"
                    onClick={handleSelectAll}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800"
                    onClick={handleDeselectAll}
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              
              {/* User Management Permission */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={canManageUsers}
                    onChange={() => setCanManageUsers(!canManageUsers)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Allow this user to manage other users
                  </span>
                </label>
              </div>
              
              {/* Page Categories */}
              <div className="space-y-6 mb-6">
                {PAGE_CATEGORIES.map(category => (
                  <div key={category.name} className="border border-gray-200 rounded-md p-4">
                    <div className="flex items-center mb-3">
                      <button
                        type="button"
                        onClick={() => handleCategoryToggle(category.pages)}
                        className="flex items-center text-gray-800 hover:text-blue-600 font-medium"
                      >
                        {/* Category checkbox - checked, indeterminate, or unchecked */}
                        <div className="relative w-5 h-5 mr-2">
                          <input
                            type="checkbox"
                            checked={isCategorySelected(category.pages)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            onChange={() => handleCategoryToggle(category.pages)}
                            ref={el => {
                              if (el) {
                                el.indeterminate = isCategoryPartiallySelected(category.pages);
                              }
                            }}
                          />
                        </div>
                        <span className="text-md">{category.name}</span>
                      </button>
                    </div>
                    
                    <div className="ml-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {category.pages.map(page => (
                        <div key={page.id} className="flex items-center">
                          <input
                            type="radio"
                            id={`page-${page.id}`}
                            name={`category-${category.name}`}
                            checked={selectedPages.includes(page.id)}
                            onChange={() => handlePageToggle(page.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <label htmlFor={`page-${page.id}`} className="ml-2 block text-sm text-gray-700">
                            {page.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={submitting}
                  color="primary"
                  className={`${submitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Page Access'
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
};

export default UserPagePrivileges; 