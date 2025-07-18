'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { 
  XMarkIcon, 
  PlusIcon,
  ShareIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const WhatsAppCatalogManager = ({ onClose }) => {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState([]);
  const [selectedCatalog, setSelectedCatalog] = useState(null);
  const [products, setProducts] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  const [productFormData, setProductFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    sku: '',
    stock_quantity: 0,
    item_type: 'product',
    category: '',
    is_available: true
  });

  useEffect(() => {
    fetchCatalogs();
  }, []);

  useEffect(() => {
    if (selectedCatalog) {
      fetchProducts(selectedCatalog.id);
    }
  }, [selectedCatalog]);

  const fetchCatalogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/whatsapp-business/catalogs/');
      if (response.ok) {
        const data = await response.json();
        setCatalogs(data.results || data || []);
      }
    } catch (error) {
      console.error('Error fetching catalogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (catalogId) => {
    try {
      const response = await fetch(`/api/proxy/whatsapp-business/products/?catalog_id=${catalogId}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.results || data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchAvailableProducts = async () => {
    try {
      const response = await fetch(`/api/proxy/whatsapp-business/products/available_for_sync/?catalog_id=${selectedCatalog.id}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching available products:', error);
    }
  };

  const handleCreateCatalog = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/proxy/whatsapp-business/catalogs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        await fetchCatalogs();
        setShowCreateModal(false);
        setFormData({ name: '', description: '', is_active: true });
      }
    } catch (error) {
      console.error('Error creating catalog:', error);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/proxy/whatsapp-business/products/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productFormData,
          catalog: selectedCatalog.id,
          price: parseFloat(productFormData.price) || 0
        })
      });
      
      if (response.ok) {
        await fetchProducts(selectedCatalog.id);
        setShowProductModal(false);
        setProductFormData({
          name: '',
          description: '',
          price: '',
          currency: 'USD',
          sku: '',
          stock_quantity: 0,
          item_type: 'product',
          category: '',
          is_available: true
        });
      }
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const handleSyncProducts = async (productIds) => {
    try {
      const response = await fetch('/api/proxy/whatsapp-business/products/sync_from_inventory/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog_id: selectedCatalog.id,
          product_ids: productIds,
          sync_all: productIds.length === 0,
          item_type: 'product'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Successfully synced ${result.synced_count} products`);
        await fetchProducts(selectedCatalog.id);
        setShowSyncModal(false);
      }
    } catch (error) {
      console.error('Error syncing products:', error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await fetch(`/api/proxy/whatsapp-business/products/${productId}/`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchProducts(selectedCatalog.id);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleShareCatalog = async (catalogId, phoneNumber) => {
    try {
      const response = await fetch(`/api/proxy/whatsapp-business/catalogs/${catalogId}/share_catalog/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber })
      });
      
      if (response.ok) {
        alert('Catalog shared successfully!');
      }
    } catch (error) {
      console.error('Error sharing catalog:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Catalog Management</h1>
            <p className="text-gray-600 mt-2">Create and manage your product catalogs</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Catalog List and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Catalog List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Your Catalogs</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-2">
                {catalogs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No catalogs yet</p>
                ) : (
                  catalogs.map((catalog) => (
                    <div
                      key={catalog.id}
                      onClick={() => setSelectedCatalog(catalog)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedCatalog?.id === catalog.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <h3 className="font-medium">{catalog.name}</h3>
                      <p className="text-sm text-gray-500">
                        {catalog.product_count || 0} products
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Catalog Details */}
          <div className="lg:col-span-2">
            {selectedCatalog ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedCatalog.name}</h2>
                      <p className="text-gray-600 mt-1">{selectedCatalog.description}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const phone = prompt('Enter WhatsApp number (with country code):');
                          if (phone) handleShareCatalog(selectedCatalog.id, phone);
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                      >
                        <ShareIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 mb-6">
                    <button
                      onClick={() => setShowProductModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      <PlusIcon className="w-4 h-4 inline mr-2" />
                      Add Product
                    </button>
                    <button
                      onClick={() => {
                        fetchAvailableProducts();
                        setShowSyncModal(true);
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      <ArrowPathIcon className="w-4 h-4 inline mr-2" />
                      Sync from Inventory
                    </button>
                  </div>

                  {/* Products Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((product) => (
                      <div key={product.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">{product.name}</h3>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">
                            {product.currency} {product.price}
                          </span>
                          <span className={`text-sm px-2 py-1 rounded-full ${
                            product.is_available
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.is_available ? 'Available' : 'Out of Stock'}
                          </span>
                        </div>
                        {product.linked_product_name && (
                          <p className="text-xs text-gray-500 mt-2">
                            Linked to: {product.linked_product_name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-gray-500">Select a catalog to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Catalog Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Create New Catalog</h3>
              <form onSubmit={handleCreateCatalog}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catalog Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Catalog
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Product Modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Add New Product</h3>
              <form onSubmit={handleCreateProduct}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={productFormData.name}
                    onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={productFormData.description}
                    onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={productFormData.price}
                      onChange={(e) => setProductFormData({ ...productFormData, price: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={productFormData.currency}
                      onChange={(e) => setProductFormData({ ...productFormData, currency: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USD">USD</option>
                      <option value="KES">KES</option>
                      <option value="NGN">NGN</option>
                      <option value="GHS">GHS</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={productFormData.sku}
                      onChange={(e) => setProductFormData({ ...productFormData, sku: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      value={productFormData.stock_quantity}
                      onChange={(e) => setProductFormData({ ...productFormData, stock_quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Type
                  </label>
                  <select
                    value={productFormData.item_type}
                    onChange={(e) => setProductFormData({ ...productFormData, item_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="product">Physical Product</option>
                    <option value="service">Service</option>
                    <option value="digital">Digital Product</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={productFormData.is_available}
                      onChange={(e) => setProductFormData({ ...productFormData, is_available: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Available for sale</span>
                  </label>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sync Products Modal */}
        {showSyncModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Sync Products from Inventory</h3>
              <p className="text-gray-600 mb-4">
                Select products to add to your WhatsApp catalog
              </p>
              
              {availableProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No products available to sync (all products may already be synced)
                </p>
              ) : (
                <div className="space-y-2 mb-6">
                  {availableProducts.map((product) => (
                    <label
                      key={product.id}
                      className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        value={product.id}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">
                          SKU: {product.sku} | Price: ${product.price}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
                    const productIds = Array.from(checkboxes).map(cb => cb.value);
                    handleSyncProducts(productIds);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Sync Selected
                </button>
                <button
                  onClick={() => handleSyncProducts([])}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Sync All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppCatalogManager;