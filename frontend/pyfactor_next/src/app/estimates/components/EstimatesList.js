'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import EstimateForm from './EstimateForm';
import EstimateTable from './EstimateTable';
import EstimateGrid from './EstimateGrid';
import EstimateDetailDialog from './EstimateDetailDialog';
import EstimateFiltersPanel from './EstimateFiltersPanel';
import EstimateStatsWidget from './EstimateStatsWidget';
import EstimateService from '@/services/estimateService';
import { toast } from 'react-hot-toast';
import debounce from 'lodash/debounce';

const EstimatesList = () => {
  const router = useRouter();
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(null);
  const [selectedEstimates, setSelectedEstimates] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'created_at',
    order: 'desc'
  });
  const [filters, setFilters] = useState({
    status: '',
    customer_id: '',
    dateRange: { start: '', end: '' },
    amountRange: { min: '', max: '' },
    expiring_soon: false
  });
  const [displayMode, setDisplayMode] = useState('standard');
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
    totalValue: 0,
    acceptanceRate: 0
  });

  // Fetch estimates
  const fetchEstimates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await EstimateService.getEstimates({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        sortBy: sortConfig.field,
        sortOrder: sortConfig.order,
        ...filters
      });

      if (response.success) {
        setEstimates(response.data.estimates || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.total || 0,
          totalPages: response.data.totalPages || 1
        }));
      }
    } catch (error) {
      logger.error('Error fetching estimates:', error);
      toast.error('Failed to load estimates');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, sortConfig, filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await EstimateService.getEstimateStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      logger.error('Error fetching estimate stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchEstimates();
    fetchStats();
  }, [fetchEstimates, fetchStats]);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((value) => {
      setSearchTerm(value);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300),
    []
  );

  const handleSearch = (e) => {
    debouncedSearch(e.target.value);
  };

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, page: 1, limit: parseInt(newLimit) }));
  };

  const handleCreateEstimate = () => {
    setEditingEstimate(null);
    setShowCreateForm(true);
  };

  const handleEditEstimate = (estimate) => {
    setEditingEstimate(estimate);
    setShowCreateForm(true);
  };

  const handleViewEstimate = (estimate) => {
    setSelectedEstimate(estimate);
    setShowDetailDialog(true);
  };

  const handleDeleteEstimate = async (estimateId) => {
    if (!window.confirm('Are you sure you want to delete this estimate?')) {
      return;
    }

    try {
      const response = await EstimateService.deleteEstimate(estimateId);
      if (response.success) {
        toast.success('Estimate deleted successfully');
        fetchEstimates();
        fetchStats();
      } else {
        toast.error(response.error || 'Failed to delete estimate');
      }
    } catch (error) {
      logger.error('Error deleting estimate:', error);
      toast.error('Failed to delete estimate');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedEstimates.length) {
      toast.error('Please select estimates to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedEstimates.length} estimates?`)) {
      return;
    }

    try {
      const response = await EstimateService.bulkDeleteEstimates(selectedEstimates);
      if (response.success) {
        toast.success(`${selectedEstimates.length} estimates deleted successfully`);
        setSelectedEstimates([]);
        fetchEstimates();
        fetchStats();
      } else {
        toast.error(response.error || 'Failed to delete estimates');
      }
    } catch (error) {
      logger.error('Error bulk deleting estimates:', error);
      toast.error('Failed to delete estimates');
    }
  };

  const handleConvertToInvoice = async (estimateId) => {
    if (!window.confirm('Convert this estimate to an invoice?')) {
      return;
    }

    try {
      const response = await EstimateService.convertToInvoice(estimateId);
      if (response.success) {
        toast.success('Estimate converted to invoice successfully');
        fetchEstimates();
        fetchStats();
        // Optionally redirect to the invoice
        // router.push(`/invoices/${response.data.invoiceId}`);
      } else {
        toast.error(response.error || 'Failed to convert estimate');
      }
    } catch (error) {
      logger.error('Error converting estimate:', error);
      toast.error('Failed to convert estimate');
    }
  };

  const handleSendEstimate = async (estimateId) => {
    try {
      const response = await EstimateService.sendEstimate(estimateId);
      if (response.success) {
        toast.success('Estimate sent successfully');
        fetchEstimates();
        fetchStats();
      } else {
        toast.error(response.error || 'Failed to send estimate');
      }
    } catch (error) {
      logger.error('Error sending estimate:', error);
      toast.error('Failed to send estimate');
    }
  };

  const handleFormSubmit = async () => {
    setShowCreateForm(false);
    setEditingEstimate(null);
    fetchEstimates();
    fetchStats();
  };

  const handleFormCancel = () => {
    setShowCreateForm(false);
    setEditingEstimate(null);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedEstimates(estimates.map(e => e.id));
    } else {
      setSelectedEstimates([]);
    }
  };

  const handleSelectEstimate = (estimateId, checked) => {
    if (checked) {
      setSelectedEstimates(prev => [...prev, estimateId]);
    } else {
      setSelectedEstimates(prev => prev.filter(id => id !== estimateId));
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Estimates</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create and manage customer estimates
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back to Dashboard
              </button>
              <button
                onClick={handleCreateEstimate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                New Estimate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Widget */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <EstimateStatsWidget stats={stats} />
      </div>

      {/* Search and Filters Bar */}
      <div className="px-4 sm:px-6 lg:px-8 pb-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search estimates by number, customer, or title..."
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>
              {selectedEstimates.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Delete ({selectedEstimates.length})
                </button>
              )}
              <div className="flex items-center bg-gray-100 rounded-md p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded ${viewMode === 'table' ? 'bg-white shadow-sm' : ''}`}
                  title="Table view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                  title="Grid view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>
              <select
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="compact">Compact</option>
                <option value="standard">Standard</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <EstimateFiltersPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              onClose={() => setShowFilters(false)}
            />
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-8 overflow-hidden">
        <div className="h-full bg-white rounded-lg shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : estimates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-lg mb-2">No estimates found</p>
              <button
                onClick={handleCreateEstimate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Create Your First Estimate
              </button>
            </div>
          ) : (
            <>
              {viewMode === 'table' ? (
                <EstimateTable
                  estimates={estimates}
                  selectedEstimates={selectedEstimates}
                  onSelectAll={handleSelectAll}
                  onSelectEstimate={handleSelectEstimate}
                  onEdit={handleEditEstimate}
                  onDelete={handleDeleteEstimate}
                  onView={handleViewEstimate}
                  onConvert={handleConvertToInvoice}
                  onSend={handleSendEstimate}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  displayMode={displayMode}
                />
              ) : (
                <EstimateGrid
                  estimates={estimates}
                  selectedEstimates={selectedEstimates}
                  onSelectEstimate={handleSelectEstimate}
                  onEdit={handleEditEstimate}
                  onDelete={handleDeleteEstimate}
                  onView={handleViewEstimate}
                  onConvert={handleConvertToInvoice}
                  onSend={handleSendEstimate}
                  displayMode={displayMode}
                />
              )}

              {/* Pagination */}
              <div className="px-6 py-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-700">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} estimates
                    </span>
                    <select
                      value={pagination.limit}
                      onChange={(e) => handleLimitChange(e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md"
                    >
                      <option value="10">10 per page</option>
                      <option value="20">20 per page</option>
                      <option value="50">50 per page</option>
                      <option value="100">100 per page</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Estimate Form Modal */}
      {showCreateForm && (
        <EstimateForm
          estimate={editingEstimate}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {/* Estimate Detail Dialog */}
      {showDetailDialog && selectedEstimate && (
        <EstimateDetailDialog
          estimate={selectedEstimate}
          onClose={() => {
            setShowDetailDialog(false);
            setSelectedEstimate(null);
          }}
          onEdit={() => {
            setShowDetailDialog(false);
            handleEditEstimate(selectedEstimate);
          }}
          onConvert={() => {
            setShowDetailDialog(false);
            handleConvertToInvoice(selectedEstimate.id);
          }}
          onSend={() => {
            setShowDetailDialog(false);
            handleSendEstimate(selectedEstimate.id);
          }}
        />
      )}
    </div>
  );
};

export default EstimatesList;