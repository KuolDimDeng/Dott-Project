import React, { useState, useEffect } from 'react';
import { inventoryService } from '@/services/inventoryService';
import { logger } from '@/utils/logger';
import { PlusIcon, TrashIcon, CubeIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

const BillOfMaterialsManagement = ({ productId = null }) => {
  const [state, setState] = useState({
    products: [],
    supplies: [],
    billOfMaterials: [],
    isLoading: true,
    error: null,
    selectedProduct: productId,
    showAddForm: false,
    newMaterial: {
      material: '',
      quantity_required: 1,
      notes: '',
      is_optional: false
    }
  });

  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    fetchData();
  }, [state.selectedProduct]);

  const fetchData = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Fetch all products that can have materials
      const productsResponse = await inventoryService.getProducts({ 
        inventory_type: 'product' 
      });
      const products = Array.isArray(productsResponse) ? productsResponse : (productsResponse.results || []);
      
      // Fetch all supplies/materials
      const suppliesResponse = await inventoryService.getProducts({ 
        inventory_type: 'supply' 
      });
      const supplies = Array.isArray(suppliesResponse) ? suppliesResponse : (suppliesResponse.results || []);
      
      // Fetch bill of materials for selected product
      let bomData = [];
      if (state.selectedProduct) {
        try {
          const bomResponse = await inventoryService.getBillOfMaterials(state.selectedProduct);
          bomData = Array.isArray(bomResponse) ? bomResponse : (bomResponse.results || []);
        } catch (error) {
          logger.warn('No bill of materials found for product');
        }
      }
      
      setState(prev => ({
        ...prev,
        products,
        supplies,
        billOfMaterials: bomData,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      logger.error('Error fetching data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load data'
      }));
    }
  };

  const handleProductChange = (productId) => {
    setState(prev => ({
      ...prev,
      selectedProduct: productId,
      showAddForm: false,
      newMaterial: {
        material: '',
        quantity_required: 1,
        notes: '',
        is_optional: false
      }
    }));
  };

  const handleAddMaterial = async () => {
    if (!state.selectedProduct || !state.newMaterial.material) {
      showNotification('Please select a product and material', 'error');
      return;
    }

    try {
      const data = {
        product: state.selectedProduct,
        material: state.newMaterial.material,
        quantity_required: parseFloat(state.newMaterial.quantity_required) || 1,
        notes: state.newMaterial.notes,
        is_optional: state.newMaterial.is_optional
      };
      
      await inventoryService.createBillOfMaterials(data);
      showNotification('Material added successfully', 'success');
      
      setState(prev => ({
        ...prev,
        showAddForm: false,
        newMaterial: {
          material: '',
          quantity_required: 1,
          notes: '',
          is_optional: false
        }
      }));
      
      fetchData();
    } catch (error) {
      logger.error('Error adding material:', error);
      showNotification('Failed to add material', 'error');
    }
  };

  const handleDeleteMaterial = async (bomId) => {
    if (!confirm('Are you sure you want to remove this material from the bill of materials?')) {
      return;
    }

    try {
      await inventoryService.deleteBillOfMaterials(bomId);
      showNotification('Material removed successfully', 'success');
      fetchData();
    } catch (error) {
      logger.error('Error deleting material:', error);
      showNotification('Failed to remove material', 'error');
    }
  };

  const handleFieldChange = (field, value) => {
    setState(prev => ({
      ...prev,
      newMaterial: {
        ...prev.newMaterial,
        [field]: value
      }
    }));
  };

  const { products, supplies, billOfMaterials, isLoading, error, selectedProduct, showAddForm, newMaterial } = state;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <CubeIcon className="h-8 w-8 text-blue-600 mr-3" />
              Bill of Materials
            </h2>
            <p className="text-gray-600 mt-1">
              Define materials required for products and services
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Product Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Product
          </label>
          <select
            value={selectedProduct || ''}
            onChange={(e) => handleProductChange(e.target.value)}
            className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select a product --</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} {product.sku && `(${product.sku})`}
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <>
            {/* Add Material Button */}
            {!showAddForm && (
              <div className="mb-4">
                <button
                  onClick={() => setState(prev => ({ ...prev, showAddForm: true }))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add Material
                </button>
              </div>
            )}

            {/* Add Material Form */}
            {showAddForm && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add Material</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Material/Supply *
                    </label>
                    <select
                      value={newMaterial.material}
                      onChange={(e) => handleFieldChange('material', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    >
                      <option value="">-- Select material --</option>
                      {supplies.map((supply) => (
                        <option key={supply.id} value={supply.id}>
                          {supply.name} ({supply.material_type === 'reusable' ? 'Tool' : 'Consumable'})
                          {supply.sku && ` - ${supply.sku}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Quantity Required *
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        value={newMaterial.quantity_required}
                        onChange={(e) => handleFieldChange('quantity_required', e.target.value)}
                        className="block w-32 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        min="0.01"
                        step="0.01"
                        required
                      />
                      <span className="text-sm text-gray-500">
                        {supplies.find(s => s.id === newMaterial.material)?.unit || 'units'} per product
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      value={newMaterial.notes}
                      onChange={(e) => handleFieldChange('notes', e.target.value)}
                      rows={2}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Special instructions for using this material..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newMaterial.is_optional}
                        onChange={(e) => handleFieldChange('is_optional', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        This material is optional
                      </span>
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={() => setState(prev => ({ ...prev, showAddForm: false }))}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMaterial}
                    disabled={!newMaterial.material}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Material
                  </button>
                </div>
              </div>
            )}

            {/* Materials List */}
            {billOfMaterials.length === 0 ? (
              <div className="text-center py-12">
                <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No materials defined</h3>
                <p className="mt-1 text-sm text-gray-500">Add materials that are required for this product.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Material
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity Required
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Optional
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billOfMaterials.map((bom) => (
                      <tr key={bom.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {bom.material_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              SKU: {bom.material_sku || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            bom.material_type === 'reusable' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {bom.material_type === 'reusable' ? 'Tool' : 'Consumable'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {bom.quantity_required} {bom.material_unit || 'units'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {bom.notes || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            bom.is_optional 
                              ? 'bg-gray-100 text-gray-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {bom.is_optional ? 'Optional' : 'Required'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteMaterial(bom.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Remove material"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`rounded-md p-4 ${
            notification.type === 'error' ? 'bg-red-50' : 
            notification.type === 'success' ? 'bg-green-50' : 
            'bg-blue-50'
          }`}>
            <p className={`text-sm font-medium ${
              notification.type === 'error' ? 'text-red-800' : 
              notification.type === 'success' ? 'text-green-800' : 
              'text-blue-800'
            }`}>
              {notification.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillOfMaterialsManagement;