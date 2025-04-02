import React, { useState, Fragment } from 'react';
import { unifiedInventoryService } from '@/services/unifiedInventoryService';
import { logger } from '@/utils/logger';

/**
 * ProductExportDialog Component
 * Provides options for exporting products to different formats
 */
const ProductExportDialog = ({ open, onClose, filters = {}, searchQuery = '' }) => {
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [format, setFormat] = useState('csv');
  const [exportFields, setExportFields] = useState({
    basic: true,
    pricing: true,
    inventory: true,
    categories: true,
    suppliers: true,
    locations: true,
    dimensions: false,
    metadata: false
  });
  const [applyCurrentFilters, setApplyCurrentFilters] = useState(true);
  
  // Handle format change
  const handleFormatChange = (event) => {
    setFormat(event.target.value);
  };
  
  // Handle export field change
  const handleExportFieldChange = (event) => {
    setExportFields({
      ...exportFields,
      [event.target.name]: event.target.checked
    });
  };
  
  // Select/deselect all fields
  const handleSelectAll = (selected) => {
    const newFields = {};
    
    Object.keys(exportFields).forEach(key => {
      newFields[key] = selected;
    });
    
    setExportFields(newFields);
  };
  
  // Handle current filters toggle
  const handleApplyFiltersChange = (event) => {
    setApplyCurrentFilters(event.target.checked);
  };
  
  // Handle export
  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare export options
      const exportOptions = {
        format,
        fields: Object.keys(exportFields).filter(key => exportFields[key]),
        filters: applyCurrentFilters ? {
          ...filters,
          search: searchQuery
        } : {}
      };
      
      // Export products
      const blob = await unifiedInventoryService.exportProducts(
        format,
        applyCurrentFilters ? { ...filters, search: searchQuery } : {}
      );
      
      // Create download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Close dialog
      onClose();
    } catch (error) {
      logger.error('Error exporting products:', error);
      setError('Failed to export products. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Check if any field is selected
  const hasSelectedFields = Object.values(exportFields).some(value => value);
  
  // Check if all fields are selected
  const allFieldsSelected = Object.values(exportFields).every(value => value);

  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={!loading ? onClose : undefined}
        ></div>

        {/* This element centers the modal contents */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Dialog */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Dialog header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Export Products
            </h3>
            {!loading && (
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Dialog content */}
          <div className="px-6 py-4 bg-white">
            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                {error}
              </div>
            )}
            
            <p className="text-sm text-gray-600 mb-4">
              Export your products data in different formats. You can customize what information to include.
            </p>
            
            {/* Export Format */}
            <div className="mb-6">
              <fieldset>
                <legend className="text-sm font-medium text-gray-700 mb-2">Export Format</legend>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={format === 'csv'}
                      onChange={handleFormatChange}
                      className="h-4 w-4 text-primary-main border-gray-300 focus:ring-primary-light"
                    />
                    <span className="ml-2 text-sm text-gray-700">CSV</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value="excel"
                      checked={format === 'excel'}
                      onChange={handleFormatChange}
                      className="h-4 w-4 text-primary-main border-gray-300 focus:ring-primary-light"
                    />
                    <span className="ml-2 text-sm text-gray-700">Excel</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value="json"
                      checked={format === 'json'}
                      onChange={handleFormatChange}
                      className="h-4 w-4 text-primary-main border-gray-300 focus:ring-primary-light"
                    />
                    <span className="ml-2 text-sm text-gray-700">JSON</span>
                  </label>
                </div>
              </fieldset>
            </div>
            
            {/* Export Fields */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <legend className="text-sm font-medium text-gray-700">Fields to Export</legend>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    disabled={allFieldsSelected}
                    className={`text-xs px-2 py-1 rounded ${allFieldsSelected ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    disabled={!hasSelectedFields}
                    className={`text-xs px-2 py-1 rounded ${!hasSelectedFields ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="basic"
                    checked={exportFields.basic}
                    onChange={handleExportFieldChange}
                    className="h-4 w-4 rounded text-primary-main border-gray-300 focus:ring-primary-light"
                  />
                  <span className="ml-2 text-sm text-gray-700">Basic Info (Name, Code, Description)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="pricing"
                    checked={exportFields.pricing}
                    onChange={handleExportFieldChange}
                    className="h-4 w-4 rounded text-primary-main border-gray-300 focus:ring-primary-light"
                  />
                  <span className="ml-2 text-sm text-gray-700">Pricing Info (Price, Cost, Tax)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="inventory"
                    checked={exportFields.inventory}
                    onChange={handleExportFieldChange}
                    className="h-4 w-4 rounded text-primary-main border-gray-300 focus:ring-primary-light"
                  />
                  <span className="ml-2 text-sm text-gray-700">Inventory Info (Stock, Reorder Level)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="categories"
                    checked={exportFields.categories}
                    onChange={handleExportFieldChange}
                    className="h-4 w-4 rounded text-primary-main border-gray-300 focus:ring-primary-light"
                  />
                  <span className="ml-2 text-sm text-gray-700">Categories</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="suppliers"
                    checked={exportFields.suppliers}
                    onChange={handleExportFieldChange}
                    className="h-4 w-4 rounded text-primary-main border-gray-300 focus:ring-primary-light"
                  />
                  <span className="ml-2 text-sm text-gray-700">Suppliers</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="locations"
                    checked={exportFields.locations}
                    onChange={handleExportFieldChange}
                    className="h-4 w-4 rounded text-primary-main border-gray-300 focus:ring-primary-light"
                  />
                  <span className="ml-2 text-sm text-gray-700">Locations</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="dimensions"
                    checked={exportFields.dimensions}
                    onChange={handleExportFieldChange}
                    className="h-4 w-4 rounded text-primary-main border-gray-300 focus:ring-primary-light"
                  />
                  <span className="ml-2 text-sm text-gray-700">Dimensions & Weight</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="metadata"
                    checked={exportFields.metadata}
                    onChange={handleExportFieldChange}
                    className="h-4 w-4 rounded text-primary-main border-gray-300 focus:ring-primary-light"
                  />
                  <span className="ml-2 text-sm text-gray-700">Metadata (Created/Updated Dates)</span>
                </label>
              </div>
            </div>
            
            <div className="border-t border-gray-200 my-4"></div>
            
            {/* Current Filters */}
            <div>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="applyCurrentFilters"
                  checked={applyCurrentFilters}
                  onChange={handleApplyFiltersChange}
                  className="h-4 w-4 rounded text-primary-main border-gray-300 focus:ring-primary-light"
                />
                <span className="ml-2 text-sm text-gray-700">Apply current search & filters</span>
              </label>
              
              {applyCurrentFilters && (searchQuery || Object.values(filters).some(v => v)) && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-xs text-gray-500">
                    Current filters that will be applied:
                  </p>
                  
                  <ul className="mt-1 pl-5 list-disc text-xs text-gray-500">
                    {searchQuery && (
                      <li>Search: "{searchQuery}"</li>
                    )}
                    
                    {filters.category_id && (
                      <li>Category filter</li>
                    )}
                    
                    {filters.supplier_id && (
                      <li>Supplier filter</li>
                    )}
                    
                    {filters.location_id && (
                      <li>Location filter</li>
                    )}
                    
                    {filters.include_inactive && (
                      <li>Including inactive products</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          {/* Dialog footer */}
          <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light ${loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading || !hasSelectedFields}
              className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light inline-flex items-center ${loading || !hasSelectedFields ? 'bg-primary-light text-white cursor-not-allowed' : 'bg-primary-main text-white hover:bg-primary-dark'}`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductExportDialog;