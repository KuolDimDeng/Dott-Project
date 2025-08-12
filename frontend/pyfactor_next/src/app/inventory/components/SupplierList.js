import React, { useState, useEffect } from 'react';
import { supplierService } from '@/services/supplierService';
import { logger } from '@/utils/logger';
import { EditIcon, DeleteIcon, AddIcon, RefreshIcon, CloseIcon } from '@/app/components/icons';

// Component for displaying and managing inventory suppliers
const SupplierList = () => {
  const [state, setState] = useState({
    suppliers: [],
    isLoading: true,
    error: null,
    snackbar: {
      open: false,
      message: '',
      severity: 'info',
    },
    dialogOpen: false,
    currentSupplier: {
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
    },
    isMockData: false,
  });
  const [useMockData, setUseMockData] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);

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

  // Fetch suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const data = await supplierService.getSuppliers();
      
      // Ensure data is an array, otherwise use an empty array
      const supplierArray = Array.isArray(data) ? data : [];
      
      if (data && supplierArray.length > 0) {
        setState(prev => ({ 
          ...prev, 
          suppliers: supplierArray, 
          isLoading: false,
          isMockData: false,
          error: null 
        }));
      } else {
        // If no data returned or empty array, show mock data
        setUseMockData(true);
        const mockData = [
          { id: 1, name: 'Supplier A', contact_person: 'John Doe', email: 'john@suppliera.com', phone: '555-123-4567', address: '123 Main St, City, Country' },
          { id: 2, name: 'Supplier B', contact_person: 'Jane Smith', email: 'jane@supplierb.com', phone: '555-987-6543', address: '456 Oak Ave, Town, Country' },
          { id: 3, name: 'Supplier C', contact_person: 'Bob Johnson', email: 'bob@supplierc.com', phone: '555-456-7890', address: '789 Pine Rd, Village, Country' },
        ];
        setState(prev => ({ 
          ...prev, 
          suppliers: mockData, 
          isLoading: false,
          isMockData: true
        }));
      }
    } catch (error) {
      logger.error('Error fetching suppliers:', error);
      setApiUnavailable(true);
      
      // Show mock data in case of error
      const mockData = [
        { id: 1, name: 'Supplier A', contact_person: 'John Doe', email: 'john@suppliera.com', phone: '555-123-4567', address: '123 Main St, City, Country' },
        { id: 2, name: 'Supplier B', contact_person: 'Jane Smith', email: 'jane@supplierb.com', phone: '555-987-6543', address: '456 Oak Ave, Town, Country' },
        { id: 3, name: 'Supplier C', contact_person: 'Bob Johnson', email: 'bob@supplierc.com', phone: '555-456-7890', address: '789 Pine Rd, Village, Country' },
      ];
      
      setState(prev => ({ 
        ...prev, 
        suppliers: mockData, 
        isLoading: false,
        error: error.message,
        isMockData: true
      }));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        if (!state.isMockData) {
          await supplierService.deleteSupplier(id);
        }
        
        setState(prev => ({
          ...prev,
          suppliers: prev.suppliers.filter(supplier => supplier.id !== id)
        }));
        
        showSnackbar('Supplier deleted successfully', 'success');
      } catch (error) {
        logger.error('Error deleting supplier:', error);
        showSnackbar('Error deleting supplier', 'error');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const isEditing = state.currentSupplier && state.currentSupplier.id;
      
      let updatedSupplier;
      if (!state.isMockData) {
        if (isEditing) {
          updatedSupplier = await supplierService.updateSupplier(
            state.currentSupplier.id,
            state.currentSupplier
          );
        } else {
          updatedSupplier = await supplierService.createSupplier(state.currentSupplier);
        }
      } else {
        // Mock response for demo/testing
        updatedSupplier = {
          ...state.currentSupplier,
          id: isEditing ? state.currentSupplier.id : Math.floor(Math.random() * 1000)
        };
      }
      
      setState(prev => {
        const updatedSuppliers = isEditing
          ? prev.suppliers.map(item => (item.id === updatedSupplier.id ? updatedSupplier : item))
          : [...prev.suppliers, updatedSupplier];
        
        return {
          ...prev,
          suppliers: updatedSuppliers,
          dialogOpen: false,
          currentSupplier: {
            name: '',
            contact_person: '',
            email: '',
            phone: '',
            address: '',
          }
        };
      });
      
      showSnackbar(
        isEditing ? 'Supplier updated successfully' : 'Supplier created successfully',
        'success'
      );
    } catch (error) {
      logger.error('Error saving supplier:', error);
      showSnackbar('Error saving supplier', 'error');
    }
  };

  const handleOpenDialog = (supplier = null) => {
    if (supplier) {
      setState(prev => ({ 
        ...prev, 
        currentSupplier: { ...supplier },
        dialogOpen: true 
      }));
    } else {
      setState(prev => ({ 
        ...prev, 
        currentSupplier: {
          name: '',
          contact_person: '',
          email: '',
          phone: '',
          address: '',
        },
        dialogOpen: true 
      }));
    }
  };

  const handleCloseDialog = () => {
    setState(prev => ({ 
      ...prev, 
      dialogOpen: false, 
      currentSupplier: {
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
      }
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setState(prev => ({ 
      ...prev, 
      currentSupplier: { ...prev.currentSupplier, [name]: value } 
    }));
  };

  // If the API is unavailable but we're showing mock data anyway,
  // display a banner to inform the user
  const ApiUnavailableBanner = () => (
    <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-200">
      <p className="font-bold">Demo Mode</p>
      <p>The supplier management API is currently unavailable. Showing sample data for demonstration purposes.</p>
    </div>
  );

  return (
    <div className="p-1 sm:p-2 md:p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Supplier Management</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => handleOpenDialog()}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <AddIcon className="w-4 h-4 mr-1" />
            Add New Supplier
          </button>
          <button
            onClick={fetchSuppliers}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshIcon className="w-4 h-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>
      
      {state.isMockData && apiUnavailable && <ApiUnavailableBanner />}
      
      {state.isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : state.error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 dark:bg-red-900 dark:text-red-200 dark:border-red-600" role="alert">
          <p className="font-bold">Error</p>
          <p>{state.error}</p>
          <button 
            onClick={fetchSuppliers}
            className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:text-red-200 dark:bg-red-800 dark:hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {state.suppliers.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300">
                No suppliers found
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Click "Add New Supplier" to create your first supplier
              </p>
            </div>
          ) : (
            <div className="shadow overflow-hidden border-b border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact Person</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Address</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {state.suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{supplier.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{supplier.contact_person || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{supplier.email || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{supplier.phone || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{supplier.address || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleOpenDialog(supplier)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <EditIcon className="w-5 h-5" />
                            <span className="sr-only">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(supplier.id)}
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
        </div>
      )}
      
      {/* Snackbar/Toast */}
      {state.snackbar.open && (
        <div 
          className={`fixed bottom-4 right-4 mb-4 p-4 rounded-md shadow-lg flex items-center justify-between ${
            state.snackbar.severity === 'success'
              ? 'bg-green-500 text-white'
              : state.snackbar.severity === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 text-white'
          }`}
          role="alert"
          aria-live="assertive"
        >
          <span>{state.snackbar.message}</span>
          <button
            onClick={handleSnackbarClose}
            className="ml-4 text-white focus:outline-none"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Modal Form Dialog */}
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
                  {state.currentSupplier && state.currentSupplier.id ? 'Edit Supplier' : 'Add New Supplier'}
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
                      value={state.currentSupplier ? state.currentSupplier.name || '' : ''}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      name="contact_person"
                      id="contact_person"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={state.currentSupplier ? state.currentSupplier.contact_person || '' : ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={state.currentSupplier ? state.currentSupplier.email || '' : ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Phone
                    </label>
                    <input
                      type="text"
                      name="phone"
                      id="phone"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={state.currentSupplier ? state.currentSupplier.phone || '' : ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Address
                    </label>
                    <textarea
                      name="address"
                      id="address"
                      rows="3"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={state.currentSupplier ? state.currentSupplier.address || '' : ''}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
                  onClick={handleSubmit}
                >
                  {state.currentSupplier && state.currentSupplier.id ? 'Update' : 'Add'}
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

export default SupplierList; 