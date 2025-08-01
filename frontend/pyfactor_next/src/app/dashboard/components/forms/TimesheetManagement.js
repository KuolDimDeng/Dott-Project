'use client';

import React, { useState, useEffect, Fragment, useRef, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useTable, usePagination, useSortBy } from 'react-table';
import { 
  MagnifyingGlassIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  BriefcaseIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PlusCircleIcon,
  EyeIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useSessionContext } from '@/providers/SessionProvider';
import { logger } from '@/utils/logger';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';
import timesheetApi from '@/utils/api/timesheetApi';
import EnhancedTimesheet from '@/app/dashboard/components/forms/timesheet/EnhancedTimesheet';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </button>
      {showTooltip && (
        <div className={`absolute z-10 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap
          ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 transform -translate-x-1/2`}>
          {text}
          <div className={`absolute left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45
            ${position === 'top' ? 'top-full -mt-1' : 'bottom-full -mb-1'}`} />
        </div>
      )}
    </div>
  );
};

/**
 * HR Timesheet Management Component
 * Comprehensive timesheet management for HR team with different handling for salary vs wage workers
 */
function TimesheetManagement({ onNavigate }) {
  const router = useRouter();
  const { user } = useSessionContext();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [weekPeriod, setWeekPeriod] = useState(null);
  const [summary, setSummary] = useState({
    total_employees: 0,
    approved_count: 0,
    pending_manager_approval: 0,
    pending_hr_approval: 0,
    not_started: 0,
    payroll_ready: false
  });
  const [processingBulk, setProcessingBulk] = useState(false);
  const [showBulkApprovalModal, setShowBulkApprovalModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showTimesheetModal, setShowTimesheetModal] = useState(false);
  const [showEnhancedTimesheet, setShowEnhancedTimesheet] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadHRDashboard();
  }, []);

  const loadHRDashboard = async () => {
    try {
      setLoading(true);
      
      // Call the new HR dashboard API
      const data = await timesheetApi.getHRDashboard();
      setEmployees(data.employees || []);
      setWeekPeriod(data.week_period);
      setSummary(data.summary || {});
      
    } catch (error) {
      logger.error('[TimesheetManagement] Error loading HR dashboard:', error);
      toast.error('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadHRDashboard();
    setRefreshing(false);
  };

  const generateSalaryTimesheets = async () => {
    try {
      setProcessingBulk(true);
      
      const data = await timesheetApi.generateSalaryTimesheets();
      toast.success(`Generated ${data.created_count} salary timesheets`);
      
      if (data.errors && data.errors.length > 0) {
        data.errors.forEach(error => toast.error(error));
      }
      
      await refreshData();
      
    } catch (error) {
      logger.error('[TimesheetManagement] Error generating salary timesheets:', error);
      toast.error('Failed to generate salary timesheets');
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleBulkApprove = async () => {
    try {
      setProcessingBulk(true);
      
      const timesheetIds = selectedEmployees
        .map(empId => {
          const emp = employees.find(e => e.employee_id === empId);
          return emp?.timesheet_status?.timesheet_id;
        })
        .filter(id => id);

      const data = await timesheetApi.bulkApproveTimesheets(timesheetIds);
      toast.success(`Approved ${data.approved_count} timesheets`);
      
      if (data.errors && data.errors.length > 0) {
        data.errors.forEach(error => toast.error(error));
      }
      
      setSelectedEmployees([]);
      setShowBulkApprovalModal(false);
      await refreshData();
      
    } catch (error) {
      logger.error('[TimesheetManagement] Error bulk approving:', error);
      toast.error('Failed to approve timesheets');
    } finally {
      setProcessingBulk(false);
    }
  };

  // Filter employees based on search and filters
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = 
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || employee.timesheet_status.status === filterStatus;
      const matchesType = filterType === 'all' || employee.compensation_type === filterType;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [employees, searchTerm, filterStatus, filterType]);

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      'approved': { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, text: 'Approved' },
      'submitted': { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon, text: 'Pending Review' },
      'draft': { color: 'bg-gray-100 text-gray-800', icon: DocumentTextIcon, text: 'Draft' },
      'not_started': { color: 'bg-red-100 text-red-800', icon: XCircleIcon, text: 'Not Started' }
    };
    
    const config = statusConfig[status] || statusConfig['not_started'];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-4 h-4 mr-1" />
        {config.text}
      </span>
    );
  };

  // Get compensation type badge
  const getCompensationBadge = (type) => {
    if (type === 'SALARY') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <CurrencyDollarIcon className="w-4 h-4 mr-1" />
          Salary
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <ClockIcon className="w-4 h-4 mr-1" />
          Hourly
        </span>
      );
    }
  };

  // Render summary cards
  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <UserGroupIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Employees</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.total_employees}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Approved</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.approved_count}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Pending HR Review</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.pending_hr_approval}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Not Started</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.not_started}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render search and filters
  const renderSearchAndFilters = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="submitted">Pending Review</option>
            <option value="draft">Draft</option>
            <option value="not_started">Not Started</option>
          </select>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="SALARY">Salary</option>
            <option value="WAGE">Hourly</option>
          </select>
          
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Render action buttons
  const renderActionButtons = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={generateSalaryTimesheets}
            disabled={processingBulk}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <PlusCircleIcon className="h-4 w-4" />
            <span>Generate Salary Timesheets</span>
          </button>
          
          {selectedEmployees.length > 0 && (
            <button
              onClick={() => setShowBulkApprovalModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <CheckCircleIcon className="h-4 w-4" />
              <span>Approve Selected ({selectedEmployees.length})</span>
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Week Period:</span>
          <span className="text-sm font-medium">
            {weekPeriod ? `${weekPeriod.start} to ${weekPeriod.end}` : 'Loading...'}
          </span>
        </div>
      </div>
    </div>
  );

  // Render employees table
  const renderEmployeesTable = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEmployees(filteredEmployees.map(emp => emp.employee_id));
                    } else {
                      setSelectedEmployees([]);
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supervisor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEmployees.map((employee) => (
              <tr key={employee.employee_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(employee.employee_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmployees([...selectedEmployees, employee.employee_id]);
                      } else {
                        setSelectedEmployees(selectedEmployees.filter(id => id !== employee.employee_id));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UserIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                      <div className="text-sm text-gray-500">{employee.employee_number}</div>
                      <div className="text-sm text-gray-500">{employee.department}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getCompensationBadge(employee.compensation_type)}
                  <div className="text-xs text-gray-500 mt-1">
                    ${employee.hourly_rate.toFixed(2)}/hr
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {employee.timesheet_status.total_hours.toFixed(1)} hrs
                  </div>
                  <div className="text-xs text-gray-500">
                    R: {employee.timesheet_status.regular_hours.toFixed(1)} | 
                    OT: {employee.timesheet_status.overtime_hours.toFixed(1)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(employee.timesheet_status.status)}
                  {employee.needs_manager_approval && (
                    <div className="text-xs text-yellow-600 mt-1">
                      Needs manager approval
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {employee.supervisor || 'None'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowTimesheetModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowEnhancedTimesheet(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Edit Timesheet"
                    >
                      <ClipboardDocumentListIcon className="h-4 w-4" />
                    </button>
                    {employee.timesheet_status.status === 'submitted' && !employee.needs_manager_approval && (
                      <button
                        onClick={() => handleBulkApprove([employee.employee_id])}
                        className="text-green-600 hover:text-green-900"
                        title="Approve"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return <CenteredSpinner size="large" text="Loading timesheets..." showText={true} minHeight="h-screen" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-black">HR Timesheet Management</h1>
            <p className="text-gray-600 mt-1">Review and approve employee timesheets for payroll processing</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {summary.payroll_ready ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <CheckCircleIcon className="w-4 h-4 mr-1" />
              Ready for Payroll
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
              Payroll Not Ready
            </span>
          )}
        </div>
      </div>

      {renderSummaryCards()}
      {renderSearchAndFilters()}
      {renderActionButtons()}
      {renderEmployeesTable()}

      {/* Bulk Approval Modal */}
      <Transition appear show={showBulkApprovalModal} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setShowBulkApprovalModal(false)}>
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
                  <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
                    Approve Selected Timesheets
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to approve {selectedEmployees.length} selected timesheets? 
                      This action cannot be undone.
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                      onClick={() => setShowBulkApprovalModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      onClick={handleBulkApprove}
                      disabled={processingBulk}
                    >
                      {processingBulk ? 'Approving...' : 'Approve'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Enhanced Timesheet Modal */}
      <Transition appear show={showEnhancedTimesheet} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setShowEnhancedTimesheet(false)}>
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
                <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  {selectedEmployee && (
                    <EnhancedTimesheet 
                      employee={selectedEmployee}
                      onClose={() => {
                        setShowEnhancedTimesheet(false);
                        refreshData(); // Refresh the dashboard after editing
                      }}
                    />
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

export default TimesheetManagement;