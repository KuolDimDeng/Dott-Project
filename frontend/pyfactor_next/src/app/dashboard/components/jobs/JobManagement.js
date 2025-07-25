import React, { useState, useEffect } from 'react';
import { jobService } from '@/services/jobService';
import { logger } from '@/utils/logger';
import { 
  BriefcaseIcon, 
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const JobManagement = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobForm, setShowJobForm] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const filterParams = {};
      if (filters.status !== 'all') {
        filterParams.status = filters.status;
      }
      if (filters.search) {
        filterParams.search = filters.search;
      }
      
      const jobsData = await jobService.getJobs(filterParams);
      // Handle both array and object response formats
      const jobsList = Array.isArray(jobsData) ? jobsData : (jobsData?.results || jobsData?.data || []);
      setJobs(jobsList);
      setError(null);
    } catch (err) {
      logger.error('Error fetching jobs:', err);
      setError('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = () => {
    setSelectedJob(null);
    setShowJobForm(true);
  };

  const handleEditJob = (job) => {
    setSelectedJob(job);
    setShowJobForm(true);
  };

  const handleViewJob = (job) => {
    setSelectedJob(job);
    // TODO: Open job details modal
  };

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) {
      return;
    }

    try {
      await jobService.deleteJob(jobId);
      fetchJobs(); // Refresh the list
    } catch (err) {
      logger.error('Error deleting job:', err);
      alert('Failed to delete job');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      quote: { color: 'bg-blue-100 text-blue-800', label: 'Quote' },
      scheduled: { color: 'bg-yellow-100 text-yellow-800', label: 'Scheduled' },
      in_progress: { color: 'bg-orange-100 text-orange-800', label: 'In Progress' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      invoiced: { color: 'bg-purple-100 text-purple-800', label: 'Invoiced' },
      paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig.quote;
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <BriefcaseIcon className="h-8 w-8 text-blue-600 mr-3" />
              Jobs & Projects
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage jobs, track materials, labor costs, and profitability
            </p>
          </div>
          <button
            onClick={handleCreateJob}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            New Job
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search jobs..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="quote">Quote</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="invoiced">Invoiced</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Jobs List */}
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first job.</p>
            <div className="mt-6">
              <button
                onClick={handleCreateJob}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Job
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Financial
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {job.job_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          {job.name}
                        </div>
                        {job.description && (
                          <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                            {job.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {job.customer?.name || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          <span>Quote: {formatDate(job.quote_date)}</span>
                        </div>
                        {job.scheduled_date && (
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            <span>Scheduled: {formatDate(job.scheduled_date)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                          <span>Quote: {formatCurrency(job.quoted_amount)}</span>
                        </div>
                        {job.total_cost && (
                          <div className="text-xs text-gray-400">
                            Cost: {formatCurrency(job.total_cost)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="inline-flex rounded-md shadow-sm" role="group">
                        <button
                          onClick={() => handleViewJob(job)}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 hover:text-gray-700"
                          title="View job"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditJob(job)}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border-t border-b border-gray-200 hover:bg-gray-100 hover:text-gray-700"
                          title="Edit job"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-r-lg hover:bg-red-50 hover:text-red-700"
                          title="Delete job"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Job Form Modal - TODO: Implement JobForm component */}
      {showJobForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedJob ? 'Edit Job' : 'Create New Job'}
                </h3>
                <button
                  onClick={() => setShowJobForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Placeholder for JobForm component */}
              <div className="text-center py-8">
                <p className="text-gray-500">JobForm component will be implemented here</p>
                <button
                  onClick={() => setShowJobForm(false)}
                  className="mt-4 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobManagement;