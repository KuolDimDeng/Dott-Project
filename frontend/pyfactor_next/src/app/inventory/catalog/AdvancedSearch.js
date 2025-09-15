'use client';

import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

/**
 * Advanced Search Component for Product Catalog
 * Provides multi-field search and filtering capabilities
 */
export default function AdvancedSearch({
  onSearch,
  categories = [],
  brands = [],
  totalProducts = 0
}) {
  const [expanded, setExpanded] = useState(false);
  const [searchFields, setSearchFields] = useState({
    query: '',
    barcode: '',
    brand: '',
    categories: [],
    priceMin: '',
    priceMax: '',
    inStockOnly: false,
    verifiedOnly: false,
    hasImages: false,
    sortBy: 'relevance' // relevance, name, price_asc, price_desc, newest
  });

  const [activeFilters, setActiveFilters] = useState(0);

  // Calculate active filters count
  useEffect(() => {
    let count = 0;
    if (searchFields.query) count++;
    if (searchFields.barcode) count++;
    if (searchFields.brand) count++;
    if (searchFields.categories.length > 0) count += searchFields.categories.length;
    if (searchFields.priceMin || searchFields.priceMax) count++;
    if (searchFields.inStockOnly) count++;
    if (searchFields.verifiedOnly) count++;
    if (searchFields.hasImages) count++;
    if (searchFields.sortBy !== 'relevance') count++;
    setActiveFilters(count);
  }, [searchFields]);

  // Handle field changes
  const handleFieldChange = (field, value) => {
    setSearchFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Toggle category selection
  const toggleCategory = (category) => {
    setSearchFields(prev => {
      const newCategories = [...prev.categories];
      const index = newCategories.indexOf(category);
      if (index > -1) {
        newCategories.splice(index, 1);
      } else {
        newCategories.push(category);
      }
      return { ...prev, categories: newCategories };
    });
  };

  // Apply search
  const applySearch = () => {
    onSearch(searchFields);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFields = {
      query: '',
      barcode: '',
      brand: '',
      categories: [],
      priceMin: '',
      priceMax: '',
      inStockOnly: false,
      verifiedOnly: false,
      hasImages: false,
      sortBy: 'relevance'
    };
    setSearchFields(clearedFields);
    onSearch(clearedFields);
  };

  // Quick search on Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      applySearch();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
      {/* Main Search Bar */}
      <div className="p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchFields.query}
              onChange={(e) => handleFieldChange('query', e.target.value)}
              onKeyPress={handleKeyPress}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search products by name, description..."
            />
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              activeFilters > 0
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
            {activeFilters > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                {activeFilters}
              </span>
            )}
            {expanded ? (
              <ChevronUpIcon className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 ml-2" />
            )}
          </button>

          <button
            onClick={applySearch}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
            Search
          </button>
        </div>

        {/* Search Stats */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Searching {totalProducts.toLocaleString()} products
          {activeFilters > 0 && (
            <>
              {' • '}
              <button
                onClick={clearFilters}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear {activeFilters} filter{activeFilters !== 1 ? 's' : ''}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Barcode Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Barcode
              </label>
              <input
                type="text"
                value={searchFields.barcode}
                onChange={(e) => handleFieldChange('barcode', e.target.value)}
                onKeyPress={handleKeyPress}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter barcode..."
              />
            </div>

            {/* Brand Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Brand
              </label>
              <select
                value={searchFields.brand}
                onChange={(e) => handleFieldChange('brand', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Brands</option>
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={searchFields.sortBy}
                onChange={(e) => handleFieldChange('sortBy', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="relevance">Relevance</option>
                <option value="name">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={searchFields.priceMin}
                  onChange={(e) => handleFieldChange('priceMin', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Min"
                  min="0"
                  step="0.01"
                />
                <span className="self-center text-gray-500">-</span>
                <input
                  type="number"
                  value={searchFields.priceMax}
                  onChange={(e) => handleFieldChange('priceMax', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Max"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      searchFields.categories.includes(category)
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toggle Filters */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={searchFields.inStockOnly}
                  onChange={(e) => handleFieldChange('inStockOnly', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  In Stock Only
                </span>
              </label>

              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={searchFields.verifiedOnly}
                  onChange={(e) => handleFieldChange('verifiedOnly', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Verified Products
                </span>
              </label>

              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={searchFields.hasImages}
                  onChange={(e) => handleFieldChange('hasImages', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Has Images
                </span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex justify-between">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Clear All Filters
            </button>
            <button
              onClick={applySearch}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}