'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession-v2';

const JobReportsManagement = () => {
  const { session } = useSession();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    reportType: 'summary'
  });

  const reportTypes = [
    { value: 'summary', label: 'Job Summary Report' },
    { value: 'profitability', label: 'Profitability Analysis' },
    { value: 'performance', label: 'Performance Report' },
    { value: 'customer', label: 'Customer Analysis' },
    { value: 'employee', label: 'Employee Performance' },
    { value: 'revenue', label: 'Revenue Analysis' }
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'quote', label: 'Quote' },
    { value: 'approved', label: 'Approved' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const fetchJobs = async () => {
    if (!session?.user) return;
    
    try {
      setLoading(true);
      setError(null);
      const tenantId = session.user.tenant_id || session.user.tenantId || session.user.business_id;
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`/api/jobs/?${params.toString()}`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(Array.isArray(data) ? data : data.results || []);
      } else {
        setError('Failed to fetch jobs data');
      }
    } catch (err) {
      setError('Error loading jobs data');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [session, filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateReport = () => {
    fetchJobs();
  };

  const exportReport = (format) => {
    // This would integrate with backend to generate actual reports
    const filename = `jobs-report-${filters.reportType}-${new Date().toISOString().split('T')[0]}.${format}`;
    console.log(`Exporting ${format.toUpperCase()} report: ${filename}`);
    // Implementation would create and download the file
  };

  const calculateSummaryStats = () => {
    const total = jobs.length;
    const completed = jobs.filter(job => job.status === 'completed').length;
    const active = jobs.filter(job => ['in_progress', 'scheduled', 'approved'].includes(job.status)).length;
    const totalRevenue = jobs
      .filter(job => job.status === 'completed' && job.final_amount)
      .reduce((sum, job) => sum + parseFloat(job.final_amount || 0), 0);
    const avgJobValue = total > 0 ? totalRevenue / completed : 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      completed,
      active,
      totalRevenue,
      avgJobValue,
      completionRate
    };
  };

  const stats = calculateSummaryStats();

  const renderSummaryReport = () => (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Job Volume</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-blue-700">Total Jobs:</span>
              <span className="font-semibold text-blue-900">{stats.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Completed:</span>
              <span className="font-semibold text-blue-900">{stats.completed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Active:</span>
              <span className="font-semibold text-blue-900">{stats.active}</span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-900 mb-4">Revenue</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-green-700">Total Revenue:</span>
              <span className="font-semibold text-green-900">
                ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Avg Job Value:</span>
              <span className="font-semibold text-green-900">
                ${stats.avgJobValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-purple-700">Completion Rate:</span>
              <span className="font-semibold text-purple-900">
                {stats.completionRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      {jobs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Jobs Detail</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {job.job_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {job.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {job.customer?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        job.status === 'completed' ? 'bg-green-100 text-green-800' :
                        job.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                        job.status === 'quote' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {job.start_date ? new Date(job.start_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(job.quoted_amount || job.final_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderReportContent = () => {
    switch (filters.reportType) {
      case 'summary':
        return renderSummaryReport();
      case 'profitability':
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Profitability Analysis report coming soon...</p>
          </div>
        );
      case 'performance':
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Performance Report coming soon...</p>
          </div>
        );
      case 'customer':
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Customer Analysis report coming soon...</p>
          </div>
        );
      case 'employee':
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Employee Performance report coming soon...</p>
          </div>
        );
      case 'revenue':
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Revenue Analysis report coming soon...</p>
          </div>
        );
      default:
        return renderSummaryReport();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Jobs Reports</h1>
        <p className="text-gray-600 mt-1">Generate and analyze job performance reports</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={filters.reportType}
              onChange={(e) => handleFilterChange('reportType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {reportTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          
          <button
            onClick={() => exportReport('pdf')}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Export PDF
          </button>
          
          <button
            onClick={() => exportReport('excel')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Export Excel
          </button>
          
          <button
            onClick={() => exportReport('csv')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading report data...</span>
          </div>
        </div>
      )}

      {/* Report Content */}
      {!loading && !error && renderReportContent()}
    </div>
  );
};

export default JobReportsManagement;