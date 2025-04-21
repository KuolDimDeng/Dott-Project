'use client';
import React, { useState, useEffect, useCallback, memo, Fragment, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { axiosInstance, backendHrApiInstance, resetCircuitBreakers } from '@/lib/axiosConfig';
import { countries } from 'countries-list';
import { format, parseISO } from 'date-fns';
import { refreshUserSession } from '@/utils/refreshUserSession';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useTable, usePagination, useSortBy } from 'react-table';
import { extractTenantId, getSecureTenantId } from '@/utils/tenantUtils';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { Button, Typography, Alert } from '@mui/material';
// Import the API utilities
import api from '@/utils/api';
import { logger } from '@/utils/logger';
import { employeeApi } from '@/utils/apiClient';
import { invalidateCache } from '@/utils/apiHelpers';
import { verifyBackendConnection } from '@/lib/axiosConfig';
import BackendConnectionCheck from '../BackendConnectionCheck';

// Employee Form Component
const EmployeeFormComponent = ({ isEdit = false, onSubmit, newEmployee, handleInputChange, isLoading, setNewEmployee, setShowAddForm, setShowEditForm }) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input
            type="text"
            name="first_name"
            value={newEmployee.first_name || ''}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input
            type="text"
            name="last_name"
            value={newEmployee.last_name || ''}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={newEmployee.email || ''}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="text"
            name="phone_number"
            value={newEmployee.phone_number || ''}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button 
          variant="outlined"
          color="secondary"
          onClick={() => isEdit ? setShowEditForm(false) : setShowAddForm(false)}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          variant="contained"
          color="primary"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
        </Button>
      </div>
    </form>
  );
};

// Memoize the form component to prevent unnecessary re-renders
const EmployeeForm = memo(EmployeeFormComponent);

const EmployeeManagement = () => {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConnectionChecker, setShowConnectionChecker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    job_title: '',
    department: '',
    dob: null,
    date_joined: null,
    role: 'EMPLOYEE',
  });
  
  // Function to manually refresh the user session
  const refreshSession = async () => {
    try {
      setLoading(true);
      const refreshed = await refreshUserSession();
      if (refreshed) {
        setError(null);
        toast.success('Session refreshed successfully');
        fetchEmployees(); // Retry fetching data
      } else {
        setError('Failed to refresh session. Please log in again.');
      }
    } catch (error) {
      logger.error('[EmployeeManagement] Error refreshing session:', error);
      setError('Failed to refresh session. Please log in again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle login redirection on session expiration
  const redirectToLogin = () => {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `/login?expired=true&redirect=${encodeURIComponent(currentPath)}`;
  };

  // Handle creating a new employee
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      // Format the employee data for the API
      const formattedEmployee = {
        ...newEmployee,
        dob: newEmployee.dob ? new Date(newEmployee.dob).toISOString().split('T')[0] : null,
        date_joined: newEmployee.date_joined ? new Date(newEmployee.date_joined).toISOString().split('T')[0] : null,
      };

      // Log the data being sent
      logger.debug('[EmployeeManagement] Creating employee:', formattedEmployee);
      
      // Send the API request
      const response = await employeeApi.createEmployee(formattedEmployee);
      
      // Handle the success response
      logger.info('[EmployeeManagement] Employee created successfully:', response);
      toast.success('Employee created successfully');
      
      // Update the UI
      setShowAddForm(false);
      fetchEmployees(); // Refresh the employee list
      
      // Reset the form
      setNewEmployee({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        job_title: '',
        department: '',
        dob: null,
        date_joined: null,
        role: 'EMPLOYEE',
      });
    } catch (error) {
      // Handle errors
      logger.error('[EmployeeManagement] Error creating employee:', error);
      
      let errorMessage = 'Failed to create employee. Please try again.';
      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (typeof error.response.data === 'object') {
          errorMessage = Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Fetch employees from the API
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await employeeApi.getEmployees();
      setEmployees(response || []);
    } catch (error) {
      logger.error('[EmployeeManagement] Error fetching employees:', error);
      setError('Failed to load employees. Please try again.');
      setShowConnectionChecker(true);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Load employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);
  
  // Handle connection restoration
  const handleConnectionRestored = () => {
    setShowConnectionChecker(false);
    fetchEmployees();
  };
  
  return (
    <div className="relative">
      {/* Error display with connection checker */}
      {error && (
        <div className="mb-4">
          <Alert severity="error" className="mb-2">
            {error}
          </Alert>
          {showConnectionChecker && (
            <BackendConnectionCheck onConnectionRestored={handleConnectionRestored} />
          )}
        </div>
      )}

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <Typography variant="h4" component="h1" className="mb-4 sm:mb-0">
            Employee Management
          </Typography>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setShowAddForm(true);
                setIsCreating(false);
                setIsEditing(false);
                setShowEmployeeDetails(false);
                setSelectedEmployee(null);
              }}
              startIcon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            >
              Add Employee
            </Button>
          </div>
        </div>
      </div>
      
      {/* Show backend connection checker if we have connection issues */}
      {showConnectionChecker && (
        <BackendConnectionCheck onConnectionRestored={handleConnectionRestored} />
      )}

      {/* Employee Forms */}
      <div className="mt-4">
        {showAddForm && !showEmployeeDetails && (
          <EmployeeForm 
            onSubmit={handleCreateEmployee}
            newEmployee={newEmployee}
            handleInputChange={handleInputChange}
            isLoading={isCreating}
            setNewEmployee={setNewEmployee}
            setShowAddForm={setShowAddForm}
          />
        )}
        
        {showEditForm && selectedEmployee && (
          <EmployeeForm 
            isEdit={true}
            onSubmit={() => {}}
            newEmployee={newEmployee}
            handleInputChange={handleInputChange}
            isLoading={isEditing}
            setNewEmployee={setNewEmployee}
            setShowEditForm={setShowEditForm}
          />
        )}
      </div>
      
      {/* Employee List will go here */}
      
    </div>
  );
};

export default EmployeeManagement; 