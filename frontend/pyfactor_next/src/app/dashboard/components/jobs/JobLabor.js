'use client';

import React, { useState, useEffect } from 'react';
import { jobService } from '@/services/jobService';
import { logger } from '@/utils/logger';
import { 
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const JobLabor = ({ jobs = [] }) => {
  // Ensure jobs is always an array
  const jobsList = Array.isArray(jobs) ? jobs : [];
  const [selectedJob, setSelectedJob] = useState(null);
  const [laborEntries, setLaborEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddLabor, setShowAddLabor] = useState(false);
  const [editingLabor, setEditingLabor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  const [laborForm, setLaborForm] = useState({
    employee_id: '',
    employee_name: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    hourly_rate: '',
    total_cost: '',
    task_description: '',
    notes: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchJobLabor();
    }
  }, [selectedJob]);

  useEffect(() => {
    // Calculate total cost when hours or hourly rate changes
    const hours = parseFloat(laborForm.hours) || 0;
    const hourlyRate = parseFloat(laborForm.hourly_rate) || 0;
    const totalCost = hours * hourlyRate;
    setLaborForm(prev => ({ ...prev, total_cost: totalCost.toFixed(2) }));
  }, [laborForm.hours, laborForm.hourly_rate]);

  const fetchEmployees = async () => {
    try {
      const employeesData = await jobService.getAvailableEmployees();
      setEmployees(employeesData);
    } catch (err) {
      logger.error('Error fetching employees:', err);
    }
  };

  const fetchJobLabor = async () => {
    if (!selectedJob) return;
    
    setLoading(true);
    try {
      const laborData = await jobService.getJobLabor(selectedJob.id);
      setLaborEntries(laborData);
    } catch (err) {
      logger.error('Error fetching job labor:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (e) => {
    const employeeId = e.target.value;
    const employee = employees.find(emp => emp.id.toString() === employeeId);
    
    if (employee) {
      setLaborForm({
        ...laborForm,
        employee_id: employeeId,
        employee_name: employee.name || `${employee.first_name} ${employee.last_name}`,
        hourly_rate: employee.hourly_rate || ''
      });
    } else {
      setLaborForm({
        ...laborForm,
        employee_id: employeeId,
        employee_name: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      if (editingLabor) {
        await jobService.updateJobLabor(selectedJob.id, editingLabor.id, laborForm);
      } else {
        await jobService.addJobLabor(selectedJob.id, laborForm);
      }
      
      fetchJobLabor();
      resetForm();
    } catch (err) {
      logger.error('Error saving labor:', err);
      alert('Failed to save labor entry');
    }
  };

  const handleDelete = async (laborId) => {
    if (!selectedJob || !confirm('Are you sure you want to remove this labor entry?')) return;

    try {
      await jobService.removeJobLabor(selectedJob.id, laborId);
      fetchJobLabor();
    } catch (err) {
      logger.error('Error deleting labor:', err);
      alert('Failed to remove labor entry');
    }
  };

  const handleEdit = (labor) => {
    setEditingLabor(labor);
    setLaborForm({
      employee_id: labor.employee_id || '',
      employee_name: labor.employee_name || '',
      date: labor.date?.split('T')[0] || '',
      hours: labor.hours || '',
      hourly_rate: labor.hourly_rate || '',
      total_cost: labor.total_cost || '',
      task_description: labor.task_description || '',
      notes: labor.notes || ''
    });
    setShowAddLabor(true);
  };

  const resetForm = () => {
    setLaborForm({
      employee_id: '',
      employee_name: '',
      date: new Date().toISOString().split('T')[0],
      hours: '',
      hourly_rate: '',
      total_cost: '',
      task_description: '',
      notes: ''
    });
    setEditingLabor(null);
    setShowAddLabor(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const calculateTotalLaborCost = () => {
    return laborEntries.reduce((sum, entry) => sum + (parseFloat(entry.total_cost) || 0), 0);
  };

  const calculateTotalHours = () => {
    return laborEntries.reduce((sum, entry) => sum + (parseFloat(entry.hours) || 0), 0);
  };

  const filteredJobs = jobsList.filter(job => 
    job.job_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLaborEntries = laborEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    const startDate = new Date(dateFilter.start);
    const endDate = new Date(dateFilter.end);
    return entryDate >= startDate && entryDate <= endDate;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center mb-4">
          <UserGroupIcon className="h-8 w-8 text-blue-600 mr-3" />
          Labor Tracking
        </h2>
        <p className="text-gray-600">
          Track employee hours and labor costs for each job
        </p>
      </div>

      {/* Summary Stats */}
      {selectedJob && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <ClockIcon className="h-10 w-10 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{calculateTotalHours().toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-10 w-10 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Labor Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(calculateTotalLaborCost())}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <UserGroupIcon className="h-10 w-10 text-purple-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Workers Assigned</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(laborEntries.map(e => e.employee_id)).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Selection */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Select a Job</h3>
            </div>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredJobs.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">No jobs found</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredJobs.map((job) => (
                  <li
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`px-6 py-4 hover:bg-gray-50 cursor-pointer ${
                      selectedJob?.id === job.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{job.job_number}</p>
                        <p className="text-sm text-gray-600">{job.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{job.customer?.name}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                        ${job.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          job.status === 'in_progress' ? 'bg-orange-100 text-orange-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {job.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Labor Entries */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedJob ? `Labor for ${selectedJob.job_number}` : 'Labor Entries'}
              </h3>
              {selectedJob && (
                <button
                  onClick={() => setShowAddLabor(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Labor
                </button>
              )}
            </div>
            {selectedJob && (
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md"
                />
              </div>
            )}
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : selectedJob ? (
              <>
                {filteredLaborEntries.length === 0 ? (
                  <div className="text-center py-12">
                    <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No labor entries found</p>
                    <button
                      onClick={() => setShowAddLabor(true)}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      Add First Entry
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredLaborEntries.map((entry) => (
                            <tr key={entry.id}>
                              <td className="px-3 py-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{entry.employee_name}</p>
                                  {entry.task_description && (
                                    <p className="text-xs text-gray-500">{entry.task_description}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {formatDate(entry.date)}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {entry.hours}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {formatCurrency(entry.hourly_rate)}/hr
                              </td>
                              <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                {formatCurrency(entry.total_cost)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={() => handleEdit(entry)}
                                  className="text-blue-600 hover:text-blue-700 mr-2"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(entry.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  Select a job to view and track labor
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Labor Modal */}
      {showAddLabor && selectedJob && (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingLabor ? 'Edit Labor Entry' : 'Add Labor Entry'}
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Employee Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Employee *
                  </label>
                  <select
                    value={laborForm.employee_id}
                    onChange={handleEmployeeSelect}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name || `${employee.first_name} ${employee.last_name}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={laborForm.date}
                    onChange={(e) => setLaborForm({ ...laborForm, date: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Hours and Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Hours *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.25"
                      min="0"
                      max="24"
                      value={laborForm.hours}
                      onChange={(e) => setLaborForm({ ...laborForm, hours: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Hourly Rate *
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        value={laborForm.hourly_rate}
                        onChange={(e) => setLaborForm({ ...laborForm, hourly_rate: e.target.value })}
                        className="pl-7 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Cost (calculated) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Total Cost
                  </label>
                  <div className="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md">
                    {formatCurrency(laborForm.total_cost)}
                  </div>
                </div>

                {/* Task Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Task Description
                  </label>
                  <input
                    type="text"
                    value={laborForm.task_description}
                    onChange={(e) => setLaborForm({ ...laborForm, task_description: e.target.value })}
                    placeholder="e.g., Framing, Plumbing, Electrical"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    value={laborForm.notes}
                    onChange={(e) => setLaborForm({ ...laborForm, notes: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingLabor ? 'Update' : 'Add'} Labor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobLabor;