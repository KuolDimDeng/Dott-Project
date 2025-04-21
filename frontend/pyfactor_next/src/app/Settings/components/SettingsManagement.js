'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, TextField } from '@/components/ui/TailwindComponents';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { extractTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { employeeApi } from '@/utils/apiClient';
import api from '@/utils/api';

const SettingsManagement = () => {
  console.log('[SettingsManagement] Component rendering');
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const isMounted = useRef(true);
  
  // State for managing user list and form
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New state for settings navigation
  const [activeSection, setActiveSection] = useState('userManagement');
  
  // New user form state
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'EMPLOYEE'
  });
  
  // Check if user has owner permissions
  const isOwner = useCallback(() => {
    if (!user || !user.attributes) return false;
    return user.attributes['custom:userrole'] === 'OWNER';
  }, [user]);
  
  // Fetch employees (potential users)
  const fetchEmployees = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      const data = await employeeApi.getAll();
      
      if (isMounted.current) {
        setEmployees(data || []);
        setError(null);
      }
    } catch (err) {
      logger.error('[SettingsManagement] Error fetching employees:', err);
      if (isMounted.current) {
        setError('Failed to load employees');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);
  
  // Fetch employees on mount
  useEffect(() => {
    fetchEmployees();
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchEmployees]);
  
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
      
      const tenantId = extractTenantId();
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
        role: 'EMPLOYEE'
      });
      setShowAddUserForm(false);
      
      // Refresh employee list
      fetchEmployees();
      
    } catch (error) {
      logger.error('[SettingsManagement] Error adding user:', error);
      notifyError(error.message || 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  }, [newUser, isOwner, notifyError, notifySuccess, fetchEmployees]);
  
  // Handle adding an existing employee as a user
  const handleAddExistingEmployee = useCallback(async (employee) => {
    if (!isOwner()) {
      notifyError('Only owners can add users');
      return;
    }
    
    if (!employee || !employee.email) {
      notifyError('Invalid employee data');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Send invitation to the selected employee
      await api.post('/api/hr/employees/invite', {
        email: employee.email,
        firstName: employee.first_name,
        lastName: employee.last_name,
        role: 'EMPLOYEE',
        companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Your Company Name'
      });
      
      notifySuccess(`Invitation sent to ${employee.email}`);
      setSelectedUser(null);
      
    } catch (error) {
      logger.error('[SettingsManagement] Error adding existing employee as user:', error);
      notifyError(error.message || 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  }, [isOwner, notifyError, notifySuccess]);

  // Settings navigation items
  const navigationItems = [
    { id: 'userManagement', label: 'User Management', icon: 'users' },
    { id: 'companyProfile', label: 'Company Profile', icon: 'building' },
    { id: 'payment', label: 'Payment', icon: 'credit-card' },
    { id: 'securityCompliance', label: 'Security & Compliance', icon: 'shield' },
    { id: 'payrollConfig', label: 'Payroll Configuration', icon: 'cash' },
    { id: 'integrationSettings', label: 'Integration Settings', icon: 'puzzle' },
    { id: 'regionalSettings', label: 'Regional Settings', icon: 'globe' },
  ];

  // Render icon based on icon name
  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'users':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
          </svg>
        );
      case 'building':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
        );
      case 'credit-card':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
          </svg>
        );
      case 'shield':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
        );
      case 'cash':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
        );
      case 'puzzle':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"></path>
          </svg>
        );
      case 'globe':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        );
    }
  };

  // Render placeholder section
  const renderPlaceholderSection = (title, description) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-3">{title}</h3>
      <p className="text-gray-600 mb-5">{description}</p>
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-6 flex items-center justify-center h-40">
        <p className="text-gray-500">This section is under development</p>
      </div>
    </div>
  );

  // Render the User Management section
  const renderUserManagement = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 sm:mb-0">User Management</h2>
        
        {isOwner() && (
          <div className="flex space-x-3">
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => setShowAddUserForm(true)}
              disabled={isSubmitting}
            >
              Add New User
            </Button>
          </div>
        )}
      </div>
      
      {!isOwner() && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-yellow-700">
            Only users with owner privileges can manage users.
          </p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {/* Add User Form */}
      {showAddUserForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-medium text-gray-800">Add User</h3>
            <button 
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setShowAddUserForm(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleAddUser}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <TextField
                label="Email"
                type="email"
                name="email"
                value={newUser.email}
                onChange={handleInputChange}
                required
                fullWidth
              />
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  name="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              
              <TextField
                label="First Name"
                name="firstName"
                value={newUser.firstName}
                onChange={handleInputChange}
                fullWidth
              />
              
              <TextField
                label="Last Name"
                name="lastName"
                value={newUser.lastName}
                onChange={handleInputChange}
                fullWidth
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outlined"
                onClick={() => setShowAddUserForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        </div>
      )}
      
      {/* Employee List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Users & Employees</h3>
          <p className="text-sm text-gray-500">
            Employees listed below can be invited to use the application.
          </p>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-sm text-gray-500">Loading employees...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">No employees found. Add employees from the HR section first.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-800 font-medium">
                            {employee.first_name?.[0]}{employee.last_name?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.first_name} {employee.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {employee.job_title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        employee.role === 'ADMIN' 
                          ? 'bg-purple-100 text-purple-800' 
                          : employee.role === 'OWNER' 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {employee.role || 'Employee'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isOwner() && (
                        <button
                          onClick={() => handleAddExistingEmployee(employee)}
                          className="text-blue-600 hover:text-blue-900"
                          disabled={isSubmitting}
                        >
                          Send Invitation
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  // Render the active section content
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'userManagement':
        return renderUserManagement();
      case 'companyProfile':
        return renderPlaceholderSection('Company Profile', 'Manage your company information, logos, and business details.');
      case 'payment':
        return renderPlaceholderSection('Payment Settings', 'Configure payment methods, billing cycles, and subscription details.');
      case 'securityCompliance':
        return renderPlaceholderSection('Security & Compliance', 'Configure security settings, compliance requirements, and data protection measures.');
      case 'payrollConfig':
        return renderPlaceholderSection('Payroll Configuration', 'Set up payment schedules, tax withholdings, and employee compensation details.');
      case 'integrationSettings':
        return renderPlaceholderSection('Integration Settings', 'Connect your system with third-party services, APIs, and external platforms.');
      case 'regionalSettings':
        return renderPlaceholderSection('Regional Settings', 'Configure language, time zone, currency, and other locale-specific settings.');
      default:
        return renderUserManagement();
    }
  };

  return (
    <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-6">
      {/* Settings Navigation Sidebar */}
      <div className="w-full md:w-64 bg-white rounded-lg shadow-md overflow-hidden flex-shrink-0">
        <div className="px-4 py-5 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Settings</h3>
        </div>
        <nav className="p-2">
          <ul className="space-y-1">
            {navigationItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">{renderIcon(item.icon)}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow">
        {renderActiveSection()}
      </div>
    </div>
  );
};

export default SettingsManagement; 