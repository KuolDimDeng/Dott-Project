'use client';
import React, { useState, useEffect, useCallback, memo, Fragment, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { axiosInstance, backendHrApiInstance, resetCircuitBreakers } from '@/lib/axiosConfig';
import { countries } from 'countries-list';
import { format, parseISO } from 'date-fns';
import EmployeePermissions from './EmployeePermissions';
import { refreshUserSession, ensureAuthProvider } from '@/utils/refreshUserSession';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useTable, usePagination, useSortBy } from 'react-table';
import { extractTenantId, getSecureTenantId } from '@/utils/tenantUtils';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
// Import the API utilities
import api from '@/utils/api';
import { logger } from '@/utils/logger';
import { employeeApi } from '@/utils/apiClient';
import { invalidateCache } from '@/utils/apiHelpers';
import { verifyBackendConnection } from '@/lib/axiosConfig';
import BackendConnectionCheck from '../BackendConnectionCheck';

// UI Components - similar to ProductManagement.js
const Typography = ({ variant, component, className, color, children, gutterBottom, ...props }) => {
  let baseClasses = '';
  
  // Handle variants
  if (variant === 'h4' || (component === 'h1' && !variant)) {
    baseClasses = 'text-2xl font-bold';
  } else if (variant === 'h5') {
    baseClasses = 'text-xl font-semibold';
  } else if (variant === 'h6') {
    baseClasses = 'text-lg font-medium';
  } else if (variant === 'subtitle1' || variant === 'subtitle2') {
    baseClasses = 'text-sm font-medium';
  } else if (variant === 'body1') {
    baseClasses = 'text-base';
  } else if (variant === 'body2') {
    baseClasses = 'text-sm';
  }
  
  // Handle colors
  if (color === 'textSecondary') {
    baseClasses += ' text-gray-500';
  } else if (color === 'primary') {
    baseClasses += ' text-blue-600';
  } else if (color === 'error') {
    baseClasses += ' text-red-600';
  }
  
  // Handle gutterBottom
  if (gutterBottom) {
    baseClasses += ' mb-2';
  }
  
  const Tag = component || 'p';
  
  return (
    <Tag className={`${baseClasses} ${className || ''}`} {...props}>
      {children}
    </Tag>
  );
};

const Alert = ({ severity, className, children }) => {
  let bgColor = 'bg-blue-50';
  let borderColor = 'border-blue-400';
  let textColor = 'text-blue-800';
  
  if (severity === 'error') {
    bgColor = 'bg-red-50';
    borderColor = 'border-red-400';
    textColor = 'text-red-800';
  } else if (severity === 'warning') {
    bgColor = 'bg-yellow-50';
    borderColor = 'border-yellow-400';
    textColor = 'text-yellow-800';
  } else if (severity === 'success') {
    bgColor = 'bg-green-50';
    borderColor = 'border-green-400';
    textColor = 'text-green-800';
  } else if (severity === 'info') {
    bgColor = 'bg-blue-50';
    borderColor = 'border-blue-400';
    textColor = 'text-blue-800';
  }
  
  return (
    <div className={`p-4 mb-4 ${bgColor} border-l-4 ${borderColor} ${textColor} ${className || ''}`}>
      {children}
    </div>
  );
};

const Paper = ({ elevation, className, children }) => {
  const shadowClass = elevation === 3 ? 'shadow-md' : 'shadow-sm';
  
  return (
    <div className={`bg-white rounded-lg ${shadowClass} ${className || ''}`}>
      {children}
    </div>
  );
};

const Button = ({ variant, color, size, onClick, disabled, type, className, startIcon, children }) => {
  let baseClasses = 'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size classes
  if (size === 'small') {
    baseClasses += ' px-2.5 py-1.5 text-xs';
  } else if (size === 'large') {
    baseClasses += ' px-6 py-3 text-base';
  } else {
    baseClasses += ' px-4 py-2 text-sm'; // Medium (default)
  }
  
  // Variant and color classes
  if (variant === 'contained') {
    if (color === 'primary') {
      baseClasses += ' bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
    } else if (color === 'secondary') {
      baseClasses += ' bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500';
    } else if (color === 'error') {
      baseClasses += ' bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
    } else if (color === 'info') {
      baseClasses += ' bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500';
    } else {
      baseClasses += ' bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500';
    }
  } else if (variant === 'outlined') {
    if (color === 'primary') {
      baseClasses += ' border border-blue-500 text-blue-700 hover:bg-blue-50 focus:ring-blue-500';
    } else if (color === 'secondary') {
      baseClasses += ' border border-purple-500 text-purple-700 hover:bg-purple-50 focus:ring-purple-500';
    } else if (color === 'error') {
      baseClasses += ' border border-red-500 text-red-700 hover:bg-red-50 focus:ring-red-500';
    } else if (color === 'info') {
      baseClasses += ' border border-sky-500 text-sky-700 hover:bg-sky-50 focus:ring-sky-500';
    } else {
      baseClasses += ' border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500';
    }
  } else {
    // Text variant
    if (color === 'primary') {
      baseClasses += ' text-blue-700 hover:bg-blue-50 focus:ring-blue-500';
    } else if (color === 'secondary') {
      baseClasses += ' text-purple-700 hover:bg-purple-50 focus:ring-purple-500';
    } else if (color === 'error') {
      baseClasses += ' text-red-700 hover:bg-red-50 focus:ring-red-500';
    } else {
      baseClasses += ' text-gray-700 hover:bg-gray-50 focus:ring-gray-500';
    }
  }
  
  // Disabled state
  if (disabled) {
    baseClasses = baseClasses.replace(/hover:[^ ]*/g, '');
    baseClasses += ' opacity-50 cursor-not-allowed';
  }
  
  return (
    <button
      type={type || 'button'}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${baseClasses} ${className || ''}`}
    >
      {startIcon && <span className="mr-2">{startIcon}</span>}
      {children}
    </button>
  );
};

const TextField = ({ label, fullWidth, multiline, rows, value, onChange, required, placeholder, name, type, inputProps, variant, className, onClick, autoComplete }) => {
  const width = fullWidth ? 'w-full' : '';
  
  return (
    <div className={`mb-4 ${width} ${className || ''}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
      {multiline ? (
        <textarea
          name={name}
          value={value || ''}
          onChange={onChange}
          onClick={onClick}
          placeholder={placeholder}
          rows={rows || 3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      ) : (
          <input
          type={type || 'text'}
          name={name}
          value={value || ''}
          onChange={onChange}
          onClick={onClick}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          {...inputProps}
        />
      )}
    </div>
  );
};

const CircularProgress = ({ size, color, className }) => {
  const sizeClass = size === 'small' ? 'h-4 w-4' : 'h-6 w-6';
  const colorClass = color === 'inherit' ? 'text-current' : 'text-blue-600';
  
  return (
    <svg className={`animate-spin ${sizeClass} ${colorClass} ${className || ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
};

const DialogTitle = ({ className, children }) => {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className || ''}`}>
      <h3 className="text-lg font-medium text-gray-900">{children}</h3>
    </div>
  );
};

const DialogContent = ({ className, children }) => {
  return (
    <div className={`px-6 py-4 ${className || ''}`}>
      {children}
    </div>
  );
};

const DialogActions = ({ className, children }) => {
  return (
    <div className={`px-6 py-4 border-t border-gray-200 flex justify-end space-x-2 ${className || ''}`}>
      {children}
    </div>
  );
};

const ModernFormLayout = ({ children, title, subtitle, onSubmit, isLoading, submitLabel }) => {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600">
        <h2 className="text-xl font-semibold text-white mb-1">{title}</h2>
        {subtitle && <p className="text-blue-100 text-sm">{subtitle}</p>}
      </div>
      
      <div className="p-6">
        {children}
      </div>
      
      <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-2">
        <Button 
          variant="outlined" 
          color="primary"
          type="button"
          className="w-24"
          onClick={() => window.history.back()}
        >
          Cancel
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          type="submit"
          className="w-24"
          disabled={isLoading}
        >
          {isLoading ? (
            <CircularProgress size="small" color="inherit" className="mr-2" />
          ) : null}
          {submitLabel || 'Save'}
        </Button>
      </div>
    </form>
  );
};

