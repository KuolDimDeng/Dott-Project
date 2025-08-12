import React, { useState, useEffect } from 'react';
import { inventoryService } from '@/services/inventoryService';
import { logger } from '@/utils/logger';
import { EditIcon, DeleteIcon, AddIcon, RefreshIcon, CloseIcon } from '@/app/components/icons';

// Component for displaying and managing inventory items
const InventoryItemList = () => {
  const [state, setState] = useState({
    items: [],
    isLoading: true,
    error: null,
    snackbar: {
      open: false,
      message: '',
      severity: 'info',
    },
    dialogOpen: false,
    currentItem: {
      name: '',
      sku: '',
      description: '',
      quantity: 0,
      reorder_level: 0,
      unit_price: 0,
    },
    isMockData: false,
  });
  const [useMockData, setUseMockData] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [skipInitialApiCall, setSkipInitialApiCall] = useState(false);

  const showSnackbar = (message, severity = 'info') => {
    setState(prev => ({
      ...prev,
      snackbar: {
        open: true,
        message,
        severity
      }
    }));
  };

  const handleSnackbarClose = () => {
    setState(prev => ({
      ...prev,
      snackbar: {
        ...prev.snackbar,
        open: false
      }
    }));
  };

  const fetchItems = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const products = await inventoryService.getProducts({}, {
        timeout: 15000,
        notify: true,
        customMessage: 'Unable to load inventory products. Using offline data.'
      });
      
      // Check if we got an array of products directly or if it's in a results object
      const items = Array.isArray(products) ? products : (products.results || []);
      
      // Determine if we're using mock data
      const isMockData = items.length > 0 && items[0].id && items[0].id.startsWith('mock-');
      
      if (items.length === 0) {
        logger.warn('No inventory items found');
      }
      
      setState(prev => ({
        ...prev,
        items,
        isLoading: false,
        isMockData,
        error: null
      }));
    } catch (error) {
      logger.error('Error fetching inventory items:', error);
      
      let errorMessage = 'Failed to load inventory items';
      let severity = 'error';
      
      if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Using demo data instead.';
        severity = 'warning';
      } else if (error.message?.includes('tenant schema')) {
        errorMessage = 'Products list is unavailable for your account. Using demo data instead.';
        severity = 'warning';
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        isMockData: true,
        snackbar: {
          open: true,
          message: errorMessage,
          severity
        }
      }));
    }
  };

  // Effect to fetch items on component mount
  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenDialog = (item = null) => {
    if (item) {
      setState(prev => ({ 
        ...prev, 
        currentItem: { ...item },
        dialogOpen: true 
      }));
    } else {
      setState(prev => ({ 
        ...prev, 
        currentItem: {
          name: '',
          sku: '',
          description: '',
          quantity: 0,
          reorder_level: 0,
          unit_price: 0,
        },
        dialogOpen: true 
      }));
    }
  };

  const handleCloseDialog = () => {
    setState(prev => ({ 
      ...prev, 
      dialogOpen: false, 
      currentItem: {
        name: '',
        sku: '',
        description: '',
        quantity: 0,
        reorder_level: 0,
        unit_price: 0,
      }
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setState(prev => ({ 
      ...prev, 
      currentItem: { ...prev.currentItem, [name]: value } 
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!state.currentItem) {
        showSnackbar('No item data available', 'error');
        return;
      }
      
      // Validate required fields
      if (!state.currentItem.name) {
        showSnackbar('Name is required', 'error');
        return;
      }

      // Convert the item to a product format
      const productData = {
        name: state.currentItem.name || '',
        description: state.currentItem.description || '',
        price: parseFloat(state.currentItem.unit_price || state.currentItem.price || 0),
        product_code: state.currentItem.sku || state.currentItem.product_code || '',
        stock_quantity: parseInt(state.currentItem.quantity || state.currentItem.stock_quantity || 0, 10),
        reorder_level: parseInt(state.currentItem.reorder_level || 0, 10),
        is_for_sale: true
      };
      
      logger.info('Submitting product data:', productData);
      setState(prev => ({ ...prev, isLoading: true }));
      
      if (state.currentItem.id) {
        try {
          await inventoryService.updateProduct(state.currentItem.id, productData);
          logger.info('Product updated successfully');
          showSnackbar('Product updated successfully', 'success');
        } catch (error) {
          logger.error('Product update failed:', error);
          showSnackbar('Failed to update product. Please try again.', 'error');
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      } else {
        try {
          await inventoryService.createProduct(productData);
          logger.info('Product created successfully');
          showSnackbar('Product created successfully', 'success');
        } catch (error) {
          logger.error('Product creation failed:', error);
          showSnackbar('Failed to create product. Please try again.', 'error');
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }
      
      // Refresh the list and close the dialog
      await fetchItems();
      handleCloseDialog();
    } catch (error) {
      logger.error('Error saving item:', error);
      showSnackbar('Failed to save item. Please try again later.', 'error');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        try {
          await inventoryService.deleteProduct(id);
          logger.info('Product deleted successfully');
          showSnackbar('Product deleted successfully', 'success');
        } catch (error) {
          logger.error('Product deletion failed:', error);
          showSnackbar('Failed to delete product. Please try again.', 'error');
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        // Refresh the list after deletion
        await fetchItems();
      } catch (error) {
        logger.error('Error deleting product:', error);
        showSnackbar('Failed to delete product. Please try again later.', 'error');
      } finally {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Inventory Items</h2>
        <div className="flex space-x-2">
          <button
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => {
              setApiUnavailable(false);
              fetchItems();
            }}
            disabled={state.isLoading}
          >
            <RefreshIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            className={`inline-flex items-center px-3 py-2 border rounded-md shadow-sm text-sm font-medium ${
              state.isMockData 
                ? 'bg-purple-600 text-white hover:bg-purple-700 border-purple-600' 
                : 'border-gray-300 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            onClick={() => {
              setUseMockData(!state.isMockData);
              fetchItems();
            }}
            disabled={state.isLoading}
          >
            {state.isMockData ? "Using Demo Data" : "Use Demo Data"}
          </button>
          <button
            className="inline-flex items-center px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-700 dark:text-blue-200 bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={async () => {
              try {
                setState(prev => ({ ...prev, isLoading: true }));
                showSnackbar('Refreshing session...', 'info');
                
                // Import the session refresh utility
                const { refreshUserSession } = await import('@/utils/refreshUserSession');
                await refreshUserSession();
                
                showSnackbar('Session refreshed successfully', 'success');
                // Fetch items after session refresh
                await fetchItems();
              } catch (error) {
                logger.error('Error refreshing session:', error);
                showSnackbar('Failed to refresh session', 'error');
              } finally {
                setState(prev => ({ ...prev, isLoading: false }));
              }
            }}
            disabled={state.isLoading}
          >
            Refresh Session
          </button>
          <button
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => handleOpenDialog()}
            disabled={state.isLoading}
          >
            <AddIcon className="w-4 h-4 mr-2" />
            Add New Item
          </button>
        </div>
      </div>
      
      {state.isLoading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {state.isMockData && (
        <div className="bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-400 dark:border-blue-600 p-4 mb-4 rounded">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-blue-400">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700 dark:text-blue-200">
                Showing demo data. Live inventory data is not available.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {state.error && (
        <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-400 dark:border-red-600 p-4 mb-4 rounded">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-red-400">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-200">
                {state.error}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {state.items.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300">
            No inventory items found
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Click "Add New Item" to create your first inventory item
          </p>
        </div>
      ) : (
        <div className="shadow overflow-hidden border-b border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SKU</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reorder Level</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unit Price</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {state.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.product_code || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.description || 'No description'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.stock_quantity || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.reorder_level || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    ${typeof item.price === 'number' 
                      ? item.price.toFixed(2) 
                      : parseFloat(item.price || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleOpenDialog(item)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <EditIcon className="w-5 h-5" />
                        <span className="sr-only">Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <DeleteIcon className="w-5 h-5" />
                        <span className="sr-only">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Snackbar/Toast */}
      {state.snackbar.open && (
        <div 
          className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center p-4 mb-4 rounded-lg shadow-lg ${
            state.snackbar.severity === 'success' ? 'bg-green-500 text-white' :
            state.snackbar.severity === 'error' ? 'bg-red-500 text-white' :
            state.snackbar.severity === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
          }`}
          role="alert"
        >
          <div className="ms-3 text-sm font-medium">{state.snackbar.message}</div>
          <button
            type="button"
            className="ms-auto -mx-1.5 -my-1.5 text-white hover:text-gray-200 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 inline-flex items-center justify-center h-8 w-8"
            onClick={handleSnackbarClose}
            aria-label="Close"
          >
            <span className="sr-only">Close</span>
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dialog */}
      {state.dialogOpen && (
        <div className="absolute inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div 
              className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={handleCloseDialog}
            ></div>
            
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white mb-4">
                  {state.currentItem && state.currentItem.id ? 'Edit Item' : 'Add New Item'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={state.currentItem ? state.currentItem.name || '' : ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="sku" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      SKU
                    </label>
                    <input
                      type="text"
                      name="sku"
                      id="sku"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={state.currentItem ? state.currentItem.sku || '' : ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <textarea
                      rows="3"
                      name="description"
                      id="description"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={state.currentItem ? state.currentItem.description || '' : ''}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>
                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      id="quantity"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={state.currentItem ? state.currentItem.quantity || 0 : 0}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="reorder_level" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      name="reorder_level"
                      id="reorder_level"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={state.currentItem ? state.currentItem.reorder_level || 0 : 0}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="unit_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      name="unit_price"
                      id="unit_price"
                      step="0.01"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={state.currentItem ? state.currentItem.unit_price || 0 : 0}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
                  onClick={handleSubmit}
                >
                  {state.currentItem && state.currentItem.id ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 sm:mt-0 sm:w-auto"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryItemList;