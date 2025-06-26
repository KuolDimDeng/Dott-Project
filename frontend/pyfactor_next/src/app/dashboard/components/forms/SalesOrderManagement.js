'use client';

import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { orderApi } from '@/utils/apiClient';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)} // For mobile
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SalesOrderManagement = () => {
  // State management
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  
  // Dropdowns data
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  
  // Refs
  const isMounted = useRef(true);
  
  // Form state
  const [formData, setFormData] = useState({
    customer_id: '',
    order_number: '',
    order_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'pending',
    discount_percentage: 0,
    shipping_cost: 0,
    tax_rate: 0,
    notes: '',
    payment_terms: 'net_30',
    items: []
  });

  // Summary statistics
  const summaryStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    totalValue: orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0)
  };

  useEffect(() => {
    isMounted.current = true;
    fetchOrders();
    fetchCustomers();
    fetchProducts();
    fetchServices();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[SalesOrderManagement] Fetching orders...');
      
      const response = await orderApi.getAll();
      
      // Handle both paginated and direct array responses
      let ordersList = [];
      if (Array.isArray(response)) {
        ordersList = response;
      } else if (response && Array.isArray(response.results)) {
        ordersList = response.results;
        console.log('[SalesOrderManagement] Paginated response - count:', response.count);
      } else if (response && Array.isArray(response.data)) {
        ordersList = response.data;
      }
      
      console.log('[SalesOrderManagement] Fetched orders:', ordersList.length);
      
      if (isMounted.current) {
        setOrders(ordersList);
      }
    } catch (error) {
      console.error('[SalesOrderManagement] Error:', error);
      if (isMounted.current) {
        setOrders([]);
        toast.error('Failed to load sales orders.');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/crm/customers', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response
        let customersList = [];
        if (Array.isArray(data)) {
          customersList = data;
        } else if (data && Array.isArray(data.results)) {
          customersList = data.results;
        }
        console.log('[SalesOrderManagement] Customers loaded:', customersList);
        setCustomers(customersList);
      }
    } catch (error) {
      console.error('[SalesOrderManagement] Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/inventory/products', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response
        let productsList = [];
        if (Array.isArray(data)) {
          productsList = data;
        } else if (data && Array.isArray(data.results)) {
          productsList = data.results;
        }
        setProducts(productsList);
      }
    } catch (error) {
      console.error('[SalesOrderManagement] Error fetching products:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/inventory/services', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response
        let servicesList = [];
        if (Array.isArray(data)) {
          servicesList = data;
        } else if (data && Array.isArray(data.results)) {
          servicesList = data.results;
        }
        setServices(servicesList);
      }
    } catch (error) {
      console.error('[SalesOrderManagement] Error fetching services:', error);
    }
  };

  // Handle form changes
  const handleFormChange = useCallback((e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  }, []);

  // Handle item changes
  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate total for item
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = parseFloat(newItems[index].quantity) || 0;
      const unitPrice = parseFloat(newItems[index].unit_price) || 0;
      newItems[index].total = quantity * unitPrice;
    }
    
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  // Add item to order
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        type: 'product',
        item_id: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        total: 0
      }]
    }));
  };

  // Remove item from order
  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Calculate order totals
  const calculateTotals = useCallback(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const discountAmount = subtotal * (parseFloat(formData.discount_percentage) || 0) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (parseFloat(formData.tax_rate) || 0) / 100;
    const total = taxableAmount + taxAmount + (parseFloat(formData.shipping_cost) || 0);
    
    return { subtotal, discountAmount, taxAmount, total };
  }, [formData]);

  // Handle create order
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    console.log('[SalesOrderManagement] Creating order...');
    
    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }
    
    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    
    // Validate all items have products/services selected
    const invalidItems = formData.items.filter(item => !item.item_id || item.item_id === '');
    if (invalidItems.length > 0) {
      toast.error('Please select a product or service for all items');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const { subtotal, total } = calculateTotals();
      
      const orderData = {
        ...formData,
        subtotal,
        total_amount: total
      };
      
      console.log('[SalesOrderManagement] Creating order with data:', orderData);
      console.log('[SalesOrderManagement] Items detail:', orderData.items);
      
      const newOrder = await orderApi.create(orderData);
      console.log('[SalesOrderManagement] Order created:', newOrder);
      
      toast.success('Sales order created successfully!');
      
      // Reset form
      setFormData({
        customer_id: '',
        order_number: '',
        order_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        discount_percentage: 0,
        shipping_cost: 0,
        tax_rate: 0,
        notes: '',
        payment_terms: 'net_30',
        items: []
      });
      setIsCreating(false);
      setActiveTab('list');
      fetchOrders();
    } catch (error) {
      console.error('[SalesOrderManagement] Error creating order:', error);
      toast.error('Failed to create sales order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update order
  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    console.log('[SalesOrderManagement] Updating order:', selectedOrder?.id);
    
    try {
      setIsSubmitting(true);
      
      const { subtotal, total } = calculateTotals();
      
      const orderData = {
        ...formData,
        subtotal,
        total_amount: total
      };
      
      const updatedOrder = await orderApi.update(selectedOrder.id, orderData);
      console.log('[SalesOrderManagement] Order updated:', updatedOrder);
      
      toast.success('Sales order updated successfully!');
      
      setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
      setIsEditing(false);
      setSelectedOrder(updatedOrder);
    } catch (error) {
      console.error('[SalesOrderManagement] Error updating order:', error);
      toast.error('Failed to update sales order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete order
  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    console.log('[SalesOrderManagement] Deleting order:', orderToDelete.id);
    
    try {
      await orderApi.delete(orderToDelete.id);
      
      toast.success('Sales order deleted successfully!');
      setOrders(orders.filter(o => o.id !== orderToDelete.id));
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      if (selectedOrder?.id === orderToDelete.id) {
        setSelectedOrder(null);
        setShowOrderDetails(false);
      }
    } catch (error) {
      console.error('[SalesOrderManagement] Error deleting order:', error);
      toast.error('Failed to delete sales order.');
    }
  };

  // Search filter
  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const customerName = customers.find(c => c.id === order.customer_id)?.name || '';
    return (
      order.order_number?.toLowerCase().includes(searchLower) ||
      customerName.toLowerCase().includes(searchLower) ||
      order.status?.toLowerCase().includes(searchLower)
    );
  });

  // Render content based on active tab
  const renderContent = () => {
    if (activeTab === 'create' || isCreating) {
      return renderCreateForm();
    } else if (activeTab === 'details' && selectedOrder && !isEditing) {
      return renderOrderDetails();
    } else if (isEditing && selectedOrder) {
      return renderEditForm();
    } else {
      return renderOrderList();
    }
  };

  // Render create form
  const renderCreateForm = () => (
    <form onSubmit={handleCreateOrder} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Customer
            <FieldTooltip text="Select the customer for this order. The customer's billing information will be used." />
          </label>
          <select
            name="customer_id"
            value={formData.customer_id}
            onChange={handleFormChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select a customer</option>
            {customers.map(customer => {
              // Get customer display ID (could be customer_id, customer_number, or id)
              const customerId = customer.customer_id || customer.customer_number || customer.id;
              
              // Get full name from various possible fields
              const fullName = customer.name || 
                              customer.full_name || 
                              (customer.first_name && customer.last_name ? `${customer.first_name} ${customer.last_name}` : '') ||
                              customer.customerName || 
                              customer.customer_name || 
                              customer.email || 
                              'Unknown Customer';
              
              return (
                <option key={customer.id} value={customer.id}>
                  {fullName}: {customerId}
                </option>
              );
            })}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Order Number
            <FieldTooltip text="Unique identifier for this order. Leave blank to auto-generate." />
          </label>
          <input
            type="text"
            name="order_number"
            value={formData.order_number}
            onChange={handleFormChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Auto-generated if left blank"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Order Date
            <FieldTooltip text="The date when this order was placed." />
          </label>
          <input
            type="date"
            name="order_date"
            value={formData.order_date}
            onChange={handleFormChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Due Date
            <FieldTooltip text="The date by which payment is expected." />
          </label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleFormChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Status
            <FieldTooltip text="Current status of the order in your fulfillment process." />
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleFormChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Payment Terms
            <FieldTooltip text="Payment terms agreed with the customer." />
          </label>
          <select
            name="payment_terms"
            value={formData.payment_terms}
            onChange={handleFormChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="immediate">Due on Receipt</option>
            <option value="net_15">Net 15</option>
            <option value="net_30">Net 30</option>
            <option value="net_60">Net 60</option>
            <option value="net_90">Net 90</option>
          </select>
        </div>
      </div>
      
      {/* Order Items */}
      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
          <button
            type="button"
            onClick={addItem}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Item
          </button>
        </div>
        
        {formData.items.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No items added yet</p>
        ) : (
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 bg-gray-50 rounded">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700">Type</label>
                  <select
                    value={item.type}
                    onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                    className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="product">Product</option>
                    <option value="service">Service</option>
                  </select>
                </div>
                
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-700">Item</label>
                  <select
                    value={item.item_id || ''}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      const selectedItem = item.type === 'product' 
                        ? products.find(p => p.id === selectedValue)
                        : services.find(s => s.id === selectedValue);
                      
                      console.log('[SalesOrderManagement] Selected item:', { 
                        value: selectedValue, 
                        type: item.type, 
                        found: selectedItem,
                        availableItems: item.type === 'product' ? products : services
                      });
                      
                      handleItemChange(index, 'item_id', selectedValue);
                      if (selectedItem) {
                        handleItemChange(index, 'description', selectedItem.name || selectedItem.description || '');
                        handleItemChange(index, 'unit_price', selectedItem.price || selectedItem.unit_price || 0);
                      }
                    }}
                    className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    required
                  >
                    <option value="">Select {item.type === 'product' ? 'Product' : 'Service'}</option>
                    {(item.type === 'product' ? products : services).map(option => (
                      <option key={option.id} value={option.id}>
                        {option.name || option.description || 'Unnamed Item'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    min="1"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700">Unit Price</label>
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                    className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700">Total</label>
                  <input
                    type="number"
                    value={item.total}
                    className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100"
                    readOnly
                  />
                </div>
                
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t pt-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Discount (%)
            <FieldTooltip text="Percentage discount applied to the subtotal." />
          </label>
          <input
            type="number"
            name="discount_percentage"
            value={formData.discount_percentage}
            onChange={handleFormChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            min="0"
            max="100"
            step="0.01"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tax Rate (%)
            <FieldTooltip text="Tax rate to apply to the order after discount." />
          </label>
          <input
            type="number"
            name="tax_rate"
            value={formData.tax_rate}
            onChange={handleFormChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            min="0"
            step="0.01"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Shipping Cost
            <FieldTooltip text="Fixed shipping cost for this order." />
          </label>
          <input
            type="number"
            name="shipping_cost"
            value={formData.shipping_cost}
            onChange={handleFormChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            min="0"
            step="0.01"
          />
        </div>
      </div>
      
      {/* Order Summary */}
      <div className="bg-gray-50 p-4 rounded">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="font-medium">${calculateTotals().subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Discount:</span>
            <span>-${calculateTotals().discountAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>${calculateTotals().taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping:</span>
            <span>${(parseFloat(formData.shipping_cost) || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total:</span>
            <span className="text-blue-600">${calculateTotals().total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Notes
          <FieldTooltip text="Internal notes about this order. Not visible to customers." />
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleFormChange}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          placeholder="Add any internal notes..."
        />
      </div>
      
      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => {
            setIsCreating(false);
            setActiveTab('list');
          }}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Sales Order'}
        </button>
      </div>
    </form>
  );

  // Similar render methods for edit form and order details...
  const renderEditForm = () => (
    <form onSubmit={handleUpdateOrder} className="space-y-6">
      {/* Same as create form but with update button */}
      {renderCreateForm().props.children}
    </form>
  );

  const renderOrderDetails = () => {
    if (!selectedOrder) return null;
    
    const customer = customers.find(c => c.id === selectedOrder.customer_id);
    
    return (
      <div className="space-y-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Order #{selectedOrder.order_number}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Order details and information
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setFormData(selectedOrder);
                  setIsEditing(true);
                }}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  setOrderToDelete(selectedOrder);
                  setDeleteDialogOpen(true);
                }}
                className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Customer</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {customer ? `${customer.name || customer.full_name || (customer.first_name && customer.last_name ? `${customer.first_name} ${customer.last_name}` : '') || customer.customerName || customer.customer_name || customer.email}: ${customer.customer_id || customer.customer_number || customer.id}` : 'Unknown'}
                </dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                    selectedOrder.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedOrder.status}
                  </span>
                </dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Order Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(selectedOrder.order_date).toLocaleDateString()}
                </dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(selectedOrder.due_date).toLocaleDateString()}
                </dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                <dd className="mt-1 text-sm text-gray-900 font-bold">
                  ${parseFloat(selectedOrder.total_amount || 0).toFixed(2)}
                </dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Payment Terms</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {selectedOrder.payment_terms?.replace('_', ' ').toUpperCase()}
                </dd>
              </div>
              
              {selectedOrder.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {selectedOrder.notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
        
        <button
          onClick={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
            setActiveTab('list');
          }}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Back to List
        </button>
      </div>
    );
  };

  const renderOrderList = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Orders</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{summaryStats.total}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Pending</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-600">{summaryStats.pending}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Completed</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{summaryStats.completed}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Value</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">${summaryStats.totalValue.toFixed(2)}</p>
        </div>
      </div>
      
      {/* Search and Actions */}
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => {
            setIsCreating(true);
            setActiveTab('create');
          }}
          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create New Order
        </button>
      </div>
      
      {/* Orders Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
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
            {isLoading ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  Loading orders...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  No orders found
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => {
                const customer = customers.find(c => c.id === order.customer_id);
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer ? `${customer.name || customer.full_name || (customer.first_name && customer.last_name ? `${customer.first_name} ${customer.last_name}` : '') || customer.customerName || customer.customer_name || customer.email}: ${customer.customer_id || customer.customer_number || customer.id}` : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${parseFloat(order.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetails(true);
                          setActiveTab('details');
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setFormData(order);
                          setIsEditing(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setOrderToDelete(order);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-black mb-6 flex items-center">
          <ShoppingCartIcon className="h-6 w-6 text-blue-600 mr-2" />
          Sales Order Management
        </h1>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setActiveTab('list');
                setIsCreating(false);
                setIsEditing(false);
                setShowOrderDetails(false);
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'list' && !isCreating && !isEditing && !showOrderDetails
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              List
            </button>
            <button
              onClick={() => {
                setActiveTab('create');
                setIsCreating(true);
                setIsEditing(false);
                setShowOrderDetails(false);
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'create' || isCreating
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Create/Edit
            </button>
            <button
              onClick={() => {
                setActiveTab('details');
                setIsCreating(false);
                setIsEditing(false);
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details' && selectedOrder && !isEditing
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              disabled={!selectedOrder}
            >
              Details
            </button>
          </nav>
        </div>
        
        {/* Content */}
        {renderContent()}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Transition appear show={deleteDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setDeleteDialogOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Delete Sales Order
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete order #{orderToDelete?.order_number}? This action cannot be undone.
                    </p>
                  </div>
                  
                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => setDeleteDialogOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                      onClick={handleDeleteOrder}
                    >
                      Delete
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default SalesOrderManagement;