'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, TextField } from '@/components/ui/TailwindComponents';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { extractTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { employeeApi } from '@/utils/apiClient';
import api from '@/utils/api';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

const UserMenuPrivileges = () => {
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const isMounted = useRef(true);
  
  // State for managing employees and menu privileges
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedMenuItems, setSelectedMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Check if user has owner permissions
  const isOwner = useCallback(() => {
    if (!user || !user.attributes) return false;
    return user.attributes['custom:userrole'] === 'owner';
  }, [user]);
  
  // Define menu items from the listItems.js file
  const definedMenuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: 'dashboard' },
    { id: 'sales', name: 'Sales', icon: 'sales' },
    { id: 'contacts', name: 'Contacts', icon: 'contacts' },
    { id: 'inventory', name: 'Inventory', icon: 'inventory' },
    { id: 'shipping', name: 'Shipping', icon: 'shipping' },
    { id: 'payments', name: 'Payments', icon: 'payments' },
    { id: 'bank', name: 'Banking', icon: 'bank' },
    { id: 'reports', name: 'Reports', icon: 'reports' },
    { id: 'analytics', name: 'Analytics', icon: 'analytics' },
    { id: 'purchases', name: 'Purchases', icon: 'cart' },
    { id: 'hr', name: 'HR', icon: 'people' },
    { id: 'payroll', name: 'Payroll', icon: 'wallet' },
    { id: 'taxes', name: 'Taxes', icon: 'receipt' },
    { id: 'transport', name: 'Transport', icon: 'shipping' },
    { id: 'crm', name: 'CRM', icon: 'contacts' },
    { id: 'accounting', name: 'Accounting', icon: 'bank' }
  ];
  
  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const data = await employeeApi.getAll();
        
        if (isMounted.current) {
          setEmployees(data || []);
          setMenuItems(definedMenuItems);
          setError(null);
        }
      } catch (err) {
        logger.error('[UserMenuPrivileges] Error fetching employees:', err);
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
  
  // Fetch existing menu privileges when employee is selected
  useEffect(() => {
    const fetchEmployeePrivileges = async () => {
      if (!selectedEmployee) return;
      
      try {
        setLoading(true);
        const response = await api.get(`/users/api/menu-privileges/?user_id=${selectedEmployee.user_id}`);
        
        if (isMounted.current && response.data && response.data.length > 0) {
          setSelectedMenuItems(response.data[0].menu_items || []);
        } else {
          // If no privileges exist yet, set to empty array
          setSelectedMenuItems([]);
        }
      } catch (err) {
        logger.error('[UserMenuPrivileges] Error fetching menu privileges:', err);
        // If privileges don't exist yet, that's fine - just use empty array
        setSelectedMenuItems([]);
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
  
  // Handle menu item selection toggle
  const handleMenuItemToggle = (menuItemId) => {
    setSelectedMenuItems(prevItems => {
      if (prevItems.includes(menuItemId)) {
        return prevItems.filter(item => item !== menuItemId);
      } else {
        return [...prevItems, menuItemId];
      }
    });
  };
  
  // Handle form submission to save menu privileges
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isOwner()) {
      notifyError('Only owners can set menu privileges');
      return;
    }
    
    if (!selectedEmployee) {
      notifyError('Please select an employee');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Save menu privileges
      await api.post('/users/api/menu-privileges/set_privileges/', {
        user_id: selectedEmployee.user_id,
        menu_items: selectedMenuItems
      });
      
      // Store in app cache for immediate access
      const key = `user_menu_privileges_${selectedEmployee.user_id}`;
      setCacheValue(key, selectedMenuItems);
      
      notifySuccess('Menu privileges saved successfully');
    } catch (error) {
      logger.error('[UserMenuPrivileges] Error saving menu privileges:', error);
      notifyError(error.message || 'Failed to save menu privileges');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Select/deselect all menu items
  const handleSelectAll = () => {
    setSelectedMenuItems(menuItems.map(item => item.id));
  };
  
  const handleDeselectAll = () => {
    setSelectedMenuItems([]);
  };
  
  // Render loading state
  if (loading && !selectedEmployee) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">User Menu Privileges</h3>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">User Menu Privileges</h3>
      {!isOwner() ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-yellow-700">Only business owners can manage menu privileges.</p>
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
          
          {/* Menu Items Selection */}
          {selectedEmployee && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-gray-700">Select Menu Items</h4>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {menuItems.map(item => (
                  <div key={item.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`menu-item-${item.id}`}
                      checked={selectedMenuItems.includes(item.id)}
                      onChange={() => handleMenuItemToggle(item.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`menu-item-${item.id}`} className="ml-2 block text-sm text-gray-700">
                      {item.name}
                    </label>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : 'Save Privileges'}
                </Button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
};

export default UserMenuPrivileges; 