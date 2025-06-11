'use client';

import React, { useState, useEffect } from 'react';
import CustomerService from '@/services/customerService';
import { logger } from '@/utils/logger';

const EstimateFiltersPanel = ({ filters, onFilterChange, onClose }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await CustomerService.getCustomers({ limit: 100 });
      if (response.success) {
        setCustomers(response.data.customers || []);
      }
    } catch (error) {
      logger.error('Error fetching customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleChange = (filterType, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleDateRangeChange = (field, value) => {
    setLocalFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }));
  };

  const handleAmountRangeChange = (field, value) => {
    setLocalFilters(prev => ({
      ...prev,
      amountRange: {
        ...prev.amountRange,
        [field]: value
      }
    }));
  };

  const handleApply = () => {
    onFilterChange(localFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      status: '',
      customer_id: '',
      dateRange: { start: '', end: '' },
      amountRange: { min: '', max: '' },
      expiring_soon: false
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const hasActiveFilters = () => {
    return localFilters.status !== '' ||
      localFilters.customer_id !== '' ||
      localFilters.dateRange.start !== '' ||
      localFilters.dateRange.end !== '' ||
      localFilters.amountRange.min !== '' ||
      localFilters.amountRange.max !== '' ||
      localFilters.expiring_soon;
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Filters</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={localFilters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {/* Customer Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer
          </label>
          {loadingCustomers ? (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-500">
              Loading customers...
            </div>
          ) : (
            <select
              value={localFilters.customer_id}
              onChange={(e) => handleChange('customer_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Customers</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_name} {customer.company_name ? `(${customer.company_name})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={localFilters.dateRange.start}
              onChange={(e) => handleDateRangeChange('start', e.target.value)}
              placeholder="Start date"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <span className="flex items-center text-gray-500">to</span>
            <input
              type="date"
              value={localFilters.dateRange.end}
              onChange={(e) => handleDateRangeChange('end', e.target.value)}
              placeholder="End date"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Amount Range Filter */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount Range
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                value={localFilters.amountRange.min}
                onChange={(e) => handleAmountRangeChange('min', e.target.value)}
                placeholder="Min"
                min="0"
                step="0.01"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <span className="flex items-center text-gray-500">to</span>
            <div className="flex-1 relative">
              <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                value={localFilters.amountRange.max}
                onChange={(e) => handleAmountRangeChange('max', e.target.value)}
                placeholder="Max"
                min="0"
                step="0.01"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Expiring Soon Filter */}
        <div className="lg:col-span-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localFilters.expiring_soon}
              onChange={(e) => handleChange('expiring_soon', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              Show estimates expiring within 7 days
            </span>
          </label>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {hasActiveFilters() && (
            <span>Active filters applied</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={!hasActiveFilters()}
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstimateFiltersPanel;