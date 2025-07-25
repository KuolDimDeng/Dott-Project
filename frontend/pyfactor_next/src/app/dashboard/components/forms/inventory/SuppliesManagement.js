import React, { useState, useEffect } from 'react';
import { inventoryService } from '@/services/inventoryService';
import { logger } from '@/utils/logger';
import { EditIcon, DeleteIcon, AddIcon, RefreshIcon, CloseIcon } from '@/app/components/icons';
import { WrenchScrewdriverIcon, CalculatorIcon, BanknotesIcon } from '@heroicons/react/24/outline';

const SuppliesManagement = () => {
  const [state, setState] = useState({
    supplies: [],
    isLoading: true,
    error: null,
    snackbar: {
      open: false,
      message: '',
      severity: 'info',
    },
    dialogOpen: false,
    deleteDialogOpen: false,
    itemToDelete: null,
    currentSupply: {
      name: '',
      sku: '',
      description: '',
      quantity: 0,
      reorder_level: 0,
      unit_price: 0,
      inventory_type: 'supply',
      markup_percentage: 0,
      is_billable: true,
    },
  });

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

  const fetchSupplies = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Fetch products filtered by inventory_type='supply'
      const response = await inventoryService.getProducts({
        inventory_type: 'supply'
      }, {
        timeout: 15000,
        notify: false
      });
      
      const supplies = Array.isArray(response) ? response : (response.results || []);
      
      setState(prev => ({
        ...prev,
        supplies,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      logger.error('Error fetching supplies:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load supplies and materials',
        supplies: []
      }));
      showSnackbar('Failed to load supplies and materials', 'error');
    }
  };

  useEffect(() => {
    fetchSupplies();
  }, []);

  const handleAddSupply = () => {
    setState(prev => ({
      ...prev,
      dialogOpen: true,
      currentSupply: {
        name: '',
        sku: '',
        description: '',
        quantity: 0,
        reorder_level: 0,
        unit_price: 0,
        inventory_type: 'supply',
        markup_percentage: 0,
        is_billable: true,
      }
    }));
  };

  const handleEditSupply = (supply) => {
    setState(prev => ({
      ...prev,
      dialogOpen: true,
      currentSupply: { ...supply }
    }));
  };

  const handleDeleteConfirm = (supply) => {
    setState(prev => ({
      ...prev,
      deleteDialogOpen: true,
      itemToDelete: supply
    }));
  };

  const handleDelete = async () => {
    if (!state.itemToDelete) return;

    try {
      await inventoryService.deleteProduct(state.itemToDelete.id);
      showSnackbar('Supply deleted successfully', 'success');
      setState(prev => ({
        ...prev,
        deleteDialogOpen: false,
        itemToDelete: null
      }));
      fetchSupplies();
    } catch (error) {
      logger.error('Error deleting supply:', error);
      showSnackbar('Failed to delete supply', 'error');
    }
  };

  const handleSave = async () => {
    const { currentSupply } = state;
    
    try {
      if (currentSupply.id) {
        await inventoryService.updateProduct(currentSupply.id, currentSupply);
        showSnackbar('Supply updated successfully', 'success');
      } else {
        await inventoryService.createProduct(currentSupply);
        showSnackbar('Supply created successfully', 'success');
      }
      
      setState(prev => ({ ...prev, dialogOpen: false }));
      fetchSupplies();
    } catch (error) {
      logger.error('Error saving supply:', error);
      showSnackbar('Failed to save supply', 'error');
    }
  };

  const handleFieldChange = (field, value) => {
    setState(prev => ({
      ...prev,
      currentSupply: {
        ...prev.currentSupply,
        [field]: value
      }
    }));
  };

  const calculateSellingPrice = (unitPrice, markupPercentage) => {
    return unitPrice * (1 + markupPercentage / 100);
  };

  const { supplies, isLoading, error, dialogOpen, deleteDialogOpen, currentSupply } = state;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <WrenchScrewdriverIcon className="h-8 w-8 text-blue-600 mr-3" />
              Supplies & Materials
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage repair supplies, materials, and parts used in service jobs
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchSupplies}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <RefreshIcon className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleAddSupply}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <AddIcon className="h-5 w-5" />
              Add Supply
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {supplies.length === 0 ? (
          <div className="text-center py-12">
            <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No supplies found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first supply item.</p>
            <div className="mt-6">
              <button
                onClick={handleAddSupply}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <AddIcon className="h-5 w-5 mr-2" />
                Add Supply
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supply Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pricing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Billing
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {supplies.map((supply) => (
                  <tr key={supply.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {supply.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          SKU: {supply.sku || 'N/A'}
                        </div>
                        {supply.description && (
                          <div className="text-sm text-gray-400 mt-1">
                            {supply.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {supply.quantity} units
                        </div>
                        {supply.quantity <= supply.reorder_level && (
                          <div className="text-red-600 text-xs mt-1">
                            Low stock (reorder at {supply.reorder_level})
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          Cost: ${parseFloat(supply.unit_price || 0).toFixed(2)}
                        </div>
                        {supply.is_billable && supply.markup_percentage > 0 && (
                          <div className="text-green-600 text-xs mt-1">
                            Sell: ${calculateSellingPrice(supply.unit_price, supply.markup_percentage).toFixed(2)}
                            <span className="text-gray-500 ml-1">
                              ({supply.markup_percentage}% markup)
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        supply.is_billable 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {supply.is_billable ? 'Billable' : 'Non-billable'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditSupply(supply)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Edit supply"
                      >
                        <EditIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteConfirm(supply)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete supply"
                      >
                        <DeleteIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {currentSupply.id ? 'Edit Supply' : 'Add New Supply'}
                </h3>
                <button
                  onClick={() => setState(prev => ({ ...prev, dialogOpen: false }))}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Supply Name *
                  </label>
                  <input
                    type="text"
                    value={currentSupply.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={currentSupply.sku}
                      onChange={(e) => handleFieldChange('sku', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Auto-generated if empty"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Current Stock
                    </label>
                    <input
                      type="number"
                      value={currentSupply.quantity}
                      onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 0)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={currentSupply.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Unit Cost ($)
                    </label>
                    <input
                      type="number"
                      value={currentSupply.unit_price}
                      onChange={(e) => handleFieldChange('unit_price', parseFloat(e.target.value) || 0)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      value={currentSupply.reorder_level}
                      onChange={(e) => handleFieldChange('reorder_level', parseInt(e.target.value) || 0)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      min="0"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Billing Settings</h4>
                  
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      id="is_billable"
                      checked={currentSupply.is_billable}
                      onChange={(e) => handleFieldChange('is_billable', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_billable" className="ml-2 block text-sm text-gray-700">
                      This supply can be billed to customers
                    </label>
                  </div>

                  {currentSupply.is_billable && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Default Markup Percentage (%)
                      </label>
                      <div className="mt-1 flex items-center gap-3">
                        <input
                          type="number"
                          value={currentSupply.markup_percentage}
                          onChange={(e) => handleFieldChange('markup_percentage', parseFloat(e.target.value) || 0)}
                          className="block w-32 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          min="0"
                          step="1"
                        />
                        <span className="text-sm text-gray-500">
                          Selling price: ${calculateSellingPrice(currentSupply.unit_price, currentSupply.markup_percentage).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setState(prev => ({ ...prev, dialogOpen: false }))}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!currentSupply.name}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentSupply.id ? 'Update Supply' : 'Add Supply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Delete Supply
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete "{state.itemToDelete?.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setState(prev => ({ ...prev, deleteDialogOpen: false, itemToDelete: null }))}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
      {state.snackbar.open && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`rounded-md p-4 ${
            state.snackbar.severity === 'error' ? 'bg-red-50' : 
            state.snackbar.severity === 'success' ? 'bg-green-50' : 
            'bg-blue-50'
          }`}>
            <div className="flex">
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  state.snackbar.severity === 'error' ? 'text-red-800' : 
                  state.snackbar.severity === 'success' ? 'text-green-800' : 
                  'text-blue-800'
                }`}>
                  {state.snackbar.message}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={handleSnackbarClose}
                  className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    state.snackbar.severity === 'error' ? 'text-red-500 hover:bg-red-100 focus:ring-red-600' : 
                    state.snackbar.severity === 'success' ? 'text-green-500 hover:bg-green-100 focus:ring-green-600' : 
                    'text-blue-500 hover:bg-blue-100 focus:ring-blue-600'
                  }`}
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliesManagement;