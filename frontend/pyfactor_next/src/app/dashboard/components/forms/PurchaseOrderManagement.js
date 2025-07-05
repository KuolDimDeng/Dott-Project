'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { DocumentTextIcon, QuestionMarkCircleIcon, PlusIcon, PencilIcon, TrashIcon, EyeIcon, MinusIcon } from '@heroicons/react/24/outline';
import { purchaseOrderApi, vendorApi, productApi } from '@/utils/apiClient';

// Tooltip component for field help
const FieldTooltip = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block ml-1">
      <QuestionMarkCircleIcon 
        className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      />
      {isVisible && (
        <div className="absolute z-10 w-64 p-2 text-xs text-white bg-gray-900 rounded-md shadow-lg -top-2 left-6">
          <div className="relative">
            {text}
            <div className="absolute w-2 h-2 bg-gray-900 rotate-45 -left-1 top-2"></div>
          </div>
        </div>
      )}
    </div>
  );
};

const PurchaseOrderManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantId, setTenantId] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    vendor_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    reference_number: '',
    status: 'draft',
    items: [],
    shipping_cost: 0,
    discount_percentage: 0,
    tax_rate: 0,
    notes: '',
    payment_terms: '30'
  });

  // Additional state for dropdowns
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    received: 0,
    totalAmount: 0
  });

  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await purchaseOrderApi.getAll();
      const orderList = response.data || response.results || response || [];
      setPurchaseOrders(orderList);
      
      // Calculate stats
      const total = orderList.length;
      const pending = orderList.filter(o => o.status === 'pending' || o.status === 'sent').length;
      const received = orderList.filter(o => o.status === 'received').length;
      const totalAmount = orderList.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
      
      setStats({ total, pending, received, totalAmount });
      
      logger.info('[PurchaseOrderManagement] Purchase orders loaded successfully');
    } catch (error) {
      logger.error('[PurchaseOrderManagement] Error fetching purchase orders:', error);
      setError('Failed to load purchase orders');
      setPurchaseOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  const fetchVendors = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      const response = await vendorApi.getAll();
      const vendorList = response.data || response.results || response || [];
      setVendors(vendorList);
    } catch (error) {
      logger.error('[PurchaseOrderManagement] Error fetching vendors:', error);
    }
  }, [tenantId]);

  const fetchProducts = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      const response = await productApi.getAll();
      const productList = response.data || response.results || response || [];
      setProducts(productList);
    } catch (error) {
      logger.error('[PurchaseOrderManagement] Error fetching products:', error);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchVendors();
    fetchProducts();
  }, [fetchPurchaseOrders, fetchVendors, fetchProducts]);

  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
    setSelectedPurchaseOrder(null);
    if (newValue === 0) {
      // Reset form when switching to create tab
      setFormData({
        vendor_id: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_date: '',
        reference_number: '',
        status: 'draft',
        items: [],
        shipping_cost: 0,
        discount_percentage: 0,
        tax_rate: 0,
        notes: '',
        payment_terms: '30'
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, {
        product_id: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: prev.tax_rate || 0
      }]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product_id: value,
          description: product.name || product.description || '',
          unit_price: parseFloat(product.price) || parseFloat(product.cost) || 0
        };
      } else {
        newItems[index][field] = value;
      }
    } else if (field === 'quantity' || field === 'unit_price' || field === 'tax_rate') {
      newItems[index][field] = parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }

    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
    
    const taxAmount = formData.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_price;
      return sum + (itemTotal * (item.tax_rate || 0) / 100);
    }, 0);
    
    const discountAmount = subtotal * (formData.discount_percentage / 100);
    const total = subtotal + taxAmount - discountAmount + formData.shipping_cost;
    
    return { subtotal, taxAmount, discountAmount, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { total } = calculateTotals();
      const orderData = {
        ...formData,
        total_amount: total,
        items: formData.items.map(item => ({
          ...item,
          total_price: item.quantity * item.unit_price
        }))
      };

      if (selectedPurchaseOrder && tabValue === 0) {
        // Update existing order
        await purchaseOrderApi.update(selectedPurchaseOrder.id, orderData);
        logger.info('[PurchaseOrderManagement] Purchase order updated successfully');
      } else {
        // Create new order
        await purchaseOrderApi.create(orderData);
        logger.info('[PurchaseOrderManagement] Purchase order created successfully');
      }
      
      await fetchPurchaseOrders();
      handleTabChange(2); // Switch to list view
    } catch (error) {
      logger.error('[PurchaseOrderManagement] Error saving purchase order:', error);
      setError(error.message || 'Failed to save purchase order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (order) => {
    setSelectedPurchaseOrder(order);
    setFormData({
      vendor_id: order.vendor_id || order.vendor || '',
      order_date: order.order_date || order.date || '',
      expected_date: order.expected_date || '',
      reference_number: order.reference_number || '',
      status: order.status || 'draft',
      items: order.items || [],
      shipping_cost: parseFloat(order.shipping_cost) || 0,
      discount_percentage: parseFloat(order.discount_percentage) || 0,
      tax_rate: parseFloat(order.tax_rate) || 0,
      notes: order.notes || '',
      payment_terms: order.payment_terms || '30'
    });
    setTabValue(0);
  };

  const handleView = (order) => {
    setSelectedPurchaseOrder(order);
    setTabValue(1);
  };

  const handleDeleteClick = (order) => {
    setOrderToDelete(order);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    
    setIsLoading(true);
    try {
      await purchaseOrderApi.delete(orderToDelete.id);
      logger.info('[PurchaseOrderManagement] Purchase order deleted successfully');
      await fetchPurchaseOrders();
      setShowDeleteModal(false);
      setOrderToDelete(null);
    } catch (error) {
      logger.error('[PurchaseOrderManagement] Error deleting purchase order:', error);
      setError('Failed to delete purchase order');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = purchaseOrders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const vendorName = vendors.find(v => v.id === order.vendor_id)?.name || order.vendor_name || '';
    return (
      order.order_number?.toLowerCase().includes(searchLower) ||
      order.reference_number?.toLowerCase().includes(searchLower) ||
      vendorName.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
          Purchase Order Management
        </h1>
        <p className="text-gray-600 text-sm">
          Create and manage purchase orders, track vendor deliveries, and monitor procurement spending.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Orders</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Pending</div>
          <div className="mt-1 text-3xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Received</div>
          <div className="mt-1 text-3xl font-bold text-green-600">{stats.received}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Value</div>
          <div className="mt-1 text-3xl font-bold text-blue-600">{formatCurrency(stats.totalAmount)}</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => handleTabChange(0)}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                tabValue === 0
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {selectedPurchaseOrder && tabValue === 0 ? 'Edit Order' : 'Create Order'}
            </button>
            <button
              onClick={() => handleTabChange(1)}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                tabValue === 1
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Order Details
            </button>
            <button
              onClick={() => handleTabChange(2)}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                tabValue === 2
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Order List
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Create/Edit Form */}
          {tabValue === 0 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor <span className="text-red-500">*</span>
                    <FieldTooltip text="Select the vendor you're purchasing from." />
                  </label>
                  <select
                    name="vendor_id"
                    value={formData.vendor_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Date <span className="text-red-500">*</span>
                    <FieldTooltip text="Date when this purchase order is created." />
                  </label>
                  <input
                    type="date"
                    name="order_date"
                    value={formData.order_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Delivery Date
                    <FieldTooltip text="When you expect to receive this order." />
                  </label>
                  <input
                    type="date"
                    name="expected_date"
                    value={formData.expected_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number
                    <FieldTooltip text="Your internal reference number for this order." />
                  </label>
                  <input
                    type="text"
                    name="reference_number"
                    value={formData.reference_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                    <FieldTooltip text="Current status of this purchase order." />
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="pending">Pending</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms (Days)
                    <FieldTooltip text="Number of days for payment (e.g., Net 30)." />
                  </label>
                  <input
                    type="number"
                    name="payment_terms"
                    value={formData.payment_terms}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Item
                  </button>
                </div>

                {formData.items.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No items added. Click "Add Item" to start.</p>
                ) : (
                  <div className="space-y-4">
                    {formData.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Product
                            <FieldTooltip text="Select a product or enter custom description." />
                          </label>
                          <select
                            value={item.product_id}
                            onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Custom item</option>
                            {products.map(product => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {!item.product_id && (
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Item description"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                          <input
                            type="text"
                            value={formatCurrency(item.quantity * item.unit_price)}
                            readOnly
                            className="w-full px-2 py-1 text-sm bg-gray-100 border border-gray-300 rounded-md"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <MinusIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tax Rate (%)
                          <FieldTooltip text="Tax percentage to apply to the order." />
                        </label>
                        <input
                          type="number"
                          name="tax_rate"
                          value={formData.tax_rate}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Discount (%)
                          <FieldTooltip text="Percentage discount on the subtotal." />
                        </label>
                        <input
                          type="number"
                          name="discount_percentage"
                          value={formData.discount_percentage}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Shipping Cost
                          <FieldTooltip text="Additional shipping and handling charges." />
                        </label>
                        <input
                          type="number"
                          name="shipping_cost"
                          value={formData.shipping_cost}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Order Summary</h4>
                      {(() => {
                        const { subtotal, taxAmount, discountAmount, total } = calculateTotals();
                        return (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tax:</span>
                              <span>{formatCurrency(taxAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Discount:</span>
                              <span>-{formatCurrency(discountAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Shipping:</span>
                              <span>{formatCurrency(formData.shipping_cost)}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between font-medium">
                              <span>Total:</span>
                              <span className="text-lg">{formatCurrency(total)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                  <FieldTooltip text="Additional notes or instructions for this purchase order." />
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => handleTabChange(2)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : selectedPurchaseOrder ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          )}

          {/* Order Details View */}
          {tabValue === 1 && selectedPurchaseOrder && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Order #{selectedPurchaseOrder.order_number}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(selectedPurchaseOrder.order_date || selectedPurchaseOrder.date).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(selectedPurchaseOrder.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vendor</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {vendors.find(v => v.id === selectedPurchaseOrder.vendor_id)?.name || selectedPurchaseOrder.vendor_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Reference Number</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedPurchaseOrder.reference_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Expected Delivery</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedPurchaseOrder.expected_date 
                        ? new Date(selectedPurchaseOrder.expected_date).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Payment Terms</p>
                    <p className="mt-1 text-sm text-gray-900">Net {selectedPurchaseOrder.payment_terms || '30'} days</p>
                  </div>
                </div>

                {selectedPurchaseOrder.notes && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500">Notes</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedPurchaseOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Items Table */}
              {selectedPurchaseOrder.items && selectedPurchaseOrder.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Order Items</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedPurchaseOrder.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.description || products.find(p => p.id === item.product_id)?.name || 'Item'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(item.unit_price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(item.quantity * item.unit_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan="3" className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                            Total Amount:
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(selectedPurchaseOrder.total_amount || selectedPurchaseOrder.totalAmount || 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => handleEdit(selectedPurchaseOrder)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Order List */}
          {tabValue === 2 && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => handleTabChange(0)}
                  className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Order
                </button>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No purchase orders found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {order.order_number || `PO-${order.id}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vendors.find(v => v.id === order.vendor_id)?.name || order.vendor_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.order_date || order.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(order.total_amount || order.totalAmount || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleView(order)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(order)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(order)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Purchase Order</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete order "{orderToDelete?.order_number || `PO-${orderToDelete?.id}`}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        Debug: Tenant ID: {tenantId} | Component: PurchaseOrderManagement
      </div>
    </div>
  );
};

export default PurchaseOrderManagement;