'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { getWhatsAppPaymentMethod } from '@/utils/whatsappCountryDetection';

const WhatsAppCatalogManagement = () => {
  const { user } = useSession();
  const [catalogs, setCatalogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCatalog, setSelectedCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewCatalogForm, setShowNewCatalogForm] = useState(false);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProductsForSync, setSelectedProductsForSync] = useState([]);

  const [newCatalog, setNewCatalog] = useState({
    name: '',
    description: '',
    is_active: true
  });

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    item_type: 'product',
    price: '',
    price_type: 'fixed',
    currency: 'USD',
    image_url: '',
    sku: '',
    stock_quantity: 0,
    is_available: true,
    category: '',
    duration_minutes: '',
    service_location: 'onsite'
  });

  useEffect(() => {
    const initializeCatalogManagement = async () => {
      try {
        // Get payment method for user's country
        const userCountry = user?.country || 'US';
        const payment = getWhatsAppPaymentMethod(userCountry);
        setPaymentMethod(payment);
        setNewProduct(prev => ({ ...prev, currency: payment.currency }));

        // Fetch catalogs
        const catalogsResponse = await fetch('/api/proxy/whatsapp-business/catalogs/');
        if (catalogsResponse.ok) {
          const catalogsData = await catalogsResponse.json();
          setCatalogs(catalogsData.results || []);
          
          // Select first catalog by default
          if (catalogsData.results && catalogsData.results.length > 0) {
            setSelectedCatalog(catalogsData.results[0]);
          }
        }

        // Fetch products for selected catalog
        if (selectedCatalog) {
          const productsResponse = await fetch(`/api/proxy/whatsapp-business/products/?catalog_id=${selectedCatalog.id}`);
          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            setProducts(productsData.results || []);
          }
        }
      } catch (error) {
        console.error('Error initializing catalog management:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      initializeCatalogManagement();
    }
  }, [user, selectedCatalog?.id]);

  const handleCreateCatalog = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/proxy/whatsapp-business/catalogs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCatalog),
      });

      if (response.ok) {
        const catalog = await response.json();
        setCatalogs(prev => [...prev, catalog]);
        setNewCatalog({ name: '', description: '', is_active: true });
        setShowNewCatalogForm(false);
        setSelectedCatalog(catalog);
      }
    } catch (error) {
      console.error('Error creating catalog:', error);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!selectedCatalog) return;

    try {
      const productData = {
        ...newProduct,
        catalog: selectedCatalog.id,
        price: parseFloat(newProduct.price),
        stock_quantity: parseInt(newProduct.stock_quantity),
        duration_minutes: newProduct.duration_minutes ? parseInt(newProduct.duration_minutes) : null
      };

      const response = await fetch('/api/proxy/whatsapp-business/products/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        const product = await response.json();
        setProducts(prev => [...prev, product]);
        setNewProduct({
          name: '',
          description: '',
          item_type: 'product',
          price: '',
          price_type: 'fixed',
          currency: paymentMethod?.currency || 'USD',
          image_url: '',
          sku: '',
          stock_quantity: 0,
          is_available: true,
          category: '',
          duration_minutes: '',
          service_location: 'onsite'
        });
        setShowNewProductForm(false);
      }
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const handleShareCatalog = async (catalog) => {
    const phoneNumber = prompt('Enter customer phone number (with country code):');
    if (!phoneNumber) return;

    try {
      const response = await fetch(`/api/proxy/whatsapp-business/catalogs/${catalog.id}/share_catalog/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });

      if (response.ok) {
        alert('Catalog shared successfully!');
      } else {
        alert('Failed to share catalog. Please try again.');
      }
    } catch (error) {
      console.error('Error sharing catalog:', error);
      alert('Error sharing catalog. Please try again.');
    }
  };

  const toggleProductAvailability = async (product) => {
    try {
      const response = await fetch(`/api/proxy/whatsapp-business/products/${product.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_available: !product.is_available }),
      });

      if (response.ok) {
        setProducts(prev => prev.map(p => 
          p.id === product.id ? { ...p, is_available: !p.is_available } : p
        ));
      }
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const loadAvailableProducts = async () => {
    if (!selectedCatalog) return;
    
    try {
      const response = await fetch(`/api/proxy/whatsapp-business/products/available_for_sync/?catalog_id=${selectedCatalog.id}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableProducts(data.products || []);
        setShowSyncModal(true);
      }
    } catch (error) {
      console.error('Error loading available products:', error);
    }
  };

  const handleSyncProducts = async (syncAll = false) => {
    if (!selectedCatalog) return;

    try {
      const response = await fetch('/api/proxy/whatsapp-business/products/sync_from_inventory/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          catalog_id: selectedCatalog.id,
          sync_all: syncAll,
          product_ids: syncAll ? [] : selectedProductsForSync,
          item_type: 'product'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setShowSyncModal(false);
        setSelectedProductsForSync([]);
        
        // Refresh products
        const productsResponse = await fetch(`/api/proxy/whatsapp-business/products/?catalog_id=${selectedCatalog.id}`);
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData.results || []);
        }
      }
    } catch (error) {
      console.error('Error syncing products:', error);
      alert('Error syncing products. Please try again.');
    }
  };

  const getPriceDisplay = (product) => {
    if (product.price_type === 'quote') {
      return 'Quote on Request';
    }
    
    let priceText = `${product.currency} ${product.price}`;
    if (product.price_type !== 'fixed') {
      priceText += ` / ${product.price_type}`;
    }
    
    return priceText;
  };

  const getItemTypeIcon = (type) => {
    switch (type) {
      case 'service':
        return '🛠️';
      case 'digital':
        return '💻';
      default:
        return '📦';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Catalog Management</h1>
          <p className="text-gray-600">Manage your WhatsApp Business catalogs, products, and services</p>
        </div>

        {/* Catalog Selection */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Catalogs</h2>
              <button
                onClick={() => setShowNewCatalogForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                New Catalog
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {catalogs.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No catalogs</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first catalog.</p>
                <button
                  onClick={() => setShowNewCatalogForm(true)}
                  className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Catalog
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {catalogs.map((catalog) => (
                  <div
                    key={catalog.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedCatalog?.id === catalog.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedCatalog(catalog)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{catalog.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        catalog.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {catalog.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{catalog.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {products.filter(p => p.catalog === catalog.id).length} items
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareCatalog(catalog);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Share
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Products Section */}
        {selectedCatalog && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Items in {selectedCatalog.name}</h2>
                <div className="flex space-x-3">
                  <button
                    onClick={loadAvailableProducts}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Sync from Inventory
                  </button>
                  <button
                    onClick={() => setShowNewProductForm(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add New Item
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {products.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
                  <p className="mt-1 text-sm text-gray-500">Add products or services to your catalog.</p>
                  <div className="mt-3 flex justify-center space-x-3">
                    <button
                      onClick={loadAvailableProducts}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Sync from Inventory
                    </button>
                    <button
                      onClick={() => setShowNewProductForm(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Create New
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <div key={product.id} className="border rounded-lg overflow-hidden">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <span className="text-lg mr-2">{getItemTypeIcon(product.item_type)}</span>
                            <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          </div>
                          <button
                            onClick={() => toggleProductAvailability(product)}
                            className={`px-2 py-1 text-xs rounded-full ${
                              product.is_available
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {product.is_available ? 'Available' : 'Unavailable'}
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                        
                        {/* Item type badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {product.item_type === 'service' ? 'Service' : product.item_type === 'digital' ? 'Digital' : 'Product'}
                          </span>
                          {product.linked_product && (
                            <span className="text-xs text-blue-600">
                              Synced from inventory
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-gray-900">
                            {getPriceDisplay(product)}
                          </span>
                          {product.item_type === 'product' && (
                            <span className="text-sm text-gray-500">
                              Stock: {product.stock_quantity}
                            </span>
                          )}
                        </div>
                        
                        {/* Service-specific info */}
                        {product.item_type === 'service' && (
                          <div className="mt-2 text-sm text-gray-600">
                            {product.duration_minutes && (
                              <p>Duration: {product.duration_minutes} mins</p>
                            )}
                            {product.service_location && (
                              <p>Location: {product.service_location === 'onsite' ? 'On-site' : 
                                         product.service_location === 'remote' ? 'Remote' :
                                         product.service_location === 'shop' ? 'At shop' : 'Flexible'}</p>
                            )}
                          </div>
                        )}
                        
                        {product.category && (
                          <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {product.category}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Catalog Modal */}
        {showNewCatalogForm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Create New Catalog</h3>
              <form onSubmit={handleCreateCatalog}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newCatalog.name}
                    onChange={(e) => setNewCatalog(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    value={newCatalog.description}
                    onChange={(e) => setNewCatalog(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowNewCatalogForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Catalog
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New Product Modal */}
        {showNewProductForm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-screen overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Add New Item</h3>
              <form onSubmit={handleCreateProduct}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item Type Selection */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Item Type</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        className={`p-3 border rounded-lg text-center ${
                          newProduct.item_type === 'product'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => setNewProduct(prev => ({ ...prev, item_type: 'product' }))}
                      >
                        <span className="text-2xl">📦</span>
                        <p className="text-sm mt-1">Physical Product</p>
                      </button>
                      <button
                        type="button"
                        className={`p-3 border rounded-lg text-center ${
                          newProduct.item_type === 'service'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => setNewProduct(prev => ({ ...prev, item_type: 'service' }))}
                      >
                        <span className="text-2xl">🛠️</span>
                        <p className="text-sm mt-1">Service</p>
                      </button>
                      <button
                        type="button"
                        className={`p-3 border rounded-lg text-center ${
                          newProduct.item_type === 'digital'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => setNewProduct(prev => ({ ...prev, item_type: 'digital' }))}
                      >
                        <span className="text-2xl">💻</span>
                        <p className="text-sm mt-1">Digital Product</p>
                      </button>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      required
                      placeholder={newProduct.item_type === 'service' ? 'e.g., Electrical Repair Service' : 'e.g., Blue T-Shirt'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder={newProduct.item_type === 'service' ? 
                        'Describe your service, what\'s included, etc.' : 
                        'Product details, features, specifications...'}
                      value={newProduct.description}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price Type</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newProduct.price_type}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, price_type: e.target.value }))}
                    >
                      <option value="fixed">Fixed Price</option>
                      {newProduct.item_type === 'service' && (
                        <>
                          <option value="hourly">Per Hour</option>
                          <option value="daily">Per Day</option>
                          <option value="project">Per Project</option>
                          <option value="quote">Quote on Request</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {newProduct.price_type === 'quote' ? 'Base Price (Optional)' : 'Price'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required={newProduct.price_type !== 'quote'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newProduct.currency}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, currency: e.target.value }))}
                    >
                      <option value="USD">USD</option>
                      <option value="KES">KES</option>
                      <option value="NGN">NGN</option>
                      <option value="GHS">GHS</option>
                      <option value="UGX">UGX</option>
                      <option value="TZS">TZS</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  
                  {newProduct.item_type === 'product' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newProduct.stock_quantity}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, stock_quantity: e.target.value }))}
                      />
                    </div>
                  )}
                  
                  {newProduct.item_type === 'service' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Optional"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newProduct.duration_minutes}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, duration_minutes: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Service Location</label>
                        <select
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newProduct.service_location}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, service_location: e.target.value }))}
                        >
                          <option value="onsite">On-site at Customer Location</option>
                          <option value="remote">Remote/Online</option>
                          <option value="shop">At Business Location</option>
                          <option value="flexible">Flexible</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <input
                      type="text"
                      placeholder={newProduct.item_type === 'service' ? 'e.g., Electrical, Plumbing' : 'e.g., Clothing, Electronics'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                    <input
                      type="url"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newProduct.image_url}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, image_url: e.target.value }))}
                    />
                  </div>
                  
                  {newProduct.item_type !== 'service' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">SKU (Optional)</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newProduct.sku}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowNewProductForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add {newProduct.item_type === 'service' ? 'Service' : 'Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sync Modal */}
        {showSyncModal && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Sync Products from Inventory</h3>
              
              <div className="mb-4">
                <div className="flex space-x-3 mb-4">
                  <button
                    onClick={() => handleSyncProducts(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Sync All Products
                  </button>
                  <button
                    onClick={() => handleSyncProducts(false)}
                    disabled={selectedProductsForSync.length === 0}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedProductsForSync.length > 0
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Sync Selected ({selectedProductsForSync.length})
                  </button>
                </div>
                
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  {availableProducts.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No products available to sync</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {availableProducts.map((product) => (
                        <div key={product.id} className="p-4 hover:bg-gray-50">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="mr-3"
                              checked={selectedProductsForSync.includes(product.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProductsForSync(prev => [...prev, product.id]);
                                } else {
                                  setSelectedProductsForSync(prev => prev.filter(id => id !== product.id));
                                }
                              }}
                            />
                            <div className="flex-1">
                              <h4 className="font-medium">{product.name}</h4>
                              <p className="text-sm text-gray-500">
                                SKU: {product.sku} | Price: ${product.price} | Stock: {product.quantity}
                              </p>
                              {product.description && (
                                <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                              )}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSyncModal(false);
                    setSelectedProductsForSync([]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppCatalogManagement;