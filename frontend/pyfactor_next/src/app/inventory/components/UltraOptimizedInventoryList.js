import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { logger } from '@/utils/logger';
import { inventoryService } from '@/services/inventoryService';
import { ultraOptimizedInventoryService } from '@/services/ultraOptimizedInventoryService';

// Import Heroicons
import {
  PencilIcon, TrashIcon, EyeIcon, PlusIcon, ArrowPathIcon,
  ExclamationTriangleIcon, TagIcon, ServerIcon, BoltIcon, 
  ShoppingBagIcon, ArchiveBoxIcon, MagnifyingGlassIcon,
  CurrencyDollarIcon, FolderIcon
} from '@heroicons/react/24/outline';

// Lazy load components for better initial load performance
const ProductStatsWidget = lazy(() => import('./ProductStatsWidget'));
const ProductDetailDialog = lazy(() => import('./ProductDetailDialog'));

/**
 * Ultra-optimized component for displaying and managing inventory items
 * This component uses the ultra-optimized inventory service for maximum performance
 */
const UltraOptimizedInventoryList = () => {
  // State for products data
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState({
    name: '',
    product_code: '',
    description: '',
    stock_quantity: 0,
    reorder_level: 0,
    price: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  
  // UI state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [useMockData, setUseMockData] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [useOfflineData, setUseOfflineData] = useState(false);
  const [showStats, setShowStats] = useState(true);
  
  // Filter state
  const [filters, setFilters] = useState({
    is_for_sale: true,
    min_stock: '',
    search: '',
    department: ''
  });
  
  // View mode state
  const [viewMode, setViewMode] = useState('ultra'); // 'ultra', 'standard', 'detailed'

  // Show snackbar notification
  const showSnackbar = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Close snackbar
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Fetch products with the appropriate service based on view mode
  const fetchProducts = useCallback(async (forceMock = false, forceOffline = false) => {
    // Temporarily disable loading spinner
    // setLoading(true);
    setError(null);
    
    // Immediately use mock data for now due to network issues
    logger.info('Using mock inventory data due to network issues');
    const mockProducts = inventoryService.getMockProducts();
    setProducts(mockProducts);
    setTotalItems(mockProducts.length);
    setTotalPages(1);
    setApiUnavailable(true);
    showSnackbar('Using demo data (API unavailable)', 'info');
    setLoading(false);
    setInitialLoading(false);
    return;
  }, [showSnackbar]);

  // Fetch product stats
  const fetchStats = useCallback(async () => {
    if (!showStats) return;
    
    try {
      const statsData = await ultraOptimizedInventoryService.getProductStats();
      setStats(statsData);
    } catch (error) {
      logger.error('Error fetching product stats:', error);
      // Don't show an error message for stats, just log it
    }
  }, [showStats]);

  // Effect to fetch products and stats on component mount and when dependencies change
  useEffect(() => {
    // Prefetch products for faster initial load
    if (initialLoading) {
      ultraOptimizedInventoryService.prefetchEssentialData().catch(() => {
        // Silently fail, will be handled in fetchProducts
      });
    }
    
    fetchProducts();
    fetchStats();
  }, [fetchProducts, fetchStats, page, viewMode]);

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  // Handle filter change
  const handleFilterChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Reset to first page when filters change
    setPage(1);
  };

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setPage(1); // Reset to first page when changing view mode
  };

  // Open dialog for adding or editing an item
  const handleOpenDialog = (item = null) => {
    if (item) {
      setCurrentItem({
        ...item,
        // Ensure all required fields are present
        name: item.name || '',
        product_code: item.product_code || '',
        description: item.description || '',
        stock_quantity: item.stock_quantity || 0,
        reorder_level: item.reorder_level || 0,
        price: item.price || 0,
      });
      setIsEditing(true);
    } else {
      setCurrentItem({
        name: '',
        product_code: '',
        description: '',
        stock_quantity: 0,
        reorder_level: 0,
        price: 0,
        is_for_sale: true,
      });
      setIsEditing(false);
    }
    setOpenDialog(true);
  };

  // Open detail dialog for a product
  const handleOpenDetailDialog = (productId) => {
    setSelectedProductId(productId);
    setDetailDialogOpen(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentItem({
      name: '',
      product_code: '',
      description: '',
      stock_quantity: 0,
      reorder_level: 0,
      price: 0,
      is_for_sale: true,
    });
    setIsEditing(false);
  };

  // Handle input change in dialog
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentItem((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Submit form for creating or updating an item
  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!currentItem.name) {
        showSnackbar('Name is required', 'error');
        return;
      }
      
      // Prepare product data
      const productData = {
        name: currentItem.name,
        description: currentItem.description || '',
        price: parseFloat(currentItem.price) || 0,
        product_code: currentItem.product_code || undefined,
        stock_quantity: parseInt(currentItem.stock_quantity, 10) || 0,
        reorder_level: parseInt(currentItem.reorder_level, 10) || 0,
        is_for_sale: currentItem.is_for_sale !== false
      };
      
      logger.info('Submitting product data:', productData);
      setLoading(true);
      
      if (isEditing) {
        try {
          // Update product
          await inventoryService.updateProduct(currentItem.id, productData);
          logger.info('Product updated successfully');
          showSnackbar('Product updated successfully', 'success');
          
          // Clear cache to ensure fresh data
          ultraOptimizedInventoryService.clearProductCache();
        } catch (error) {
          logger.error('Error updating product:', error);
          showSnackbar('Failed to update product. Please try again.', 'error');
          setLoading(false);
          return;
        }
      } else {
        try {
          // Create product
          await inventoryService.createProduct(productData);
          logger.info('Product created successfully');
          showSnackbar('Product created successfully', 'success');
          
          // Clear cache to ensure fresh data
          ultraOptimizedInventoryService.clearProductCache();
        } catch (error) {
          logger.error('Error creating product:', error);
          showSnackbar('Failed to create product. Please try again.', 'error');
          setLoading(false);
          return;
        }
      }
      
      // Refresh the list and close the dialog
      await fetchProducts();
      await fetchStats();
      handleCloseDialog();
    } catch (error) {
      logger.error('Error saving product:', error);
      showSnackbar('Failed to save product. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete an item
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        setLoading(true);
        
        await inventoryService.deleteProduct(id);
        logger.info('Product deleted successfully');
        showSnackbar('Product deleted successfully', 'success');
        
        // Clear cache to ensure fresh data
        ultraOptimizedInventoryService.clearProductCache();
        
        // Refresh the list after deletion
        await fetchProducts();
        await fetchStats();
      } catch (error) {
        logger.error('Error deleting product:', error);
        showSnackbar('Failed to delete product. Please try again later.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Render loading skeletons for initial load
  const renderSkeletons = () => {
    return Array(5).fill(0).map((_, index) => (
      <tr key={`skeleton-${index}`} className="border-b border-gray-200">
        <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded animate-pulse w-4/5"></div></td>
        <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded animate-pulse w-3/5"></div></td>
        {viewMode !== 'ultra' && <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded animate-pulse w-9/10"></div></td>}
        <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded animate-pulse w-2/5"></div></td>
        {viewMode === 'detailed' && <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded animate-pulse w-2/5"></div></td>}
        <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded animate-pulse w-1/2"></div></td>
        <td className="px-6 py-4">
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </td>
      </tr>
    ));
  };

  // Status indicator component
  const StatusIndicator = () => {
    let status = 'online';
    let statusText = 'Using live data';
    let statusColor = 'bg-green-100 text-green-800';
    let icon = <ArrowPathIcon className="w-4 h-4" />;
    
    if (useMockData) {
      status = 'demo';
      statusText = 'Using demo data';
      statusColor = 'bg-purple-100 text-purple-800';
      icon = <ServerIcon className="w-4 h-4" />;
    } else if (useOfflineData) {
      status = 'offline';
      statusText = 'Using offline data';
      statusColor = 'bg-amber-100 text-amber-800';
      icon = <ServerIcon className="w-4 h-4" />;
    } else if (viewMode === 'ultra') {
      status = 'ultra';
      statusText = 'Using ultra-optimized endpoint';
      statusColor = 'bg-green-100 text-green-800';
      icon = <BoltIcon className="w-4 h-4" />;
    } else if (viewMode === 'standard') {
      status = 'standard';
      statusText = 'Using standard optimized endpoint';
      statusColor = 'bg-blue-100 text-blue-800';
      icon = <ArrowPathIcon className="w-4 h-4" />;
    } else {
      status = 'detailed';
      statusText = 'Using detailed endpoint';
      statusColor = 'bg-gray-100 text-gray-800';
      icon = <ArchiveBoxIcon className="w-4 h-4" />;
    }
    
    return (
      <div className="group relative ml-2 inline-flex">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
          <span className="mr-1">{icon}</span>
          {status}
        </span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute left-0 -bottom-10 z-10 bg-gray-900 text-white text-xs rounded py-1 px-2 pointer-events-none whitespace-nowrap">
          {statusText}
        </div>
      </div>
    );
  };

  // Render stats widgets
  const renderStats = () => {
    if (!showStats) return null;
    
    return (
      <Suspense fallback={<div className="p-4"></div>}>
        <div className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {stats ? (
              <>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-gray-500 text-sm mb-1">Total Products</p>
                  <p className="text-2xl font-semibold">{stats.total_products}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-gray-500 text-sm mb-1">Low Stock Items</p>
                  <p className={`text-2xl font-semibold ${stats.low_stock_count > 0 ? "text-red-600" : ""}`}>
                    {stats.low_stock_count}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-gray-500 text-sm mb-1">Total Inventory Value</p>
                  <p className="text-2xl font-semibold">${parseFloat(stats.total_value).toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-gray-500 text-sm mb-1">Average Price</p>
                  <p className="text-2xl font-semibold">${parseFloat(stats.avg_price).toFixed(2)}</p>
                </div>
              </>
            ) : (
              // Skeleton loading for stats
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white p-4 rounded-lg shadow">
                    <div className="h-4 bg-gray-200 rounded w-3/5 mb-2 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded w-2/5 animate-pulse"></div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </Suspense>
    );
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      {/* Header with title and actions */}
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold flex items-center">
          Ultra-Optimized Inventory
          <StatusIndicator />
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => {
              setApiUnavailable(false);
              setUseOfflineData(false);
              fetchProducts(false);
              fetchStats();
            }}
            disabled={loading}
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
          
          <button
            className={`inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md 
              ${useMockData 
                ? "bg-purple-600 text-white hover:bg-purple-700" 
                : "text-gray-700 bg-white hover:bg-gray-50"}`}
            onClick={() => {
              setUseMockData(!useMockData);
              setUseOfflineData(false);
              fetchProducts(!useMockData);
            }}
            disabled={loading}
          >
            {useMockData ? "Using Demo Data" : "Use Demo Data"}
          </button>
          
          <button
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => handleOpenDialog()}
            disabled={loading}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add New Item
          </button>
        </div>
      </div>
      
      {/* Stats widgets */}
      {renderStats()}
      
      {/* Filters and view mode */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8">
            <h2 className="text-lg font-medium mb-4">Filters</h2>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  checked={filters.is_for_sale}
                  onChange={handleFilterChange}
                  name="is_for_sale"
                />
                <span className="ml-2 text-sm text-gray-700">For Sale Only</span>
              </label>
              
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                <input
                  type="number"
                  name="min_stock"
                  value={filters.min_stock}
                  onChange={handleFilterChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div className="relative w-full max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    placeholder="Search products..."
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="md:col-span-4">
            <h2 className="text-lg font-medium mb-4">View Mode</h2>
            <div className="flex flex-wrap gap-2">
              <button
                className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md ${
                  viewMode === 'ultra' 
                    ? 'bg-green-600 text-white hover:bg-green-700 border-transparent' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
                onClick={() => handleViewModeChange('ultra')}
              >
                <BoltIcon className="h-4 w-4 mr-2" />
                Ultra Fast
              </button>
              <button
                className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md ${
                  viewMode === 'standard' 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 border-transparent' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
                onClick={() => handleViewModeChange('standard')}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Standard
              </button>
              <button
                className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md ${
                  viewMode === 'detailed' 
                    ? 'bg-purple-600 text-white hover:bg-purple-700 border-transparent' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
                onClick={() => handleViewModeChange('detailed')}
              >
                <ArchiveBoxIcon className="h-4 w-4 mr-2" />
                Detailed
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Status alerts */}
      {(useMockData || apiUnavailable) && (
        <div className="mb-6 rounded-md bg-amber-50 p-4 border border-amber-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Using Demo Data</h3>
              <div className="mt-2 text-sm text-amber-700">
                {apiUnavailable
                  ? "The inventory API is currently unavailable. All data shown is demo data and changes will not be saved."
                  : "You are viewing demo data. Changes will not be persisted to the database."}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {useOfflineData && (
        <div className="mb-6 rounded-md bg-blue-50 p-4 border border-blue-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <ServerIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Using Offline Data</h3>
              <div className="mt-2 text-sm text-blue-700">
                You are viewing cached offline data. This data may not be up-to-date with the latest changes.
              </div>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Products display */}
      {products.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-500">
            No inventory items found
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Click "Add New Item" to create your first inventory item
          </p>
        </div>
      ) : (
        <>
          {/* Products table */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    {viewMode !== 'ultra' && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>}
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    {viewMode === 'detailed' && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Level</th>}
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading && !initialLoading ? (
                    renderSkeletons()
                  ) : (
                    products.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div 
                            className="text-sm font-medium text-gray-900 cursor-pointer hover:text-indigo-600 hover:underline"
                            onClick={() => handleOpenDetailDialog(item.id)}
                          >
                            {item.name}
                          </div>
                          {viewMode === 'standard' && item.department_name && (
                            <div className="text-xs text-gray-500">
                              {item.department_name}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.product_code || 'N/A'}
                        </td>
                        {viewMode !== 'ultra' && (
                          <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs">
                            {item.description ? 
                              (item.description.length > 50 ? 
                                `${item.description.substring(0, 50)}...` : 
                                item.description) : 
                              'No description'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {(item.stock_quantity !== undefined && item.reorder_level !== undefined && 
                           item.stock_quantity < item.reorder_level) ? (
                            <div className="flex items-center">
                              <span className="text-red-600">{item.stock_quantity}</span>
                              <div className="group relative ml-2">
                                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute left-0 -bottom-8 z-10 bg-gray-900 text-white text-xs rounded py-1 px-2 pointer-events-none whitespace-nowrap">
                                  Low stock
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-700">{item.stock_quantity || 0}</span>
                          )}
                        </td>
                        {viewMode === 'detailed' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.reorder_level || 0}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${typeof item.price === 'number'
                            ? item.price.toFixed(2)
                            : parseFloat(item.price || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button 
                              className="p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                              onClick={() => handleOpenDialog(item)}
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button 
                              className="p-1 rounded-full text-gray-500 hover:text-red-600 hover:bg-gray-100"
                              onClick={() => handleDelete(item.id)}
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1 || loading}
                  className={`px-2 py-1 border rounded ${
                    page === 1 || loading
                      ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                {[...Array(totalPages).keys()].map((i) => (
                  <button
                    key={i + 1}
                    onClick={() => handlePageChange(i + 1)}
                    className={`px-3 py-1 border rounded ${
                      page === i + 1
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages || loading}
                  className={`px-2 py-1 border rounded ${
                    page === totalPages || loading
                      ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </nav>
            </div>
          )}
          
          {/* Item count */}
          <div className="mt-4 text-right">
            <p className="text-sm text-gray-500">
              Showing {products.length} of {totalItems} items
            </p>
          </div>
        </>
      )}
      
      {/* Snackbar for notifications */}
      {snackbarOpen && (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 rounded-md py-2 px-4 shadow-lg ${
          snackbarSeverity === 'success' ? 'bg-green-500 text-white' :
          snackbarSeverity === 'error' ? 'bg-red-500 text-white' :
          snackbarSeverity === 'warning' ? 'bg-amber-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center">
            <span className="mr-2">
              {snackbarSeverity === 'success' ? '✓' : 
               snackbarSeverity === 'error' ? '✕' : 
               snackbarSeverity === 'warning' ? '⚠' : 'ℹ'}
            </span>
            <p>{snackbarMessage}</p>
            <button 
              onClick={handleSnackbarClose}
              className="ml-4 focus:outline-none text-white opacity-50 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Dialog for adding/editing items */}
      {openDialog && (
        <div className="absolute inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={handleCloseDialog}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  {isEditing ? 'Edit Product' : 'Add New Product'}
                </h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      value={currentItem.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="product_code" className="block text-sm font-medium text-gray-700">SKU</label>
                    <input
                      type="text"
                      name="product_code"
                      id="product_code"
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      value={currentItem.product_code}
                      onChange={handleInputChange}
                    />
                    <p className="mt-1 text-xs text-gray-500">Leave blank to auto-generate</p>
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      name="description"
                      id="description"
                      rows="3"
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      value={currentItem.description}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>
                  
                  <div>
                    <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      name="stock_quantity"
                      id="stock_quantity"
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      value={currentItem.stock_quantity}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="reorder_level" className="block text-sm font-medium text-gray-700">Reorder Level</label>
                    <input
                      type="number"
                      name="reorder_level"
                      id="reorder_level"
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      value={currentItem.reorder_level}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        name="price"
                        id="price"
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                        value={currentItem.price}
                        onChange={handleInputChange}
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="is_for_sale"
                      name="is_for_sale"
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={currentItem.is_for_sale !== false}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="is_for_sale" className="ml-2 block text-sm text-gray-700">
                      Available for Sale
                    </label>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleSubmit}
                >
                  {isEditing ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product detail dialog */}
      {selectedProductId && (
        <Suspense fallback={<div></div>}>
          <ProductDetailDialog
            open={detailDialogOpen}
            onClose={() => setDetailDialogOpen(false)}
            productId={selectedProductId}
          />
        </Suspense>
      )}
    </div>
  );
};

export default UltraOptimizedInventoryList;