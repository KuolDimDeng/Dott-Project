'use client';

import React, { useState } from 'react';

const ServiceFiltersPanel = ({ filters, onFilterChange, onClose }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleChange = (name, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePriceRangeChange = (field, value) => {
    setLocalFilters(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [field]: value
      }
    }));
  };

  const handleApply = () => {
    onFilterChange(localFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      is_recurring: '',
      is_for_sale: '',
      is_for_rent: '',
      charge_period: '',
      priceRange: { min: '', max: '' }
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

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

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Service Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service Type
          </label>
          <select
            value={localFilters.is_recurring}
            onChange={(e) => handleChange('is_recurring', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All Types</option>
            <option value="true">Recurring</option>
            <option value="false">One-time</option>
          </select>
        </div>

        {/* Availability */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Availability
          </label>
          <select
            value={localFilters.is_for_sale}
            onChange={(e) => handleChange('is_for_sale', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All</option>
            <option value="true">For Sale</option>
            <option value="false">Not for Sale</option>
          </select>
        </div>

        {/* Rental Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rental Status
          </label>
          <select
            value={localFilters.is_for_rent}
            onChange={(e) => handleChange('is_for_rent', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All</option>
            <option value="true">For Rent</option>
            <option value="false">Not for Rent</option>
          </select>
        </div>

        {/* Charge Period */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Charge Period
          </label>
          <select
            value={localFilters.charge_period}
            onChange={(e) => handleChange('charge_period', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All Periods</option>
            <option value="hour">Hourly</option>
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price Range
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={localFilters.priceRange.min}
              onChange={(e) => handlePriceRangeChange('min', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              min="0"
              step="0.01"
            />
            <input
              type="number"
              placeholder="Max"
              value={localFilters.priceRange.max}
              onChange={(e) => handlePriceRangeChange('max', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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
  );
};

export default ServiceFiltersPanel;