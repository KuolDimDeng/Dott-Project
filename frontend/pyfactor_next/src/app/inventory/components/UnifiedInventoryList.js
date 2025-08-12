import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { unifiedInventoryService } from '@/services/unifiedInventoryService';
import { logger } from '@/utils/logger';

// Import Heroicons
import {
  PlusIcon, ArrowPathIcon, FunnelIcon, TrashIcon, 
  CloudArrowUpIcon, CloudArrowDownIcon, ListBulletIcon, 
  Squares2X2Icon, ViewColumnsIcon, MagnifyingGlassIcon, 
  XMarkIcon, CheckIcon, ExclamationTriangleIcon, 
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

// Lazy load components for better initial load performance
const ProductTable = lazy(() => import('./ProductTable'));
const ProductGrid = lazy(() => import('./ProductGrid'));
const ProductForm = lazy(() => import('./ProductForm'));
const ProductStatsWidget = lazy(() => import('./ProductStatsWidget'));
const ProductDetailDialog = lazy(() => import('./ProductDetailDialog'));
const ProductBulkActions = lazy(() => import('./ProductBulkActions'));
const ProductImportDialog = lazy(() => import('./ProductImportDialog'));
const ProductExportDialog = lazy(() => import('./ProductExportDialog'));
const ProductFiltersPanel = lazy(() => import('./ProductFiltersPanel'));

/**
 * Unified Inventory List Component
 * Combines the best features of all inventory list implementations
 * with optimized performance and enhanced features
 */
const UnifiedInventoryList = ({ initialCreateForm = false }) => {
  // State for products and loading
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // State for pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // State for dialogs
  const [formDialogOpen, setFormDialogOpen] = useState(initialCreateForm);
  const [currentItem, setCurrentItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category_id: '',
    supplier_id: '',
    location_id: '',
    include_inactive: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // State for view options
  const [viewMode, setViewMode] = useState('table'); // 'table', 'grid'
  const [displayMode, setDisplayMode] = useState('standard'); // 'ultra', 'standard', 'detailed'

  // State for bulk actions
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);

  // State for snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Initial data loading
  useEffect(() => {
    fetchProducts();
    fetchStats();
  }, [page, limit]); // Dependencies that trigger reload

  // Fetch products when page, limit, search or filters change
  useEffect(() => {
    fetchProducts();
  }, [page, limit, searchQuery, filters, displayMode]);
  
  // Effect for handling refresh after actions
  useEffect(() => {
    if (initialCreateForm) {
      logger.info('Opening create form from URL parameter');
    }
  }, [initialCreateForm]);

  // Fetch product statistics
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const data = await unifiedInventoryService.getProductStats();
      setStatsData(data);
    } catch (error) {
      logger.error('Error fetching product stats:', error);
      setError('Failed to load product statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch products with current pagination, search and filters
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const params = {
        page,
        limit,
        search: searchQuery,
        view_mode: displayMode,
        ...filters
      };
      
      const response = await unifiedInventoryService.getProducts(params);
      
      setProducts(response.data || []);
      setTotalPages(response.pagination?.total_pages || 1);
      setTotalItems(response.pagination?.total || 0);
      setError(null);
    } catch (error) {
      logger.error('Error fetching products:', error);
      setError('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = () => {
    unifiedInventoryService.clearProductCache();
    fetchStats();
    fetchProducts();
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  // Handle search
  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    setPage(1); // Reset to first page when search changes
  };

  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setFiltersApplied(Object.values(newFilters).some(value => 
      value !== '' && value !== false && value !== null));
    setPage(1); // Reset to first page when filters change
  };

  // Toggle filter panel
  const handleToggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  // Handle display mode change
  const handleDisplayModeChange = (newMode) => {
    if (newMode !== null) {
      setDisplayMode(newMode);
    }
  };

  // Open form dialog for create/edit
  const handleOpenFormDialog = (item = null) => {
    setCurrentItem(item);
    setFormDialogOpen(true);
  };

  // Close form dialog
  const handleCloseFormDialog = (refreshData = false) => {
    setFormDialogOpen(false);
    setCurrentItem(null);
    
    if (refreshData) {
      handleRefresh();
    }
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (id) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Close delete dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  // Delete a product
  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      await unifiedInventoryService.deleteProduct(itemToDelete);
      
      handleCloseDeleteDialog();
      handleRefresh();
      
      setSnackbar({
        open: true,
        message: 'Product deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      logger.error('Error deleting product:', error);
      
      setSnackbar({
        open: true,
        message: 'Failed to delete product',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Open detail dialog
  const handleOpenDetailDialog = (id) => {
    setDetailItem(id);
    setDetailDialogOpen(true);
  };

  // Close detail dialog
  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setDetailItem(null);
  };

  // Toggle item selection for bulk actions
  const handleToggleSelect = (id) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Select/deselect all items
  const handleSelectAll = (selected) => {
    if (selected) {
      setSelectedItems(products.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  // Toggle bulk actions menu
  const handleToggleBulkMenu = () => {
    setBulkMenuOpen(!bulkMenuOpen);
  };

  // Perform bulk delete
  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      setBulkMenuOpen(false);
      
      const result = await unifiedInventoryService.bulkDeleteProducts(selectedItems);
      
      setSnackbar({
        open: true,
        message: `Successfully deleted ${result.success_count} products${
          result.failed_ids?.length ? `, failed to delete ${result.failed_ids.length}` : ''
        }`,
        severity: result.failed_ids?.length ? 'warning' : 'success'
      });
      
      setSelectedItems([]);
      handleRefresh();
    } catch (error) {
      logger.error('Error performing bulk delete:', error);
      
      setSnackbar({
        open: true,
        message: 'Failed to delete products',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Open import dialog
  const handleOpenImportDialog = () => {
    setImportDialogOpen(true);
  };

  // Close import dialog
  const handleCloseImportDialog = (refreshData = false) => {
    setImportDialogOpen(false);
    
    if (refreshData) {
      handleRefresh();
    }
  };

  // Open export dialog
  const handleOpenExportDialog = () => {
    setExportDialogOpen(true);
  };

  // Close export dialog
  const handleCloseExportDialog = () => {
    setExportDialogOpen(false);
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  // Memoized value to determine if any filters are applied
  const hasActiveFilters = useMemo(() => {
    return searchQuery !== '' || filtersApplied;
  }, [searchQuery, filtersApplied]);

  return (
    <div className="w-full">
      {/* Statistics Widget */}
      <Suspense fallback={
        <div className="h-[150px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      }>
        <ProductStatsWidget stats={statsData} loading={statsLoading} />
      </Suspense>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div className="sm:col-span-8">
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => handleOpenFormDialog()}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Product
              </button>
              
              <button
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={handleRefresh}
                disabled={loading}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Refresh
              </button>
              
              <button
                className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  filtersApplied 
                    ? "text-indigo-700 border-indigo-300 bg-indigo-50 hover:bg-indigo-100" 
                    : "text-gray-700 border-gray-300 bg-white hover:bg-gray-50"
                }`}
                onClick={handleToggleFilters}
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
              </button>
              
              {selectedItems.length > 0 && (
                <div className="relative">
                  <button
                    className="inline-flex items-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={handleToggleBulkMenu}
                  >
                    <span className="relative mr-2">
                      <TrashIcon className="h-4 w-4" />
                      <span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-4 w-4 text-xs font-bold text-white bg-indigo-600 rounded-full">
                        {selectedItems.length}
                      </span>
                    </span>
                    Bulk Actions
                  </button>
                  
                  {/* Bulk Actions Menu */}
                  {bulkMenuOpen && (
                    <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <div className="py-1" role="menu" aria-orientation="vertical">
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                          role="menuitem"
                          onClick={handleBulkDelete}
                        >
                          <TrashIcon className="h-4 w-4 mr-3 text-gray-500" />
                          Delete Selected ({selectedItems.length})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="sm:col-span-4">
            <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
              <button
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                onClick={handleOpenImportDialog}
                title="Import Products"
              >
                <CloudArrowUpIcon className="h-5 w-5" />
              </button>
              
              <button
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                onClick={handleOpenExportDialog}
                title="Export Products"
              >
                <CloudArrowDownIcon className="h-5 w-5" />
              </button>
              
              <div className="h-6 border-l border-gray-300 mx-1"></div>
              
              <button
                className={`p-2 rounded-md hover:bg-gray-100 ${
                  viewMode === 'table' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => handleViewModeChange('table')}
                title="Table View"
              >
                <ListBulletIcon className="h-5 w-5" />
              </button>
              
              <button
                className={`p-2 rounded-md hover:bg-gray-100 ${
                  viewMode === 'grid' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => handleViewModeChange('grid')}
                title="Grid View"
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Box */}
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search products by name, code, or description..."
              value={searchQuery}
              onChange={handleSearch}
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  onClick={() => setSearchQuery('')}
                  className="h-5 w-5 text-gray-400 hover:text-gray-500"
                  title="Clear search"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Display Mode Tabs */}
        <div className="mt-4 border-b border-gray-200">
          <div className="flex overflow-x-auto">
            <button
              className={`pb-2 px-4 text-sm font-medium inline-flex items-center ${
                displayMode === 'ultra'
                  ? 'border-b-2 border-indigo-500 text-indigo-600' 
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleDisplayModeChange('ultra')}
            >
              <ViewColumnsIcon className="h-4 w-4 mr-2" />
              Compact
            </button>
            <button
              className={`pb-2 px-4 text-sm font-medium inline-flex items-center ${
                displayMode === 'standard'
                  ? 'border-b-2 border-indigo-500 text-indigo-600' 
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleDisplayModeChange('standard')}
            >
              <ListBulletIcon className="h-4 w-4 mr-2" />
              Standard
            </button>
            <button
              className={`pb-2 px-4 text-sm font-medium inline-flex items-center ${
                displayMode === 'detailed'
                  ? 'border-b-2 border-indigo-500 text-indigo-600' 
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleDisplayModeChange('detailed')}
            >
              <Squares2X2Icon className="h-4 w-4 mr-2" />
              Detailed
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Suspense fallback={
          <div className="h-[100px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        }>
          <ProductFiltersPanel 
            filters={filters} 
            onFilterChange={handleFilterChange} 
            onClose={handleToggleFilters} 
          />
        </Suspense>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          {searchQuery && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-0.5 text-sm font-medium text-gray-800">
              Search: {searchQuery}
              <button
                type="button"
                className="ml-1 inline-flex flex-shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-500"
                onClick={() => setSearchQuery('')}
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {filters.category_id && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-0.5 text-sm font-medium text-gray-800">
              Category Filter
              <button
                type="button"
                className="ml-1 inline-flex flex-shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-500"
                onClick={() => handleFilterChange({...filters, category_id: ''})}
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {filters.supplier_id && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-0.5 text-sm font-medium text-gray-800">
              Supplier Filter
              <button
                type="button"
                className="ml-1 inline-flex flex-shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-500"
                onClick={() => handleFilterChange({...filters, supplier_id: ''})}
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {filters.location_id && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-0.5 text-sm font-medium text-gray-800">
              Location Filter
              <button
                type="button"
                className="ml-1 inline-flex flex-shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-500"
                onClick={() => handleFilterChange({...filters, location_id: ''})}
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {filters.include_inactive && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-0.5 text-sm font-medium text-gray-800">
              Including Inactive
              <button
                type="button"
                className="ml-1 inline-flex flex-shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-500"
                onClick={() => handleFilterChange({...filters, include_inactive: false})}
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          
          <button 
            className="text-sm text-indigo-600 hover:text-indigo-500"
            onClick={() => {
              setSearchQuery('');
              handleFilterChange({
                category_id: '',
                supplier_id: '',
                location_id: '',
                include_inactive: false
              });
            }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {initialLoading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* No Products Message */}
          {products.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-500">
                No products found
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {hasActiveFilters 
                  ? 'Try changing your search or filters'
                  : 'Click "Add Product" to create your first product'}
              </p>
            </div>
          ) : (
            <>
              {/* Products Display */}
              <Suspense fallback={
                <div className="flex justify-center my-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                </div>
              }>
                {viewMode === 'table' ? (
                  <ProductTable
                    products={products}
                    loading={loading}
                    displayMode={displayMode}
                    selectedItems={selectedItems}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                    onEdit={handleOpenFormDialog}
                    onDelete={handleOpenDeleteDialog}
                    onViewDetails={handleOpenDetailDialog}
                  />
                ) : (
                  <ProductGrid
                    products={products}
                    loading={loading}
                    displayMode={displayMode}
                    selectedItems={selectedItems}
                    onToggleSelect={handleToggleSelect}
                    onEdit={handleOpenFormDialog}
                    onDelete={handleOpenDeleteDialog}
                    onViewDetails={handleOpenDetailDialog}
                  />
                )}
              </Suspense>
              
              {/* Pagination */}
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pb-4">
                <p className="text-sm text-gray-500 mb-4 sm:mb-0">
                  Showing {Math.min((page - 1) * limit + 1, totalItems)} - {Math.min(page * limit, totalItems)} of {totalItems} items
                </p>
                
                {totalPages > 1 && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={page === 1 || loading}
                      className={`px-2 py-1 border rounded-md ${
                        page === 1 || loading
                          ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1 || loading}
                      className={`px-2 py-1 border rounded-md ${
                        page === 1 || loading
                          ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Previous
                    </button>
                    
                    <div className="flex space-x-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const pageNumber = page <= 3
                          ? i + 1
                          : page >= totalPages - 2
                            ? totalPages - 4 + i
                            : page - 2 + i;
                            
                        if (pageNumber > 0 && pageNumber <= totalPages) {
                          return (
                            <button
                              key={pageNumber}
                              onClick={() => handlePageChange(pageNumber)}
                              className={`w-8 h-8 flex items-center justify-center border rounded-md ${
                                page === pageNumber
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        }
                        return null;
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages || loading}
                      className={`px-2 py-1 border rounded-md ${
                        page === totalPages || loading
                          ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Next
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={page === totalPages || loading}
                      className={`px-2 py-1 border rounded-md ${
                        page === totalPages || loading
                          ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Last
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Dialogs */}
      <Suspense fallback={null}>
        {/* Product Form Dialog */}
        {formDialogOpen && (
          <ProductForm
            open={formDialogOpen}
            onClose={handleCloseFormDialog}
            product={currentItem}
            isEdit={!!currentItem}
          />
        )}
        
        {/* Product Detail Dialog */}
        {detailDialogOpen && (
          <ProductDetailDialog
            open={detailDialogOpen}
            onClose={handleCloseDetailDialog}
            productId={detailItem}
            onEdit={handleOpenFormDialog}
          />
        )}
        
        {/* Import Dialog */}
        {importDialogOpen && (
          <ProductImportDialog
            open={importDialogOpen}
            onClose={handleCloseImportDialog}
          />
        )}
        
        {/* Export Dialog */}
        {exportDialogOpen && (
          <ProductExportDialog
            open={exportDialogOpen}
            onClose={handleCloseExportDialog}
            filters={filters}
            searchQuery={searchQuery}
          />
        )}
      </Suspense>

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="absolute inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={handleCloseDeleteDialog}></div>
            
            {/* Center modal */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Confirm Delete
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this product? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteConfirm}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    'Delete'
                  )}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCloseDeleteDialog}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar for notifications */}
      {snackbar.open && (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 rounded-md py-2 px-4 shadow-lg flex items-center ${
          snackbar.severity === 'success' ? 'bg-green-500 text-white' :
          snackbar.severity === 'error' ? 'bg-red-500 text-white' :
          snackbar.severity === 'warning' ? 'bg-amber-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <span className="mr-2">
            {snackbar.severity === 'success' ? <CheckIcon className="h-5 w-5" /> : 
             snackbar.severity === 'error' ? <ExclamationTriangleIcon className="h-5 w-5" /> : 
             snackbar.severity === 'warning' ? <ExclamationTriangleIcon className="h-5 w-5" /> : 
             <PaperAirplaneIcon className="h-5 w-5" />}
          </span>
          <p>{snackbar.message}</p>
          <button 
            onClick={handleCloseSnackbar}
            className="ml-4 focus:outline-none text-white opacity-50 hover:opacity-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default UnifiedInventoryList;