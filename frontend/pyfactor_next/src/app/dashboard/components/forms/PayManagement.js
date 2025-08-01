'use client';

import React, { useState, useEffect, Fragment, useRef, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useTable, usePagination, useSortBy } from 'react-table';
import { 
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { hrApi } from '@/utils/apiClient';
import { logger } from '@/utils/logger';
import api from '@/utils/api';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

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
 * Pay Management Component
 * Comprehensive employee payment management including bank info, withholdings, benefits, and deductions
 */
function PayManagement({ onNavigate }) {
  const router = useRouter();
  
  // State management
  const [activeTab, setActiveTab] = useState('deposit-methods');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [depositMethods, setDepositMethods] = useState([]);
  const [withholdings, setWithholdings] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [payStatements, setPayStatements] = useState([]);
  const [paySettings, setPaySettings] = useState(null);
  const [stats, setStats] = useState({
    totalActiveEmployees: 0,
    directDepositSetup: 0,
    withHoldingCompleted: 0,
    upcomingPayDate: null,
    totalPayroll: 0,
    avgSalary: 0,
    pendingPayments: 0,
    processedThisMonth: 0
  });

  // Missing state variables for payRecords and modals
  const [payRecords, setPayRecords] = useState([]);
  const [selectedPayRecord, setSelectedPayRecord] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    employee: '',
    position: '',
    department: '',
    baseSalary: '',
    overtimeHours: '',
    overtimeRate: '',
    bonuses: '',
    deductions: '',
    payPeriod: '',
    payDate: '',
    status: 'pending'
  });

  const [errors, setErrors] = useState({});

  // Load data on component mount
  useEffect(() => {
    loadEmployees();
    loadPayrollSettings();
    loadStats();
    loadPayRecords();
  }, []);
  
  // Load data when employee selection changes
  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeePaymentData();
    }
  }, [selectedEmployee]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/hr/v2/employees/');
      setEmployees(response.data?.data || []);
    } catch (error) {
      logger.error('[PayManagement] Error loading employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };
  
  const loadPayrollSettings = async () => {
    try {
      const response = await api.get('/api/payroll/settings/');
      setPaySettings(response.data);
    } catch (error) {
      logger.error('[PayManagement] Error loading payroll settings:', error);
    }
  };

  const loadPayRecords = async () => {
    try {
      const response = await api.get('/api/payroll/records/');
      setPayRecords(response.data?.results || []);
    } catch (error) {
      logger.error('[PayManagement] Error loading pay records:', error);
      // Set some mock data for demonstration
      setPayRecords([
        {
          id: 1,
          employee: 'John Doe',
          position: 'Software Engineer',
          department: 'IT',
          baseSalary: 75000,
          payPeriod: 'July 2024',
          payDate: '2024-07-31',
          status: 'pending'
        },
        {
          id: 2,
          employee: 'Jane Smith',
          position: 'HR Manager',
          department: 'HR',
          baseSalary: 65000,
          payPeriod: 'July 2024',
          payDate: '2024-07-31',
          status: 'processed'
        }
      ]);
    }
  };
  
  const loadEmployeePaymentData = async () => {
    if (!selectedEmployee) return;
    
    try {
      setLoading(true);
      
      // Load all payment-related data in parallel
      const [depositResponse, withholdingResponse, bonusResponse, statementsResponse] = await Promise.all([
        api.get(`/api/payroll/deposit-methods/?employee=${selectedEmployee.id}`),
        api.get(`/api/payroll/withholdings/?employee=${selectedEmployee.id}`),
        api.get(`/api/payroll/bonuses/?employee=${selectedEmployee.id}`),
        api.get(`/api/payroll/statements/?employee=${selectedEmployee.id}`)
      ]);
      
      setDepositMethods(depositResponse.data || []);
      setWithholdings(withholdingResponse.data || []);
      setBonuses(bonusResponse.data || []);
      setPayStatements(statementsResponse.data || []);
    } catch (error) {
      logger.error('[PayManagement] Error loading employee payment data:', error);
      toast.error('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/api/payroll/stats/');
      setStats(response.data || stats);
    } catch (error) {
      logger.error('[PayManagement] Error loading stats:', error);
    }
  };

  // Filter pay records based on search term
  const filteredPayRecords = useMemo(() => {
    if (!searchTerm) return payRecords;
    
    return payRecords.filter(record =>
      record.employee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [payRecords, searchTerm]);

  // Table columns configuration
  const columns = useMemo(() => [
    {
      Header: 'Employee',
      accessor: 'employee',
      Cell: ({ value }) => (
        <div className="flex items-center">
          <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="font-medium text-gray-900">{value}</span>
        </div>
      )
    },
    {
      Header: 'Position',
      accessor: 'position',
      Cell: ({ value }) => (
        <span className="text-sm text-gray-600">{value}</span>
      )
    },
    {
      Header: 'Department',
      accessor: 'department',
      Cell: ({ value }) => (
        <span className="text-sm text-gray-600">{value}</span>
      )
    },
    {
      Header: 'Base Salary',
      accessor: 'baseSalary',
      Cell: ({ value }) => (
        <span className="inline-flex items-center text-sm font-medium text-green-800">
          ${value?.toLocaleString()}
        </span>
      )
    },
    {
      Header: 'Pay Period',
      accessor: 'payPeriod',
      Cell: ({ value }) => (
        <span className="text-sm text-gray-600">{value}</span>
      )
    },
    {
      Header: 'Status',
      accessor: 'status',
      Cell: ({ value }) => {
        const statusConfig = {
          pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
          processed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Processed' },
          approved: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Approved' },
          rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' }
        };
        const config = statusConfig[value] || statusConfig.pending;
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
          </span>
        );
      }
    },
    {
      Header: 'Actions',
      Cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleView(row.original)}
            className="text-blue-600 hover:text-blue-900"
            title="View"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEdit(row.original)}
            className="text-purple-600 hover:text-purple-900"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original)}
            className="text-red-600 hover:text-red-900"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ], []);

  // Table hooks
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
    state: { pageIndex, pageSize }
  } = useTable(
    {
      columns,
      data: filteredPayRecords,
      initialState: { pageIndex: 0, pageSize: 10 }
    },
    useSortBy,
    usePagination
  );

  // Event handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.employee.trim()) newErrors.employee = 'Employee is required';
    if (!formData.position.trim()) newErrors.position = 'Position is required';
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.baseSalary || isNaN(formData.baseSalary)) newErrors.baseSalary = 'Valid base salary is required';
    if (!formData.payPeriod) newErrors.payPeriod = 'Pay period is required';
    if (!formData.payDate) newErrors.payDate = 'Pay date is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = () => {
    setFormData({
      employee: '',
      position: '',
      department: '',
      baseSalary: '',
      overtimeHours: '',
      overtimeRate: '',
      bonuses: '',
      deductions: '',
      payPeriod: '',
      payDate: '',
      status: 'pending'
    });
    setErrors({});
    setIsCreateModalOpen(true);
    setActiveTab('create');
  };

  const handleEdit = (payRecord) => {
    setSelectedPayRecord(payRecord);
    setFormData({ ...payRecord });
    setErrors({});
    setIsEditModalOpen(true);
    setActiveTab('edit');
  };

  const handleView = (payRecord) => {
    setSelectedPayRecord(payRecord);
    setIsViewModalOpen(true);
    setActiveTab('details');
  };

  const handleDelete = (payRecord) => {
    setSelectedPayRecord(payRecord);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      if (selectedPayRecord) {
        await hrApi.payroll.update(selectedPayRecord.id, formData);
        toast.success('Pay record updated successfully');
        setIsEditModalOpen(false);
      } else {
        await hrApi.payroll.create(formData);
        toast.success('Pay record created successfully');
        setIsCreateModalOpen(false);
      }
      
      await loadPayRecords();
      await loadStats();
      setActiveTab('list');
    } catch (error) {
      logger.error('[PayManagement] Error saving pay record:', error);
      toast.error('Failed to save pay record');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await hrApi.payroll.delete(selectedPayRecord.id);
      toast.success('Pay record deleted successfully');
      setIsDeleteModalOpen(false);
      await loadPayRecords();
      await loadStats();
    } catch (error) {
      logger.error('[PayManagement] Error deleting pay record:', error);
      toast.error('Failed to delete pay record');
    }
  };

  // Summary Cards Component
  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Payroll</p>
            <p className="text-3xl font-bold text-green-600">${loading ? '-' : stats.totalPayroll?.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <BanknotesIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Avg Salary</p>
            <p className="text-3xl font-bold text-blue-600">${loading ? '-' : stats.avgSalary?.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ClipboardDocumentListIcon className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Pending Payments</p>
            <p className="text-3xl font-bold text-yellow-600">{loading ? '-' : stats.pendingPayments}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CalendarIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Processed This Month</p>
            <p className="text-3xl font-bold text-purple-600">{loading ? '-' : stats.processedThisMonth}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Search and Actions Component
  const renderSearchAndActions = () => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="relative flex-1 max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search pay records..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <button
        onClick={handleCreate}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <CurrencyDollarIcon className="h-4 w-4 mr-2" />
        Add Pay Record
      </button>
    </div>
  );

  // Tab Navigation Component
  const renderTabNavigation = () => (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-8">
        {[
          { id: 'list', label: 'Pay Records', icon: CurrencyDollarIcon },
          { id: 'create', label: 'Create Record', icon: DocumentTextIcon },
          { id: 'details', label: 'Details', icon: EyeIcon }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );

  // Form Component
  const renderForm = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Employee
              <FieldTooltip text="Select the employee for this pay record" />
            </label>
            <input
              type="text"
              name="employee"
              value={formData.employee}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.employee ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter employee name"
            />
            {errors.employee && <p className="mt-1 text-sm text-red-600">{errors.employee}</p>}
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Position
              <FieldTooltip text="Employee's job title or position" />
            </label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.position ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter position"
            />
            {errors.position && <p className="mt-1 text-sm text-red-600">{errors.position}</p>}
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Department
              <FieldTooltip text="Employee's department or team" />
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.department ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter department"
            />
            {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department}</p>}
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Base Salary
              <FieldTooltip text="Employee's base salary amount" />
            </label>
            <input
              type="number"
              name="baseSalary"
              value={formData.baseSalary}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.baseSalary ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter base salary"
            />
            {errors.baseSalary && <p className="mt-1 text-sm text-red-600">{errors.baseSalary}</p>}
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Overtime Hours (Optional)
              <FieldTooltip text="Number of overtime hours worked" />
            </label>
            <input
              type="number"
              name="overtimeHours"
              value={formData.overtimeHours}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter overtime hours"
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Overtime Rate (Optional)
              <FieldTooltip text="Hourly rate for overtime work" />
            </label>
            <input
              type="number"
              name="overtimeRate"
              value={formData.overtimeRate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter overtime rate"
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Bonuses (Optional)
              <FieldTooltip text="Additional bonuses or incentives" />
            </label>
            <input
              type="number"
              name="bonuses"
              value={formData.bonuses}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter bonus amount"
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Deductions (Optional)
              <FieldTooltip text="Deductions from pay (taxes, insurance, etc.)" />
            </label>
            <input
              type="number"
              name="deductions"
              value={formData.deductions}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter deduction amount"
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Pay Period
              <FieldTooltip text="Pay period for this record (e.g., 'Jan 2024', 'Week 1-2024')" />
            </label>
            <input
              type="text"
              name="payPeriod"
              value={formData.payPeriod}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.payPeriod ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter pay period"
            />
            {errors.payPeriod && <p className="mt-1 text-sm text-red-600">{errors.payPeriod}</p>}
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Pay Date
              <FieldTooltip text="Date when payment will be or was processed" />
            </label>
            <input
              type="date"
              name="payDate"
              value={formData.payDate}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.payDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.payDate && <p className="mt-1 text-sm text-red-600">{errors.payDate}</p>}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setIsCreateModalOpen(false);
              setIsEditModalOpen(false);
              setActiveTab('list');
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {selectedPayRecord ? 'Update' : 'Create'} Pay Record
          </button>
        </div>
      </form>
    </div>
  );

  // Table Component
  const renderTable = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.render('Header')}</span>
                      {column.isSorted && (
                        <span className="text-blue-500">
                          {column.isSortedDesc ? '↓' : '↑'}
                        </span>
                      )}
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
                <tr {...row.getRowProps()} className="hover:bg-gray-50">
                  {row.cells.map(cell => (
                    <td
                      {...cell.getCellProps()}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
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
                {Math.min((pageIndex + 1) * pageSize, filteredPayRecords.length)}
              </span>{' '}
              of <span className="font-medium">{filteredPayRecords.length}</span> results
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
    </div>
  );

  // Content renderer based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'create':
      case 'edit':
        return renderForm();
      case 'details':
        return selectedPayRecord ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pay Record Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Employee</label>
                <p className="text-sm text-gray-900">{selectedPayRecord.employee}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Position</label>
                <p className="text-sm text-gray-900">{selectedPayRecord.position}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Department</label>
                <p className="text-sm text-gray-900">{selectedPayRecord.department}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Base Salary</label>
                <p className="text-sm text-gray-900">${selectedPayRecord.baseSalary?.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Pay Period</label>
                <p className="text-sm text-gray-900">{selectedPayRecord.payPeriod}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Pay Date</label>
                <p className="text-sm text-gray-900">{new Date(selectedPayRecord.payDate).toLocaleDateString()}</p>
              </div>
              {selectedPayRecord.overtimeHours && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Overtime Hours</label>
                  <p className="text-sm text-gray-900">{selectedPayRecord.overtimeHours}</p>
                </div>
              )}
              {selectedPayRecord.bonuses && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Bonuses</label>
                  <p className="text-sm text-gray-900">${selectedPayRecord.bonuses?.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        ) : null;
      default:
        return renderTable();
    }
  };

  // Show loading spinner while data is loading
  if (loading) {
    return <CenteredSpinner size="large" text="Loading pay management..." showText={true} minHeight="h-screen" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Heroicon */}
      <div className="flex items-center space-x-3">
        <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold text-black">Pay Management</h1>
          <p className="text-gray-600 mt-1">Manage employee compensation, payroll, and payment records</p>
        </div>
      </div>

      {renderSummaryCards()}
      {renderSearchAndActions()}
      {renderTabNavigation()}
      {renderContent()}

      {/* Delete Confirmation Dialog */}
      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsDeleteModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="absolute inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="absolute inset-0 overflow-y-auto">
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
                    Delete Pay Record
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete this pay record? This action cannot be undone.
                    </p>
                  </div>

                  <div className="mt-4 flex space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      onClick={handleDeleteConfirm}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setIsDeleteModalOpen(false)}
                    >
                      Cancel
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

export default PayManagement;