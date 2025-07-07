'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import VendorForm from './VendorForm';
import VendorTable from './VendorTable';
import VendorGrid from './VendorGrid';
import VendorDetailDialog from './VendorDetailDialog';
import VendorFiltersPanel from './VendorFiltersPanel';
import VendorStatsWidget from './VendorStatsWidget';
import VendorService from '@/services/vendorService';
import { toast } from 'react-hot-toast';
import debounce from 'lodash/debounce';

const VendorsList = () => {
  const router = useRouter();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedVendors, setSelectedVendors] = useState([]);
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
    state: '',
    city: ''
  });
  const [displayMode, setDisplayMode] = useState('standard');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    newThisMonth: 0,
    totalPurchases: 0
  });

  // Fetch vendors
  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await VendorService.getVendors({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        sortBy: sortConfig.field,
        sortOrder: sortConfig.order,
        ...filters
      });

      if (response.success) {
        setVendors(response.data.vendors || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.total || 0,
          totalPages: response.data.totalPages || 1
        }));
      }
    } catch (error) {
      logger.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, sortConfig, filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await VendorService.getVendorStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      logger.error('Error fetching vendor stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
    fetchStats();
  }, [fetchVendors, fetchStats]);

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

  const handleCreateVendor = () => {
    setEditingVendor(null);
    setShowCreateForm(true);
  };

  const handleEditVendor = (vendor) => {
    setEditingVendor(vendor);
    setShowCreateForm(true);
  };

  const handleViewVendor = (vendor) => {
    setSelectedVendor(vendor);
    setShowDetailDialog(true);
  };

  const handleDeleteVendor = async (vendorId) => {
    if (!window.confirm('Are you sure you want to delete this vendor? This will permanently delete all related bills, purchase orders, procurements, and purchases.')) {
      return;
    }

    try {
      const response = await VendorService.deleteVendor(vendorId);
      if (response.success) {
        toast.success('Vendor deleted successfully');
        fetchVendors();
        fetchStats();
      } else {
        toast.error(response.error || 'Failed to delete vendor');
      }
    } catch (error) {
      logger.error('Error deleting vendor:', error);
      toast.error('Failed to delete vendor');
    }
  };

  const handleToggleVendorStatus = async (vendor) => {
    const action = vendor.is_active ? 'deactivate' : 'activate';
    const confirmMessage = vendor.is_active 
      ? 'Are you sure you want to deactivate this vendor? They will not appear in dropdown lists.' 
      : 'Are you sure you want to activate this vendor?';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await VendorService.toggleVendorStatus(vendor.id);
      if (response.success) {
        toast.success(response.message || `Vendor ${action}d successfully`);
        fetchVendors();
        fetchStats();
      } else {
        toast.error(response.error || `Failed to ${action} vendor`);
      }
    } catch (error) {
      logger.error('Error toggling vendor status:', error);
      toast.error(`Failed to ${action} vendor`);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedVendors.length) {
      toast.error('Please select vendors to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedVendors.length} vendors?`)) {
      return;
    }

    try {
      const response = await VendorService.bulkDeleteVendors(selectedVendors);
      if (response.success) {
        toast.success(`${selectedVendors.length} vendors deleted successfully`);
        setSelectedVendors([]);
        fetchVendors();
        fetchStats();
      } else {
        toast.error(response.error || 'Failed to delete vendors');
      }
    } catch (error) {
      logger.error('Error bulk deleting vendors:', error);
      toast.error('Failed to delete vendors');
    }
  };

  const handleFormSubmit = async () => {
    setShowCreateForm(false);
    setEditingVendor(null);
    fetchVendors();
    fetchStats();
  };

  const handleFormCancel = () => {
    setShowCreateForm(false);
    setEditingVendor(null);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedVendors(vendors.map(v => v.id));
    } else {
      setSelectedVendors([]);
    }
  };

  const handleSelectVendor = (vendorId, checked) => {
    if (checked) {
      setSelectedVendors(prev => [...prev, vendorId]);
    } else {
      setSelectedVendors(prev => prev.filter(id => id !== vendorId));
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Vendors</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your vendors and suppliers
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
                onClick={handleCreateVendor}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add Vendor
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Widget */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <VendorStatsWidget stats={stats} />
      </div>

      {/* Search and Filters Bar */}
      <div className="px-4 sm:px-6 lg:px-8 pb-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search vendors by name, number, phone..."
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
              {selectedVendors.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Delete ({selectedVendors.length})
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
            <VendorFiltersPanel
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
          ) : vendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-gray-500 text-lg mb-2">No vendors found</p>
              <button
                onClick={handleCreateVendor}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add Your First Vendor
              </button>
            </div>
          ) : (
            <>
              {viewMode === 'table' ? (
                <VendorTable
                  vendors={vendors}
                  selectedVendors={selectedVendors}
                  onSelectAll={handleSelectAll}
                  onSelectVendor={handleSelectVendor}
                  onEdit={handleEditVendor}
                  onDelete={handleDeleteVendor}
                  onView={handleViewVendor}
                  onToggleStatus={handleToggleVendorStatus}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  displayMode={displayMode}
                />
              ) : (
                <VendorGrid
                  vendors={vendors}
                  selectedVendors={selectedVendors}
                  onSelectVendor={handleSelectVendor}
                  onEdit={handleEditVendor}
                  onDelete={handleDeleteVendor}
                  onView={handleViewVendor}
                  onToggleStatus={handleToggleVendorStatus}
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
                      {pagination.total} vendors
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

      {/* Vendor Form Modal */}
      {showCreateForm && (
        <VendorForm
          vendor={editingVendor}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {/* Vendor Detail Dialog */}
      {showDetailDialog && selectedVendor && (
        <VendorDetailDialog
          vendor={selectedVendor}
          onClose={() => {
            setShowDetailDialog(false);
            setSelectedVendor(null);
          }}
          onEdit={() => {
            setShowDetailDialog(false);
            handleEditVendor(selectedVendor);
          }}
        />
      )}
    </div>
  );
};

export default VendorsList;