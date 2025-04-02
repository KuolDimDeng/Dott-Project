import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { inventoryService } from '@/services/inventoryService';
import { optimizedInventoryService } from '@/services/optimizedInventoryService';
import { logger } from '@/utils/logger';

/**
 * Optimized component for displaying and managing inventory items
 * This component uses the optimized inventory service for better performance
 */
const OptimizedInventoryList = () => {
  // State for products data
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
  
  // UI state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [useMockData, setUseMockData] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [useOfflineData, setUseOfflineData] = useState(false);
  const [useOptimizedEndpoint, setUseOptimizedEndpoint] = useState(true);
  
  // Filter state
  const [filters, setFilters] = useState({
    is_for_sale: true,
    min_stock: '',
  });

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

  // Fetch products with optimized service
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

  // Effect to fetch products on component mount and when dependencies change
  useEffect(() => {
    // Prefetch products for faster initial load
    if (initialLoading) {
      optimizedInventoryService.prefetchProducts().catch(() => {
        // Silently fail, will be handled in fetchProducts
      });
    }
    
    fetchProducts();
  }, [fetchProducts, page, useOptimizedEndpoint]);

  // Handle page change
  const handlePageChange = (event, newPage) => {
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
          optimizedInventoryService.clearProductCache();
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
          optimizedInventoryService.clearProductCache();
        } catch (error) {
          logger.error('Error creating product:', error);
          showSnackbar('Failed to create product. Please try again.', 'error');
          setLoading(false);
          return;
        }
      }
      
      // Refresh the list and close the dialog
      await fetchProducts();
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
        optimizedInventoryService.clearProductCache();
        
        // Refresh the list after deletion
        await fetchProducts();
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
        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-4/5"></div></td>
        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-3/5"></div></td>
        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-[90%]"></div></td>
        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-2/5"></div></td>
        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-2/5"></div></td>
        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div></td>
        <td className="py-3 px-4">
          <div className="flex gap-2">
            <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </td>
      </tr>
    ));
  };

  // Status indicator component
  const StatusIndicator = () => {
    let status = 'online';
    let statusText = 'Using live data';
    let statusColor = 'bg-green-100 text-green-800 border-green-200';
    let iconClasses = "w-4 h-4 mr-1";
    
    if (useMockData) {
      status = 'demo';
      statusText = 'Using demo data';
      statusColor = 'bg-purple-100 text-purple-800 border-purple-200';
    } else if (useOfflineData) {
      status = 'offline';
      statusText = 'Using offline data';
      statusColor = 'bg-amber-100 text-amber-800 border-amber-200';
    } else if (!useOptimizedEndpoint) {
      status = 'standard';
      statusText = 'Using standard endpoint';
      statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
    }
    
    return (
      <div className={`${statusColor} flex items-center text-xs rounded-full px-2.5 py-1 border ml-2 inline-flex`} title={statusText}>
        {status === 'online' || status === 'standard' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        )}
        {status}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      {/* Header with title and actions */}
      <div className="flex justify-between items-center mb-4 flex-wrap">
        <h4 className="text-2xl font-semibold flex items-center">
          Inventory Items
          <StatusIndicator />
        </h4>
        <div className="flex gap-2 flex-wrap mt-2 sm:mt-0">
          <button
            className="px-4 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              setApiUnavailable(false);
              setUseOfflineData(false);
              fetchProducts(false);
            }}
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          
          <button
            className={`px-4 py-2 rounded-md flex items-center ${
              useMockData 
                ? "bg-purple-600 text-white hover:bg-purple-700" 
                : "border border-blue-500 text-blue-500 hover:bg-blue-50"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleOpenDialog()}
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Item
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="mb-4 p-4 bg-white rounded-md shadow-sm">
        <h6 className="text-lg font-medium mb-4">Filters</h6>
        <div className="flex flex-wrap gap-4 items-center">
          <label className="inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              name="is_for_sale"
              checked={filters.is_for_sale}
              onChange={handleFilterChange}
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ms-3 text-sm font-medium text-gray-900">For Sale Only</span>
          </label>
          
          <div>
            <label htmlFor="min_stock" className="block text-sm font-medium text-gray-700 mb-1">
              Min Stock
            </label>
            <input
              id="min_stock"
              className="w-28 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              name="min_stock"
              type="number"
              value={filters.min_stock}
              onChange={handleFilterChange}
            />
          </div>
          
          <label className="inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={useOptimizedEndpoint}
              onChange={(e) => setUseOptimizedEndpoint(e.target.checked)}
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            <span className="ms-3 text-sm font-medium text-gray-900">Use Optimized Endpoint</span>
          </label>
        </div>
      </div>
      
      {/* Status alerts */}
      {(useMockData || apiUnavailable) && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <p className="font-bold text-amber-800">
            Using Demo Data
          </p>
          <p className="text-sm text-amber-700 mt-1">
            {apiUnavailable
              ? "The inventory API is currently unavailable. All data shown is demo data and changes will not be saved."
              : "You are viewing demo data. Changes will not be persisted to the database."}
          </p>
        </div>
      )}
      
      {useOfflineData && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="font-bold text-blue-800">
            Using Offline Data
          </p>
          <p className="text-sm text-blue-700 mt-1">
            You are viewing cached offline data. This data may not be up-to-date with the latest changes.
          </p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {/* Products display */}
      {products.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-md shadow-sm">
          <h6 className="text-lg font-medium text-gray-500">
            No inventory items found
          </h6>
          <p className="text-gray-500 mt-2">
            Click "Add New Item" to create your first inventory item
          </p>
        </div>
      ) : (
        <>
          {/* Products table */}
          <div className="w-full overflow-x-auto rounded-lg shadow bg-white">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Name</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">SKU</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Description</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Quantity</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Reorder Level</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Price</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && !initialLoading ? (
                  renderSkeletons()
                ) : (
                  products.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{item.name}</td>
                      <td className="py-3 px-4">{item.product_code || 'N/A'}</td>
                      <td className="py-3 px-4">{item.description || 'No description'}</td>
                      <td className="py-3 px-4">{item.stock_quantity || 0}</td>
                      <td className="py-3 px-4">{item.reorder_level || 0}</td>
                      <td className="py-3 px-4">
                        ${typeof item.price === 'number'
                          ? item.price.toFixed(2)
                          : parseFloat(item.price || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleOpenDialog(item)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <nav className="inline-flex rounded-md shadow">
                <button
                  onClick={() => handlePageChange(null, Math.max(1, page - 1))}
                  disabled={page === 1 || loading}
                  className="px-3 py-1 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => handlePageChange(null, index + 1)}
                    className={`px-3 py-1 border border-gray-300 text-sm font-medium ${
                      page === index + 1
                        ? 'bg-blue-50 text-blue-600 border-blue-500 z-10'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(null, Math.min(totalPages, page + 1))}
                  disabled={page === totalPages || loading}
                  className="px-3 py-1 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
          
          {/* Item count */}
          <div className="mt-3 text-right">
            <p className="text-sm text-gray-600">
              Showing {products.length} of {totalItems} items
            </p>
          </div>
        </>
      )}
      
      {/* Snackbar for notifications */}
      {snackbarOpen && (
        <div className={`fixed bottom-4 inset-x-0 flex justify-center z-50`}>
          <div className={`
            p-4 rounded-md shadow-lg flex items-center gap-2
            ${snackbarSeverity === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : ''}
            ${snackbarSeverity === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : ''}
            ${snackbarSeverity === 'warning' ? 'bg-amber-50 border border-amber-200 text-amber-800' : ''}
            ${snackbarSeverity === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-800' : ''}
          `}>
            {snackbarSeverity === 'success' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {snackbarSeverity === 'error' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {snackbarSeverity === 'warning' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {snackbarSeverity === 'info' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{snackbarMessage}</span>
            <button 
              onClick={handleSnackbarClose}
              className="ml-3 text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Dialog for adding/editing items */}
      {openDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{isEditing ? 'Edit Product' : 'Add New Product'}</h3>
                <button onClick={handleCloseDialog} className="text-gray-500 hover:text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    id="name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    name="name"
                    type="text"
                    value={currentItem.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="product_code" className="block text-sm font-medium text-gray-700 mb-1">
                    SKU
                  </label>
                  <input
                    id="product_code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    name="product_code"
                    type="text"
                    value={currentItem.product_code}
                    onChange={handleInputChange}
                  />
                  <p className="mt-1 text-sm text-gray-500">Leave blank to auto-generate</p>
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    name="description"
                    rows={3}
                    value={currentItem.description}
                    onChange={handleInputChange}
                  ></textarea>
                </div>
                
                <div>
                  <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    id="stock_quantity"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    name="stock_quantity"
                    type="number"
                    value={currentItem.stock_quantity}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="reorder_level" className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Level
                  </label>
                  <input
                    id="reorder_level"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    name="reorder_level"
                    type="number"
                    value={currentItem.reorder_level}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    id="price"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    name="price"
                    type="number"
                    step="0.01"
                    value={currentItem.price}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="mt-2">
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      name="is_for_sale"
                      checked={currentItem.is_for_sale !== false}
                      onChange={handleInputChange}
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-900">Available for Sale</span>
                  </label>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <button 
                  onClick={handleCloseDialog}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {isEditing ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedInventoryList;