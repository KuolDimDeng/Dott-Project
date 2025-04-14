'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { axiosInstance } from '@/lib/axiosConfig';
import { countries } from 'countries-list';
import { format, parseISO } from 'date-fns';
import EmployeePermissions from './EmployeePermissions';

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

  // Fetch employees from AWS AppSync or Cognito
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      // In a real implementation, this would use AWS AppSync, here we're simulating for development
      const response = await fetch('/api/hr/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      
      let data = await response.json();
      
      // If we don't have real data, generate some mock data for development
      if (!data || data.length === 0) {
        data = generateMockEmployees();
      }
      
      setEmployees(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees. Please try again.');
      // Use mock data as fallback
      setEmployees(generateMockEmployees());
    } finally {
      setLoading(false);
    }
  }, []);

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
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee(prev => ({
      ...prev,
      [name]: value
    }));
  };

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
    
    setLoading(true);
    try {
      // In a real implementation, this would call the API
      // const response = await fetch('/api/hr/employees', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newEmployee)
      // });
      // if (!response.ok) throw new Error('Failed to create employee');
      
      // Simulate API call for development
      const newEmployeeWithId = {
        ...newEmployee,
        id: uuidv4(),
        employee_number: `EMP-${String(employees.length + 1).padStart(6, '0')}`,
        active: true
      };
      
      setEmployees(prev => [...prev, newEmployeeWithId]);
      setShowAddForm(false);
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
      
      setNotification({
        show: true,
        message: 'Employee created successfully',
        type: 'success'
      });
      
      // In a real implementation, we would also send an invite email here
      if (newEmployee.invite_to_onboard) {
        console.log(`Invitation email would be sent to ${newEmployee.email}`);
      }
    } catch (err) {
      console.error('Error creating employee:', err);
      setNotification({
        show: true,
        message: 'Failed to create employee',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle employee update
  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    
    if (!selectedEmployee) return;
    
    setLoading(true);
    try {
      // In a real implementation, this would call the API
      // const response = await fetch(`/api/hr/employees/${selectedEmployee.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newEmployee)
      // });
      // if (!response.ok) throw new Error('Failed to update employee');
      
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
      setNotification({
        show: true,
        message: 'Failed to update employee',
        type: 'error'
      });
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

  // Reset notification after display
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ ...notification, show: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Employee form (shared between add and edit)
  const EmployeeForm = ({ isEdit = false, onSubmit }) => (
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
      
      {notification.show && (
        <div className={`p-4 mb-4 rounded-md ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {notification.message}
        </div>
      )}
      
      {/* Add Employee Form */}
      {showAddForm && (
        <EmployeeForm onSubmit={handleCreateEmployee} />
      )}
      
      {/* Edit Employee Form */}
      {showEditForm && (
        <EmployeeForm isEdit={true} onSubmit={handleUpdateEmployee} />
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
          <div className="p-4 text-center">Loading employees...</div>
        ) : error ? (
          <div className="p-4 text-center text-red-600">{error}</div>
        ) : employees.length === 0 ? (
          <div className="p-4 text-center">No employees found. Add your first employee!</div>
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