// Employee form component with validation
const EmployeeFormComponent = ({ isEdit = false, onSubmit, newEmployee, handleInputChange, isLoading, setNewEmployee, setShowAddForm, setShowEditForm, employees = [] }) => {
    // Ensure we have a clean way to close the form
    const handleCancel = () => {
      if (isEdit && setShowEditForm) {
        setShowEditForm(false);
      } else if (setShowAddForm) {
        setEmployeeTab('list');
      }
      logger.debug('[EmployeeManagement] Form canceled:', isEdit ? 'edit' : 'add');
    };
  return (
    <ModernFormLayout 
      title={isEdit ? "Edit Employee" : "Add New Employee"}
      subtitle={isEdit ? "Update employee information" : "Add a new employee to your organization"}
      onSubmit={onSubmit}
      onCancel={handleCancel}
      isSubmitting={isLoading}
      submitLabel={isEdit ? "Update Employee" : "Add Employee"}
    >
      {!isEdit && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            <span className="font-medium">Note:</span> User invitation functionality has been moved to the User Management section in Settings.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <TextField
          label="First Name"
            name="first_name"
            value={newEmployee.first_name}
            onChange={handleInputChange}
            required
          fullWidth
        />
        
        <TextField
          label="Date Joined"
          type="date"
          name="date_joined"
          value={newEmployee.date_joined || new Date().toISOString().split('T')[0]}
          onChange={handleInputChange}
          required
          fullWidth
        />
        
        <TextField
          label="Middle Name"
            name="middle_name"
            value={newEmployee.middle_name}
            onChange={handleInputChange}
          fullWidth
        />
        
        <TextField
          label="Last Name"
            name="last_name"
            value={newEmployee.last_name}
            onChange={handleInputChange}
            required
          fullWidth
          />
        
        <TextField
          label="Date of Birth"
          type="date"
          name="dob"
          value={newEmployee.dob}
          onChange={handleInputChange}
          required
          fullWidth
        />
        
        
        
        <TextField
          label="Email"
            type="email"
            name="email"
            value={newEmployee.email}
            onChange={handleInputChange}
            required
          fullWidth
          />
        
        <TextField
          label="Phone Number"
            type="tel"
            name="phone_number"
            value={newEmployee.phone_number}
            onChange={handleInputChange}
          fullWidth
        />
        
        <TextField
          label="Job Title"
            name="job_title"
            value={newEmployee.job_title}
            onChange={handleInputChange}
            required
          fullWidth
        />
        
        <TextField
          label="Department"
            name="department"
            value={newEmployee.department}
            onChange={handleInputChange}
          fullWidth
          />
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Compensation Type</label>
          <select
            name="compensation_type"
            value={newEmployee.compensation_type}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="SALARY">Salary (Yearly)</option>
            <option value="WAGE">Wage (Hourly)</option>
          </select>
        </div>
        
        {newEmployee.compensation_type === 'SALARY' ? (
          <TextField
            label="Annual Salary"
            type="number"
            name="salary"
            value={newEmployee.salary}
            onChange={handleInputChange}
            fullWidth
            inputProps={{ min: "0", step: "0.01" }}
          />
        ) : (
          <TextField
            label="Hourly Wage"
            type="number"
            name="wage_per_hour"
            value={newEmployee.wage_per_hour}
            onChange={handleInputChange}
            fullWidth
            inputProps={{ min: "0", step: "0.01" }}
          />
        )}
        
        
        
        
        
        
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
          <select
            name="employment_type"
            value={newEmployee.employment_type}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="FT">Full-time</option>
            <option value="PT">Part-time</option>
          </select>
        </div>
      </div>
      
      {newEmployee.compensation_type === 'WAGE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <TextField
            label="Hours Per Day"
            type="number"
            name="hours_per_day"
            value={newEmployee.hours_per_day}
            onChange={handleInputChange}
            fullWidth
            inputProps={{ min: "0", max: "24", step: "0.5" }}
          />
          
          <TextField
            label="Days Per Week"
            type="number"
            name="days_per_week"
            value={newEmployee.days_per_week}
            onChange={handleInputChange}
            fullWidth
            inputProps={{ min: "1", max: "7", step: "1" }}
          />
          
          <TextField
            label="Overtime Rate"
            type="number"
            name="overtime_rate"
            value={newEmployee.overtime_rate}
            onChange={handleInputChange}
            fullWidth
            inputProps={{ min: "0", step: "0.01" }}
          />
      </div>
      )}
    
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="ID_verified"
              checked={newEmployee.ID_verified}
              onChange={(e) => handleInputChange({ target: { name: 'ID_verified', value: e.target.checked } })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              ID Verified
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              name="areManager"
              checked={newEmployee.areManager}
              onChange={(e) => handleInputChange({ target: { name: 'areManager', value: e.target.checked } })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Is Manager
            </label>
          </div>
          
          {newEmployee.areManager && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supervising Employees
              </label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
                {employees
                  .filter(emp => emp.id !== newEmployee.id)
                  .map(emp => (
                    <div key={emp.id} className="flex items-center">
                      <input
                        type="radio"
                        name="supervising"
                        id={`supervising-${emp.id}`}
                        value={emp.id}
                        checked={newEmployee.supervising === emp.id}
                        onChange={(e) => {
                          handleInputChange({ 
                            target: { 
                              name: 'supervising', 
                              value: e.target.checked ? emp.id : null 
                            } 
                          });
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label 
                        htmlFor={`supervising-${emp.id}`}
                        className="ml-2 block text-sm text-gray-700"
                      >
                        {emp.first_name} {emp.last_name}
                      </label>
                    </div>
                  ))}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Select one employee to supervise
              </p>
            </div>
          )}
        </div>
    </ModernFormLayout>
  );
};

// Memoize the form component to prevent unnecessary re-renders
const EmployeeForm = memo(EmployeeFormComponent);

/**
 * Employee Management Component
 * Handles CRUD operations for employees
 */
const EmployeeManagement = () => {

  // Function to handle login redirection on session expiration
  const redirectToLogin = () => {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `/login?expired=true&redirect=${encodeURIComponent(currentPath)}`;
  };

  // Function to manually refresh the user session
  const refreshSession = async () => {
    try {
      setLoading(true);
      logger.info('[EmployeeManagement] Attempting to refresh user session manually');
      
      // Ensure auth provider is set
      ensureAuthProvider();
      
      // Try multiple approaches to refresh the session
      
      // 1. First try the standard refresh mechanism
      let refreshed = await refreshUserSession();
      
      // 2. If that fails, try to get current user as a fallback
      if (!refreshed) {
        try {
          const { getCurrentUser, fetchAuthSession } = await import('aws-amplify/auth');
          const currentUser = await getCurrentUser();
          if (currentUser) {
            // Get a fresh auth session
            const session = await fetchAuthSession({ forceRefresh: true });
            if (session?.tokens) {
              logger.info('[EmployeeManagement] Successfully refreshed session via fetchAuthSession');
              refreshed = true;
              
              // Store tokens in app cache for other components to access
              if (typeof window !== 'undefined' && window.__APP_CACHE) {
                window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
                window.__APP_CACHE.auth.token = session.tokens.idToken?.toString();
                window.__APP_CACHE.auth.provider = 'cognito';
              }
            }
          }
        } catch (getUserError) {
          logger.error('[EmployeeManagement] Error in getCurrentUser fallback:', getUserError);
        }
      }
      
      if (refreshed) {
        setError(null);
        toast.success('Session refreshed successfully');
        fetchEmployees(); // Retry fetching data
      } else {
        setError('Failed to refresh session. Please log in again.');
        // Redirect to login after a short delay
        setTimeout(() => {
          redirectToLogin();
        }, 2000);
      }
    } catch (error) {
      logger.error('[EmployeeManagement] Error refreshing session:', error);
      setError('Failed to refresh session. Please log in again.');
      // Redirect to login after a short delay
      setTimeout(() => {
        redirectToLogin();
      }, 2000);
    } finally {
      setLoading(false);
    }
  };
  const router = useRouter();
  const notifySuccess = (message) => toast.success(message);
  const notifyError = (message) => toast.error(message);
  const notifyInfo = (message) => toast.loading(message);
  const notifyWarning = (message) => toast.error(message, { icon: '⚠️' });
  
  // Add isMounted ref to track component mounting status
  const isMounted = useRef(true);
  // Add refs for tracking network requests and timeouts
  const fetchRequestRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  
  // Effect to track component mount status
  useEffect(() => {
    // Set to true on mount (though it's already initialized as true)
    isMounted.current = true;
    // Cleanup function sets to false when component unmounts
    
  return () => {
      isMounted.current = false;
    };
  }, []);
  
  // State for managing component behavior
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainTab, setMainTab] = useState('personal'); // 'personal', 'add-employee', or 'list-employees'
  const [employeeTab, setEmployeeTab] = useState('list'); // 'list' or 'add' for employee tabs - kept for backward compatibility
  const [activeSection, setActiveSection] = useState('employee-management'); // 'employee-management' or 'personal' // 'employee-management' or 'personal'
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchError, setFetchError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitError, setSubmitError] = useState(null); // Add missing submitError state
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Assume authenticated initially
  
  // Add state to track if we should show the connection checker
  const [showConnectionChecker, setShowConnectionChecker] = useState(false);
  
  
  // Add state for edit form visibility
  const [showEditForm, setShowEditForm] = useState(false);

  // Add state for selected employee
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Add state for add form visibility
  const [showAddForm, setShowAddForm] = useState(false);

  // Add state for editing mode
  const [isEditing, setIsEditing] = useState(false);
// Initialize tenantId from AppCache
  const getTenantId = () => {
    try {
      return typeof window !== 'undefined' ? 
        getCacheValue('tenantId') || getCacheValue('businessid') || 'default' :
        'default';
    } catch (e) {
      console.error('Error accessing AppCache for tenantId:', e);
      return 'default';
    }
  };
  
  const [tenantId, setTenantId] = useState(getTenantId());

  // Define the initial state for a new employee
  const initialEmployeeState = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US',
    role: 'employee',
    department: '',
    job_title: '',
    hire_date: new Date().toISOString().split('T')[0],
    date_joined: new Date().toISOString().split('T')[0],
    dob: new Date().toISOString().split('T')[0],
    salary: '',
    employment_status: 'ACTIVE',
    employee_type: 'FULL_TIME',
    security_number_type: 'SSN',
    security_number: '',
    invite_to_onboard: false,
    ID_verified: false,
    areManager: false,
    supervising: []
  };

  // Use the initialEmployeeState for the newEmployee state
  const [newEmployee, setNewEmployee] = useState(initialEmployeeState);

  const countryList = Object.entries(countries).map(([code, country]) => ({
    code,
    name: country.name,
  }));

  const getSecurityNumberType = (countryCode) => {
    switch (countryCode) {
      case 'US':
        return 'SSN';
      case 'UK':
      case 'GB':
        return 'NIN';
      case 'CA':
        return 'SIN';
      case 'AU':
        return 'TFN';
      case 'NZ':
        return 'IRD';
      default:
        return 'Tax ID';
    }
  };

  // Normalize employee data to ensure all required fields exist
  const normalizeEmployeeData = (employees) => {
    // Validate that employees is an array
    if (!employees || !Array.isArray(employees)) {
      logger.warn('[EmployeeManagement] Invalid employees data received:', employees);
      return [];
    }

    logger.debug(`[EmployeeManagement] Normalizing ${employees.length} employees`);
    
    // Log the first few employees for debugging
    if (employees.length > 0) {
      logger.debug('[EmployeeManagement] Sample employee data:', 
        employees.slice(0, Math.min(3, employees.length)).map(e => ({
          id: e.id,
          first_name: e.first_name,
          last_name: e.last_name,
          email: e.email
        }))
      );
    }

    return employees.map(employee => {
      if (!employee || typeof employee !== 'object') {
        logger.warn('[EmployeeManagement] Invalid employee record:', employee);
        return {}; // Return empty object to avoid breaking the UI
      }

      // Create a sanitized copy of the employee object with default values for missing fields
      const sanitizedEmployee = { 
        id: employee.id || '',
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        job_title: '',
        department: '',
        compensation_type: 'SALARY',
        salary: 0,
        wage_per_hour: 0,
        hours_per_day: 8,
        days_per_week: 5,
        overtime_rate: 1.5,
        active: true,
        employment_type: 'FULL_TIME',
        employment_status: 'ACTIVE',
        date_joined: new Date().toISOString().split('T')[0],
        role: 'employee',
        ...employee  // Spread the employee object to override defaults
      };
      
      // Sanitize string fields with type checking
      sanitizedEmployee.first_name = typeof sanitizedEmployee.first_name === 'string' 
        ? sanitizedEmployee.first_name.trim().slice(0, 100) 
        : String(sanitizedEmployee.first_name || '').trim().slice(0, 100);
      
      sanitizedEmployee.middle_name = typeof sanitizedEmployee.middle_name === 'string' 
        ? sanitizedEmployee.middle_name.trim().slice(0, 100) 
        : String(sanitizedEmployee.middle_name || '').trim().slice(0, 100);
      
      sanitizedEmployee.last_name = typeof sanitizedEmployee.last_name === 'string' 
        ? sanitizedEmployee.last_name.trim().slice(0, 100) 
        : String(sanitizedEmployee.last_name || '').trim().slice(0, 100);
      
      // Email validation and sanitization
      sanitizedEmployee.email = typeof sanitizedEmployee.email === 'string' 
        ? sanitizedEmployee.email.trim().toLowerCase().slice(0, 255) 
        : String(sanitizedEmployee.email || '').trim().toLowerCase().slice(0, 255);
      
      // Phone number sanitization (remove non-numeric characters)
      sanitizedEmployee.phone_number = typeof sanitizedEmployee.phone_number === 'string' 
        ? sanitizedEmployee.phone_number.replace(/[^\d+\-() ]/g, '').trim().slice(0, 20) 
        : String(sanitizedEmployee.phone_number || '').replace(/[^\d+\-() ]/g, '').trim().slice(0, 20);
      
      // Job title sanitization
      sanitizedEmployee.job_title = typeof sanitizedEmployee.job_title === 'string' 
        ? sanitizedEmployee.job_title.trim().slice(0, 100) 
        : String(sanitizedEmployee.job_title || '').trim().slice(0, 100);
      
      // Department sanitization
      sanitizedEmployee.department = typeof sanitizedEmployee.department === 'string' 
        ? sanitizedEmployee.department.trim().slice(0, 100) 
        : String(sanitizedEmployee.department || '').trim().slice(0, 100);

      // For backward compatibility, infer compensation type if it doesn't exist
      if (!sanitizedEmployee.compensation_type) {
        // Convert salary to number for comparison
        const salaryValue = parseFloat(sanitizedEmployee.salary || 0);
        sanitizedEmployee.compensation_type = salaryValue > 0 ? 'SALARY' : 'WAGE';
      }
      
      // Set default values for wage-related fields if they don't exist and ensure numeric values
      if (sanitizedEmployee.compensation_type === 'WAGE') {
        // Convert string values to numbers for wage-related fields
        sanitizedEmployee.wage_per_hour = parseFloat(sanitizedEmployee.wage_per_hour || 0);
        sanitizedEmployee.hours_per_day = parseFloat(sanitizedEmployee.hours_per_day || 8);
        sanitizedEmployee.days_per_week = parseFloat(sanitizedEmployee.days_per_week || 5);
        sanitizedEmployee.overtime_rate = parseFloat(sanitizedEmployee.overtime_rate || 1.5);
      } else {
        // Ensure salary has a default value if not present and convert to number
        sanitizedEmployee.salary = parseFloat(sanitizedEmployee.salary || 0);
      }
      
      // Ensure boolean fields are actually booleans
      sanitizedEmployee.active = sanitizedEmployee.active === true || 
                              sanitizedEmployee.active === 'true' || 
                              sanitizedEmployee.active === 1 || 
                              sanitizedEmployee.active === '1';
      
      // Normalize role to uppercase and handle common variations
      if (sanitizedEmployee.role) {
        const role = String(sanitizedEmployee.role).toUpperCase();
        if (['ADMINISTRATOR'].includes(role)) {
          sanitizedEmployee.role = 'owner';
        } else if (['owner', 'OWNR'].includes(role)) {
          sanitizedEmployee.role = 'owner';
        } else {
          sanitizedEmployee.role = 'employee';
        }
      } else {
        sanitizedEmployee.role = 'employee';
      }
      
      // Validate date fields (ensure they're in ISO format)
      if (sanitizedEmployee.date_joined) {
        try {
          // Check if date is valid by attempting to parse it
          const dateCheck = new Date(sanitizedEmployee.date_joined);
          if (isNaN(dateCheck.getTime())) {
            logger.warn('[EmployeeManagement] Invalid date_joined:', sanitizedEmployee.date_joined);
            sanitizedEmployee.date_joined = new Date().toISOString().split('T')[0]; // Default to today
          } else {
            // Format date consistently
            sanitizedEmployee.date_joined = dateCheck.toISOString().split('T')[0];
          }
        } catch (error) {
          logger.warn('[EmployeeManagement] Error parsing date_joined:', error);
          sanitizedEmployee.date_joined = new Date().toISOString().split('T')[0]; // Default to today
        }
      } else {
        sanitizedEmployee.date_joined = new Date().toISOString().split('T')[0];
      }

      // Ensure employment_type is normalized
      if (sanitizedEmployee.employment_type) {
        const empType = String(sanitizedEmployee.employment_type).toUpperCase();
        if (['FT', 'FULL', 'FULL-TIME', 'FULL_TIME', 'FULLTIME'].includes(empType)) {
          sanitizedEmployee.employment_type = 'FULL_TIME';
        } else if (['PT', 'PART', 'PART-TIME', 'PART_TIME', 'PARTTIME'].includes(empType)) {
          sanitizedEmployee.employment_type = 'PART_TIME';
        } else {
          sanitizedEmployee.employment_type = 'FULL_TIME'; // Default
        }
      } else {
        sanitizedEmployee.employment_type = 'FULL_TIME'; // Default
      }
      
      // Log sanitized data for debugging newly created employee
      if (sanitizedEmployee.id === '3659') {
        logger.debug('[EmployeeManagement] Found and processed employee 3659:', {
          id: sanitizedEmployee.id,
          name: `${sanitizedEmployee.first_name} ${sanitizedEmployee.last_name}`,
          email: sanitizedEmployee.email
        });
      }
      
      return sanitizedEmployee;
    });
  };

  const fetchEmployeesData = async (tenantId) => {
    if (!tenantId) {
      logger.error('[EmployeeManagement] Cannot fetch employees: No tenant ID provided');
      setError('No tenant ID available. Please try refreshing the page.');
      setLoading(false);
      return;
    }

    // Check for auth token first
    let authToken = window?.__APP_CACHE?.auth?.token;
    if (!authToken) {
      logger.warn('[EmployeeManagement] No auth token found in APP_CACHE before fetching employees');
      
      // Try to get token directly from Amplify before failing
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const session = await fetchAuthSession();
        
        if (session?.tokens?.idToken) {
          authToken = session.tokens.idToken.toString();
          logger.info('[EmployeeManagement] Successfully retrieved auth token directly from Amplify');
          
          // Store token in APP_CACHE for future use
          if (typeof window !== 'undefined') {
            window.__APP_CACHE = window.__APP_CACHE || {};
            window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
            window.__APP_CACHE.auth.token = authToken;
          }
        } else {
          logger.error('[EmployeeManagement] No token available in Amplify session');
          setError('Authentication required. Please log in to view employees.');
          setLoading(false);
          
          // Try to refresh the session
          const refreshResult = await refreshUserSession();
          if (!refreshResult) {
            logger.error('[EmployeeManagement] Session refresh failed - no token available');
            return;
          }
          // If refresh succeeded, get the token again
          authToken = window?.__APP_CACHE?.auth?.token;
          if (!authToken) {
            logger.error('[EmployeeManagement] Still no token after refresh');
            return;
          }
        }
      } catch (error) {
        logger.error('[EmployeeManagement] Error getting auth token from Amplify:', error);
        setError('Authentication required. Please log in to view employees.');
        setLoading(false);
        return;
      }
    }

    // Log token information (partially masked for security)
    const tokenPreview = authToken.substring(0, 10) + '...' + authToken.substring(authToken.length - 5);
    logger.debug(`[EmployeeManagement] Using auth token for fetch: ${tokenPreview}`);

    logger.info(`[EmployeeManagement] Fetching employees with tenant ID: ${tenantId}`);
    
    try {
      // Reset the circuit breaker for employees endpoint before trying
      resetCircuitBreakers('/employees');
      
      setLoading(true);
      setError(null);
      
      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      
      // Clear any existing abort controller
      if (fetchRequestRef.current) {
        try {
          fetchRequestRef.current.abort();
        } catch (e) {
          // Ignore abort errors
        }
        fetchRequestRef.current = null;
      }
      
      // Create new abort controller
      const abortController = new AbortController();
      fetchRequestRef.current = abortController;
      
      // Set a timeout to actually make the API call
      fetchTimeoutRef.current = setTimeout(async () => {
        try {
          // Use the employeeApi with retry capabilities
          const response = await employeeApi.getAll({
            bypassCache: true, // Always get fresh data
            _t: Date.now(), // Add timestamp to prevent caching
            signal: abortController.signal,
            retry: 2, // Enable up to 2 retries
            timeout: 10000 // Set a reasonable timeout
          });
          
          if (!isMounted.current) return;
          
          if (Array.isArray(response)) {
            logger.debug(`[EmployeeManagement] Received ${response.length} employees from API`);
            setEmployees(normalizeEmployeeData(response));
          } else if (response && Array.isArray(response.data)) {
            logger.debug(`[EmployeeManagement] Received ${response.data.length} employees from API (in data property)`);
            setEmployees(normalizeEmployeeData(response.data));
          } else {
            logger.warn('[EmployeeManagement] Unexpected response format from employeeApi.getAll:', response);
            setEmployees([]);
          }
          
          setLoading(false);
          setShowConnectionChecker(false); // Hide connection checker on success
        } catch (error) {
          if (!isMounted.current) return;
          
          // Don't treat aborted requests as errors when component unmounts
          if (error.name === 'AbortError' || error.message?.includes('aborted')) {
            logger.info('[EmployeeManagement] Request aborted');
            return;
          }
          
          logger.error('[EmployeeManagement] Error fetching employees:', error);
          
          // Handle 403 errors by trying proxy route
          if (error.response?.status === 403) {
            logger.warn('[EmployeeManagement] Got 403 Forbidden, trying proxy route instead');
            try {
              // Try using the proxy route
              const proxyResponse = await fetch(`/api/hr-proxy?tenantId=${tenantId}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              });
              
              const proxyData = await proxyResponse.json();
              
              if (proxyData.data && Array.isArray(proxyData.data)) {
                logger.info('[EmployeeManagement] Successfully fetched employees through proxy route');
                setEmployees(normalizeEmployeeData(proxyData.data));
                setLoading(false);
                setShowConnectionChecker(false);
                return;
              } else {
                logger.warn('[EmployeeManagement] Proxy route returned non-array data:', proxyData);
                // Continue to error handling below
              }
            } catch (proxyError) {
              logger.error('[EmployeeManagement] Proxy route also failed:', proxyError);
              // Continue to error handling below
            }
          }
          
          setLoading(false);
          
          // Handle auth errors directly here
          if (error.response?.status === 401 || 
              (error.message && (error.message.includes('401') || 
                                error.message.includes('Unauthorized') || 
                                error.message.includes('Authentication')))) {
            logger.warn('[EmployeeManagement] Auth error detected in fetchEmployeesData');
            // Call handleAuthError but don't retry immediately to prevent loops
            const refreshSuccessful = await handleAuthError();
            if (!refreshSuccessful) {
              setError('Your session has expired. Please log in again to view employees.');
            }
            return;
          }
          
          setError('Failed to fetch employees. Please try again later.');
          
          // Show connection checker for circuit breaker or network errors
          if (error.message && (error.message.includes('Circuit breaker') || 
                               error.message.includes('Network Error') || 
                               error.message.includes('timeout') ||
                               error.message.includes('aborted'))) {
            setShowConnectionChecker(true);
          }
        } finally {
          // Clear references to avoid memory leaks
          if (isMounted.current) {
            fetchTimeoutRef.current = null;
            fetchRequestRef.current = null;
          }
        }
      }, 100); // Small delay to avoid redundant API calls
    } catch (error) {
      if (!isMounted.current) return;
      
      logger.error('[EmployeeManagement] Error in fetchEmployeesData:', error);
      setLoading(false);
      setError('Failed to fetch employees. Please try again later.');
    }
  };

  // Define the fetchEmployees function that's being called in the useEffect
  const fetchEmployees = async () => {
    try {
      // First reset any circuit breaker issues
      resetCircuitBreakers('/employees');
      
      // Ensure auth provider is set
      ensureAuthProvider();
      
      // Get current tenant ID
      const currentTenantId = getTenantId();
      
      // Check if token is available before trying to fetch
      const token = window?.__APP_CACHE?.auth?.token;
      
      if (!token) {
        logger.info('[EmployeeManagement] No token found, attempting to refresh session');
        
        // Try to refresh token
        const refreshed = await refreshUserSession();
        if (!refreshed) {
          logger.error('[EmployeeManagement] Session refresh failed - setting auth error');
          setError('Your session has expired. Please log in again to view employees.');
          setIsAuthenticated(false);
          setShowConnectionChecker(false);
          setLoading(false);
          return;
        }
        logger.info('[EmployeeManagement] Session refreshed successfully');
      }
      
      // Check for mock mode flag in AppCache
      const useMockMode = typeof window !== 'undefined' && 
        window.__APP_CACHE && 
        window.__APP_CACHE.debug && 
        window.__APP_CACHE.debug.useMockMode === true;
      
      if (useMockMode) {
        logger.info('[EmployeeManagement] Using mock data mode from localStorage setting');
        try {
          setLoading(true);
          // Use the mock API directly
          const response = await fetch('/api/hr/employees');
          const data = await response.json();
          
          if (Array.isArray(data)) {
            setEmployees(normalizeEmployeeData(data));
            setLoading(false);
            setShowConnectionChecker(false);
            return;
          }
        } catch (mockError) {
          logger.error('[EmployeeManagement] Mock API error:', mockError);
          // Continue to regular flow on error
        }
      }
      
      // Now fetch the data
      await fetchEmployeesData(currentTenantId);
    } catch (error) {
      setLoading(false);
      logger.error('[EmployeeManagement] Error in fetchEmployees:', error);
      
      // Handle authentication errors specifically
      if (error?.response?.status === 401 || 
          (error?.message && (error?.message.includes('401') || 
                            error?.message.includes('Unauthorized') || 
                            error?.message.includes('Authentication')))) {
        setError('Authentication failed. Please log in again.');
        setIsAuthenticated(false);
      } else {
        setError('Failed to fetch employees. Please try again later.');
      }
    }
  };

  // Just use a single useEffect for fetching employees on mount
  useEffect(() => {
    // Create an async function inside the effect to call our async fetchEmployees
    const loadEmployees = async () => {
      try {
        // Add backend connection test
        logger.info("[EmployeeManagement] Testing backend connection before employee fetch...");
        try {
          const { verifyBackendConnection } = await import('@/lib/axiosConfig');
          const connectionResult = await verifyBackendConnection();
          logger.info("[EmployeeManagement] Backend connection test result:", connectionResult);
        } catch (connError) {
          logger.error("[EmployeeManagement] Backend connection test failed:", connError);
        }
        
        // Ensure AUTH_CACHE provider is set before doing anything else
        ensureAuthProvider();
        
        // Check session status before fetching data
        const checkSessionStatus = async () => {
          try {
            // Import and use getCurrentUser to verify session
            const { getCurrentUser } = await import('aws-amplify/auth');
            await getCurrentUser();
            setIsAuthenticated(true);
            fetchEmployees();
          } catch (error) {
            logger.error('[EmployeeManagement] Session check failed:', error);
            setIsAuthenticated(false);
            setError('Your session appears to be invalid. Please refresh your session or log in again.');
          }
        };
        
        await checkSessionStatus();
      } catch (error) {
        logger.error('[EmployeeManagement] Error loading employees:', error);
        notifyError('Failed to load employees. Please refresh the page.');
      }
    };
    
    // Call the async function
    loadEmployees();
    
    // Set up the cleanup function
    return () => {
      isMounted.current = false;
      
      // Clear any pending timeouts
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      // Abort any pending requests
      if (fetchRequestRef.current) {
        try {
          fetchRequestRef.current.abort();
        } catch (e) {
          // Ignore abort errors
        }
      }
    };
  }, []);

  // Add a function to toggle mock mode
  const toggleMockMode = useCallback(() => {
    // Get current mock mode from AppCache
    const currentMockMode = typeof window !== 'undefined' && 
      window.__APP_CACHE && 
      window.__APP_CACHE.debug && 
      window.__APP_CACHE.debug.useMockMode === true;
    
    const newMockMode = !currentMockMode;
    
    // Update AppCache
    if (typeof window !== 'undefined') {
      window.__APP_CACHE = window.__APP_CACHE || {};
      window.__APP_CACHE.debug = window.__APP_CACHE.debug || {};
      window.__APP_CACHE.debug.useMockMode = newMockMode;
    }
    
    // Show notification
    if (newMockMode) {
      notifySuccess('Switching to mock data mode');
    } else {
      notifyInfo('Switching to real backend mode');
    }
    
    // Refresh data
    fetchEmployees();
  }, []);

  // Handle when the connection is restored
  const handleConnectionRestored = async () => {
    try {
      setShowConnectionChecker(false);
      await fetchEmployees();
      notifySuccess('Connection restored successfully!');
    } catch (error) {
      logger.error('[EmployeeManagement] Error in handleConnectionRestored:', error);
      notifyError('Failed to fetch data after connection restored.');
    }
  };

  // React Table columns definition
  const columns = React.useMemo(
    () => [
      {
        Header: 'Name',
        accessor: (row) => `${row.first_name} ${row.last_name}`,
        Cell: ({ row }) => (
          <div>
            <div className="text-sm font-medium text-black">{`${row.original.first_name} ${row.original.last_name}`}</div>
            <div className="text-xs text-gray-500">{row.original.job_title || 'No title'}</div>
          </div>
        )
      },
      {
        Header: 'Email',
        accessor: 'email',
        Cell: ({ value }) => (
          <div className="text-sm text-black">{value}</div>
        )
      },
      {
        Header: 'Department',
        accessor: 'department',
        Cell: ({ value }) => (
          <div className="text-sm text-black">{value || 'N/A'}</div>
        )
      },
      {
        Header: 'Compensation',
        accessor: 'compensation_type',
        Cell: ({ row }) => {
          const { compensation_type, salary, wage_per_hour } = row.original;
          return (
            <div>
              <div className="text-sm font-medium text-black">
                {compensation_type === 'SALARY' ? 'Salary' : 'Hourly Wage'}
              </div>
              <div className="text-xs text-gray-500">
                {compensation_type === 'SALARY' 
                  ? `$${parseFloat(salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/year`
                  : `$${parseFloat(wage_per_hour || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/hour`
                }
              </div>
            </div>
          );
        }
      },
      {
        Header: 'Employment',
        accessor: 'employment_type',
        Cell: ({ value }) => (
          <div className="text-sm text-black">
            {value === 'FT' ? 'Full-time' : 'Part-time'}
            </div>
        )
      },
      {
        Header: 'Status',
        accessor: 'active',
        Cell: ({ value }) => (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Active' : 'Inactive'}
          </span>
        )
      },
      {
        Header: 'Actions',
        id: 'actions',
        Cell: ({ row }) => (
  <div className="text-right flex justify-end space-x-2">
    {/* Edit button */}
    <button
      onClick={() => {
        handleEditEmployee(row.original);
      }}
      className="p-1 flex items-center bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md"
      title="Edit"
    >
      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      <span className="text-xs">Edit</span>
    </button>
    
    {/* Details button */}
    <button
      onClick={() => {
        setSelectedEmployee(row.original);
        setShowEmployeeDetails(true);
        setIsCreating(false);
        setIsEditing(false);
      }}
      className="p-1 flex items-center bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md"
      title="Details"
    >
      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      <span className="text-xs">Details</span>
    </button>
    
    {/* Delete button */}
    <button
      onClick={() => handleDeleteEmployee(row.original.id)}
      className="p-1 flex items-center bg-red-50 text-red-600 hover:bg-red-100 rounded-md"
      title="Delete"
    >
      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      <span className="text-xs">Delete</span>
    </button>
  </div>
)
      }
    ],
    []
  );

  // Memoize employees data to avoid recreating on each render
  const tableData = React.useMemo(() => {
    // Ensure employees is always an array, even if it's null or undefined
    if (!employees || !Array.isArray(employees)) {
      return [];
    }
    return employees;
  }, [employees]);

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    if (!searchQuery.trim()) return employees;
    
    const query = searchQuery.toLowerCase().trim();
    return employees.filter(employee => {
      return (
        (employee.first_name && employee.first_name.toLowerCase().includes(query)) ||
        (employee.last_name && employee.last_name.toLowerCase().includes(query)) ||
        (employee.email && employee.email.toLowerCase().includes(query)) ||
        (employee.department && employee.department.toLowerCase().includes(query)) ||
        (employee.job_title && employee.job_title.toLowerCase().includes(query))
      );
    });
  }, [employees, searchQuery]);

  // Table hooks need to be at component level, not inside render functions
  const tableInstance = useTable(
    { 
      columns, 
      data: filteredEmployees, 
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useSortBy,
    usePagination
  );

  // Get all the table props we need
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = tableInstance;

  // Render the employees list based on search query
  const renderEmployeesList = () => {
    // Show loading state
    if (loading && !employees.length) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading employees...</p>
          </div>
        </div>
      );
    }

    // Show fetch error message if there is one
    if (fetchError || error) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-red-800 font-medium text-lg mb-2">Error Loading Employees</h3>
            <p className="text-red-700 mb-4">{fetchError || error}</p>
          <button 
              onClick={() => fetchEmployeesData(tenantId)} 
              className="bg-red-100 text-red-800 px-4 py-2 rounded-md hover:bg-red-200 transition-colors"
          >
              Try Again
          </button>
        </div>
      </div>
      );
    }

    // Show empty state with helpful message if no employees
    if (!employees || employees.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg p-6">
          <div className="text-center mb-6">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 text-gray-300 mx-auto mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" 
              />
              </svg>
            <h3 className="text-xl font-medium text-black mb-2">No Employees Yet</h3>
            <p className="text-gray-500 max-w-md">
              You haven't added any employees to your organization yet. Get started by clicking the "Add Employee" button above.
            </p>
            </div>
              <button 
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => {
              setEmployeeTab('add');
              setIsCreating(false);
              setIsEditing(false);
              setShowEmployeeDetails(false);
              setSelectedEmployee(null);
            }}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Employee
              </button>
          </div>
      );
    }
    
    // If no employees match the search criteria
    if (filteredEmployees.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg p-6">
          <div className="text-center mb-6">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 text-gray-300 mx-auto mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
              </svg>
            <h3 className="text-xl font-medium text-black mb-2">No Matching Employees</h3>
            <p className="text-gray-500 max-w-md">
              No employees match your search criteria "{searchQuery}". Try a different search term or clear the search.
            </p>
            </div>
            <button 
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => setSearchQuery('')}
            >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear Search
            </button>
          </div>
      );
    }

    // Render the employee table
    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {headerGroups.map(headerGroup => (
                  <tr {...headerGroup.getHeaderGroupProps()}>
                    {headerGroup.headers.map(column => (
                      <th
                        {...column.getHeaderProps(column.getSortByToggleProps())}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column.render('Header')}
                        <span>
                          {column.isSorted
                            ? column.isSortedDesc
                              ? ' 🔽'
                              : ' 🔼'
                            : ''}
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody {...getTableBodyProps()} className="bg-white divide-y divide-gray-200">
                {page.map((row, i) => {
                  prepareRow(row)
                  return (
                    <tr 
                      {...row.getRowProps()} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedEmployee(row.original);
                        setShowEmployeeDetails(true);
                      }}
                    >
                      {row.cells.map(cell => {
                        return (
                          <td
                            {...cell.getCellProps()}
                            className="px-6 py-4 whitespace-nowrap"
                            onClick={(e) => {
                              // Prevent row click for action buttons
                              if (cell.column.id === 'actions') {
                                e.stopPropagation();
                              }
                            }}
                          >
                            {cell.render('Cell')}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
    );
  };

  // Employee details dialog component
  const renderEmployeeDetailsDialog = () => {
  // Only render if both selectedEmployee exists AND showEmployeeDetails is true
  if (!selectedEmployee || !showEmployeeDetails) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[55] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 z-10">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                {selectedEmployee.first_name} {selectedEmployee.last_name}
              </h3>
              <button
                onClick={handleCloseEmployeeDetails}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="px-6 py-4">
            <div className="flex flex-wrap mb-6">
              <div className="mb-4 w-full md:w-1/3 pr-4">
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold mb-2">
                    {selectedEmployee.first_name?.[0]}{selectedEmployee.last_name?.[0]}
                  </div>
                  <h4 className="text-lg font-semibold">
                    {selectedEmployee.first_name} {selectedEmployee.middle_name ? selectedEmployee.middle_name[0] + '. ' : ''}{selectedEmployee.last_name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {selectedEmployee.job_title || 'No Title'}
                  </p>
                  
                  <div className="mt-4 w-full flex flex-col space-y-2">
                    <button
                      onClick={() => {
                        // First close the details dialog
                        setShowEmployeeDetails(false);
                        // Then edit the employee
                        handleEditEmployee(selectedEmployee);
                      }}
                      className="flex items-center justify-center w-full px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Employee
                    </button>
                    
                    <button
                      onClick={() => handleDeleteEmployee(selectedEmployee.id)}
                      className="flex items-center justify-center w-full px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Employee
                    </button>
                  </div>
                </div>
              </div>
              <div className="mb-4 w-full md:w-2/3">
                <div className="space-y-3">
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Email</span>
                    <span className="block mt-1">{selectedEmployee.email}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Phone</span>
                    <span className="block mt-1">{selectedEmployee.phone_number || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Job Title</span>
                    <span className="block mt-1">{selectedEmployee.job_title || 'Not assigned'}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Department</span>
                    <span className="block mt-1">{selectedEmployee.department || 'Not assigned'}</span>
                  </div>
                  
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Management</span>
                    <span className="block mt-1">
                      {selectedEmployee.areManager ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Manager
                        </span>
                      ) : 'Not a manager'}
                    </span>
                  </div>
                  
                  {selectedEmployee.supervising && selectedEmployee.supervising.length > 0 && (
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Supervising</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedEmployee.supervising.map(empId => {
                          const supervisedEmp = employees.find(e => e.id === empId);
                          return supervisedEmp ? (
                            <span key={empId} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {supervisedEmp.first_name} {supervisedEmp.last_name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                  
                  {employees.some(emp => emp.supervising && emp.supervising.includes(selectedEmployee.id)) && (
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Reports to</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {employees
                          .filter(emp => emp.supervising && emp.supervising.includes(selectedEmployee.id))
                          .map(supervisor => (
                            <span key={supervisor.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              {supervisor.first_name} {supervisor.last_name}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Role</span>
                    <span className="block mt-1">
                      {selectedEmployee.role === 'ADMIN' || selectedEmployee.role === 'ADMN' 
                        ? 'Administrator' 
                        : selectedEmployee.role === 'owner' || selectedEmployee.role === 'OWNR'
                          ? 'owner'
                          : 'employee'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Employment Type</span>
                    <span className="block mt-1">
                      {selectedEmployee.employment_type === 'FT' ? 'Full-time' : 'Part-time'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Date Joined</span>
                    <span className="block mt-1">
                      {selectedEmployee.date_joined ? format(new Date(selectedEmployee.date_joined), 'MMMM d, yyyy') : 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Gender</span>
                    <span className="block mt-1">{selectedEmployee.gender || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Marital Status</span>
                    <span className="block mt-1">{selectedEmployee.marital_status || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Country</span>
                    <span className="block mt-1">{selectedEmployee.country || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Street</span>
                    <span className="block mt-1">{selectedEmployee.street || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">City</span>
                    <span className="block mt-1">{selectedEmployee.city || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Postcode</span>
                    <span className="block mt-1">{selectedEmployee.postcode || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Handle resending an invitation email to an employee - Functionality removed
  const handleResendInvitation = async (employee) => {
    // This functionality has been moved to the Settings Management page
    notifyInfo("User invitation functionality has been moved to Settings page");
    
    // After a brief delay, dismiss the notification and let the user know where to find the feature
    setTimeout(() => {
      toast.dismiss();
      notifySuccess("Please use the User Management section in Settings to invite users");
    }, 2000);
  };

  // Add this function to the EmployeeManagement component
  const resetCircuitBreaker = useCallback(() => {
    try {
      // Reset the circuit breakers for the employees endpoint
      resetCircuitBreakers('/employees');
      logger.info('[EmployeeManagement] Reset circuit breaker for /employees endpoint');
      notifySuccess('Connection reset successful. Trying again...');
      
      // Fetch data after reset with a slight delay
      setTimeout(() => {
        fetchEmployeesData(true, 0, true);
      }, 500);
    } catch (error) {
      logger.error('[EmployeeManagement] Error resetting circuit breaker:', error);
      notifyError('Failed to reset connection. Please refresh the page.');
    }
  }, [fetchEmployeesData]);

  // Handle creating a new employee
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      setSubmitError(null);
      
      // Get current tenant ID
      const currentTenantId = getTenantId();
      
      // Validate required fields
      if (!newEmployee.first_name || !newEmployee.last_name || !newEmployee.email) {
        setSubmitError('First name, last name, and email are required');
        setIsCreating(false);
        return;
      }
      
      // Ensure date_joined is set if not provided
      if (!newEmployee.date_joined) {
        newEmployee.date_joined = new Date().toISOString().split('T')[0];
      }
      
      // Try to refresh the user session first to ensure we have valid credentials
      await refreshUserSession();
      
      // Call API to create employee
      const response = await employeeApi.create(newEmployee);
      
      if (response && (response.id || response.success)) {
        // Successfully created
        setEmployees([...employees, response]);
        setNewEmployee(initialEmployeeState);
        setEmployeeTab('list');
        notifySuccess('Employee created successfully!');
        
        // Refresh the employee list
        fetchEmployees();
      } else if (response && response.message) {
        // Handle specific error message from the API
        setSubmitError(response.message);
        
        // If authentication error, try to refresh session
        if (response.status === 401 || response.message.includes('Authentication')) {
          notifyWarning('Session expired. Attempting to refresh...');
          const refreshed = await refreshUserSession();
          if (refreshed) {
            notifyInfo('Session refreshed. Please try again.');
          } else {
            notifyError('Failed to refresh session. Please log in again.');
            setTimeout(() => redirectToLogin(), 2000);
          }
        }
      } else {
        setSubmitError('Failed to create employee. Please try again.');
      }
    } catch (error) {
      logger.error('[EmployeeManagement] Error creating employee:', error);
      
      // Handle authentication errors
      if (error.message && error.message.includes('Authentication')) {
        setSubmitError('Authentication failed. Refreshing your session...');
        try {
          const refreshed = await refreshUserSession();
          if (refreshed) {
            setSubmitError('Session refreshed. Please try creating the employee again.');
          } else {
            setSubmitError('Failed to refresh session. Please log in again.');
            setTimeout(() => redirectToLogin(), 2000);
          }
        } catch (refreshError) {
          setSubmitError('Failed to refresh session. Please log in again.');
          setTimeout(() => redirectToLogin(), 2000);
        }
      } else {
        setSubmitError(error.message || 'An unexpected error occurred while creating the employee');
      }
    } finally {
      setIsCreating(false);
    }
  };
  
  // Handle editing an existing employee
  const handleEditEmployee = (employee) => {
  // Close any open dialogs first
  setShowEmployeeDetails(false);
  
  // Reset any other state that might interfere
  setSelectedEmployee(null);
  
  // Set up edit mode
  setNewEmployee(employee);
  setIsEditing(true);
  setShowEditForm(true);
  
  // Log for debugging
  logger.debug('[EmployeeManagement] Edit employee initiated:', employee.id);
};

  // Function to close the employee details dialog
  const handleViewEmployeeDetails = (employee) => {
  // Close any edit forms first
  setShowEditForm(false);
  setIsEditing(false);
  
  // Set up details view
  setSelectedEmployee(employee);
  setShowEmployeeDetails(true);
  
  // Log for debugging
  logger.debug('[EmployeeManagement] View employee details initiated:', employee.id);
};

const handleCloseEmployeeDetails = () => {
  if (showEditForm) {
    setShowEditForm(false);
  }
  
  setShowEmployeeDetails(false);
  setSelectedEmployee(null);
  
  // Log for debugging
  logger.debug('[EmployeeManagement] Employee details closed');
};
  
  // Handle updating an employee
  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      // Get current tenant ID
      const currentTenantId = getTenantId();
      
      // Validate required fields
      if (!newEmployee.first_name || !newEmployee.last_name || !newEmployee.email) {
        setSubmitError('First name, last name, and email are required');
        setIsSubmitting(false);
        return;
      }
      
      // Create a clean copy of the employee data
      const employeeData = { ...newEmployee };
      
      // Format date fields properly
      if (employeeData.dob && typeof employeeData.dob === 'string') {
        // Ensure date is in YYYY-MM-DD format
        const dateObj = new Date(employeeData.dob);
        if (!isNaN(dateObj.getTime())) {
          employeeData.dob = dateObj.toISOString().split('T')[0];
        }
      }
      
      if (employeeData.date_joined && typeof employeeData.date_joined === 'string') {
        // Ensure date is in YYYY-MM-DD format
        const dateObj = new Date(employeeData.date_joined);
        if (!isNaN(dateObj.getTime())) {
          employeeData.date_joined = dateObj.toISOString().split('T')[0];
        }
      }
      
      if (employeeData.probation_end_date && typeof employeeData.probation_end_date === 'string') {
        // Ensure date is in YYYY-MM-DD format
        const dateObj = new Date(employeeData.probation_end_date);
        if (!isNaN(dateObj.getTime())) {
          employeeData.probation_end_date = dateObj.toISOString().split('T')[0];
        }
      }
      
      if (employeeData.termination_date && typeof employeeData.termination_date === 'string') {
        // Ensure date is in YYYY-MM-DD format
        const dateObj = new Date(employeeData.termination_date);
        if (!isNaN(dateObj.getTime())) {
          employeeData.termination_date = dateObj.toISOString().split('T')[0];
        }
      }
      
      if (employeeData.last_work_date && typeof employeeData.last_work_date === 'string') {
        // Ensure date is in YYYY-MM-DD format
        const dateObj = new Date(employeeData.last_work_date);
        if (!isNaN(dateObj.getTime())) {
          employeeData.last_work_date = dateObj.toISOString().split('T')[0];
        }
      }
      
      // Ensure numeric fields are properly formatted
      if (employeeData.salary !== undefined && employeeData.salary !== null) {
        employeeData.salary = Number(employeeData.salary);
      }
      
      if (employeeData.wage_per_hour !== undefined && employeeData.wage_per_hour !== null) {
        employeeData.wage_per_hour = Number(employeeData.wage_per_hour);
      }
      
      if (employeeData.hours_per_day !== undefined && employeeData.hours_per_day !== null) {
        employeeData.hours_per_day = Number(employeeData.hours_per_day);
      }
      
      if (employeeData.days_per_week !== undefined && employeeData.days_per_week !== null) {
        employeeData.days_per_week = Number(employeeData.days_per_week);
      }
      
      if (employeeData.overtime_rate !== undefined && employeeData.overtime_rate !== null) {
        employeeData.overtime_rate = Number(employeeData.overtime_rate);
      }
      
      // Ensure boolean fields are properly formatted
      employeeData.active = Boolean(employeeData.active);
      employeeData.onboarded = Boolean(employeeData.onboarded);
      employeeData.probation = Boolean(employeeData.probation);
      employeeData.health_insurance_enrollment = Boolean(employeeData.health_insurance_enrollment);
      employeeData.pension_enrollment = Boolean(employeeData.pension_enrollment);
      employeeData.ID_verified = Boolean(employeeData.ID_verified);
      employeeData.areManager = Boolean(employeeData.areManager);
      
      // Log the formatted data for debugging
      logger.debug('[EmployeeManagement] Updating employee with formatted data:', 
        JSON.stringify(employeeData, null, 2));
      
      // Call API to update employee
      const response = await employeeApi.update(employeeData.id, employeeData);
      
      if (response && response.id) {
        // Successfully updated
        setEmployees(employees.map(emp => emp.id === employeeData.id ? response : emp));
        setNewEmployee(initialEmployeeState);
        setShowEditForm(false);
        notifySuccess('Employee updated successfully!');
        
        // Refresh the employee list
        fetchEmployees();
      } else {
        setSubmitError('Failed to update employee. Please try again.');
      }
    } catch (error) {
      logger.error('[EmployeeManagement] Error updating employee:', error);
      
      // Extract error message from response if available
      let errorMessage = 'An unexpected error occurred while updating the employee';
      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (typeof error.response.data === 'object') {
          // Format validation errors from the API
          const validationErrors = [];
          Object.entries(error.response.data).forEach(([field, errors]) => {
            if (Array.isArray(errors)) {
              validationErrors.push(`${field}: ${errors.join(', ')}`);
            } else {
              validationErrors.push(`${field}: ${errors}`);
            }
          });
          
          if (validationErrors.length > 0) {
            errorMessage = `Validation errors: ${validationErrors.join('; ')}`;
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle deleting an employee
  const handleDeleteEmployee = async (employeeId) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        setLoading(true);
        
        // Get current tenant ID
        const currentTenantId = getTenantId();
        
        // Call API to delete employee
        const response = await employeeApi.delete(employeeId);
        
        // Most delete operations return a 204 or success message
        // Remove from local state regardless of response
        setEmployees(employees.filter(emp => emp.id !== employeeId));
        notifySuccess('Employee deleted successfully!');
        
      } catch (error) {
        logger.error('[EmployeeManagement] Error deleting employee:', error);
        notifyError(error.message || 'An unexpected error occurred while deleting the employee');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle input changes in the form
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkbox inputs differently
    if (type === 'checkbox') {
      setNewEmployee({
        ...newEmployee,
        [name]: checked
      });
    } 
    // Handle country change to update security number type
    else if (name === 'country') {
      setNewEmployee({
        ...newEmployee,
        [name]: value,
        security_number_type: getSecurityNumberType(value)
      });
    }
    // Handle all other input types
    else {
      setNewEmployee({
        ...newEmployee,
        [name]: value
      });
    }
  };

  // Render the main content
  return (
    <div className="p-6 bg-white shadow-sm rounded-lg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <Typography variant="h4" component="h1" className="mb-2">
            Employee Portal
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage employees and personal information
          </Typography>
        </div>

      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setMainTab('personal')}
            className={`${
              mainTab === 'personal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Personal Information
          </button>
          <button
            onClick={() => {
              setMainTab('add-employee');
              setNewEmployee({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                department: '',
                role: '',
                hire_date: new Date().toISOString().split('T')[0],
                employment_status: 'PENDING',
                employee_type: 'FULL_TIME',
                ID_verified: false,
                areManager: false,
                supervising: []
              });
            }}
            className={`${
              mainTab === 'add-employee'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Add Employee
          </button>
          <button
            onClick={() => setMainTab('list-employees')}
            className={`${
              mainTab === 'list-employees'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            List Employees
          </button>
        </nav>
      </div>

      {/* Show connection errors with debug info */}
      {error && (
        <Alert severity="error" className="mb-4">
          <div className="text-red-800">{error}</div>
          
          {/* Debug section - only visible in development */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
              <div className="font-bold">Debug Options:</div>
              <div className="mt-1">
                <button 
                  onClick={refreshSession}
                  className="px-2 py-1 mr-2 bg-green-100 hover:bg-green-200 rounded text-green-800"
                >
                  Refresh Session
                </button>
                
                <button 
                  onClick={() => fetch('/api/test-connection').then(r => r.json()).then(console.log)}
                  className="px-2 py-1 bg-purple-100 hover:bg-purple-200 rounded text-purple-800"
                >
                  Test Connection
                </button>
              </div>
            </div>
          )}
        </Alert>
      )}

      {showConnectionChecker && (
        <BackendConnectionCheck 
          onConnectionRestored={handleConnectionRestored}
        />
      )}

      {/* Tab Content */}
      {mainTab === 'personal' ? (
        <PersonalInformationTab />
      ) : mainTab === 'add-employee' ? (
        <EmployeeFormComponent 
          onSubmit={handleCreateEmployee} 
          newEmployee={newEmployee}
          handleInputChange={handleInputChange}
          isLoading={isCreating}
          setNewEmployee={setNewEmployee}
          setShowAddForm={setEmployeeTab}
          employees={employees}
        />
      ) : (
        <>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <CircularProgress size="large" color="primary" />
              <span className="ml-3">Loading employees...</span>
            </div>
          ) : (
            renderEmployeesList()
          )}

          {showEditForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto" style={{ marginLeft: '120px' }}>
                <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white">Edit Employee</h3>
                  <button
                    onClick={() => {
                      setShowEditForm(false);
                      setIsEditing(false);
                      // Ensure details dialog stays closed
                      setShowEmployeeDetails(false);
                      logger.debug('[EmployeeManagement] Edit form closed');
                    }}
                    className="text-white hover:text-blue-100"
                    aria-label="Close"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <EmployeeFormComponent 
                  isEdit={true}
                  onSubmit={handleUpdateEmployee} 
                  newEmployee={newEmployee}
                  handleInputChange={handleInputChange}
                  isLoading={isSubmitting}
                  setNewEmployee={setNewEmployee}
                  setShowEditForm={setShowEditForm}
                  employees={employees}
                />
              </div>
            </div>
          )}

          {renderEmployeeDetailsDialog()}
        </>
      )}
    </div>
  );
};

// Personal Information Tab Component
const PersonalInformationTab = () => {
  const [personalInfo, setPersonalInfo] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    phone_number: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US',
    dob: '',
    gender: '',
    marital_status: '',
    payment_method: {
      bank_name: '',
      account_number: '',
      account_number_confirm: '',
      routing_number: '',
      mobile_wallet_id: ''
    },
    emergency_contact: {
      name: '',
      relationship: '',
      phone: ''
    }
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch personal information on component mount
  useEffect(() => {
    const fetchPersonalInfo = async () => {
      try {
        // Get tenant ID from context or cache
        const tenantId = window.__APP_CACHE?.tenant?.currentTenantId || 
                          window.getCacheValue?.('tenantId') || 
                          localStorage.getItem('tenantId');
        
        // Try to get user data from multiple sources
        let userData = null;
        
        // 1. First try the UserProfile API endpoint
        try {
          const url = tenantId 
            ? `/api/user/profile?tenantId=${encodeURIComponent(tenantId)}`
            : '/api/user/profile';
            
          console.log('Fetching user profile from API:', url);
          const response = await fetch(url, { 
            headers: { 
              'Cache-Control': 'no-cache',
              'X-Dashboard-Route': 'true'
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result && result.profile) {
              console.log('Successfully fetched user profile from API');
              userData = {
                first_name: result.profile.firstName || result.profile.first_name || '',
                last_name: result.profile.lastName || result.profile.last_name || '',
                email: result.profile.email || '',
                // Use other fields if available
                phone_number: result.profile.phoneNumber || result.profile.phone_number || '',
                address: result.profile.street || result.profile.address || '',
                city: result.profile.city || '',
                state: result.profile.state || '',
                zip_code: result.profile.postcode || result.profile.zip_code || '',
                country: result.profile.country || 'US',
              };
            }
          }
        } catch (apiError) {
          console.error('Error fetching from User Profile API:', apiError);
        }
        
        // 2. If API fails, try to get data from AWS App Cache
        if (!userData && window.__APP_CACHE?.userProfile?.data?.profile) {
          console.log('Using App Cache for user profile data');
          const cachedProfile = window.__APP_CACHE.userProfile.data.profile;
          userData = {
            first_name: cachedProfile.firstName || cachedProfile.first_name || '',
            last_name: cachedProfile.lastName || cachedProfile.last_name || '',
            email: cachedProfile.email || '',
            phone_number: cachedProfile.phoneNumber || cachedProfile.phone_number || '',
            address: cachedProfile.street || cachedProfile.address || '',
            city: cachedProfile.city || '',
            state: cachedProfile.state || '',
            zip_code: cachedProfile.postcode || cachedProfile.zip_code || ''
          };
        }
        
        // 3. If both fail, try to get from Cognito attributes
        if (!userData && window.fetchUserAttributes) {
          try {
            console.log('Fetching from Cognito attributes');
            const userAttributes = await window.fetchUserAttributes();
            userData = {
              first_name: userAttributes['given_name'] || userAttributes['custom:firstname'] || '',
              last_name: userAttributes['family_name'] || userAttributes['custom:lastname'] || '',
              email: userAttributes['email'] || '',
              phone_number: userAttributes['phone_number'] || ''
            };
          } catch (cognitoError) {
            console.error('Error fetching from Cognito:', cognitoError);
          }
        }
        
        // If we couldn't get user data from any source, use empty defaults
        if (!userData) {
          console.log('No user data found, using defaults');
          userData = {
            first_name: '',
            last_name: '',
            email: '',
          };
        }
        
        // Set the personal information state with our user data
        // Merge with existing state to keep empty fields for values we don't have
        setPersonalInfo(prev => ({
          ...prev,
          ...userData,
          // Keep nested objects with defaults
          payment_method: prev.payment_method,
          emergency_contact: prev.emergency_contact
        }));
      } catch (error) {
        console.error('Error fetching personal information:', error);
      }
    };;
    
    fetchPersonalInfo();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setPersonalInfo(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setPersonalInfo(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that account numbers match if we're editing and both fields have values
    if (isEditing && personalInfo.accountNumber && personalInfo.accountNumberConfirmation) {
      if (personalInfo.accountNumber !== personalInfo.accountNumberConfirmation) {
        setAlertMessage({
          type: 'error',
          message: 'Account numbers do not match. Please verify and try again.'
        });
        return;
      }
    }
    
    setLoading(true);
    
    try {
      // Prepare data for API submission
      const paymentDetails = {};
      
      // Add data based on payment provider
      if (personalInfo.paymentProvider === 'stripe') {
        paymentDetails.bank_name = personalInfo.bankName;
        
        // Only include account details if they were modified
        if (personalInfo.accountNumber && personalInfo.routingNumber) {
          paymentDetails.account_number = personalInfo.accountNumber;
          paymentDetails.routing_number = personalInfo.routingNumber;
        }
      } else if (personalInfo.paymentProvider === 'mpesa') {
        paymentDetails.mpesa_phone_number = personalInfo.mpesaPhoneNumber;
      } else if (personalInfo.paymentProvider === 'paypal') {
        paymentDetails.paypal_email = personalInfo.paypalEmail;
      }
      
      // Call the API to update employee payment method
      const paymentResponse = await fetch(`/api/payments/employees/${employeeData.id}/payment-method/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: personalInfo.paymentProvider,
          details: paymentDetails
        })
      });
      
      const paymentResult = await paymentResponse.json();
      
      if (paymentResponse.ok) {
        // Now update the rest of the personal information
        // ... existing simulation code ...
        
        // Show success message with security note if using Stripe
        if (paymentResult.secure_storage) {
          setAlertMessage({
            type: 'success',
            message: 'Your information was saved successfully. For security, your full account details are stored securely with our payment processor and only the last 4 digits are stored in our system.'
          });
        } else {
          setAlertMessage({
            type: 'success',
            message: 'Your information was saved successfully!'
          });
        }
        
        // Reset confirmation field and editing state
        setPersonalInfo(prev => ({
          ...prev,
          accountNumberConfirmation: ''
        }));
        setIsEditing(false);
      } else {
        throw new Error(paymentResult.error || 'Failed to update payment information');
      }
    } catch (error) {
      console.error("Error saving information:", error);
      setAlertMessage({
        type: 'error',
        message: error.message || 'An error occurred while saving your information. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Personal Information</h2>
        {!isEditing ? (
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsEditing(true)}
          >
            Edit Information
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {saveSuccess && (
        <Alert severity="success" className="mb-4">
          Your personal information has been updated successfully.
        </Alert>
      )}

      {saveError && (
        <Alert severity="error" className="mb-4">
          {saveError}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TextField
            label="First Name"
            name="first_name"
            value={personalInfo.first_name}
            onChange={handleInputChange}
            required
            fullWidth
            disabled={!isEditing}
          />
          
          <TextField
            label="Last Name"
            name="last_name"
            value={personalInfo.last_name}
            onChange={handleInputChange}
            required
            fullWidth
            disabled={!isEditing}
          />
          
          <TextField
            label="Middle Name"
            name="middle_name"
            value={personalInfo.middle_name}
            onChange={handleInputChange}
            fullWidth
            disabled={!isEditing}
          />
          
          <TextField
            label="Email"
            type="email"
            name="email"
            value={personalInfo.email}
            onChange={handleInputChange}
            required
            fullWidth
            disabled={!isEditing}
          />
          
          <TextField
            label="Phone Number"
            type="tel"
            name="phone_number"
            value={personalInfo.phone_number}
            onChange={handleInputChange}
            fullWidth
            disabled={!isEditing}
          />
          
          <TextField
            label="Date of Birth"
            type="date"
            name="dob"
            value={personalInfo.dob}
            onChange={handleInputChange}
            fullWidth
            disabled={!isEditing}
          />
          
          <TextField
            label="Gender"
            name="gender"
            value={personalInfo.gender}
            onChange={handleInputChange}
            fullWidth
            disabled={!isEditing}
          />
          
          <TextField
            label="Marital Status"
            name="marital_status"
            value={personalInfo.marital_status}
            onChange={handleInputChange}
            fullWidth
            disabled={!isEditing}
          />
          
          <TextField
            label="Address"
            name="address"
            value={personalInfo.address}
            onChange={handleInputChange}
            fullWidth
            disabled={!isEditing}
          />
          
          <TextField
            label="City"
            name="city"
            value={personalInfo.city}
            onChange={handleInputChange}
            fullWidth
            disabled={!isEditing}
          />
          
          <TextField
            label="State/Province"
            name="state"
            value={personalInfo.state}
            onChange={handleInputChange}
            fullWidth
            disabled={!isEditing}
          />
          
          <TextField
            label="ZIP/Postal Code"
            name="zip_code"
            value={personalInfo.zip_code}
            onChange={handleInputChange}
            fullWidth
            disabled={!isEditing}
          />
          
          <TextField
            label="Country"
            name="country"
            value={personalInfo.country}
            onChange={handleInputChange}
            fullWidth
            disabled={!isEditing}
          />
        </div>
        
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Payment Method</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField
              label="Bank Name"
              name="payment_method.bank_name"
              value={personalInfo.payment_method.bank_name}
              onChange={handleInputChange}
              fullWidth
              disabled={!isEditing}
            />
            
            <TextField
              label="Account Number"
              name="payment_method.account_number"
              value={personalInfo.payment_method.account_number}
              onChange={handleInputChange}
              fullWidth
              disabled={!isEditing}
              type={isEditing ? "text" : "password"}
            />
            
            {isEditing && (
              <TextField
                label="Confirm Account Number"
                name="payment_method.account_number_confirm"
                value={personalInfo.payment_method.account_number_confirm}
                onChange={handleInputChange}
                fullWidth
                required
                error={personalInfo.payment_method.account_number !== personalInfo.payment_method.account_number_confirm}
                helperText={personalInfo.payment_method.account_number !== personalInfo.payment_method.account_number_confirm ? "Account numbers don't match" : ""}
                type="text"
              />
            )}
            
            <TextField
              label="Routing Number"
              name="payment_method.routing_number"
              value={personalInfo.payment_method.routing_number}
              onChange={handleInputChange}
              fullWidth
              disabled={!isEditing}
              type={isEditing ? "text" : "password"}
            />
            
            {personalInfo.country === 'KE' && (
              <TextField
                label="M-Pesa Phone Number"
                name="payment_method.mobile_wallet_id"
                value={personalInfo.payment_method.mobile_wallet_id}
                onChange={handleInputChange}
                fullWidth
                disabled={!isEditing}
                placeholder="e.g., 07XXXXXXXX"
              />
            )}
          </div>
        </div>
        
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField
              label="Name"
              name="emergency_contact.name"
              value={personalInfo.emergency_contact.name}
              onChange={handleInputChange}
              fullWidth
              disabled={!isEditing}
            />
            
            <TextField
              label="Relationship"
              name="emergency_contact.relationship"
              value={personalInfo.emergency_contact.relationship}
              onChange={handleInputChange}
              fullWidth
              disabled={!isEditing}
            />
            
            <TextField
              label="Phone Number"
              name="emergency_contact.phone"
              value={personalInfo.emergency_contact.phone}
              onChange={handleInputChange}
              fullWidth
              disabled={!isEditing}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default EmployeeManagement;