import React, { useState, useEffect } from 'react';
import { unifiedInventoryService } from '@/services/unifiedInventoryService';
import { logger } from '@/utils/logger';

/**
 * ProductFiltersPanel Component
 * Provides a panel with filters for the product list
 */
const ProductFiltersPanel = ({ filters, onFilterChange, onClose }) => {
  // State
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Local state for filters
  const [localFilters, setLocalFilters] = useState({ ...filters });
  
  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState({
    price_min: '',
    price_max: '',
    stock_min: '',
    stock_max: ''
  });
  
  // Fetch reference data on mount
  useEffect(() => {
    fetchReferenceData();
  }, []);
  
  // Update local filters when props change
  useEffect(() => {
    setLocalFilters({ ...filters });
  }, [filters]);
  
  // Fetch categories, suppliers, and locations
  const fetchReferenceData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const categoriesData = await unifiedInventoryService.getCategories();
      setCategories(categoriesData || []);
      
      // Mock data for suppliers and locations until those endpoints are ready
      setSuppliers([
        { id: 1, name: 'Supplier A' },
        { id: 2, name: 'Supplier B' },
        { id: 3, name: 'Supplier C' },
      ]);
      
      setLocations([
        { id: 1, name: 'Warehouse A' },
        { id: 2, name: 'Warehouse B' },
        { id: 3, name: 'Showroom' },
        { id: 4, name: 'Online Store' },
      ]);
    } catch (error) {
      logger.error('Error fetching filter reference data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle filter change
  const handleFilterChange = (event) => {
    const { name, value, checked, type } = event.target;
    
    setLocalFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle advanced filter change
  const handleAdvancedFilterChange = (event) => {
    const { name, value } = event.target;
    
    // Allow only numbers or empty string
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      setAdvancedFilters(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Apply filters
  const handleApplyFilters = () => {
    // Combine basic and advanced filters
    const combinedFilters = {
      ...localFilters
    };
    
    // Add advanced filters if they have values
    if (advancedFilters.price_min) {
      combinedFilters.price_min = advancedFilters.price_min;
    }
    
    if (advancedFilters.price_max) {
      combinedFilters.price_max = advancedFilters.price_max;
    }
    
    if (advancedFilters.stock_min) {
      combinedFilters.stock_min = advancedFilters.stock_min;
    }
    
    if (advancedFilters.stock_max) {
      combinedFilters.stock_max = advancedFilters.stock_max;
    }
    
    onFilterChange(combinedFilters);
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setLocalFilters({
      category_id: '',
      supplier_id: '',
      location_id: '',
      include_inactive: false
    });
    
    setAdvancedFilters({
      price_min: '',
      price_max: '',
      stock_min: '',
      stock_max: ''
    });
  };
  
  // Check if any filter is applied
  const hasFilters = () => {
    return Object.values(localFilters).some(value => 
      value !== '' && value !== false && value !== null) ||
      Object.values(advancedFilters).some(value => 
        value !== '' && value !== null);
  };
  
  return (
    <div className="bg-white rounded-md shadow p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="flex items-center text-lg font-medium">
          {/* Filter Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
          Filter Products
        </h2>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
          {/* Close Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Basic Filters */}
        <div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category_id"
              value={localFilters.category_id}
              onChange={handleFilterChange}
              disabled={loading}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-main focus:border-primary-main sm:text-sm rounded-md bg-white disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <select
              name="supplier_id"
              value={localFilters.supplier_id}
              onChange={handleFilterChange}
              disabled={loading}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-main focus:border-primary-main sm:text-sm rounded-md bg-white disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              name="location_id"
              value={localFilters.location_id}
              onChange={handleFilterChange}
              disabled={loading}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-main focus:border-primary-main sm:text-sm rounded-md bg-white disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">All Locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center mt-6">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary-main focus:ring-primary-light"
              checked={localFilters.include_inactive}
              onChange={handleFilterChange}
              name="include_inactive"
            />
            <span className="ml-2 text-sm text-gray-700">Include Inactive Products</span>
          </label>
        </div>
        
        {/* Advanced Filters */}
        <div className="col-span-full mt-2">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Advanced Filters</h3>
        </div>
        
        <div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="text"
                name="price_min"
                value={advancedFilters.price_min}
                onChange={handleAdvancedFilterChange}
                className="focus:ring-primary-main focus:border-primary-main block w-full pl-7 pr-3 py-2 sm:text-sm border-gray-300 rounded-md"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        
        <div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="text"
                name="price_max"
                value={advancedFilters.price_max}
                onChange={handleAdvancedFilterChange}
                className="focus:ring-primary-main focus:border-primary-main block w-full pl-7 pr-3 py-2 sm:text-sm border-gray-300 rounded-md"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        
        <div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
            <input
              type="text"
              name="stock_min"
              value={advancedFilters.stock_min}
              onChange={handleAdvancedFilterChange}
              className="focus:ring-primary-main focus:border-primary-main block w-full pr-3 py-2 sm:text-sm border-gray-300 rounded-md"
              placeholder="0"
            />
          </div>
        </div>
        
        <div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock</label>
            <input
              type="text"
              name="stock_max"
              value={advancedFilters.stock_max}
              onChange={handleAdvancedFilterChange}
              className="focus:ring-primary-main focus:border-primary-main block w-full pr-3 py-2 sm:text-sm border-gray-300 rounded-md"
              placeholder="0"
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="col-span-full">
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasFilters()}
              className={`flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm ${hasFilters() ? 'text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light' : 'text-gray-400 cursor-not-allowed'}`}
            >
              {/* Reset Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Reset
            </button>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-main hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductFiltersPanel;