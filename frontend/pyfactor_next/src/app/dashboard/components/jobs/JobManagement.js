import React, { useState, useEffect, useMemo } from 'react';
import { jobService } from '@/services/jobService';
import { logger } from '@/utils/logger';
import { 
  BriefcaseIcon, 
  PlusIcon,
  EyeIcon,
  PencilIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  CalendarIcon,
  WrenchIcon,
  CubeIcon,
  UserGroupIcon,
  ChartBarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import JobForm from './JobForm';
import JobDetails from './JobDetails';
import JobCosting from './JobCosting';
import JobMaterials from './JobMaterials';
import JobLabor from './JobLabor';
import JobProfitability from './JobProfitability';

const JobManagement = ({ view = 'jobs-list' }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showAddJobForm, setShowAddJobForm] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });
  
  // Log component mount and view
  useEffect(() => {
    logger.debug('[JobManagement] Component mounted with view:', view);
  }, [view]);

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
      logger.debug('[JobManagement] Raw jobs data:', { 
        type: typeof jobsData, 
        isArray: Array.isArray(jobsData),
        hasResults: jobsData?.results !== undefined,
        hasData: jobsData?.data !== undefined,
        keys: jobsData ? Object.keys(jobsData) : []
      });
      
      // Handle both array and object response formats
      const jobsList = Array.isArray(jobsData) ? jobsData : (jobsData?.results || jobsData?.data || []);
      // Ensure jobs is always an array
      setJobs(Array.isArray(jobsList) ? jobsList : []);
      setError(null);
    } catch (err) {
      logger.error('Error fetching jobs:', err);
      setError('Failed to load jobs');
      setJobs([]); // Ensure jobs is always an array even on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = () => {
    setShowAddJobForm(true);
  };

  const handleEditJob = (job) => {
    setSelectedJob(job);
    setShowJobForm(true);
  };

  const handleViewJob = (job) => {
    setSelectedJob(job);
    // TODO: Open job details modal
  };

  const handleCloseJob = async (job) => {
    const action = job.status === 'closed' ? 'reopen' : 'close';
    if (!confirm(`Are you sure you want to ${action} this job?`)) {
      return;
    }

    try {
      const newStatus = job.status === 'closed' ? 'completed' : 'closed';
      await jobService.updateJob(job.id, { ...job, status: newStatus });
      fetchJobs(); // Refresh the list
    } catch (err) {
      logger.error(`Error ${action}ing job:`, err);
      alert(`Failed to ${action} job`);
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
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      closed: { color: 'bg-gray-100 text-gray-800', label: 'Closed' }
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

  // Handle different views
  if (view === 'job-costing') {
    return <JobCosting jobs={jobs} />;
  }
  
  if (view === 'job-materials') {
    return <JobMaterials jobs={jobs} />;
  }
  
  if (view === 'job-labor') {
    return <JobLabor jobs={jobs} />;
  }
  
  if (view === 'job-profitability') {
    return <JobProfitability jobs={jobs} />;
  }

  // Default view: jobs-list
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BriefcaseIcon className="h-8 w-8 text-blue-600 mr-3" />
              Jobs & Projects
            </h2>
            <p className="text-gray-600 mt-1">
              Manage jobs, track materials, labor costs, and profitability
            </p>
          </div>
          {!showAddJobForm && (
            <button
              onClick={handleCreateJob}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              New Job
            </button>
          )}
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
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Inline Add Job Form */}
        {showAddJobForm && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <JobForm
              job={null}
              inline={true}
              onClose={() => setShowAddJobForm(false)}
              onSave={() => {
                setShowAddJobForm(false);
                fetchJobs();
              }}
            />
          </div>
        )}

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
                {Array.isArray(jobs) && jobs.map((job) => (
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
                          onClick={() => handleCloseJob(job)}
                          className={`px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-r-lg ${
                            job.status === 'closed' 
                              ? 'text-green-600 hover:bg-green-50 hover:text-green-700' 
                              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                          }`}
                          title={job.status === 'closed' ? 'Reopen job' : 'Close job'}
                        >
                          {job.status === 'closed' ? (
                            <CheckCircleIcon className="h-4 w-4" />
                          ) : (
                            <XCircleIcon className="h-4 w-4" />
                          )}
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

      {/* Edit Job Form Modal */}
      {showJobForm && selectedJob && (
        <JobForm
          job={selectedJob}
          onClose={() => {
            setShowJobForm(false);
            setSelectedJob(null);
          }}
          onSave={() => {
            setShowJobForm(false);
            setSelectedJob(null);
            fetchJobs();
          }}
        />
      )}
      
      {/* Job Details Modal */}
      {selectedJob && !showJobForm && (
        <JobDetails
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onEdit={() => {
            setShowJobForm(true);
          }}
        />
      )}
    </div>
  );
};

export default JobManagement;