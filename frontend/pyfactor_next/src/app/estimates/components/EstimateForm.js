'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import EstimateService from '@/services/estimateService';
import CustomerService from '@/services/customerService';
import ProductService from '@/services/productService';
import ServiceManagementService from '@/services/serviceManagementService';
import { logger } from '@/utils/logger';

const EstimateForm = ({ estimate, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    title: 'Estimate',
    summary: '',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customer_ref: '',
    discount: 0,
    currency: 'USD',
    footer: '',
    items: []
  });
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState({});
  const [newItem, setNewItem] = useState({
    type: 'product',
    product_id: '',
    service_id: '',
    description: '',
    quantity: 1,
    unit_price: 0
  });

  useEffect(() => {
    fetchData();
    
    if (estimate) {
      setFormData({
        customer_id: estimate.customer_id || '',
        title: estimate.title || 'Estimate',
        summary: estimate.summary || '',
        valid_until: estimate.valid_until ? new Date(estimate.valid_until).toISOString().split('T')[0] : '',
        customer_ref: estimate.customer_ref || '',
        discount: estimate.discount || 0,
        currency: estimate.currency || 'USD',
        footer: estimate.footer || '',
        items: estimate.items || []
      });
    }
  }, [estimate]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const [customersRes, productsRes, servicesRes] = await Promise.all([
        CustomerService.getCustomers({ limit: 100 }),
        ProductService.getProducts({ limit: 100 }),
        ServiceManagementService.getServices({ limit: 100 })
      ]);
      
      if (customersRes.success) {
        setCustomers(customersRes.data.customers || []);
      }
      if (productsRes.success) {
        setProducts(productsRes.data.products || []);
      }
      if (servicesRes.success) {
        setServices(servicesRes.data.services || []);
      }
    } catch (error) {
      logger.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.customer_id) {
      newErrors.customer_id = 'Customer is required';
    }
    
    if (!formData.title) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.valid_until) {
      newErrors.valid_until = 'Valid until date is required';
    }
    
    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddItem = () => {
    if (newItem.type === 'product' && !newItem.product_id) {
      toast.error('Please select a product');
      return;
    }
    if (newItem.type === 'service' && !newItem.service_id) {
      toast.error('Please select a service');
      return;
    }
    if (!newItem.description && newItem.type === 'custom') {
      toast.error('Please enter a description');
      return;
    }
    if (newItem.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (newItem.unit_price < 0) {
      toast.error('Unit price cannot be negative');
      return;
    }

    const item = { ...newItem };
    
    // Add name based on selection
    if (item.type === 'product') {
      const product = products.find(p => p.id === item.product_id);
      item.name = product?.name || '';
      item.description = item.description || product?.description || '';
      item.unit_price = item.unit_price || product?.price || 0;
    } else if (item.type === 'service') {
      const service = services.find(s => s.id === item.service_id);
      item.name = service?.service_name || '';
      item.description = item.description || service?.description || '';
      item.unit_price = item.unit_price || service?.rate || 0;
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    // Reset new item form
    setNewItem({
      type: 'product',
      product_id: '',
      service_id: '',
      description: '',
      quantity: 1,
      unit_price: 0
    });

    // Clear items error
    if (errors.items) {
      setErrors(prev => ({ ...prev, items: '' }));
    }
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = subtotal * (formData.discount / 100);
    return subtotal - discountAmount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const dataToSubmit = {
        ...formData,
        totalAmount: calculateTotal(),
        items: formData.items.map(item => ({
          product_id: item.type === 'product' ? item.product_id : null,
          service_id: item.type === 'service' ? item.service_id : null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };
      
      let response;
      if (estimate) {
        response = await EstimateService.updateEstimate(estimate.id, dataToSubmit);
      } else {
        response = await EstimateService.createEstimate(dataToSubmit);
      }
      
      if (response.success) {
        toast.success(estimate ? 'Estimate updated successfully' : 'Estimate created successfully');
        onSubmit();
      } else {
        toast.error(response.error || 'Failed to save estimate');
      }
    } catch (error) {
      logger.error('Error saving estimate:', error);
      toast.error('Failed to save estimate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {estimate ? 'Edit Estimate' : 'Create New Estimate'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="p-6 space-y-6">
            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer *
              </label>
              {loadingData ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  Loading customers...
                </div>
              ) : (
                <select
                  name="customer_id"
                  value={formData.customer_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.customer_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customer_name} ({customer.company_name || 'Individual'})
                    </option>
                  ))}
                </select>
              )}
              {errors.customer_id && (
                <p className="mt-1 text-sm text-red-600">{errors.customer_id}</p>
              )}
            </div>
            
            {/* Estimate Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Estimate Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    name="valid_until"
                    value={formData.valid_until}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.valid_until ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.valid_until && (
                    <p className="mt-1 text-sm text-red-600">{errors.valid_until}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Reference
                  </label>
                  <input
                    type="text"
                    name="customer_ref"
                    value={formData.customer_ref}
                    onChange={handleChange}
                    placeholder="Customer PO or reference"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Summary
                  </label>
                  <textarea
                    name="summary"
                    value={formData.summary}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Brief description of the estimate"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Line Items */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Line Items *</h3>
              
              {/* Add Item Form */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      name="type"
                      value={newItem.type}
                      onChange={handleItemChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="product">Product</option>
                      <option value="service">Service</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  
                  {newItem.type === 'product' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                      <select
                        name="product_id"
                        value={newItem.product_id}
                        onChange={handleItemChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select product</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - ${product.price}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {newItem.type === 'service' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                      <select
                        name="service_id"
                        value={newItem.service_id}
                        onChange={handleItemChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select service</option>
                        {services.map(service => (
                          <option key={service.id} value={service.id}>
                            {service.service_name} - ${service.rate}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {newItem.type === 'custom' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        name="description"
                        value={newItem.description}
                        onChange={handleItemChange}
                        placeholder="Item description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      value={newItem.quantity}
                      onChange={handleItemChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                    <input
                      type="number"
                      name="unit_price"
                      value={newItem.unit_price}
                      onChange={handleItemChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Items List */}
              {formData.items.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {item.name || item.description}
                            </div>
                            {item.description && item.name && (
                              <div className="text-sm text-gray-500">{item.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            ${item.unit_price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                            ${(item.quantity * item.unit_price).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No items added yet
                </div>
              )}
              
              {errors.items && (
                <p className="mt-2 text-sm text-red-600">{errors.items}</p>
              )}
            </div>
            
            {/* Totals */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Discount</span>
                    <input
                      type="number"
                      name="discount"
                      value={formData.discount}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    <span className="text-gray-600">%</span>
                  </div>
                  <span className="font-medium">
                    -${(calculateSubtotal() * formData.discount / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Footer Notes
              </label>
              <textarea
                name="footer"
                value={formData.footer}
                onChange={handleChange}
                rows={3}
                placeholder="Terms, conditions, or additional notes"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {estimate && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Estimate Details</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">
                    <p><span className="font-medium">Estimate Number:</span> {estimate.estimate_num}</p>
                    <p className="mt-1"><span className="font-medium">Created:</span> {new Date(estimate.created_at).toLocaleDateString()}</p>
                    <p className="mt-1"><span className="font-medium">Last Updated:</span> {new Date(estimate.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
        
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || loadingData}
          >
            {loading ? 'Saving...' : (estimate ? 'Update Estimate' : 'Create Estimate')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstimateForm;