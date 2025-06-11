'use client';

import React, { useState, useEffect } from 'react';
import VendorService from '@/services/vendorService';
import { logger } from '@/utils/logger';

const BillFiltersPanel = ({ filters, onFilterChange, onClose }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(true);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoadingVendors(true);
      const response = await VendorService.getVendors({ limit: 100 });
      if (response.success) {
        setVendors(response.data.vendors || []);
      }
    } catch (error) {
      logger.error('Error fetching vendors:', error);
    } finally {
      setLoadingVendors(false);
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
      is_paid: '',
      vendor_id: '',
      dateRange: { start: '', end: '' },
      amountRange: { min: '', max: '' }
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const hasActiveFilters = () => {
    return localFilters.is_paid !== '' ||
      localFilters.vendor_id !== '' ||
      localFilters.dateRange.start !== '' ||
      localFilters.dateRange.end !== '' ||
      localFilters.amountRange.min !== '' ||
      localFilters.amountRange.max !== '';
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
            value={localFilters.is_paid}
            onChange={(e) => handleChange('is_paid', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All Status</option>
            <option value="false">Unpaid</option>
            <option value="true">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Vendor Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vendor
          </label>
          {loadingVendors ? (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-500">
              Loading vendors...
            </div>
          ) : (
            <select
              value={localFilters.vendor_id}
              onChange={(e) => handleChange('vendor_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Vendors</option>
              {vendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.vendor_name}
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

export default BillFiltersPanel;