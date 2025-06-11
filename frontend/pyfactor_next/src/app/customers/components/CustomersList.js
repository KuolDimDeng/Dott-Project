'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import CustomerForm from './CustomerForm';
import CustomerTable from './CustomerTable';
import CustomerGrid from './CustomerGrid';
import CustomerDetailDialog from './CustomerDetailDialog';
import CustomerFiltersPanel from './CustomerFiltersPanel';
import CustomerStatsWidget from './CustomerStatsWidget';
import CustomerService from '@/services/customerService';
import { toast } from 'react-hot-toast';
import debounce from 'lodash/debounce';

const CustomersList = () => {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
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
    customer_type: '',
    city: '',
    state: '',
    country: '',
    has_purchases: ''
  });
  const [displayMode, setDisplayMode] = useState('standard');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    new_this_month: 0,
    total_revenue: 0,
    average_order_value: 0
  });

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await CustomerService.getCustomers({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        sortBy: sortConfig.field,
        sortOrder: sortConfig.order,
        ...filters
      });

      if (response.success) {
        setCustomers(response.data.customers || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.total || 0,
          totalPages: response.data.totalPages || 1
        }));
      }
    } catch (error) {
      logger.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, sortConfig, filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await CustomerService.getCustomerStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      logger.error('Error fetching customer stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, [fetchCustomers, fetchStats]);

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

  const handleCreateCustomer = () => {
    setEditingCustomer(null);
    setShowCreateForm(true);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setShowCreateForm(true);
  };

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowDetailDialog(true);
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer? This will also delete all related data (invoices, estimates, etc.).')) {
      return;
    }

    try {
      const response = await CustomerService.deleteCustomer(customerId);
      if (response.success) {
        toast.success('Customer deleted successfully');
        fetchCustomers();
        fetchStats();
      } else {
        toast.error(response.error || 'Failed to delete customer');
      }
    } catch (error) {
      logger.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedCustomers.length) {
      toast.error('Please select customers to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedCustomers.length} customers? This will also delete all related data.`)) {
      return;
    }

    try {
      const response = await CustomerService.bulkDeleteCustomers(selectedCustomers);
      if (response.success) {
        toast.success(`${selectedCustomers.length} customers deleted successfully`);
        setSelectedCustomers([]);
        fetchCustomers();
        fetchStats();
      } else {
        toast.error(response.error || 'Failed to delete customers');
      }
    } catch (error) {
      logger.error('Error bulk deleting customers:', error);
      toast.error('Failed to delete customers');
    }
  };

  const handleFormSubmit = async () => {
    setShowCreateForm(false);
    setEditingCustomer(null);
    fetchCustomers();
    fetchStats();
  };

  const handleFormCancel = () => {
    setShowCreateForm(false);
    setEditingCustomer(null);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCustomers(customers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectCustomer = (customerId, checked) => {
    if (checked) {
      setSelectedCustomers(prev => [...prev, customerId]);
    } else {
      setSelectedCustomers(prev => prev.filter(id => id !== customerId));
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your customer relationships
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
                onClick={handleCreateCustomer}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Widget */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <CustomerStatsWidget stats={stats} />
      </div>

      {/* Search and Filters Bar */}
      <div className="px-4 sm:px-6 lg:px-8 pb-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search customers by name, email, phone, or account number..."
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
              {selectedCustomers.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Delete ({selectedCustomers.length})
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
            <CustomerFiltersPanel
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
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500 text-lg mb-2">No customers found</p>
              <button
                onClick={handleCreateCustomer}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add Your First Customer
              </button>
            </div>
          ) : (
            <>
              {viewMode === 'table' ? (
                <CustomerTable
                  customers={customers}
                  selectedCustomers={selectedCustomers}
                  onSelectAll={handleSelectAll}
                  onSelectCustomer={handleSelectCustomer}
                  onEdit={handleEditCustomer}
                  onDelete={handleDeleteCustomer}
                  onView={handleViewCustomer}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  displayMode={displayMode}
                />
              ) : (
                <CustomerGrid
                  customers={customers}
                  selectedCustomers={selectedCustomers}
                  onSelectCustomer={handleSelectCustomer}
                  onEdit={handleEditCustomer}
                  onDelete={handleDeleteCustomer}
                  onView={handleViewCustomer}
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
                      {pagination.total} customers
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

      {/* Customer Form Modal */}
      {showCreateForm && (
        <CustomerForm
          customer={editingCustomer}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {/* Customer Detail Dialog */}
      {showDetailDialog && selectedCustomer && (
        <CustomerDetailDialog
          customer={selectedCustomer}
          onClose={() => {
            setShowDetailDialog(false);
            setSelectedCustomer(null);
          }}
          onEdit={() => {
            setShowDetailDialog(false);
            handleEditCustomer(selectedCustomer);
          }}
        />
      )}
    </div>
  );
};

export default CustomersList;