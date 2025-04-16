'use client';
import React, { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { axiosInstance } from '@/lib/axiosConfig';
import { countries } from 'countries-list';
import { format, parseISO } from 'date-fns';
import EmployeePermissions from './EmployeePermissions';
import { refreshUserSession } from '@/utils/refreshUserSession';

// Employee form component (defined outside the parent component)
const EmployeeFormComponent = ({ isEdit = false, onSubmit, newEmployee, handleInputChange, loading, setNewEmployee, setShowAddForm, setShowEditForm }) => {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">{isEdit ? 'Edit Employee' : 'Add New Employee'}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
          <input
            type="text"
            name="first_name"
            value={newEmployee.first_name}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
            autoComplete="off"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
          <input
            type="text"
            name="middle_name"
            value={newEmployee.middle_name}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            autoComplete="off"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
          <input
            type="text"
            name="last_name"
            value={newEmployee.last_name}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
            autoComplete="off"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            name="email"
            value={newEmployee.email}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
            autoComplete="off"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            name="phone_number"
            value={newEmployee.phone_number}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            autoComplete="off"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
          <input
            type="text"
            name="job_title"
            value={newEmployee.job_title}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
            autoComplete="off"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <input
            type="text"
            name="department"
            value={newEmployee.department}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            autoComplete="off"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Salary/Wage</label>
          <input
            type="number"
            name="salary"
            value={newEmployee.salary}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            min="0"
            step="0.01"
            autoComplete="off"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            name="role"
            value={newEmployee.role}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            {/* 
              Role values will be mapped to 4-6 char values in cognito.js:
              - EMPLOYEE -> EMPL
              - ADMIN -> ADMN
              - OWNER -> OWNR
            */}
            <option value="EMPLOYEE">Employee</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Joined</label>
          <input
            type="date"
            name="date_joined"
            value={newEmployee.date_joined}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
          <select
            name="employment_type"
            value={newEmployee.employment_type}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="FT">Full-time</option>
            <option value="PT">Part-time</option>
          </select>
        </div>
      </div>
      
      {!isEdit && (
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="invite_to_onboard"
              checked={newEmployee.invite_to_onboard}
              onChange={(e) => setNewEmployee(prev => ({ ...prev, invite_to_onboard: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Send invitation email with temporary password</span>
          </label>
        </div>
      )}
      
      <div className="flex justify-end gap-2">
        <button 
          type="button" 
          onClick={() => isEdit ? setShowEditForm(false) : setShowAddForm(false)}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Saving...' : (isEdit ? 'Update Employee' : 'Create Employee')}
        </button>
      </div>
    </form>
  );
};

// Memoize the form component to prevent unnecessary re-renders
const EmployeeForm = memo(EmployeeFormComponent);

/**
 * Employee Management Component
 * Handles CRUD operations for employees
 */
const EmployeeManagement = () => {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Assume authenticated initially

  // New employee form state
  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    job_title: '',
    department: '',
    salary: '',
    role: 'EMPLOYEE', // Will be mapped to 'EMPL' in cognito.js
    date_joined: new Date().toISOString().split('T')[0],
    dob: '',
    gender: '',
    marital_status: '',
    country: 'USA',
    street: '',
    city: '',
    postcode: '',
    employment_type: 'FT',
    invite_to_onboard: true,
  });

  const countryList = Object.entries(countries).map(([code, country]) => ({
    code,
    name: country.name,
  }));

  const getSecurityNumberType = (countryCode) => {
    switch (countryCode) {
      case 'US':
        return 'SSN';
      case 'UK':
        return 'NIN';
      case 'CA':
        return 'SIN';
      // Add more countries and their respective security number types
      default:
        return 'Other';
    }
  };

  // Fetch employees function that doesn't depend on handleAuthError
  const fetchEmployeesData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Add a custom header to help with debugging
      const response = await fetch('/api/hr/employees', {
        headers: {
          'X-Client-Side-Request': 'true'
        }
      });
      
      if (!response.ok) {
        // Handle different HTTP error codes gracefully
        if (response.status === 404) {
          setEmployees([]);
          setError('No employees found. You can add your first employee below.');
          return false;
        } else if (response.status === 401 || response.status === 403) {
          // Will be handled by the caller
          throw new Error(`Authentication error: ${response.status}`);
        } else {
          // Get error details from response if possible
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          
          // Specifically check for SSL error patterns
          if (errorData.code === 'EPROTO' || 
              (errorData.details && errorData.details.includes('SSL')) ||
              (errorData.details && errorData.details.includes('EPROTO'))) {
            console.error('SSL Protocol Error:', errorData);
            setError('SSL connection error. This is typically a development environment issue.');
            
            // In development, show mock employees
            if (process.env.NODE_ENV === 'development') {
              const mockEmployees = generateMockEmployees();
              setEmployees(mockEmployees);
              console.log('Using mock employees data due to SSL error');
              return true;
            }
            return false;
          }
          
          console.error('API Error:', errorData);
          setEmployees([]);
          setError(`Unable to load employees: ${errorData.details || errorData.error || response.status}`);
          return false;
        }
      } else {
        let data = await response.json();
        
        // Check if the data contains the is_mock flag
        const isMockData = Array.isArray(data) && data.length > 0 && data[0].is_mock === true;
        if (isMockData) {
          console.log('Server returned mock employee data');
          // Show a subtle indication that this is mock data
          setError('Note: Using mock employee data for demonstration purposes');
        }
        
        // Properly handle empty data - API might return empty array, null, or empty object
        if (!data || 
            (Array.isArray(data) && data.length === 0) || 
            (typeof data === 'object' && Object.keys(data).length === 0)) {
          // This is a normal empty result - show friendly message
          setEmployees([]);
          setError('No employees found. Get started by adding your first employee!');
          return true;
        } else if (Array.isArray(data)) {
          // We have employee data
          setEmployees(data);
          // Don't override the mock data message if it was set
          if (!isMockData) {
            setError(null);
          }
          return true;
        } else {
          // Unexpected response format
          console.error('Unexpected API response format:', data);
          setEmployees([]);
          setError('Received unexpected data format from server. Please try again later.');
          return false;
        }
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      // Check if this is an auth error
      if (err.message && (err.message.includes('401') || err.message.includes('Authentication error'))) {
        throw err; // Let the caller handle auth errors
      }
      
      // Check for SSL or network errors
      if (err.message && 
          (err.message.includes('SSL') || 
           err.message.includes('EPROTO') || 
           err.message.includes('Failed to fetch'))) {
        console.error('Network or SSL error:', err.message);
        setError('Network connection error. This may be due to SSL configuration issues.');
        
        // In development, show mock employees
        if (process.env.NODE_ENV === 'development') {
          const mockEmployees = generateMockEmployees();
          setEmployees(mockEmployees);
          console.log('Using mock employees data due to connection error');
          return true;
        }
      } else {
        // Handle other errors with user-friendly message
        setError('Unable to load employees at this time. Try refreshing the page.');
        setEmployees([]);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle authentication errors consistently - doesn't call fetchEmployees
  const handleAuthError = useCallback(async () => {
    setIsAuthenticated(false);
    setError('Authentication error. Please wait while we try to refresh your session...');
    
    try {
      // Try to refresh the session automatically
      const result = await refreshUserSession();
      if (result && result.tokens) {
        setIsAuthenticated(true);
        setError(null);
        return true;
      }
    } catch (refreshError) {
      console.error('Failed to refresh session:', refreshError);
    }
    
    // If refresh failed, show error message
    setError('Your session has expired. Please log in again to continue.');
    // In development mode, we'll still show mock data
    if (process.env.NODE_ENV === 'development') {
      setEmployees(generateMockEmployees());
    } else {
      setEmployees([]);
    }
    return false;
  }, []);

  // Higher-level function that coordinates fetch and auth handling
  const fetchEmployees = useCallback(async () => {
    try {
      await fetchEmployeesData();
    } catch (err) {
      if (err.message && (err.message.includes('401') || err.message.includes('Authentication error'))) {
        // Handle auth errors
        await handleAuthError();
      } else {
        // Rethrow other errors
        throw err;
      }
    }
  }, [fetchEmployeesData, handleAuthError]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Generate mock employees for development
  const generateMockEmployees = () => {
    return [
      {
        id: uuidv4(),
        employee_number: 'EMP-000001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        job_title: 'Software Engineer',
        department: 'Engineering',
        salary: 85000,
        date_joined: '2022-01-15',
        active: true,
        role: 'EMPLOYEE'
      },
      {
        id: uuidv4(),
        employee_number: 'EMP-000002',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        job_title: 'Product Manager',
        department: 'Product',
        salary: 95000,
        date_joined: '2022-02-01',
        active: true,
        role: 'ADMIN'
      },
      {
        id: uuidv4(),
        employee_number: 'EMP-000003',
        first_name: 'Michael',
        last_name: 'Johnson',
        email: 'michael.johnson@example.com',
        job_title: 'Marketing Specialist',
        department: 'Marketing',
        salary: 75000,
        date_joined: '2022-03-15',
        active: true,
        role: 'EMPLOYEE'
      }
    ];
  };

  // Handle form input changes
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // Use a function-based state update to avoid dependencies on newEmployee
    setNewEmployee(prev => ({
      ...prev,
      [name]: value
    }));
  }, [setNewEmployee]);

  // Handle employee creation
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!newEmployee.first_name || !newEmployee.last_name || !newEmployee.email || !newEmployee.job_title) {
      setNotification({
        show: true,
        message: 'Please fill in all required fields',
        type: 'error'
      });
      return;
    }
    
    if (!isAuthenticated && process.env.NODE_ENV !== 'development') {
      setNotification({
        show: true,
        message: 'You need to log in to create employees',
        type: 'error'
      });
      return;
    }
    
    setLoading(true);
    try {
      // Create employee API call with improved error handling
      const response = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Side-Request': 'true'
        },
        body: JSON.stringify(newEmployee)
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleAuthError();
          throw new Error('Authentication failed');
        }
        
        // Try to get error details from the response
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.details || errorData.error || `Failed to create employee (Status: ${response.status})`);
      }
      
      const employeeCreationResponse = await response.json();
      
      // Continue with the invitation step if employee creation was successful
      // If invite_to_onboard is checked, create a user account and send invitation email
      if (newEmployee.invite_to_onboard) {
        try {
          // Note: Employee inherits the owner's tenant ID from the server session
          const inviteResponse = await fetch('/api/hr/employees/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: newEmployee.email,
              firstName: newEmployee.first_name,
              lastName: newEmployee.last_name,
              role: newEmployee.role,
              // Get company name from environment variables
              companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Your Company Name' 
            })
          });
          
          if (!inviteResponse.ok) {
            const errorText = await inviteResponse.text();
            console.error('Failed to send invitation email:', errorText);
            
            // Try to parse the error as JSON
            let errorDetails;
            try {
              errorDetails = JSON.parse(errorText);
            } catch (e) {
              errorDetails = { error: 'Unknown error', details: errorText };
            }
            
            // Check if it's a "user already exists" error
            if (errorDetails.details && errorDetails.details.includes('already exists')) {
              setNotification({
                show: true,
                message: 'This email address already has an account. Please use a different email or try resetting their password.',
                type: 'warning'
              });
            } else {
              // Continue with employee creation even if invitation fails with other errors
              setNotification({
                show: true,
                message: 'Employee created successfully, but invitation email could not be sent',
                type: 'warning'
              });
            }
          } else {
            const inviteData = await inviteResponse.json();
            console.log('Invitation response:', inviteData);
            
            // Check if the user already existed
            if (inviteData.userExists) {
              // Show a message that we're resending the invitation to an existing user
              setNotification({
                show: true,
                message: inviteData.verificationUrl 
                  ? (
                    <div>
                      <p>This email already has an account. A new verification link has been generated.</p>
                      <p className="mt-2">Share this verification link with the employee:</p>
                      <div className="mt-2 p-2 bg-gray-100 rounded-md break-all">
                        <a 
                          href={inviteData.verificationUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {inviteData.verificationUrl}
                        </a>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(inviteData.verificationUrl);
                          alert('Verification link copied to clipboard!');
                        }}
                        className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Copy Link
                      </button>
                    </div>
                  )
                  : 'A new invitation has been sent to the existing employee account.',
                type: 'info'
              });
            } else if (inviteData.verificationUrl) {
              // Check if we got a verification URL (development mode without SES)
              setNotification({
                show: true,
                message: (
                  <div>
                    <p>Employee created successfully. Email sending is disabled in development.</p>
                    <p className="mt-2">Share this verification link with the employee:</p>
                    <div className="mt-2 p-2 bg-gray-100 rounded-md break-all">
                      <a 
                        href={inviteData.verificationUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {inviteData.verificationUrl}
                      </a>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(inviteData.verificationUrl);
                        alert('Verification link copied to clipboard!');
                      }}
                      className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Copy Link
                    </button>
                  </div>
                ),
                type: 'info'
              });
            } else {
              setNotification({
                show: true,
                message: 'Employee created successfully and invitation email sent',
                type: 'success'
              });
            }
          }
        } catch (inviteError) {
          console.error('Error sending invitation:', inviteError);
          setNotification({
            show: true,
            message: 'Employee created successfully, but invitation email could not be sent',
            type: 'warning'
          });
        }
      } else {
        // No invitation needed
        setNotification({
          show: true,
          message: 'Employee created successfully',
          type: 'success'
        });
      }
      
      // Add the new employee to the local state
      const newEmployeeWithId = {
        ...newEmployee,
        id: employeeCreationResponse.id || uuidv4(),
        employee_number: employeeCreationResponse.employee_number || `EMP-${String(employees.length + 1).padStart(6, '0')}`,
        active: true
      };
      
      setEmployees(prev => [...prev, newEmployeeWithId]);
      setShowAddForm(false);
      
      // Reset the form
      setNewEmployee({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        job_title: '',
        department: '',
        salary: '',
        role: 'EMPLOYEE',
        date_joined: new Date().toISOString().split('T')[0],
        dob: '',
        gender: '',
        marital_status: '',
        country: 'USA',
        street: '',
        city: '',
        postcode: '',
        employment_type: 'FT',
        invite_to_onboard: true,
      });
    } catch (err) {
      console.error('Error creating employee:', err);
      if (err.message === 'Authentication failed') {
        // Already handled by handleAuthError
      } else {
        setNotification({
          show: true,
          message: 'Failed to create employee',
          type: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle employee update
  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    
    if (!selectedEmployee) return;
    
    if (!isAuthenticated && process.env.NODE_ENV !== 'development') {
      setNotification({
        show: true,
        message: 'You need to log in to update employees',
        type: 'error'
      });
      return;
    }
    
    setLoading(true);
    try {
      // In a real implementation, this would call the API
      if (process.env.NODE_ENV !== 'development') {
        const response = await fetch(`/api/hr/employees/${selectedEmployee.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEmployee)
        });
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            handleAuthError();
            throw new Error('Authentication failed');
          }
          throw new Error('Failed to update employee');
        }
      }
      
      // Simulate API call for development
      setEmployees(prev => 
        prev.map(emp => 
          emp.id === selectedEmployee.id ? { ...emp, ...newEmployee } : emp
        )
      );
      
      setShowEditForm(false);
      setSelectedEmployee(null);
      
      setNotification({
        show: true,
        message: 'Employee updated successfully',
        type: 'success'
      });
    } catch (err) {
      console.error('Error updating employee:', err);
      if (err.message === 'Authentication failed') {
        // Already handled by handleAuthError
      } else {
        setNotification({
          show: true,
          message: 'Failed to update employee',
          type: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle employee deletion
  const handleDeleteEmployee = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    
    setLoading(true);
    try {
      // In a real implementation, this would call the API
      // const response = await fetch(`/api/hr/employees/${employeeId}`, {
      //   method: 'DELETE'
      // });
      // if (!response.ok) throw new Error('Failed to delete employee');
      
      // Simulate API call for development
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
      
      setNotification({
        show: true,
        message: 'Employee deleted successfully',
        type: 'success'
      });
    } catch (err) {
      console.error('Error deleting employee:', err);
      setNotification({
        show: true,
        message: 'Failed to delete employee',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle editing an employee
  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setNewEmployee({
      first_name: employee.first_name || '',
      middle_name: employee.middle_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      phone_number: employee.phone_number || '',
      job_title: employee.job_title || '',
      department: employee.department || '',
      salary: employee.salary || '',
      role: employee.role || 'EMPLOYEE',
      date_joined: employee.date_joined || new Date().toISOString().split('T')[0],
      dob: employee.dob || '',
      gender: employee.gender || '',
      marital_status: employee.marital_status || '',
      country: employee.country || 'USA',
      street: employee.street || '',
      city: employee.city || '',
      postcode: employee.postcode || '',
      employment_type: employee.employment_type || 'FT',
    });
    setShowEditForm(true);
  };

  // Handle resending an invitation email to an employee
  const handleResendInvitation = async (employee) => {
    if (!employee || !employee.email) return;
    
    setLoading(true);
    try {
      const inviteResponse = await fetch('/api/hr/employees/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: employee.email,
          firstName: employee.first_name,
          lastName: employee.last_name,
          role: employee.role || 'EMPLOYEE',
          companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Your Company Name'
        })
      });
      
      if (!inviteResponse.ok) {
        const errorText = await inviteResponse.text();
        console.error('Failed to send invitation email:', errorText);
        setNotification({
          show: true,
          message: 'Failed to send invitation email',
          type: 'error'
        });
      } else {
        const inviteData = await inviteResponse.json();
        console.log('Invitation response:', inviteData);
        
        if (inviteData.verificationUrl) {
          // Show the verification URL in development mode
          setNotification({
            show: true,
            message: (
              <div>
                <p>Invitation email is disabled in development environment.</p>
                <p className="mt-2">Share this verification link with the employee:</p>
                <div className="mt-2 p-2 bg-gray-100 rounded-md break-all">
                  <a 
                    href={inviteData.verificationUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {inviteData.verificationUrl}
                  </a>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(inviteData.verificationUrl);
                    alert('Verification link copied to clipboard!');
                  }}
                  className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Copy Link
                </button>
              </div>
            ),
            type: 'info'
          });
        } else {
          setNotification({
            show: true,
            message: 'Invitation email sent successfully',
            type: 'success'
          });
        }
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setNotification({
        show: true,
        message: 'Failed to send invitation email',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset notification after display
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ ...notification, show: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Redirect to login if not authenticated
  const redirectToLogin = () => {
    router.push('/login');
  };

  // Add a function to refresh the session manually
  const refreshSession = async () => {
    setLoading(true);
    try {
      const refreshed = await handleAuthError();
      if (refreshed) {
        await fetchEmployeesData();
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employee Management</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Add New Employee
        </button>
      </div>
      
      {/* Notification */}
      {notification.show && (
        <div className={`fixed bottom-4 left-4 rounded-md p-4 max-w-md shadow-lg ${
          notification.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' : 
          notification.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
          notification.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
          'bg-blue-50 border-l-4 border-blue-500'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : notification.type === 'error' ? (
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              ) : notification.type === 'warning' ? (
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <div className={`text-sm font-medium ${
                notification.type === 'success' ? 'text-green-700' : 
                notification.type === 'error' ? 'text-red-700' :
                notification.type === 'warning' ? 'text-yellow-700' :
                'text-blue-700'
              }`}>
                {typeof notification.message === 'string' ? notification.message : (
                  <div className="notification-content">{notification.message}</div>
                )}
              </div>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setNotification({ ...notification, show: false })}
                  className={`inline-flex rounded-md p-1.5 ${
                    notification.type === 'success' ? 'text-green-500 hover:bg-green-100' : 
                    notification.type === 'error' ? 'text-red-500 hover:bg-red-100' :
                    notification.type === 'warning' ? 'text-yellow-500 hover:bg-yellow-100' :
                    'text-blue-500 hover:bg-blue-100'
                  }`}
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Employee Form */}
      {showAddForm && (
        <EmployeeForm 
          onSubmit={handleCreateEmployee}
          newEmployee={newEmployee}
          handleInputChange={handleInputChange}
          loading={loading}
          setNewEmployee={setNewEmployee}
          setShowAddForm={setShowAddForm}
          setShowEditForm={setShowEditForm}
        />
      )}
      
      {/* Edit Employee Form */}
      {showEditForm && (
        <EmployeeForm 
          isEdit={true} 
          onSubmit={handleUpdateEmployee}
          newEmployee={newEmployee}
          handleInputChange={handleInputChange}
          loading={loading}
          setNewEmployee={setNewEmployee}
          setShowAddForm={setShowAddForm}
          setShowEditForm={setShowEditForm}
        />
      )}
      
      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded-l-md"
          />
          <button 
            onClick={() => console.log('Search:', searchQuery)}
            className="px-4 py-2 text-white bg-blue-600 rounded-r-md hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </div>
      
      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && !employees.length ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading employees...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="mb-4 text-amber-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            {error.includes('session has expired') ? (
              <button 
                onClick={redirectToLogin}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 mr-2"
              >
                Log In Again
              </button>
            ) : error.includes('Authentication error') ? (
              <button 
                onClick={refreshSession}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 mr-2"
              >
                Refresh Session
              </button>
            ) : (
              <button 
                onClick={fetchEmployees}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            )}
          </div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mb-4 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">No employees found. Add your first employee to get started!</p>
            <button 
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add Employee
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {`${employee.first_name} ${employee.last_name}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{employee.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.job_title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{employee.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${employee.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {employee.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleResendInvitation(employee)}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        Invite
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeManagement;