'use client';

import React, { useState, useEffect, Fragment, useRef, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useToast } from '@/components/Toast/ToastProvider';
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
  BriefcaseIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { hrApi, payrollApi } from '@/utils/apiClient';
import { logger } from '@/utils/logger';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';
import { DEPARTMENTS, POSITIONS, EMPLOYMENT_TYPES } from '@/utils/employeeConstants';
import { getAllCountries, getSSNInfoByCountry } from '@/utils/countrySSNMapping';
import PhoneInput from '@/components/ui/PhoneInput';
import { getInternationalPhoneNumber, validatePhoneNumber, parseInternationalPhoneNumber } from '@/utils/countryPhoneCodes';

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

// Country to Security Number Type mapping
const COUNTRY_TO_SECURITY_NUMBER = {
  'US': { type: 'SSN', label: 'Social Security Number', placeholder: 'XXX-XX-XXXX', pattern: '\\d{3}-\\d{2}-\\d{4}' },
  'UK': { type: 'NIN', label: 'National Insurance Number', placeholder: 'XX 12 34 56 X', pattern: '[A-Z]{2}\\d{6}[A-Z]' },
  'CA': { type: 'SIN', label: 'Social Insurance Number', placeholder: 'XXX-XXX-XXX', pattern: '\\d{3}-\\d{3}-\\d{3}' },
  'AU': { type: 'TFN', label: 'Tax File Number', placeholder: 'XXX XXX XXX', pattern: '\\d{3}\\s\\d{3}\\s\\d{3}' },
  'SG': { type: 'NRIC', label: 'NRIC Number', placeholder: 'SXXXXXXXA', pattern: '[ST]\\d{7}[A-Z]' },
  'IN': { type: 'PAN', label: 'PAN Card Number', placeholder: 'ABCDE1234F', pattern: '[A-Z]{5}\\d{4}[A-Z]' },
  'BR': { type: 'CPF', label: 'CPF Number', placeholder: 'XXX.XXX.XXX-XX', pattern: '\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}' },
  'MX': { type: 'CURP', label: 'CURP', placeholder: 'ABCD123456HEFGHI01', pattern: '[A-Z]{4}\\d{6}[HM][A-Z]{5}\\d{2}' },
  'ES': { type: 'DNI', label: 'DNI Number', placeholder: '12345678X', pattern: '\\d{8}[A-Z]' },
  'AR': { type: 'DNI', label: 'DNI Number', placeholder: '12.345.678', pattern: '\\d{2}\\.\\d{3}\\.\\d{3}' },
  'HK': { type: 'HKID', label: 'Hong Kong ID Card', placeholder: 'A123456(7)', pattern: '[A-Z]\\d{6}\\(\\d\\)' },
  'SE': { type: 'NINO', label: 'Personal Identity Number', placeholder: 'YYYYMMDD-XXXX', pattern: '\\d{8}-\\d{4}' },
  'NL': { type: 'BSN', label: 'Citizen Service Number', placeholder: '123456789', pattern: '\\d{9}' },
  'PL': { type: 'PESEL', label: 'PESEL Number', placeholder: '12345678901', pattern: '\\d{11}' },
  'CL': { type: 'RUT', label: 'RUT Number', placeholder: '12.345.678-9', pattern: '\\d{1,2}\\.\\d{3}\\.\\d{3}-[\\dK]' },
  'PK': { type: 'CNIC', label: 'CNIC Number', placeholder: '12345-1234567-1', pattern: '\\d{5}-\\d{7}-\\d' },
  'MY': { type: 'MYKAD', label: 'MyKad Number', placeholder: '123456-12-3456', pattern: '\\d{6}-\\d{2}-\\d{4}' },
  'ID': { type: 'KTP', label: 'KTP Number', placeholder: '1234567890123456', pattern: '\\d{16}' },
  'PT': { type: 'NIF', label: 'NIF Number', placeholder: '123456789', pattern: '\\d{9}' },
  'NZ': { type: 'IRD', label: 'IRD Number', placeholder: '123-456-789', pattern: '\\d{3}-\\d{3}-\\d{3}' },
  'IE': { type: 'PPS', label: 'PPS Number', placeholder: '1234567X', pattern: '\\d{7}[A-Z]' },
  'SA': { type: 'IQAMA', label: 'Iqama Number', placeholder: '1234567890', pattern: '\\d{10}' },
  'SS': { type: 'OTHER', label: 'Tax Identification Number', placeholder: 'Enter TIN', pattern: '' }, // South Sudan
  'KE': { type: 'KRA-PIN', label: 'KRA PIN', placeholder: 'A123456789X', pattern: '[A-Z]\\d{9}[A-Z]' }, // Kenya
  'NG': { type: 'OTHER', label: 'Tax Identification Number', placeholder: 'Enter TIN', pattern: '' }, // Nigeria
  'ZA': { type: 'OTHER', label: 'Tax Identification Number', placeholder: 'Enter TIN', pattern: '' }, // South Africa
  'OTHER': { type: 'OTHER', label: 'Tax/National ID Number', placeholder: 'Enter ID number', pattern: '' }
};

// Get comprehensive countries list from mapping
const COUNTRIES = getAllCountries().map(country => ({
  code: country.value,
  name: country.label
}));

/**
 * Employee Component
 * Industry-standard employee management with CRUD operations and standard UI
 */
function EmployeeManagement({ onNavigate }) {
  const router = useRouter();
  const toast = useToast();
  const supervisorDropdownRef = useRef(null);
  
  // State management
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'create', 'edit', 'view'
  const [employees, setEmployees] = useState([]);
  const [basicEmployees, setBasicEmployees] = useState([]); // For supervisor dropdown
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  // Removed delete modal state - employees should be deactivated, not deleted
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    onLeave: 0,
    inactive: 0
  });
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive', 'onLeave'

  // Form state for create/edit
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phoneCountryCode: 'US', // Default to US
    dateOfBirth: '',
    position: '',
    department: '',
    supervisor: '', // Supervisor employee ID
    employmentType: 'FT', // Full-time or Part-time
    compensationType: 'SALARY', // Add compensation type
    salary: '',
    wagePerHour: '', // Add hourly wage field
    hireDate: '',
    status: 'active',
    
    // Address fields
    street: '',
    city: '',
    state: '',
    zipCode: '',
    
    emergencyContact: '',
    emergencyPhone: '',
    securityNumberType: 'SSN', // Tax ID type based on country
    securityNumber: '', // Full tax ID (will be stored securely in Stripe)
    country: 'US', // Employee's country for tax ID type
    
    // Payroll and Benefits
    directDeposit: 'no', // 'yes' or 'no'
    isSupervisor: false, // Default to false
    vacationTime: 'no', // 'yes' or 'no'
    vacationDaysPerYear: '' // Number of vacation days if vacationTime is 'yes'
  });

  const [formErrors, setFormErrors] = useState({});
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [showSupervisorDropdown, setShowSupervisorDropdown] = useState(false);
  
  // User linking states
  const [showUserLinking, setShowUserLinking] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef(null);

  // Helper function to get security number info based on country
  const getSecurityNumberInfo = (countryCode) => {
    // First check if we have it in the old mapping for special cases
    if (COUNTRY_TO_SECURITY_NUMBER[countryCode]) {
      return COUNTRY_TO_SECURITY_NUMBER[countryCode];
    }
    
    // Otherwise use the comprehensive mapping
    const ssnInfo = getSSNInfoByCountry(countryCode);
    if (ssnInfo) {
      return {
        type: countryCode,
        label: ssnInfo.ssnName,
        placeholder: ssnInfo.format === 'Variable' ? 'Enter Tax ID' : ssnInfo.format,
        pattern: null // Pattern validation can be added based on format
      };
    }
    
    // Default for unknown countries
    return COUNTRY_TO_SECURITY_NUMBER['OTHER'];
  };
  
  // Filter employees for supervisor dropdown - only show employees marked as supervisors
  const filteredSupervisors = useMemo(() => {
    console.log('🔍 [DEBUG] Basic Employees Raw Data:', basicEmployees);
    console.log('🔍 [DEBUG] Processing basic employees count:', basicEmployees.length);
    if (basicEmployees.length > 0) {
      console.log('🔍 [DEBUG] First employee data structure:', basicEmployees[0]);
      console.log('🔍 [DEBUG] All employees is_supervisor values:', 
        basicEmployees.map(emp => ({
          name: `${emp.first_name} ${emp.last_name}`,
          is_supervisor: emp.is_supervisor,
          active: emp.active
        }))
      );
    }
    
    logger.info('🔍 [EmployeeManagement] Filtering supervisors:', {
      totalBasicEmployees: basicEmployees.length,
      basicEmployeesData: basicEmployees.map(emp => ({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        active: emp.active,
        is_supervisor: emp.is_supervisor
      }))
    });
    
    const supervisorEmployees = basicEmployees.filter(emp => 
      emp.active && 
      emp.is_supervisor && // Only show employees marked as supervisors
      emp.id !== selectedEmployee?.id
    );
    
    logger.info('🔍 [EmployeeManagement] Filtered supervisors result:', {
      supervisorCount: supervisorEmployees.length,
      supervisors: supervisorEmployees.map(emp => ({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`
      }))
    });
    
    if (!supervisorSearch) return supervisorEmployees;
    
    const search = supervisorSearch.toLowerCase();
    return supervisorEmployees.filter(emp => 
      emp.first_name?.toLowerCase().includes(search) ||
      emp.last_name?.toLowerCase().includes(search) ||
      emp.full_name?.toLowerCase().includes(search) ||
      emp.employee_number?.toLowerCase().includes(search) ||
      emp.department?.toLowerCase().includes(search)
    );
  }, [basicEmployees, supervisorSearch, selectedEmployee]);

  // Update security number type when country changes
  const handleCountryChange = (countryCode) => {
    const securityInfo = getSecurityNumberInfo(countryCode);
    setFormData(prev => ({
      ...prev,
      country: countryCode,
      securityNumberType: securityInfo.type,
      securityNumber: '' // Clear the number when country changes
    }));
  };

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
    fetchBasicEmployees();
  }, []);
  
  // Fetch available users only when user linking is shown
  useEffect(() => {
    if (showUserLinking) {
      fetchAvailableUsers();
    }
  }, [showUserLinking]);
  
  // Handle click outside supervisor dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (supervisorDropdownRef.current && !supervisorDropdownRef.current.contains(event.target)) {
        setShowSupervisorDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchBasicEmployees = async () => {
    try {
      logger.info('🚀 [EmployeeManagement] Fetching basic employee list for dropdowns');
      
      const response = await hrApi.employees.getBasic();
      logger.info('✅ [EmployeeManagement] Fetched basic employee data:', {
        count: response?.length || 0,
        employees: response?.map(emp => ({
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          is_supervisor: emp.is_supervisor,
          active: emp.active
        })) || []
      });
      
      setBasicEmployees(response || []);
    } catch (error) {
      logger.error('❌ [EmployeeManagement] Error fetching basic employees:', error);
      // Don't show error toast for dropdown data
      setBasicEmployees([]);
    }
  };
  
  const fetchAvailableUsers = async () => {
    try {
      logger.info('🚀 [EmployeeManagement] === FETCHING UNLINKED USERS START ===');
      logger.info('🚀 [EmployeeManagement] Fetching available users for linking');
      logger.info('🚀 [EmployeeManagement] Request URL: /api/hr/unlinked-users');
      
      // Fetch users who don't have an employee record yet
      const response = await fetch('/api/hr/unlinked-users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      logger.info('📡 [EmployeeManagement] Response status:', response.status);
      logger.info('📡 [EmployeeManagement] Response OK:', response.ok);
      logger.info('📡 [EmployeeManagement] Response headers:', response.headers);
      
      if (!response.ok) {
        // Don't log error for 401 as this is optional functionality
        if (response.status === 401) {
          logger.debug('[EmployeeManagement] User linking not available - auth required');
          setAvailableUsers([]);
          return;
        }
        const errorText = await response.text();
        logger.error('❌ [EmployeeManagement] Error response:', errorText);
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      logger.info('✅ [EmployeeManagement] Response data received');
      logger.info('✅ [EmployeeManagement] Full response data:', JSON.stringify(data, null, 2));
      logger.info('✅ [EmployeeManagement] Fetched unlinked users:', {
        count: data?.users?.length || 0,
        hasUsersKey: 'users' in data,
        dataKeys: Object.keys(data),
        firstUser: data?.users?.[0],
        dataType: typeof data,
        isArray: Array.isArray(data),
        hasTotal: 'total' in data
      });
      
      // Log each user for debugging
      if (data.users && Array.isArray(data.users)) {
        logger.info('✅ [EmployeeManagement] Users found:', data.users.length);
        data.users.forEach((user, index) => {
          logger.info(`✅ [EmployeeManagement] User ${index + 1}:`, {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            hasName: 'name' in user,
            hasEmail: 'email' in user
          });
        });
        setAvailableUsers(data.users);
      } else {
        logger.warn('⚠️ [EmployeeManagement] No users array in response');
        logger.warn('⚠️ [EmployeeManagement] Response structure:', {
          dataType: typeof data,
          isArray: Array.isArray(data),
          keys: Object.keys(data || {})
        });
        setAvailableUsers([]);
      }
      
      logger.info('🚀 [EmployeeManagement] === FETCHING UNLINKED USERS END ===');
    } catch (error) {
      logger.error('❌ [EmployeeManagement] Error fetching users:', error);
      logger.debug('[EmployeeManagement] User linking not available:', error.message);
      // Don't show error to user as this is optional functionality
      setAvailableUsers([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      logger.info('🚀 [EmployeeManagement] === START fetchEmployees ===');
      
      // Fetch employees and stats in parallel
      const [employeesData, statsData] = await Promise.all([
        hrApi.employees.getAll().catch((err) => {
          logger.error('❌ [EmployeeManagement] Failed to fetch employees:', err);
          return [];
        }),
        hrApi.employees.getStats().catch((err) => {
          logger.error('❌ [EmployeeManagement] Failed to fetch stats:', err);
          return { total: 0, active: 0, onLeave: 0, inactive: 0 };
        })
      ]);

      logger.info('✅ [EmployeeManagement] Fetched data:', {
        employeesCount: employeesData?.length || 0,
        stats: statsData
      });

      // Map backend fields to frontend fields
      const mappedEmployees = (employeesData || []).map(emp => ({
        ...emp,
        firstName: emp.first_name,
        lastName: emp.last_name,
        middleName: emp.middle_name,
        phone: emp.phone_number,
        dateOfBirth: emp.date_of_birth,
        position: emp.job_title,
        employmentType: emp.employment_type,
        compensationType: emp.compensation_type,
        wagePerHour: emp.wage_per_hour, // Map wage_per_hour to wagePerHour
        zipCode: emp.zip_code,
        emergencyContact: emp.emergency_contact,
        emergencyPhone: emp.emergency_phone,
        securityNumberType: emp.security_number_type,
        hireDate: emp.hire_date,
        probationEndDate: emp.probation_end_date,
        supervisor: emp.supervisor,
        supervisorName: emp.supervisor_name,
        isSupervisor: emp.is_supervisor || false,
        healthInsuranceEnrollment: emp.health_insurance_enrollment,
        pensionEnrollment: emp.pension_enrollment,
        directDeposit: emp.direct_deposit,
        vacationTime: emp.vacation_time,
        vacationDaysPerYear: emp.vacation_days_per_year,
        // Convert active boolean to status string
        status: emp.active ? 'active' : 'inactive'
      }));

      // Debug: Log wage mapping for support@dottapps.com
      const supportEmployee = mappedEmployees.find(emp => emp.email === 'support@dottapps.com');
      if (supportEmployee) {
        logger.info('💰 [EmployeeManagement] === SUPPORT EMPLOYEE WAGE DEBUG ===');
        logger.info('💰 [EmployeeManagement] Support employee raw data:', {
          wage_per_hour: supportEmployee.wage_per_hour,
          wagePerHour: supportEmployee.wagePerHour,
          salary: supportEmployee.salary,
          compensation_type: supportEmployee.compensation_type,
          compensationType: supportEmployee.compensationType
        });
      }

      setEmployees(mappedEmployees);
      setStats(statsData);
    } catch (error) {
      logger.error('❌ [EmployeeManagement] Error in fetchEmployees:', error);
      
      // Show specific error messages based on error type
      if (error.message.includes('403')) {
        toast.error('Access denied. Please check your permissions to view employees.');
      } else if (error.message.includes('401')) {
        toast.error('Authentication required. Please sign in again.');
      } else {
        toast.error(`Failed to load employees: ${error.message}`);
      }
      
      // Set empty arrays instead of demo data to force real data usage
      setEmployees([]);
      setStats({ total: 0, active: 0, onLeave: 0, inactive: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Filter employees based on search term and status
  const filteredEmployees = useMemo(() => {
    logger.info('🔍 [EmployeeManagement] Filtering employees:', {
      totalEmployees: employees.length,
      searchTerm,
      statusFilter
    });

    let filtered = employees;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(employee => employee.status === statusFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(employee => 
        employee.firstName?.toLowerCase().includes(term) ||
        employee.lastName?.toLowerCase().includes(term) ||
        employee.email?.toLowerCase().includes(term) ||
        employee.position?.toLowerCase().includes(term) ||
        employee.department?.toLowerCase().includes(term)
      );
    }
    
    logger.info('🔍 [EmployeeManagement] Filtered results:', {
      filteredCount: filtered.length
    });
    
    return filtered;
  }, [employees, searchTerm, statusFilter]);

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
        Header: 'Supervisor',
        accessor: 'supervisorName',
        Cell: ({ value, row }) => (
          <div className="text-sm text-gray-900">
            {value || row.original.supervisor_name || '-'}
          </div>
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
          <div className="flex items-center space-x-2">
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
              onClick={() => handleToggleEmployeeStatus(row.original)}
              className={`px-2 py-1 text-xs font-medium rounded ${
                row.original.status === 'active' 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
              title={row.original.status === 'active' ? 'Deactivate Employee' : 'Activate Employee'}
            >
              {row.original.status === 'active' ? 'Deactivate' : 'Activate'}
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
    logger.info('👁️ [EmployeeManagement] Viewing employee details:', {
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      status: employee.status
    });
    setSelectedEmployee(employee);
    setActiveTab('details');
  };

  const handleEdit = (employee) => {
    logger.info('📝 [EmployeeManagement] === EDIT EMPLOYEE DEBUG START ===');
    logger.info('📝 [EmployeeManagement] Raw employee object:', employee);
    logger.info('📝 [EmployeeManagement] Employee wage fields:', {
      wagePerHour: employee.wagePerHour,
      wage_per_hour: employee.wage_per_hour,
      salary: employee.salary,
      compensationType: employee.compensationType,
      compensation_type: employee.compensation_type
    });
    
    // Parse international phone number if it exists
    let phoneData = { phoneNumber: '', countryCode: 'US' };
    if (employee.phone) {
      phoneData = parseInternationalPhoneNumber(employee.phone);
      logger.info('📱 [EmployeeManagement] Parsed phone number:', {
        original: employee.phone,
        parsed: phoneData
      });
    }
    
    setSelectedEmployee(employee);
    setFormData({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      phone: phoneData.phoneNumber,
      phoneCountryCode: phoneData.countryCode,
      dateOfBirth: employee.dateOfBirth || '',
      position: employee.position || '',
      department: employee.department || '',
      supervisor: employee.supervisor || '',
      employmentType: employee.employmentType || 'FT',
      compensationType: employee.compensationType || 'SALARY',
      salary: employee.salary || '',
      wagePerHour: employee.wagePerHour || employee.wage_per_hour || '',
      hireDate: employee.hireDate || '',
      status: employee.status || 'active',
      isSupervisor: employee.isSupervisor || false,
      
      // Address fields
      street: employee.street || '',
      city: employee.city || '',
      state: employee.state || '',
      zipCode: employee.zipCode || '',
      
      emergencyContact: employee.emergencyContact || '',
      emergencyPhone: employee.emergencyPhone || '',
      securityNumberType: employee.securityNumberType || 'SSN',
      securityNumber: '', // Never populate - security best practice (stored in Stripe)
      country: employee.country || 'US',
      
      // Payroll and Benefits
      directDeposit: employee.directDeposit ? 'yes' : 'no',
      vacationTime: employee.vacationTime ? 'yes' : 'no',
      vacationDaysPerYear: employee.vacationDaysPerYear || ''
    });
    
    logger.info('📝 [EmployeeManagement] Form data set with values:', {
      compensationType: employee.compensationType || 'SALARY',
      salary: employee.salary || '',
      wagePerHour: employee.wagePerHour || employee.wage_per_hour || '',
      originalWagePerHour: employee.wagePerHour,
      originalWage_per_hour: employee.wage_per_hour
    });
    logger.info('📝 [EmployeeManagement] === EDIT EMPLOYEE DEBUG END ===');
    
    setActiveTab('create');
  };

  // Removed handleDelete - use status field to deactivate employees instead

  const handleCreate = () => {
    resetForm();
    setSelectedEmployee(null);
    setActiveTab('create');
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      phoneCountryCode: 'US',
      dateOfBirth: '',
      position: '',
      department: '',
      supervisor: '',
      employmentType: 'FT',
      compensationType: 'SALARY',
      salary: '',
      wagePerHour: '',
      hireDate: '',
      status: 'active',
      
      // Address fields
      street: '',
      city: '',
      state: '',
      zipCode: '',
      
      emergencyContact: '',
      emergencyPhone: '',
      securityNumberType: 'SSN',
      securityNumber: '',
      country: 'US',
      
      // Payroll and Benefits
      directDeposit: 'no',
      vacationTime: 'no',
      vacationDaysPerYear: ''
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
    // Only require security number for new employees, not when editing
    if (!selectedEmployee && !formData.securityNumber.trim()) {
      const securityInfo = getSecurityNumberInfo(formData.country);
      errors.securityNumber = `${securityInfo.label} is required for payroll processing`;
    }
    
    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Date of birth validation
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const dayDiff = today.getDate() - dob.getDate();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
      
      if (actualAge < 16) {
        errors.dateOfBirth = 'Employee must be at least 16 years old';
      }
      if (actualAge > 100) {
        errors.dateOfBirth = 'Please enter a valid date of birth';
      }
    }
    
    // Phone number validation
    if (formData.phone) {
      const phoneValidation = validatePhoneNumber(formData.phone, formData.phoneCountryCode);
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.error;
      }
    }
    
    // Vacation days validation
    if (formData.vacationTime === 'yes' && !formData.vacationDaysPerYear) {
      errors.vacationDaysPerYear = 'Please specify number of vacation days';
    }
    if (formData.vacationTime === 'yes' && formData.vacationDaysPerYear) {
      const days = parseInt(formData.vacationDaysPerYear);
      if (isNaN(days) || days < 0 || days > 365) {
        errors.vacationDaysPerYear = 'Vacation days must be between 0 and 365';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      logger.info('🚀 [EmployeeManagement] === START handleSubmit ===');
      logger.info('[EmployeeManagement] Form data:', {
        ...formData,
        email: formData.email ? `${formData.email.substring(0, 3)}***@***` : 'not provided'
      });
      
      // Convert camelCase to snake_case for backend
      const backendData = {
        ...formData,
        // Convert camelCase fields to snake_case
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phone,
        phone_country_code: formData.phoneCountryCode,
        date_of_birth: formData.dateOfBirth,
        job_title: formData.position,
        department: formData.department,
        supervisor: formData.supervisor || null,
        is_supervisor: formData.isSupervisor || false,
        employment_type: formData.employmentType,
        compensation_type: formData.compensationType,
        wage_per_hour: (() => {
          logger.info('💰 [EmployeeManagement] === WAGE CALCULATION DEBUG ===');
          logger.info('💰 [EmployeeManagement] Form compensation type:', formData.compensationType);
          logger.info('💰 [EmployeeManagement] Form wagePerHour value:', formData.wagePerHour);
          logger.info('💰 [EmployeeManagement] Form salary value:', formData.salary);
          
          if (formData.compensationType === 'HOURLY') {
            const hourlyWage = parseFloat(formData.wagePerHour) || 0;
            logger.info('💰 [EmployeeManagement] Using HOURLY wage:', hourlyWage);
            return hourlyWage;
          } else {
            // Calculate hourly rate for salaried employees (industry standard)
            const calculatedRate = Math.min(9999.99, Math.round((parseFloat(formData.salary) / 2080) * 100) / 100);
            logger.info('💰 [EmployeeManagement] Using calculated SALARY rate:', calculatedRate);
            return calculatedRate;
          }
        })(),
        hire_date: formData.hireDate,
        zip_code: formData.zipCode,
        emergency_contact_name: formData.emergencyContact,
        emergency_contact_phone: formData.emergencyPhone,
        security_number_type: formData.securityNumberType,
        security_number: formData.securityNumber,
        // New fields - convert to snake_case
        direct_deposit: formData.directDeposit === 'yes',
        vacation_time: formData.vacationTime === 'yes',
        vacation_days_per_year: formData.vacationTime === 'yes' ? parseInt(formData.vacationDaysPerYear) || 0 : 0,
        // User linking
        user_id: selectedUserId || null,
        // Ensure state is max 2 characters
        state: formData.state ? formData.state.substring(0, 2).toUpperCase() : ''
      };
      
      // Format phone number to international format if provided
      if (backendData.phone_number && backendData.phone_country_code) {
        backendData.phone_number = getInternationalPhoneNumber(backendData.phone_number, backendData.phone_country_code);
      }
      
      // Remove camelCase fields to avoid duplication
      delete backendData.firstName;
      delete backendData.lastName;
      delete backendData.phone; // Keep formatted phone_number
      delete backendData.phoneCountryCode; // Keep phone_country_code
      delete backendData.dateOfBirth;
      delete backendData.compensationType;
      delete backendData.wagePerHour;
      delete backendData.hireDate;
      delete backendData.zipCode;
      delete backendData.emergencyContact;
      delete backendData.emergencyPhone;
      delete backendData.securityNumberType;
      delete backendData.securityNumber;
      delete backendData.directDeposit;
      delete backendData.vacationTime;
      delete backendData.vacationDaysPerYear;
      
      if (selectedEmployee) {
        // Update existing employee
        logger.info('[EmployeeManagement] Updating employee:', {
          id: selectedEmployee.id,
          name: `${backendData.first_name} ${backendData.last_name}`,
          status: backendData.status,
          active: backendData.active
        });
        
        // Add active field based on status for backend compatibility
        backendData.active = backendData.status === 'active';
        
        logger.info('📤 [EmployeeManagement] Sending update request with data:', JSON.stringify(backendData, null, 2));
        const result = await hrApi.employees.update(selectedEmployee.id, backendData);
        logger.info('✅ [EmployeeManagement] Employee updated successfully:', {
          id: result?.id,
          active: result?.active,
          status: result?.status,
          phone_number: result?.phone_number,
          response: JSON.stringify(result, null, 2)
        });
        toast.success('Employee updated successfully');
      } else {
        // Create new employee
        logger.info('[EmployeeManagement] Creating new employee');
        
        // Set active status for new employees
        backendData.active = true;
        backendData.status = 'active';
        
        const result = await hrApi.employees.create(backendData);
        logger.info('✅ [EmployeeManagement] Employee created:', {
          id: result?.id,
          fullResult: JSON.stringify(result, null, 2)
        });
        toast.success('Employee created successfully');
      }
      
      // Refresh data and return to list
      await fetchEmployees();
      await fetchBasicEmployees(); // Refresh supervisor dropdown data
      resetForm();
      setSelectedEmployee(null);
      setActiveTab('list');
    } catch (error) {
      logger.error('❌ [EmployeeManagement] Error saving employee:', {
        error: error,
        message: error.message,
        response: error.response,
        responseData: error.response?.data,
        responseStatus: error.response?.status,
        stack: error.stack
      });
      
      // Parse error message for user-friendly display
      let userMessage = 'Failed to save employee. Please try again.';
      
      // Check for API response errors
      if (error.response?.data?.detail) {
        userMessage = error.response.data.detail;
      } else if (error.response?.data?.error) {
        userMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        userMessage = error.response.data.message;
      } else if (error.message) {
        // Check for common error patterns
        if (error.message.includes('does not exist')) {
          userMessage = 'There was a database configuration issue. Please contact support.';
        } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          userMessage = 'An employee with this email already exists.';
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          userMessage = 'Please check your input data and try again.';
        } else if (error.message.includes('permission') || error.message.includes('forbidden')) {
          userMessage = 'You do not have permission to perform this action.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          userMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('500') || error.message.includes('server')) {
          userMessage = 'Server error. Please try again later or contact support.';
        } else {
          // For any other errors, show a simplified message
          userMessage = 'Unable to save employee. Please try again.';
        }
      }
      
      toast.error(userMessage);
    }
  };

  // Toggle employee status (activate/deactivate)
  const handleToggleEmployeeStatus = async (employee) => {
    const newStatus = employee.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    
    // Confirm the action
    const confirmMessage = `Are you sure you want to ${action} ${employee.firstName} ${employee.lastName}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      logger.info(`🔄 [EmployeeManagement] Toggling employee status:`, {
        id: employee.id,
        currentStatus: employee.status,
        newStatus: newStatus
      });
      
      // Since backend doesn't support PATCH, we need to use PUT with minimal data
      // Prepare the update data with only status change
      const updateData = {
        status: newStatus,
        // Include required fields for PUT (backend may require these)
        first_name: employee.firstName,
        last_name: employee.lastName,
        email: employee.email,
        // Set active field based on status for backend compatibility
        active: newStatus === 'active'
      };
      
      logger.info(`📤 [EmployeeManagement] Sending status update:`, updateData);
      
      // Use hrApi.employees.update which handles the proper endpoint and headers
      const updatedEmployee = await hrApi.employees.update(employee.id, updateData);
      
      logger.info(`✅ [EmployeeManagement] Employee status updated successfully:`, {
        id: employee.id,
        newStatus: updatedEmployee.status || newStatus
      });
      
      toast.success(`Employee ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      
      // Refresh the employee list
      await fetchEmployees();
      
    } catch (error) {
      logger.error(`❌ [EmployeeManagement] Error toggling employee status:`, error);
      toast.error(`Failed to ${action} employee: ${error.message}`);
    }
  };

  // Removed confirmDelete - employees should be deactivated, not deleted

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
            <p className="text-3xl font-bold text-blue-600 truncate">{loading ? '-' : stats.total}</p>
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
            <p className="text-3xl font-bold text-green-600 truncate">{loading ? '-' : stats.active}</p>
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
            <p className="text-3xl font-bold text-yellow-600 truncate">{loading ? '-' : stats.onLeave}</p>
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
            <p className="text-3xl font-bold text-gray-600 truncate">{loading ? '-' : stats.inactive}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearchAndActions = () => (
    <div className="space-y-4 mb-6">
      {/* First Row: Search and Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, position, or department..."
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
      
      {/* Second Row: Status Filter */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              logger.info('🎯 [EmployeeManagement] Status filter changed to: all');
              setStatusFilter('all');
            }}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              statusFilter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => {
              logger.info('🎯 [EmployeeManagement] Status filter changed to: active');
              setStatusFilter('active');
            }}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              statusFilter === 'active' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active ({stats.active})
          </button>
          <button
            onClick={() => {
              logger.info('🎯 [EmployeeManagement] Status filter changed to: inactive');
              setStatusFilter('inactive');
            }}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              statusFilter === 'inactive' 
                ? 'bg-gray-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Inactive ({stats.inactive})
          </button>
          <button
            onClick={() => {
              logger.info('🎯 [EmployeeManagement] Status filter changed to: onLeave');
              setStatusFilter('onLeave');
            }}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              statusFilter === 'onLeave' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            On Leave ({stats.onLeave})
          </button>
        </div>
      </div>
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
          
          {/* User Account Linking */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Link to User Account
                <FieldTooltip text="Connect this employee to an existing user account to grant system access" />
              </label>
              <button
                type="button"
                onClick={() => setShowUserLinking(!showUserLinking)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {showUserLinking ? 'Hide' : 'Link User'}
              </button>
            </div>
            
            {showUserLinking && (
              <div className="relative" ref={userDropdownRef}>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  placeholder="Search for user by name or email..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                
                {selectedUserId && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md flex items-center justify-between">
                    <span className="text-sm text-blue-700">
                      {availableUsers.find(u => u.id === selectedUserId)?.name || 
                       availableUsers.find(u => u.id === selectedUserId)?.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserId(null);
                        setUserSearch('');
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                {showUserDropdown && !selectedUserId && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {(() => {
                      logger.info('🔍 [EmployeeManagement] === RENDERING USER DROPDOWN ===');
                      logger.info('🔍 [EmployeeManagement] Available users count:', availableUsers.length);
                      logger.info('🔍 [EmployeeManagement] User search term:', userSearch);
                      logger.info('🔍 [EmployeeManagement] Show dropdown:', showUserDropdown);
                      logger.info('🔍 [EmployeeManagement] Selected user ID:', selectedUserId);
                      
                      if (availableUsers.length === 0) {
                        logger.warn('⚠️ [EmployeeManagement] No available users to display');
                        return (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            No unlinked users found. All users may already have employee records.
                          </div>
                        );
                      }
                      
                      const filtered = availableUsers
                        .filter(user => 
                          userSearch === '' || 
                          user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                          user.email?.toLowerCase().includes(userSearch.toLowerCase())
                        );
                      
                      logger.info('🔍 [EmployeeManagement] Filtered users count:', filtered.length);
                      
                      return filtered.map(user => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setUserSearch(user.name || user.email);
                            setShowUserDropdown(false);
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        >
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || 'No name'}
                          </div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-400">Role: {user.role}</div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
              <FieldTooltip text="Phone number for payroll notifications via WhatsApp and SMS" />
            </label>
            <PhoneInput
              value={formData.phone}
              countryCode={formData.phoneCountryCode}
              onChange={(phone) => setFormData({...formData, phone})}
              onCountryChange={(countryCode) => setFormData({...formData, phoneCountryCode: countryCode})}
              placeholder="Enter phone number"
              error={formErrors.phone}
            />
            {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
              <FieldTooltip text="Employee's date of birth (must be at least 16 years old)" />
            </label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                formErrors.dateOfBirth ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {formErrors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{formErrors.dateOfBirth}</p>}
          </div>
          
          {/* Address Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
              <FieldTooltip text="Employee's residential street address" />
            </label>
            <input
              type="text"
              value={formData.street}
              onChange={(e) => setFormData({...formData, street: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="123 Main Street"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
                <FieldTooltip text="City or town of residence" />
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="New York"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State/Province
                <FieldTooltip text="State, province, or region" />
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="NY"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP/Postal Code
              <FieldTooltip text="ZIP code, postal code, or equivalent" />
            </label>
            <input
              type="text"
              value={formData.zipCode}
              onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="10001"
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
            <select
              value={formData.position}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                formErrors.position ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            >
              <option value="">Select Position</option>
              {POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
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
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            {formErrors.department && <p className="text-red-500 text-xs mt-1">{formErrors.department}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supervisor
              <FieldTooltip text="The employee who will supervise this person. Defaults to owner if not specified." />
            </label>
            <div className="relative" ref={supervisorDropdownRef}>
              <input
                type="text"
                value={supervisorSearch}
                onChange={(e) => {
                  setSupervisorSearch(e.target.value);
                  setShowSupervisorDropdown(true);
                }}
                onFocus={() => setShowSupervisorDropdown(true)}
                placeholder="Search for supervisor..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {formData.supervisor && (
                <div className="text-sm text-gray-600 mt-1">
                  Selected: {basicEmployees.find(e => e.id === formData.supervisor)?.full_name || 
                            `${basicEmployees.find(e => e.id === formData.supervisor)?.first_name} ${basicEmployees.find(e => e.id === formData.supervisor)?.last_name}`}
                </div>
              )}
              
              {showSupervisorDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({...formData, supervisor: ''});
                      setSupervisorSearch('');
                      setShowSupervisorDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 border-b"
                  >
                    No Supervisor (Will use business owner)
                  </button>
                  {filteredSupervisors.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        setFormData({...formData, supervisor: emp.id});
                        setSupervisorSearch(`${emp.first_name} ${emp.last_name}`);
                        setShowSupervisorDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">{emp.first_name} {emp.last_name}</div>
                        <div className="text-xs text-gray-500">{emp.department} • {emp.job_title || emp.position}</div>
                      </div>
                      <span className="text-xs text-gray-400">{emp.employee_number}</span>
                    </button>
                  ))}
                  {filteredSupervisors.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">No employees found</div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employment Type
              <FieldTooltip text="Specify if this is a full-time or part-time position" />
            </label>
            <div className="flex space-x-4">
              {EMPLOYMENT_TYPES.map((type) => (
                <label key={type.value} className="flex items-center">
                  <input
                    type="radio"
                    value={type.value}
                    checked={formData.employmentType === type.value}
                    onChange={(e) => setFormData({...formData, employmentType: e.target.value})}
                    className="mr-2"
                  />
                  <span className="text-sm">{type.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Is Supervisor
              <FieldTooltip text="Can this employee supervise others? Only supervisors will appear in the supervisor dropdown for other employees." />
            </label>
            <div className="flex items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isSupervisor}
                  onChange={(e) => setFormData({...formData, isSupervisor: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">
                  {formData.isSupervisor ? 'Yes, can supervise others' : 'No, cannot supervise others'}
                </span>
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compensation Type
              <FieldTooltip text="Choose between annual salary or hourly wage payment structure" />
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="SALARY"
                  checked={formData.compensationType === 'SALARY'}
                  onChange={(e) => setFormData({...formData, compensationType: e.target.value})}
                  className="mr-2"
                />
                <span className="text-sm">Salary (Annual)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="WAGE"
                  checked={formData.compensationType === 'WAGE'}
                  onChange={(e) => setFormData({...formData, compensationType: e.target.value})}
                  className="mr-2"
                />
                <span className="text-sm">Wage (Hourly)</span>
              </label>
            </div>
          </div>
          
          {formData.compensationType === 'SALARY' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Annual Salary
                <FieldTooltip text="Annual salary - hourly rate will be auto-calculated for timesheets and overtime (salary ÷ 2,080 hours)" />
              </label>
              <input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({...formData, salary: e.target.value})}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                  formErrors.salary ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="e.g., 75000"
              />
              {formErrors.salary && <p className="text-red-500 text-xs mt-1">{formErrors.salary}</p>}
              {formData.salary && !formErrors.salary && (
                <p className="text-xs text-gray-500 mt-1">
                  Hourly equivalent: ${(parseFloat(formData.salary) / 2080).toFixed(2)}/hour
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hourly Wage
                <FieldTooltip text="Hourly wage amount in your local currency" />
              </label>
              <input
                type="number"
                value={formData.wagePerHour}
                onChange={(e) => setFormData({...formData, wagePerHour: e.target.value})}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                  formErrors.wagePerHour ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="e.g., 25.50"
                step="0.01"
              />
              {formErrors.wagePerHour && <p className="text-red-500 text-xs mt-1">{formErrors.wagePerHour}</p>}
            </div>
          )}
          
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
              Country
              <FieldTooltip text="Employee's country of residence for tax identification purposes" />
            </label>
            <select
              value={formData.country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {COUNTRIES.map(country => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {getSecurityNumberInfo(formData.country).label}
              <FieldTooltip 
                text={`Enter the employee's ${getSecurityNumberInfo(formData.country).label.toLowerCase()}. This information is encrypted and securely stored for payroll processing.`} 
              />
            </label>
            <input
              type="text"
              value={formData.securityNumber}
              onChange={(e) => setFormData({...formData, securityNumber: e.target.value})}
              placeholder={getSecurityNumberInfo(formData.country).placeholder}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                formErrors.securityNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {formErrors.securityNumber && <p className="text-red-500 text-xs mt-1">{formErrors.securityNumber}</p>}
            <p className="text-xs text-gray-500 mt-1">
              🔒 Securely encrypted and stored with Stripe for payroll processing
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Used on Quarterly and Annual Tax Forms. Incorrect SSN may result in penalties.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
              <FieldTooltip text="Active: Currently working | Inactive: No longer working (for legal compliance, records are retained) | On Leave: Temporarily away" />
            </label>
            <select
              value={formData.status}
              onChange={(e) => {
                logger.info('🔄 [EmployeeManagement] Status changed:', {
                  from: formData.status,
                  to: e.target.value
                });
                setFormData({...formData, status: e.target.value});
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="active">Active - Currently Working</option>
              <option value="onLeave">On Leave - Temporarily Away</option>
              <option value="inactive">Inactive - No Longer Working</option>
            </select>
            {formData.status === 'inactive' && (
              <p className="text-xs text-gray-500 mt-1">
                🔒 Employee records are retained for legal and compliance purposes
              </p>
            )}
          </div>
        </div>

        {/* Payroll and Benefits */}
        <div className="md:col-span-2 space-y-4">
          <h4 className="text-md font-medium text-gray-900 border-b pb-2">Payroll and Benefits</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Direct Deposit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Direct Deposit
                <FieldTooltip text="Enable direct deposit for automated payroll payments to employee's bank account" />
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="yes"
                    checked={formData.directDeposit === 'yes'}
                    onChange={(e) => setFormData({...formData, directDeposit: e.target.value})}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Yes</span>
                </label>
                {formData.directDeposit === 'yes' && (
                  <p className="ml-6 text-xs text-gray-500">
                    This requires employee bank information. You can change this setting at any time.
                  </p>
                )}
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="no"
                    checked={formData.directDeposit === 'no'}
                    onChange={(e) => setFormData({...formData, directDeposit: e.target.value})}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">No</span>
                </label>
              </div>
            </div>

            {/* Vacation Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vacation Time
                <FieldTooltip text="Specify if this employee is eligible for paid vacation time" />
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="yes"
                    checked={formData.vacationTime === 'yes'}
                    onChange={(e) => setFormData({...formData, vacationTime: e.target.value})}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Yes, offer vacation time</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="no"
                    checked={formData.vacationTime === 'no'}
                    onChange={(e) => setFormData({...formData, vacationTime: e.target.value})}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">No, don't offer vacation time</span>
                </label>
                
                {/* Conditional Vacation Days Field */}
                {formData.vacationTime === 'yes' && (
                  <div className="mt-3 ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vacation Days per Year
                      <FieldTooltip text="Number of paid vacation days this employee receives annually" />
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={formData.vacationDaysPerYear}
                      onChange={(e) => setFormData({...formData, vacationDaysPerYear: e.target.value})}
                      placeholder="e.g. 15"
                      className={`w-32 px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                        formErrors.vacationDaysPerYear ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {formErrors.vacationDaysPerYear && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.vacationDaysPerYear}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
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
      {selectedEmployee ? (
        <>
          {/* Status Banner for Inactive Employees */}
          {selectedEmployee.status === 'inactive' && (
            <div className="mb-6 p-4 bg-gray-100 border border-gray-300 rounded-lg flex items-center">
              <XCircleIcon className="h-5 w-5 text-gray-600 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">This employee is inactive</p>
                <p className="text-sm text-gray-600">
                  Employee records are retained for legal and compliance purposes. 
                  To reactivate, edit the employee and change their status to "Active".
                </p>
              </div>
            </div>
          )}
          
          {/* Status Banner for On Leave Employees */}
          {selectedEmployee.status === 'onLeave' && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
              <CalendarIcon className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">This employee is on leave</p>
                <p className="text-sm text-gray-600">
                  The employee is temporarily away from work. Update their status when they return.
                </p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 border-b pb-2">Personal Information</h4>
            
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
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Date of Birth</p>
                <p className="text-sm text-gray-600">
                  {selectedEmployee.date_of_birth ? new Date(selectedEmployee.date_of_birth).toLocaleDateString() : 'Not provided'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <MapPinIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Address</p>
                <div className="text-sm text-gray-600">
                  {selectedEmployee.street && <p>{selectedEmployee.street}</p>}
                  {(selectedEmployee.city || selectedEmployee.state || selectedEmployee.zipCode) && (
                    <p>
                      {selectedEmployee.city}{selectedEmployee.city && selectedEmployee.state && ', '}{selectedEmployee.state} {selectedEmployee.zipCode}
                    </p>
                  )}
                  {!selectedEmployee.street && !selectedEmployee.city && !selectedEmployee.state && !selectedEmployee.zipCode && (
                    <p>Not provided</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Employment Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 border-b pb-2">Employment Information</h4>
            
            <div className="flex items-center space-x-3">
              <BriefcaseIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Position</p>
                <p className="text-sm text-gray-600">{selectedEmployee.position}</p>
              </div>
            </div>
            
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

            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 text-gray-400 flex items-center justify-center">
                <span className="text-xs font-bold">$</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Compensation</p>
                <p className="text-sm text-gray-600">
                  {selectedEmployee.compensationType === 'SALARY' 
                    ? `$${selectedEmployee.salary || 'Not specified'} annually`
                    : `$${selectedEmployee.wagePerHour || 'Not specified'} per hour`
                  }
                </p>
              </div>
            </div>

            {/* Payroll & Benefits Info */}
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 text-gray-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Direct Deposit</p>
                <p className="text-sm text-gray-600">
                  {selectedEmployee.directDeposit || selectedEmployee.direct_deposit ? 'Enabled' : 'Not enabled'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 text-gray-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Vacation Time</p>
                <p className="text-sm text-gray-600">
                  {selectedEmployee.vacationTime || selectedEmployee.vacation_time 
                    ? `${selectedEmployee.vacationDaysPerYear || selectedEmployee.vacation_days_per_year || 'Not specified'} days per year`
                    : 'No vacation time offered'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 text-gray-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Supervisor Status</p>
                <p className="text-sm text-gray-600">
                  {selectedEmployee.isSupervisor || selectedEmployee.is_supervisor
                    ? 'Can supervise other employees'
                    : 'Regular employee (no supervisory role)'
                  }
                </p>
              </div>
            </div>
            
            {/* Employee Timeline */}
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 text-gray-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Employment Duration</p>
                <p className="text-sm text-gray-600">
                  {selectedEmployee.hireDate ? (() => {
                    const hireDate = new Date(selectedEmployee.hireDate);
                    const now = new Date();
                    const years = now.getFullYear() - hireDate.getFullYear();
                    const months = now.getMonth() - hireDate.getMonth();
                    const totalMonths = years * 12 + months;
                    
                    if (totalMonths < 12) {
                      return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
                    } else {
                      const displayYears = Math.floor(totalMonths / 12);
                      const remainingMonths = totalMonths % 12;
                      return `${displayYears} year${displayYears !== 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}` : ''}`;
                    }
                  })() : 'Not specified'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-6 flex space-x-3">
          <button
            onClick={() => handleEdit(selectedEmployee)}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit Employee Information
          </button>
          {selectedEmployee.status === 'active' && (
            <button
              onClick={() => {
                // Quick deactivate action
                const confirmDeactivate = window.confirm(
                  `Are you sure you want to deactivate ${selectedEmployee.firstName} ${selectedEmployee.lastName}? They can be reactivated later.`
                );
                if (confirmDeactivate) {
                  handleEdit(selectedEmployee);
                  // Auto-set status to inactive
                  setTimeout(() => {
                    setFormData(prev => ({ ...prev, status: 'inactive' }));
                  }, 100);
                }
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Deactivate Employee
            </button>
          )}
        </div>
        </>
      ) : (
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
      )}
    </div>
  );

  const renderEmployeeList = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {loading ? (
        <CenteredSpinner size="large" text="Loading employees..." showText={true} minHeight="h-96" />
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
                  of <span className="font-medium">{filteredEmployees.length}</span> 
                  {statusFilter !== 'all' ? `${statusFilter} ` : ''}employees
                  {searchTerm && ` matching "${searchTerm}"`}
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
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Create New Employee</h2>
              <button
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to List
              </button>
            </div>
            {renderEmployeeForm()}
          </div>
        );
      case 'edit':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Employee: {selectedEmployee?.firstName} {selectedEmployee?.lastName}
              </h2>
              <button
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to List
              </button>
            </div>
            {renderEmployeeForm()}
          </div>
        );
      case 'view':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Employee Details: {selectedEmployee?.firstName} {selectedEmployee?.lastName}
              </h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleEdit(selectedEmployee)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit Employee
                </button>
                <button
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to List
                </button>
              </div>
            </div>
            {renderEmployeeDetails()}
          </div>
        );
      case 'list':
      default:
        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            {renderSummaryCards()}
            
            {/* Search and Actions */}
            {renderSearchAndActions()}
            
            {/* Employee List */}
            {renderEmployeeList()}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Heroicon */}
      <div className="flex items-center space-x-3">
        <UserGroupIcon className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-black">Employee</h1>
          <p className="text-gray-600 mt-1">Manage your team members, track their information, and oversee employment details</p>
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Removed Delete Modal - Employee records must be retained for legal compliance.
          Use the status field to mark employees as 'inactive' instead of deleting them. */}
    </div>
  );
}

export default EmployeeManagement;