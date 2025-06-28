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
  PlayIcon,
  StopIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  BriefcaseIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { hrApi, payrollApi } from '@/utils/apiClient';
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
 * Timesheet Management Component
 * Industry-standard timesheet management with CRUD operations and standard UI
 */
function TimesheetManagement({ onNavigate }) {
  const router = useRouter();
  
  // State management
  const [activeTab, setActiveTab] = useState('list');
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalHours: 0,
    todayHours: 0,
    weekHours: 0,
    pendingApprovals: 0
  });

  // Form state for create/edit
  const [formData, setFormData] = useState({
    employee: '',
    project: '',
    task: '',
    date: '',
    startTime: '',
    endTime: '',
    hours: '',
    description: '',
    status: 'draft'
  });

  const [errors, setErrors] = useState({});

  // Load data on component mount
  useEffect(() => {
    loadTimesheets();
    loadStats();
  }, []);

  const loadTimesheets = async () => {
    try {
      setLoading(true);
      const data = await payrollApi.timesheets.getAll();
      setTimesheets(data || []);
    } catch (error) {
      logger.error('[TimesheetManagement] Error loading timesheets:', error);
      toast.error('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await payrollApi.timesheets.getStats();
      setStats(data || stats);
    } catch (error) {
      logger.error('[TimesheetManagement] Error loading stats:', error);
    }
  };

  // Filter timesheets based on search term
  const filteredTimesheets = useMemo(() => {
    if (!searchTerm) return timesheets;
    
    return timesheets.filter(timesheet =>
      timesheet.employee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      timesheet.project?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      timesheet.task?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [timesheets, searchTerm]);

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
      Header: 'Project',
      accessor: 'project',
      Cell: ({ value }) => (
        <span className="text-sm text-gray-600">{value}</span>
      )
    },
    {
      Header: 'Date',
      accessor: 'date',
      Cell: ({ value }) => (
        <span className="text-sm text-gray-600">{new Date(value).toLocaleDateString()}</span>
      )
    },
    {
      Header: 'Hours',
      accessor: 'hours',
      Cell: ({ value }) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {value}h
        </span>
      )
    },
    {
      Header: 'Status',
      accessor: 'status',
      Cell: ({ value }) => {
        const statusConfig = {
          draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
          submitted: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Submitted' },
          approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
          rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' }
        };
        const config = statusConfig[value] || statusConfig.draft;
        
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
      data: filteredTimesheets,
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
    if (!formData.project.trim()) newErrors.project = 'Project is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = () => {
    setFormData({
      employee: '',
      project: '',
      task: '',
      date: '',
      startTime: '',
      endTime: '',
      hours: '',
      description: '',
      status: 'draft'
    });
    setErrors({});
    setIsCreateModalOpen(true);
    setActiveTab('create');
  };

  const handleEdit = (timesheet) => {
    setSelectedTimesheet(timesheet);
    setFormData({ ...timesheet });
    setErrors({});
    setIsEditModalOpen(true);
    setActiveTab('edit');
  };

  const handleView = (timesheet) => {
    setSelectedTimesheet(timesheet);
    setIsViewModalOpen(true);
    setActiveTab('details');
  };

  const handleDelete = (timesheet) => {
    setSelectedTimesheet(timesheet);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      if (selectedTimesheet) {
        await payrollApi.timesheets.update(selectedTimesheet.id, formData);
        toast.success('Timesheet updated successfully');
        setIsEditModalOpen(false);
      } else {
        await payrollApi.timesheets.create(formData);
        toast.success('Timesheet created successfully');
        setIsCreateModalOpen(false);
      }
      
      await loadTimesheets();
      await loadStats();
      setActiveTab('list');
    } catch (error) {
      logger.error('[TimesheetManagement] Error saving timesheet:', error);
      toast.error('Failed to save timesheet');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await payrollApi.timesheets.delete(selectedTimesheet.id);
      toast.success('Timesheet deleted successfully');
      setIsDeleteModalOpen(false);
      await loadTimesheets();
      await loadStats();
    } catch (error) {
      logger.error('[TimesheetManagement] Error deleting timesheet:', error);
      toast.error('Failed to delete timesheet');
    }
  };

  // Summary Cards Component
  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ClockIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Hours</p>
            <p className="text-3xl font-bold text-blue-600">{loading ? '-' : stats.totalHours}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CalendarIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Today's Hours</p>
            <p className="text-3xl font-bold text-green-600">{loading ? '-' : stats.todayHours}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <BriefcaseIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Week Hours</p>
            <p className="text-3xl font-bold text-purple-600">{loading ? '-' : stats.weekHours}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ClipboardDocumentListIcon className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Pending Approvals</p>
            <p className="text-3xl font-bold text-yellow-600">{loading ? '-' : stats.pendingApprovals}</p>
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
          placeholder="Search timesheets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <button
        onClick={handleCreate}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <PlayIcon className="h-4 w-4 mr-2" />
        Start Timer
      </button>
    </div>
  );

  // Tab Navigation Component
  const renderTabNavigation = () => (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-8">
        {[
          { id: 'list', label: 'Timesheets', icon: ClockIcon },
          { id: 'create', label: 'Create Entry', icon: PlayIcon },
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
              <FieldTooltip text="Select the employee for this timesheet entry" />
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
              Project
              <FieldTooltip text="Select the project this time was spent on" />
            </label>
            <input
              type="text"
              name="project"
              value={formData.project}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.project ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter project name"
            />
            {errors.project && <p className="mt-1 text-sm text-red-600">{errors.project}</p>}
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Date
              <FieldTooltip text="Select the date for this timesheet entry" />
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Task (Optional)
              <FieldTooltip text="Specific task or activity performed" />
            </label>
            <input
              type="text"
              name="task"
              value={formData.task}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter task description"
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Start Time
              <FieldTooltip text="Time when work started" />
            </label>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.startTime ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.startTime && <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>}
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              End Time
              <FieldTooltip text="Time when work ended" />
            </label>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.endTime ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.endTime && <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>}
          </div>
        </div>

        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
            <FieldTooltip text="Detailed description of work performed" />
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe the work performed..."
          />
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
            {selectedTimesheet ? 'Update' : 'Create'} Timesheet
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
                {Math.min((pageIndex + 1) * pageSize, filteredTimesheets.length)}
              </span>{' '}
              of <span className="font-medium">{filteredTimesheets.length}</span> results
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
        return selectedTimesheet ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Timesheet Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Employee</label>
                <p className="text-sm text-gray-900">{selectedTimesheet.employee}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Project</label>
                <p className="text-sm text-gray-900">{selectedTimesheet.project}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Date</label>
                <p className="text-sm text-gray-900">{new Date(selectedTimesheet.date).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Hours</label>
                <p className="text-sm text-gray-900">{selectedTimesheet.hours}</p>
              </div>
              {selectedTimesheet.description && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-sm text-gray-900">{selectedTimesheet.description}</p>
                </div>
              )}
            </div>
          </div>
        ) : null;
      default:
        return renderTable();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Heroicon */}
      <div className="flex items-center space-x-3">
        <ClockIcon className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-black">Timesheet Management</h1>
          <p className="text-gray-600 mt-1">Track and manage employee time entries and approvals</p>
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
                    Delete Timesheet
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete this timesheet entry? This action cannot be undone.
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

export default TimesheetManagement;