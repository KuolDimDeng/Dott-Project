'use client';


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { getCacheValue, setCacheValue } from @/utils/appCache';
import { extractTenantId, getSecureTenantId } from '@/utils/tenantUtils';
import { refreshUserSession } from '@/utils/refreshUserSession';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { logger } from '@/utils/logger';
import api from '@/utils/api';

const EmployeeTaxManagement = () => {
  // Toast notifications
  const notifySuccess = (message) => toast.success(message);
  const notifyError = (message) => toast.error(message);
  const notifyInfo = (message) => toast.loading(message);
  const notifyWarning = (message) => toast.error(message, { icon: '⚠️' });

  // State management
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [taxForms, setTaxForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMounted, setIsMounted] = useState(true);
  
  // Initialize tenantId from AppCache
  const getTenantId = useCallback(() => {
    try {
      return typeof window !== 'undefined' ? 
        getCacheValue('tenantId') || getCacheValue('businessid') || 'default' :
        'default';
    } catch (e) {
      console.error('Error accessing AppCache for tenantId:', e);
      return 'default';
    }
  }, []);
  
  const [tenantId, setTenantId] = useState(getTenantId());
  
  const [taxFormData, setTaxFormData] = useState({
    form_type: 'W4',
    tax_year: new Date().getFullYear(),
    filing_status: 'single',
    allowances: 0,
    additional_withholding: 0,
    exemptions: false,
    state_code: 'NY',
    employee_id: '',
    is_submitted: false,
    effective_date: new Date()
  });
  const [formFile, setFormFile] = useState(null);

  // Set up refs for cleanup
  const fetchEmployeesRef = React.useRef(null);
  const fetchTaxFormsRef = React.useRef(null);

  // Ensure component cleanup
  useEffect(() => {
    return () => {
      setIsMounted(false);
      if (fetchEmployeesRef.current) {
        clearTimeout(fetchEmployeesRef.current);
      }
      if (fetchTaxFormsRef.current) {
        clearTimeout(fetchTaxFormsRef.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [searchQuery]);

  // Filter employees based on search query
  useEffect(() => {
    if (employees.length > 0) {
      const query = searchQuery.toLowerCase().trim();
      if (!query) {
        setFilteredEmployees(employees);
      } else {
        const filtered = employees.filter(employee => 
          (employee.first_name && employee.first_name.toLowerCase().includes(query)) ||
          (employee.last_name && employee.last_name.toLowerCase().includes(query)) ||
          (employee.email && employee.email.toLowerCase().includes(query)) ||
          (employee.department && employee.department.toLowerCase().includes(query)) ||
          (employee.job_title && employee.job_title.toLowerCase().includes(query))
        );
        setFilteredEmployees(filtered);
      }
    } else {
      setFilteredEmployees([]);
    }
  }, [employees, searchQuery]);

  const fetchEmployees = async () => {
    // Clear any previous timeout
    if (fetchEmployeesRef.current) {
      clearTimeout(fetchEmployeesRef.current);
    }
    
    // Add debounce for search
    fetchEmployeesRef.current = setTimeout(async () => {
      if (!isMounted) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get secure tenant ID
        const currentTenantId = getTenantId();
        
        if (!currentTenantId) {
          setError('Unable to determine your organization ID. Please try refreshing the page.');
          setLoading(false);
          return;
        }
        
        // Use the API utility to fetch employees with proper auth
        const response = await api.get(`/api/hr/employees`, {
          params: { 
            q: searchQuery,
            tenant_id: currentTenantId
          }
        });
        
        if (!isMounted) return;
        
        if (response && response.data) {
          if (Array.isArray(response.data)) {
            setEmployees(response.data);
          } else if (response.data.employees && Array.isArray(response.data.employees)) {
            setEmployees(response.data.employees);
          } else {
            // Handle empty response gracefully
            setEmployees([]);
          }
        } else {
          // API returned no data
          setEmployees([]);
        }
      } catch (error) {
        logger.error('[EmployeeTaxManagement] Error fetching employees:', error);
        
        if (!isMounted) return;
        
        // Handle authentication errors
        if (error.status === 401 || (error.message && error.message.includes('Authentication'))) {
          // Try to refresh the session
          try {
            await refreshUserSession();
            notifyInfo('Refreshing your session...');
            // Retry fetch after session refresh
            fetchEmployees();
          } catch (refreshError) {
            setError('Authentication error. Please refresh the page and log in again.');
          }
        } else {
          setError('Failed to load employees. Please try again.');
        }
        
        // Set empty array on error
        setEmployees([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }, 500); // 500ms debounce
  };

  const fetchTaxForms = async (employeeId) => {
    if (!employeeId) {
      notifyError('No employee selected');
      return;
    }
    
    // Clear any previous timeout
    if (fetchTaxFormsRef.current) {
      clearTimeout(fetchTaxFormsRef.current);
    }
    
    fetchTaxFormsRef.current = setTimeout(async () => {
      if (!isMounted) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get secure tenant ID
        const currentTenantId = getTenantId();
        
        // Use the API utility to fetch tax forms with proper auth
        const response = await api.get(`/api/taxes/forms/employee/${employeeId}`, {
          params: { tenant_id: currentTenantId }
        });
        
        if (!isMounted) return;
        
        if (response && response.data) {
          if (Array.isArray(response.data)) {
            setTaxForms(response.data);
          } else if (response.data.forms && Array.isArray(response.data.forms)) {
            setTaxForms(response.data.forms);
          } else {
            // Handle empty response gracefully
            setTaxForms([]);
          }
        } else {
          // API returned no data
          setTaxForms([]);
        }
      } catch (error) {
        logger.error('[EmployeeTaxManagement] Error fetching tax forms:', error);
        
        if (!isMounted) return;
        
        // Handle authentication errors
        if (error.status === 401 || (error.message && error.message.includes('Authentication'))) {
          // Try to refresh the session
          try {
            await refreshUserSession();
            // Retry fetch after session refresh
            fetchTaxForms(employeeId);
          } catch (refreshError) {
            setError('Authentication error. Please refresh the page and log in again.');
          }
        } else {
          setError('Failed to load tax forms. Please try again.');
        }
        
        // Set empty array on error
        setTaxForms([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }, 300); // 300ms debounce
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearch = () => {
    fetchEmployees();
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    fetchTaxForms(employee.id);
    setTabValue(1);
  };

  const handleOpenDialog = () => {
    if (!selectedEmployee) {
      notifyWarning('Please select an employee first');
      return;
    }
    
    setTaxFormData({
      ...taxFormData,
      employee_id: selectedEmployee.id
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleFormChange = (event) => {
    const { name, value, checked, type } = event.target;
    setTaxFormData({
      ...taxFormData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleDateChange = (field, date) => {
    setTaxFormData({
      ...taxFormData,
      [field]: date
    });
  };

  const handleFileChange = (event) => {
    setFormFile(event.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(taxFormData).forEach(key => {
        if (key === 'effective_date') {
          formData.append(key, new Date(taxFormData[key]).toISOString().split('T')[0]);
        } else {
          formData.append(key, taxFormData[key]);
        }
      });
      
      if (formFile) {
        formData.append('file', formFile);
      }

      // Replace with your actual API endpoint
      const response = await axiosInstance.post('/api/taxes/forms/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      notifySuccess('Tax form successfully submitted');
      
      // Refresh tax forms
      fetchTaxForms(selectedEmployee.id);
      handleCloseDialog();
    } catch (error) {
      console.error('Error submitting tax form:', error);
      notifyError('Failed to submit tax form');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    // Basic validation
    if (!taxFormData.form_type || !taxFormData.tax_year || !taxFormData.filing_status) {
      notifyWarning('Please fill in all required fields');
      return false;
    }
    
    if (!formFile && taxFormData.is_submitted) {
      notifyWarning('Please upload a form file for submitted forms');
      return false;
    }
    
    return true;
  };

  const handleDeleteForm = async (formId) => {
    if (!window.confirm('Are you sure you want to delete this tax form?')) {
      return;
    }
    
    setLoading(true);
    try {
      // Replace with your actual API endpoint
      await axiosInstance.delete(`/api/taxes/forms/${formId}/`);
      
      notifySuccess('Tax form successfully deleted');
      
      // Refresh tax forms
      fetchTaxForms(selectedEmployee.id);
    } catch (error) {
      console.error('Error deleting tax form:', error);
      notifyError('Failed to delete tax form');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadForm = async (formId) => {
    try {
      // Replace with your actual API endpoint
      const response = await axiosInstance.get(`/api/taxes/forms/${formId}/download/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tax_form_${formId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading tax form:', error);
      notifyError('Failed to download tax form');
    }
  };

  // Employee search view
  const renderEmployeeSearch = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Employee Tax Management</h1>
        <p className="text-gray-600">
          Select an employee to manage their tax forms and information.
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search employees by name, email, or department..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          <p className="font-medium">Error</p>
          <p>{error}</p>
          <button 
            onClick={fetchEmployees}
            className="mt-2 px-4 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            strokeWidth="1.5"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery.trim() ? `No results match "${searchQuery}"` : "Get started by adding employees to your organization."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.employee_number || employee.id.substring(0, 8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                          {employee.first_name?.[0]}{employee.last_name?.[0]}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.department || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.job_title || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEmployeeSelect(employee)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Manage Tax Forms
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Employee tax forms view
  const renderEmployeeTaxForms = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-2xl font-semibold">
            Tax Forms for {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : ''}
          </h1>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
            onClick={handleOpenDialog}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Add Tax Form</span>
          </button>
        </div>
      </div>
      
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Employee ID</p>
            <p className="mt-1">{selectedEmployee?.employee_number || selectedEmployee?.id.substring(0, 8)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Department</p>
            <p className="mt-1">{selectedEmployee?.department || 'Not assigned'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Job Title</p>
            <p className="mt-1">{selectedEmployee?.job_title || 'Not assigned'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="mt-1">{selectedEmployee?.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Tax Filing Status</p>
            <p className="mt-1">
              {selectedEmployee?.tax_filing_status === 'S' ? 'Single' : 
               selectedEmployee?.tax_filing_status === 'M' ? 'Married Filing Jointly' : 
               selectedEmployee?.tax_filing_status === 'H' ? 'Head of Household' : 'Not Specified'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <h2 className="text-lg font-medium mb-4">Tax Forms</h2>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
            <p className="font-medium">Error</p>
            <p>{error}</p>
            <button 
              onClick={() => fetchTaxForms(selectedEmployee.id)}
              className="mt-2 px-4 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
            >
              Try Again
            </button>
          </div>
        ) : taxForms.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tax forms</h3>
            <p className="mt-1 text-sm text-gray-500">
              No tax forms have been added for this employee yet.
            </p>
            <div className="mt-6">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleOpenDialog}
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add a Tax Form
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Form Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tax Year
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filing Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submission Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {taxForms.map((form) => (
                  <tr key={form.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {form.form_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {form.tax_year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {form.filing_status === 'single' ? 'Single' : 
                       form.filing_status === 'married_joint' ? 'Married Filing Jointly' :
                       form.filing_status === 'married_separate' ? 'Married Filing Separately' :
                       form.filing_status === 'head_household' ? 'Head of Household' : form.filing_status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {form.state_code || 'Federal'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {form.submission_date ? new Date(form.submission_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        form.is_submitted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {form.is_submitted ? "Submitted" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => console.log('Edit form', form.id)}
                        >
                          Edit
                        </button>
                        
                        {form.is_submitted && (
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => handleDownloadForm(form.id)}
                          >
                            Download
                          </button>
                        )}
                        
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDeleteForm(form.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <button 
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            onClick={() => setTabValue(0)}
          >
            Back to Employee Search
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      {tabValue === 0 ? renderEmployeeSearch() : renderEmployeeTaxForms()}
      
      {/* Dialog for adding new tax form - will be converted in a separate step */}
      {openDialog && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Add New Tax Form
                    </h3>
                    <div className="mt-2">
                      <form className="space-y-4">
                        {/* Form fields will be updated in a separate step */}
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></div>
                      Submitting...
                    </div>
                  ) : 'Submit'}
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTaxManagement;