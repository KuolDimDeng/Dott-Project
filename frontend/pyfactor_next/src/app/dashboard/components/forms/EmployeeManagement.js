'use client';

import React, { useState, useEffect, Fragment, useRef, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useTable, usePagination, useSortBy } from 'react-table';
import { 
  MagnifyingGlassIcon,
  UserPlusIcon,
  UserGroupIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import { hrApi } from '@/utils/apiClient';
import { logger } from '@/utils/logger';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Employee Management Component
 * Industry-standard employee management with CRUD operations and standard UI
 */
function EmployeeManagement({ onNavigate }) {
  const router = useRouter();
  
  // State management
  const [activeTab, setActiveTab] = useState('list');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    onLeave: 0,
    inactive: 0
  });

  // Form state for create/edit
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    salary: '',
    hireDate: '',
    status: 'active',
    address: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  const [formErrors, setFormErrors] = useState({});

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // Fetch employees and stats in parallel
      const [employeesData, statsData] = await Promise.all([
        hrApi.employees.getAll().catch(() => []),
        hrApi.employees.getStats().catch(() => ({ total: 0, active: 0, onLeave: 0, inactive: 0 }))
      ]);

      setEmployees(employeesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
      
      // Use demo data as fallback
      const demoEmployees = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@company.com',
          phone: '+1 (555) 123-4567',
          position: 'Software Engineer',
          department: 'Engineering',
          status: 'active',
          hireDate: '2023-01-15',
          salary: 75000
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@company.com',
          phone: '+1 (555) 987-6543',
          position: 'Product Manager',
          department: 'Product',
          status: 'active',
          hireDate: '2022-08-20',
          salary: 85000
        }
      ];
      
      setEmployees(demoEmployees);
      setStats({ total: 2, active: 2, onLeave: 0, inactive: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return employees;
    
    const term = searchTerm.toLowerCase();
    return employees.filter(employee => 
      employee.firstName?.toLowerCase().includes(term) ||
      employee.lastName?.toLowerCase().includes(term) ||
      employee.email?.toLowerCase().includes(term) ||
      employee.position?.toLowerCase().includes(term) ||
      employee.department?.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  // Table configuration
  const columns = useMemo(
    () => [
      {
        Header: 'Name',
        accessor: 'name',
        Cell: ({ row }) => (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10">
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {row.original.firstName?.[0]}{row.original.lastName?.[0]}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">
                {row.original.firstName} {row.original.lastName}
              </div>
              <div className="text-sm text-gray-500">
                {row.original.email}
              </div>
            </div>
          </div>
        ),
      },
      {
        Header: 'Position',
        accessor: 'position',
        Cell: ({ value }) => (
          <div className="text-sm text-gray-900">{value}</div>
        ),
      },
      {
        Header: 'Department',
        accessor: 'department',
        Cell: ({ value }) => (
          <div className="text-sm text-gray-900">{value}</div>
        ),
      },
      {
        Header: 'Status',
        accessor: 'status',
        Cell: ({ value }) => (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            value === 'active' 
              ? 'bg-green-100 text-green-800'
              : value === 'onLeave'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {value === 'active' ? 'Active' : value === 'onLeave' ? 'On Leave' : 'Inactive'}
          </span>
        ),
      },
      {
        Header: 'Hire Date',
        accessor: 'hireDate',
        Cell: ({ value }) => (
          <div className="text-sm text-gray-900">
            {value ? new Date(value).toLocaleDateString() : '-'}
          </div>
        ),
      },
      {
        Header: 'Actions',
        id: 'actions',
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            <button
              onClick={() => handleView(row.original)}
              className="text-blue-600 hover:text-blue-900 p-1"
              title="View Employee"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleEdit(row.original)}
              className="text-purple-600 hover:text-purple-900 p-1"
              title="Edit Employee"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(row.original)}
              className="text-red-600 hover:text-red-900 p-1"
              title="Delete Employee"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

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
  } = useTable(
    {
      columns,
      data: filteredEmployees,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useSortBy,
    usePagination
  );

  // Event handlers
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'create') {
      resetForm();
    }
  };

  const handleView = (employee) => {
    setSelectedEmployee(employee);
    setIsViewModalOpen(true);
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      phone: employee.phone || '',
      position: employee.position || '',
      department: employee.department || '',
      salary: employee.salary || '',
      hireDate: employee.hireDate || '',
      status: employee.status || 'active',
      address: employee.address || '',
      emergencyContact: employee.emergencyContact || '',
      emergencyPhone: employee.emergencyPhone || ''
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (employee) => {
    setSelectedEmployee(employee);
    setIsDeleteModalOpen(true);
  };

  const handleCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      salary: '',
      hireDate: '',
      status: 'active',
      address: '',
      emergencyContact: '',
      emergencyPhone: ''
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.position.trim()) errors.position = 'Position is required';
    if (!formData.department.trim()) errors.department = 'Department is required';
    
    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      if (selectedEmployee) {
        // Update existing employee
        await hrApi.employees.update(selectedEmployee.id, formData);
        toast.success('Employee updated successfully');
        setIsEditModalOpen(false);
      } else {
        // Create new employee
        await hrApi.employees.create(formData);
        toast.success('Employee created successfully');
        setIsCreateModalOpen(false);
      }
      
      fetchEmployees();
      resetForm();
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Failed to save employee');
    }
  };

  const confirmDelete = async () => {
    try {
      await hrApi.employees.delete(selectedEmployee.id);
      toast.success('Employee deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  // Render methods
  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Employees Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <UserGroupIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Employees</p>
            <p className="text-3xl font-bold text-blue-600">{loading ? '-' : stats.total}</p>
          </div>
        </div>
      </div>

      {/* Active Employees Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Active</p>
            <p className="text-3xl font-bold text-green-600">{loading ? '-' : stats.active}</p>
          </div>
        </div>
      </div>

      {/* On Leave Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CalendarIcon className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">On Leave</p>
            <p className="text-3xl font-bold text-yellow-600">{loading ? '-' : stats.onLeave}</p>
          </div>
        </div>
      </div>

      {/* Inactive Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <XCircleIcon className="h-8 w-8 text-gray-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Inactive</p>
            <p className="text-3xl font-bold text-gray-600">{loading ? '-' : stats.inactive}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearchAndActions = () => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search employees..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Action Button */}
      <button
        onClick={handleCreate}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <UserPlusIcon className="h-4 w-4 mr-2" />
        Create New Employee
      </button>
    </div>
  );

  const renderTabNavigation = () => (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          {[
            { key: 'create', label: 'Create/Edit' },
            { key: 'details', label: 'Details' },
            { key: 'list', label: 'List' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );

  const renderEmployeeForm = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Employee Information</h3>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 border-b pb-2">Personal Information</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
              <FieldTooltip text="Employee's legal first name as it appears on official documents" />
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                formErrors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {formErrors.firstName && <p className="text-red-500 text-xs mt-1">{formErrors.firstName}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
              <FieldTooltip text="Employee's legal last name as it appears on official documents" />
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                formErrors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {formErrors.lastName && <p className="text-red-500 text-xs mt-1">{formErrors.lastName}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
              <FieldTooltip text="Primary work email address for the employee" />
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                formErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
              <FieldTooltip text="Primary contact phone number including area code" />
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Employment Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 border-b pb-2">Employment Information</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position/Title
              <FieldTooltip text="Official job title or position within the company" />
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                formErrors.position ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {formErrors.position && <p className="text-red-500 text-xs mt-1">{formErrors.position}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
              <FieldTooltip text="Department or team the employee belongs to" />
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                formErrors.department ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            >
              <option value="">Select Department</option>
              <option value="Engineering">Engineering</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
              <option value="Operations">Operations</option>
              <option value="HR">Human Resources</option>
              <option value="Finance">Finance</option>
            </select>
            {formErrors.department && <p className="text-red-500 text-xs mt-1">{formErrors.department}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salary
              <FieldTooltip text="Annual salary amount in your local currency" />
            </label>
            <input
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData({...formData, salary: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hire Date
              <FieldTooltip text="Date when the employee officially started working" />
            </label>
            <input
              type="date"
              value={formData.hireDate}
              onChange={(e) => setFormData({...formData, hireDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
              <FieldTooltip text="Current employment status of the employee" />
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="onLeave">On Leave</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Form Actions */}
        <div className="md:col-span-2 flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Reset
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {selectedEmployee ? 'Update Employee' : 'Create Employee'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderEmployeeDetails = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="text-center py-12">
        <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Employee Details</h3>
        <p className="text-gray-600 text-sm mb-4">
          Select an employee from the list to view detailed information, performance metrics, and employment history.
        </p>
        <button 
          onClick={() => setActiveTab('list')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          View Employee List
        </button>
      </div>
    </div>
  );

  const renderEmployeeList = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12">
          <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No employees found</p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add First Employee
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {headerGroups.map(headerGroup => (
                  <tr {...headerGroup.getHeaderGroupProps()} key={headerGroup.id}>
                    {headerGroup.headers.map(column => (
                      <th
                        {...column.getHeaderProps(column.getSortByToggleProps())}
                        key={column.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-1">
                          <span>{column.render('Header')}</span>
                          <span>
                            {column.isSorted
                              ? column.isSortedDesc
                                ? ' 🔽'
                                : ' 🔼'
                              : ''}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody {...getTableBodyProps()} className="bg-white divide-y divide-gray-200">
                {page.map(row => {
                  prepareRow(row);
                  return (
                    <tr {...row.getRowProps()} key={row.id} className="hover:bg-gray-50">
                      {row.cells.map(cell => (
                        <td
                          {...cell.getCellProps()}
                          key={cell.column.id}
                          className="px-6 py-4 whitespace-nowrap"
                        >
                          {cell.render('Cell')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => previousPage()}
                disabled={!canPreviousPage}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => nextPage()}
                disabled={!canNextPage}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{pageIndex * pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min((pageIndex + 1) * pageSize, filteredEmployees.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredEmployees.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => previousPage()}
                    disabled={!canPreviousPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => nextPage()}
                    disabled={!canNextPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'create':
        return renderEmployeeForm();
      case 'details':
        return renderEmployeeDetails();
      case 'list':
        return renderEmployeeList();
      default:
        return renderEmployeeList();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-black">Employee Management</h1>
        <p className="text-gray-600 mt-1">Manage your team members, track their information, and oversee employment details</p>
      </div>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Search and Actions */}
      {renderSearchAndActions()}

      {/* Tab Navigation */}
      {renderTabNavigation()}

      {/* Content */}
      {renderContent()}

      {/* Create Employee Modal */}
      <Transition appear show={isCreateModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsCreateModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Create New Employee
                  </Dialog.Title>
                  
                  {renderEmployeeForm()}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Edit Employee Modal */}
      <Transition appear show={isEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsEditModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Edit Employee: {selectedEmployee?.firstName} {selectedEmployee?.lastName}
                  </Dialog.Title>
                  
                  {renderEmployeeForm()}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* View Employee Modal */}
      <Transition appear show={isViewModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsViewModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Employee Details: {selectedEmployee?.firstName} {selectedEmployee?.lastName}
                  </Dialog.Title>
                  
                  {selectedEmployee && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Email</p>
                            <p className="text-sm text-gray-600">{selectedEmployee.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <PhoneIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Phone</p>
                            <p className="text-sm text-gray-600">{selectedEmployee.phone || 'Not provided'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <BriefcaseIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Position</p>
                            <p className="text-sm text-gray-600">{selectedEmployee.position}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <UserGroupIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Department</p>
                            <p className="text-sm text-gray-600">{selectedEmployee.department}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <CalendarIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Hire Date</p>
                            <p className="text-sm text-gray-600">
                              {selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString() : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <CheckCircleIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Status</p>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              selectedEmployee.status === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : selectedEmployee.status === 'onLeave'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedEmployee.status === 'active' ? 'Active' : selectedEmployee.status === 'onLeave' ? 'On Leave' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setIsViewModalOpen(false);
                        handleEdit(selectedEmployee);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Edit Employee
                    </button>
                    <button
                      onClick={() => setIsViewModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsDeleteModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Delete Employee
                  </Dialog.Title>
                  
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete {selectedEmployee?.firstName} {selectedEmployee?.lastName}? 
                      This action cannot be undone.
                    </p>
                  </div>

                  <div className="mt-4 flex space-x-3 justify-end">
                    <button
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

export default EmployeeManagement;