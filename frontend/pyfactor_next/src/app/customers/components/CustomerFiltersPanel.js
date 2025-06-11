'use client';

import React, { useState, useEffect } from 'react';

const CustomerFiltersPanel = ({ filters, onFilterChange, onClose }) => {
  const [localFilters, setLocalFilters] = useState({
    customer_type: '',
    city: '',
    state: '',
    country: '',
    has_purchases: ''
  });

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleChange = (field, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApply = () => {
    onFilterChange(localFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      customer_type: '',
      city: '',
      state: '',
      country: '',
      has_purchases: ''
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const hasActiveFilters = Object.values(localFilters).some(value => value !== '');

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Customer Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Type
          </label>
          <select
            value={localFilters.customer_type}
            onChange={(e) => handleChange('customer_type', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="business">Business</option>
            <option value="individual">Individual</option>
          </select>
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <input
            type="text"
            value={localFilters.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Filter by city"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* State */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State
          </label>
          <input
            type="text"
            value={localFilters.state}
            onChange={(e) => handleChange('state', e.target.value)}
            placeholder="Filter by state"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <input
            type="text"
            value={localFilters.country}
            onChange={(e) => handleChange('country', e.target.value)}
            placeholder="Filter by country"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Has Purchases */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purchase History
          </label>
          <select
            value={localFilters.has_purchases}
            onChange={(e) => handleChange('has_purchases', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Customers</option>
            <option value="yes">With Purchases</option>
            <option value="no">No Purchases</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={handleReset}
          className="text-sm text-gray-600 hover:text-gray-900"
          disabled={!hasActiveFilters}
        >
          Reset filters
        </button>
        <div className="flex items-center gap-2">
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

export default CustomerFiltersPanel;