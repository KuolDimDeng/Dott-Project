'use client';
import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { countries } from 'countries-list';
import { format, parseISO } from 'date-fns';
import EmployeePermissions from './EmployeePermissions';

const EmployeeManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [payrollProgress, setPayrollProgress] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openDialog, setOpenDialog] = useState(false);
  const [openPermissionsDialog, setOpenPermissionsDialog] = useState(false);

  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    dob: null,
    gender: '',
    marital_status: '',
    nationality: '',
    street: '',
    postcode: '',
    city: '',
    country: '',
    email: '',
    security_number_type: 'SSN',
    security_number: '',
    invite_to_onboard: false,
    date_joined: null,
    wage_type: 'salary',
    salary: '',
    wage_rate: '',
    direct_deposit: false,
    department: '',
    job_title: '',
    role: '',
    phone_number: '',
    address: '',
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

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axiosInstance.get(`/api/hr/employees/?q=${searchQuery}`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === 'country') {
      const securityNumberType = getSecurityNumberType(value);
      setNewEmployee((prev) => ({
        ...prev,
        [name]: value,
        security_number_type: securityNumberType,
      }));
    } else {
      setNewEmployee((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleDateChange = (name, value) => {
    setNewEmployee((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatDate = (date) => {
    if (!date) return '';
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, 'yyyy-MM-dd');
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setSnackbar({ open: false, message: '', severity: 'success' });
    try {
      const formattedEmployee = {
        ...newEmployee,
        dob: formatDate(newEmployee.dob),
        date_joined: formatDate(newEmployee.date_joined),
      };

      console.log('Sending employee data:', formattedEmployee);
      const response = await axiosInstance.post('/api/hr/employees/create/', formattedEmployee);
      console.log('Employee created:', response.data);

      fetchEmployees();
      setActiveTab(2);
      setPayrollProgress(20); // Increase progress when employee is added
      setSnackbar({ open: true, message: 'Employee created successfully', severity: 'success' });

      // Reset the form
      setNewEmployee({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        dob: null,
        gender: '',
        marital_status: '',
        nationality: '',
        street: '',
        postcode: '',
        city: '',
        country: '',
        security_number_type: 'SSN',
        security_number: '',
        invite_to_onboard: false,
        date_joined: null,
        wage_type: 'salary',
        salary: '',
        wage_rate: '',
        direct_deposit: false,
        department: '',
        job_title: '',
        role: '',
        phone_number: '',
        address: '',
      });
    } catch (error) {
      console.error('Error creating employee:', error);
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
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setActiveTab(1);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearch = () => {
    fetchEmployees();
  };

  const validateForm = () => {
    const requiredFields = ['first_name', 'last_name', 'email', 'dob', 'date_joined', 'role'];
    const missingFields = requiredFields.filter((field) => !newEmployee[field]);
    if (missingFields.length > 0) {
      setSnackbar({
        open: true,
        message: `Please fill in the following required fields: ${missingFields.join(', ')}`,
        severity: 'error',
      });
      return false;
    }
    return true;
  };

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setSelectedEmployee(employee);
      setNewEmployee(employee);
    } else {
      setSelectedEmployee(null);
      setNewEmployee({
        first_name: '',
        middle_name: '',
        last_name: '',
        dob: null,
        gender: '',
        marital_status: '',
        nationality: '',
        street: '',
        postcode: '',
        city: '',
        country: '',
        email: '',
        security_number_type: 'SSN',
        security_number: '',
        invite_to_onboard: false,
        date_joined: null,
        wage_type: 'salary',
        salary: '',
        wage_rate: '',
        direct_deposit: false,
        department: '',
        job_title: '',
        role: '',
        phone_number: '',
        address: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEmployee(null);
  };

  const handleOpenPermissionsDialog = (employee) => {
    setSelectedEmployee(employee);
    setOpenPermissionsDialog(true);
  };

  const handleClosePermissionsDialog = () => {
    setOpenPermissionsDialog(false);
    setSelectedEmployee(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setSnackbar({ open: false, message: '', severity: 'success' });
    try {
      const formattedEmployee = {
        ...newEmployee,
        dob: formatDate(newEmployee.dob),
        date_joined: formatDate(newEmployee.date_joined),
      };

      console.log('Sending employee data:', formattedEmployee);
      const response = await axiosInstance.post('/api/hr/employees/create/', formattedEmployee);
      console.log('Employee created:', response.data);

      fetchEmployees();
      setActiveTab(2);
      setPayrollProgress(20); // Increase progress when employee is added
      setSnackbar({ open: true, message: 'Employee created successfully', severity: 'success' });

      // Reset the form
      setNewEmployee({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        dob: null,
        gender: '',
        marital_status: '',
        nationality: '',
        street: '',
        postcode: '',
        city: '',
        country: '',
        security_number_type: 'SSN',
        security_number: '',
        invite_to_onboard: false,
        date_joined: null,
        wage_type: 'salary',
        salary: '',
        wage_rate: '',
        direct_deposit: false,
        department: '',
        job_title: '',
        role: '',
        phone_number: '',
        address: '',
      });
    } catch (error) {
      console.error('Error creating employee:', error);
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
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  const handleDelete = async (employeeId) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        const response = await axiosInstance.delete(`/api/hr/employees/${employeeId}/`);
        if (response.ok) {
          fetchEmployees();
        } else {
          console.error('Error deleting employee:', await response.json());
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  const handleSwitchChange = (name) => (e) => {
    setNewEmployee((prev) => ({
      ...prev,
      [name]: e.target.checked,
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="relative mt-4 mb-4">
        {/* Progress Bar Section */}
        <div className="w-1/2">
          <div className="h-2.5 rounded-full bg-gray-200">
            <div 
              className="h-2.5 rounded-full bg-green-500" 
              style={{ width: `${payrollProgress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Payroll setup {payrollProgress}% completed
          </p>
        </div>

        {/* Image Section */}
        <div className="absolute right-0 top-0">
          <img
            src="/static/images/good4.png"
            alt="Good icon"
            className="w-24 h-24 rounded-full object-contain"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            className={`py-2 px-1 border-b-2 ${
              activeTab === 0
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(0)}
          >
            Add Employee
          </button>
          <button
            className={`py-2 px-1 border-b-2 ${
              activeTab === 1
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(1)}
          >
            Employee Details
          </button>
          <button
            className={`py-2 px-1 border-b-2 ${
              activeTab === 2
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(2)}
          >
            View Employees
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-auto">
        {activeTab === 0 && (
          <div>
            <div className="flex items-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-2 text-blue-900" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
              </svg>
              <h2 className="text-xl font-semibold">Add Employee</h2>
            </div>
            <p className="text-sm mb-6">Add basic information about the employee.</p>

            <form onSubmit={handleCreateEmployee}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={newEmployee.first_name}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      name="middle_name"
                      value={newEmployee.middle_name}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={newEmployee.last_name}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={newEmployee.email}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      name="dob"
                      value={formatDate(newEmployee.dob)}
                      onChange={(e) => handleDateChange('dob', e.target.value ? new Date(e.target.value) : null)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      name="gender"
                      value={newEmployee.gender}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                      <option value="N">Prefer not to say</option>
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                    <select
                      name="marital_status"
                      value={newEmployee.marital_status}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="">Select Status</option>
                      <option value="S">Single</option>
                      <option value="M">Married</option>
                      <option value="D">Divorced</option>
                      <option value="W">Widowed</option>
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                    <input
                      type="text"
                      name="nationality"
                      value={newEmployee.nationality}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                    <input
                      type="text"
                      name="street"
                      value={newEmployee.street}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                    <input
                      type="text"
                      name="postcode"
                      value={newEmployee.postcode}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      name="city"
                      value={newEmployee.city}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      name="country"
                      value={newEmployee.country}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Security Number Type</label>
                    <select
                      name="security_number_type"
                      value={newEmployee.security_number_type}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="SSN">Social Security Number (US)</option>
                      <option value="NIN">National Insurance Number (UK)</option>
                      {/* Add other options as needed */}
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Security Number</label>
                    <input
                      type="text"
                      name="security_number"
                      value={newEmployee.security_number}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="flex items-center mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="invite_to_onboard"
                        checked={newEmployee.invite_to_onboard}
                        onChange={handleSwitchChange('invite_to_onboard')}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">Invite employee to onboard and enter their information</span>
                    </label>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium mb-4">Work Information</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      name="date_joined"
                      value={formatDate(newEmployee.date_joined)}
                      onChange={(e) => handleDateChange('date_joined', e.target.value ? new Date(e.target.value) : null)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wage Type</label>
                    <select
                      name="wage_type"
                      value={newEmployee.wage_type}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="salary">Salary</option>
                      <option value="wage">Wage</option>
                    </select>
                  </div>
                  
                  {newEmployee.wage_type === 'salary' ? (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                      <input
                        type="number"
                        name="salary"
                        value={newEmployee.salary}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  ) : (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Wage Rate per Hour</label>
                      <input
                        type="number"
                        name="wage_rate"
                        value={newEmployee.wage_rate}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="direct_deposit"
                        checked={newEmployee.direct_deposit}
                        onChange={handleSwitchChange('direct_deposit')}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">Direct Deposit</span>
                    </label>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      name="department"
                      value={newEmployee.department}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                    <input
                      type="text"
                      name="job_title"
                      value={newEmployee.job_title}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      name="role"
                      value={newEmployee.role}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="">Select Role</option>
                      <option value="ADMIN">Admin</option>
                      <option value="EMPLOYEE">Employee</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={
                  !newEmployee.first_name ||
                  !newEmployee.last_name ||
                  !newEmployee.email ||
                  !newEmployee.dob ||
                  !newEmployee.date_joined
                }
              >
                Add Employee
              </button>
            </form>
          </div>
        )}

        {activeTab === 1 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Employee Details</h2>
            {selectedEmployee && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee Number</label>
                    <input
                      type="text"
                      value={selectedEmployee.employee_number}
                      className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                      disabled
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={selectedEmployee.first_name}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      value={selectedEmployee.middle_name || ''}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={selectedEmployee.last_name}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="text"
                      value={new Date(selectedEmployee.dob).toLocaleDateString()}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={selectedEmployee.email}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <input
                      type="text"
                      value={selectedEmployee.gender}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                    <input
                      type="text"
                      value={selectedEmployee.marital_status}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                    <input
                      type="text"
                      value={selectedEmployee.nationality || ''}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Security Number Type</label>
                    <input
                      type="text"
                      value={selectedEmployee.security_number_type}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Security Number</label>
                    <input
                      type="text"
                      value={selectedEmployee.security_number || ''}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium mb-4">Work Information</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={selectedEmployee.job_title || ''}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={selectedEmployee.department || ''}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Joined</label>
                    <input
                      type="text"
                      value={new Date(selectedEmployee.date_joined).toLocaleDateString()}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wage Type</label>
                    <input
                      type="text"
                      value={selectedEmployee.wage_type || ''}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                  
                  {selectedEmployee.wage_type === 'salary' ? (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                      <input
                        type="text"
                        value={selectedEmployee.salary || ''}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        readOnly
                      />
                    </div>
                  ) : (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Wage Rate</label>
                      <input
                        type="text"
                        value={selectedEmployee.wage_rate || ''}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        readOnly
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedEmployee.direct_deposit}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-0"
                        disabled
                      />
                      <span className="ml-2 text-sm text-gray-700">Direct Deposit</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 2 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">View Employees</h2>
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full p-2 pl-10 border border-gray-300 rounded-md"
              />
              <button 
                onClick={handleSearch}
                className="absolute inset-y-0 right-0 px-3 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.employee_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{`${employee.first_name} ${employee.last_name}`}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.job_title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEmployeeSelect(employee)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleOpenPermissionsDialog(employee)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Snackbar/Toast Notification */}
      {snackbar.open && (
        <div 
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-lg ${
            snackbar.severity === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          <div className="flex items-center">
            <span>{snackbar.message}</span>
            <button 
              onClick={() => setSnackbar({ ...snackbar, open: false })}
              className="ml-4 text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Employee Edit/Add Dialog */}
      {openDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">
                {selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h3>
            </div>
            <div className="px-6 py-4">
              <form className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    name="role"
                    value={newEmployee.role}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    required
                  >
                    <option value="">Select Role</option>
                    <option value="ADMIN">Admin</option>
                    <option value="EMPLOYEE">Employee</option>
                  </select>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone_number"
                    value={newEmployee.phone_number}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={newEmployee.address}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={newEmployee.city}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={newEmployee.country}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                  <input
                    type="text"
                    name="postcode"
                    value={newEmployee.postcode}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </form>
            </div>
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={handleCloseDialog}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {selectedEmployee ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Permissions Dialog rendered by the EmployeePermissions component */}
      {selectedEmployee && openPermissionsDialog && (
        <EmployeePermissions
          employee={selectedEmployee}
          open={openPermissionsDialog}
          onClose={handleClosePermissionsDialog}
        />
      )}
    </div>
  );
};

export default EmployeeManagement;