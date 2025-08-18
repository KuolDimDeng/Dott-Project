'use client';

import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { getCacheValue } from '@/utils/appCache';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import DeleteConfirmationDialog from '@/components/ui/DeleteConfirmationDialog';
import { canDeleteItem } from '@/utils/accountingRestrictions';
import { useCurrency } from '@/context/CurrencyContext';

import StandardSpinner, { ButtonSpinner, CenteredSpinner } from '@/components/ui/StandardSpinner';
const EstimateManagement = () => {
  const { currency } = useCurrency();
  
  // State management
  const [estimates, setEstimates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showEstimateDetails, setShowEstimateDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [estimateToDelete, setEstimateToDelete] = useState(null);
  const [isDeletingEstimate, setIsDeletingEstimate] = useState(false);
  
  // Dropdowns data
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  
  // Refs
  const isMounted = useRef(true);
  
  // Form state
  const [formData, setFormData] = useState({
    customer_id: '',
    title: 'Estimate',
    estimate_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    discount: 0,
    notes: '',
    terms: '',
    items: []
  });

  useEffect(() => {
    isMounted.current = true;
    fetchEstimates();
    fetchCustomers();
    fetchProducts();
    fetchServices();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchEstimates = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[EstimateManagement] Fetching estimates...');
      
      // Get secure tenant ID
      const tenantId = await getSecureTenantId();
      if (!tenantId) {
        console.error('[EstimateManagement] No tenant ID found');
        toast.error('Authentication required. Please log in again.');
        return;
      }
      
      const response = await fetch('/api/sales/estimates', {
        headers: {
          'x-tenant-id': tenantId
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch estimates: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle both paginated and direct array responses
      let estimatesList = [];
      if (Array.isArray(data)) {
        estimatesList = data;  // Direct array response
      } else if (data && Array.isArray(data.results)) {
        estimatesList = data.results;  // Django paginated response
        console.log('[EstimateManagement] Paginated response - count:', data.count);
      } else if (data && Array.isArray(data.data)) {
        estimatesList = data.data;  // Alternative format
      }
      
      console.log('[EstimateManagement] Fetched estimates:', estimatesList.length);
      
      if (isMounted.current) {
        setEstimates(estimatesList);
      }
    } catch (error) {
      console.error('[EstimateManagement] Error:', error);
      if (isMounted.current) {
        setEstimates([]);
        toast.error('Failed to load estimates.');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const fetchCustomers = async () => {
    try {
      const tenantId = await getSecureTenantId();
      const response = await fetch('/api/crm/customers', {
        headers: { 'x-tenant-id': tenantId }
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
        setCustomers(customersList);
      }
    } catch (error) {
      console.error('[EstimateManagement] Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const tenantId = await getSecureTenantId();
      const response = await fetch('/api/inventory/products', {
        headers: { 'x-tenant-id': tenantId }
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
      console.error('[EstimateManagement] Error fetching products:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const tenantId = await getSecureTenantId();
      const response = await fetch('/api/inventory/services', {
        headers: { 'x-tenant-id': tenantId }
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
      console.error('[EstimateManagement] Error fetching services:', error);
    }
  };

  // Handle form changes
  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  // Add new item
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          type: 'product',
          product_id: '',
          service_id: '',
          description: '',
          quantity: 1,
          unit_price: 0,
          total: 0
        }
      ]
    }));
  };

  // Remove item
  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const discountAmount = (subtotal * parseFloat(formData.discount || 0)) / 100;
    const total = subtotal - discountAmount;
    
    return { subtotal, discountAmount, total };
  }, [formData.items, formData.discount]);

  // Handle create estimate
  const handleCreateEstimate = async (e) => {
    e.preventDefault();
    console.log('[EstimateManagement] Creating estimate with data:', formData);
    
    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }
    
    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const tenantId = await getSecureTenantId();
      if (!tenantId) {
        toast.error('Authentication required. Please log in again.');
        return;
      }
      
      const { subtotal, total } = calculateTotals();
      
      const estimateData = {
        ...formData,
        subtotal,
        total,
        totalAmount: total
      };
      
      const response = await fetch('/api/sales/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify(estimateData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create estimate: ${response.status}`);
      }
      
      const newEstimate = await response.json();
      console.log('[EstimateManagement] Estimate created:', newEstimate);
      
      toast.success('Estimate created successfully!');
      
      // Reset form and refresh list
      setFormData({
        customer_id: '',
        title: 'Estimate',
        estimate_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        discount: 0,
        notes: '',
        terms: '',
        items: []
      });
      setIsCreating(false);
      fetchEstimates();
    } catch (error) {
      console.error('[EstimateManagement] Error creating estimate:', error);
      toast.error('Failed to create estimate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update estimate
  const handleUpdateEstimate = async (e) => {
    e.preventDefault();
    console.log('[EstimateManagement] Updating estimate:', selectedEstimate?.id);
    
    try {
      setIsSubmitting(true);
      
      const tenantId = await getSecureTenantId();
      if (!tenantId) {
        toast.error('Authentication required. Please log in again.');
        return;
      }
      
      const { subtotal, total } = calculateTotals();
      
      const estimateData = {
        ...formData,
        subtotal,
        total,
        totalAmount: total
      };
      
      const response = await fetch(`/api/sales/estimates/${selectedEstimate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify(estimateData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update estimate: ${response.status}`);
      }
      
      const updatedEstimate = await response.json();
      console.log('[EstimateManagement] Estimate updated:', updatedEstimate);
      
      toast.success('Estimate updated successfully!');
      
      setEstimates(estimates.map(e => e.id === selectedEstimate.id ? updatedEstimate : e));
      setIsEditing(false);
      setSelectedEstimate(updatedEstimate);
    } catch (error) {
      console.error('[EstimateManagement] Error updating estimate:', error);
      toast.error('Failed to update estimate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle activate/deactivate estimate
  const handleToggleEstimateStatus = async (estimate) => {
    const newStatus = !estimate.is_active;
    const action = newStatus ? 'activate' : 'deactivate';
    
    console.log(`[EstimateManagement] ${action}ing estimate:`, estimate.id);
    
    try {
      const response = await fetch(`/api/sales/estimates/${estimate.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          is_active: newStatus
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} estimate: ${response.status}`);
      }
      
      const updatedEstimate = await response.json();
      console.log(`[EstimateManagement] Estimate ${action}d:`, updatedEstimate);
      
      toast.success(`Estimate ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      
      // Update the estimate in the list
      setEstimates(estimates.map(e => 
        e.id === estimate.id ? { ...e, is_active: newStatus } : e
      ));
      
      // Update selected estimate if it's the same
      if (selectedEstimate?.id === estimate.id) {
        setSelectedEstimate({ ...selectedEstimate, is_active: newStatus });
      }
    } catch (error) {
      console.error(`[EstimateManagement] Error ${action}ing estimate:`, error);
      toast.error(`Failed to ${action} estimate.`);
    }
  };

  // Handle delete estimate (kept for critical cases, but prefer deactivation)
  const handleDeleteEstimate = async () => {
    if (!estimateToDelete) return;
    
    console.log('[EstimateManagement] Deleting estimate:', estimateToDelete.id);
    
    setIsDeletingEstimate(true);
    try {
      const tenantId = await getSecureTenantId();
      if (!tenantId) {
        toast.error('Authentication required. Please log in again.');
        return;
      }
      
      const response = await fetch(`/api/sales/estimates/${estimateToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenantId
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete estimate: ${response.status}`);
      }
      
      console.log('[EstimateManagement] Estimate deleted successfully');
      
      toast.success('Estimate deleted successfully and archived in audit trail!');
      setEstimates(estimates.filter(e => e.id !== estimateToDelete.id));
      setDeleteDialogOpen(false);
      setEstimateToDelete(null);
      
      if (selectedEstimate?.id === estimateToDelete.id) {
        setShowEstimateDetails(false);
        setSelectedEstimate(null);
      }
    } catch (error) {
      console.error('[EstimateManagement] Error deleting estimate:', error);
      toast.error('Failed to delete estimate.');
    } finally {
      setIsDeletingEstimate(false);
    }
  };

  // Handle view estimate details
  const handleViewEstimate = useCallback((estimate) => {
    console.log('[EstimateManagement] Viewing estimate:', estimate);
    setSelectedEstimate(estimate);
    setShowEstimateDetails(true);
    setIsCreating(false);
    setIsEditing(false);
  }, []);

  // Handle edit estimate
  const handleEditEstimate = useCallback((estimate) => {
    console.log('[EstimateManagement] Editing estimate:', estimate);
    setSelectedEstimate(estimate);
    setFormData({
      customer_id: estimate.customer_id || '',
      title: estimate.title || 'Estimate',
      estimate_date: estimate.estimate_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      expiry_date: estimate.expiry_date?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: estimate.status || 'draft',
      discount: estimate.discount || 0,
      notes: estimate.notes || '',
      terms: estimate.terms || '',
      items: estimate.items || []
    });
    setIsEditing(true);
    setShowEstimateDetails(true);
  }, []);

  // Filter estimates based on search
  const filteredEstimates = estimates.filter(estimate => 
    estimate.estimate_num?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render estimate form
  const renderEstimateForm = () => {
    const isEditMode = isEditing && selectedEstimate;
    const { subtotal, discountAmount, total } = calculateTotals();
    
    return (
      <form onSubmit={isEditMode ? handleUpdateEstimate : handleCreateEstimate} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              name="customer_id"
              value={formData.customer_id}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a customer</option>
              {customers.map(customer => {
                const customerId = customer.customer_id || customer.customer_number || customer.id;
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Estimate title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimate Date
            </label>
            <input
              type="date"
              name="estimate_date"
              value={formData.estimate_date}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="date"
              name="expiry_date"
              value={formData.expiry_date}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount (%)
            </label>
            <input
              type="number"
              name="discount"
              value={formData.discount}
              onChange={handleFormChange}
              min="0"
              max="100"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
        </div>
        
        {/* Items Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Item
            </button>
          </div>
          
          {formData.items.length > 0 ? (
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={item.type}
                        onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      >
                        <option value="product">Product</option>
                        <option value="service">Service</option>
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {item.type === 'product' ? 'Product' : 'Service'}
                      </label>
                      <select
                        value={item.type === 'product' ? item.product_id : item.service_id}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          if (item.type === 'product') {
                            const product = products.find(p => p.id === selectedId);
                            handleItemChange(index, 'product_id', selectedId);
                            handleItemChange(index, 'service_id', '');
                            handleItemChange(index, 'description', product?.name || '');
                            handleItemChange(index, 'unit_price', product?.price || 0);
                          } else {
                            const service = services.find(s => s.id === selectedId);
                            handleItemChange(index, 'service_id', selectedId);
                            handleItemChange(index, 'product_id', '');
                            handleItemChange(index, 'description', service?.name || '');
                            handleItemChange(index, 'unit_price', service?.price || 0);
                          }
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      >
                        <option value="">Select {item.type}</option>
                        {(item.type === 'product' ? products : services).map(option => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        min="1"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Total
                      </label>
                      <div className="flex items-center">
                        <span className="flex-1 text-sm">${(item.total || 0).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="ml-2 text-red-600 hover:text-red-900"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      placeholder="Item description"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">No items added yet. Click "Add Item" to start.</p>
            </div>
          )}
        </div>
        
        {/* Totals */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Discount ({formData.discount}%):</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold pt-2 border-t">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleFormChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Terms & Conditions
          </label>
          <textarea
            name="terms"
            value={formData.terms}
            onChange={handleFormChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Terms and conditions..."
          />
        </div>
        
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setShowEstimateDetails(false);
              setFormData({
                customer_id: '',
                title: 'Estimate',
                estimate_date: new Date().toISOString().split('T')[0],
                expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'draft',
                discount: 0,
                notes: '',
                terms: '',
                items: []
              });
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <ButtonSpinner />
                Processing...
              </span>
            ) : (
              <span>{isEditMode ? 'Update Estimate' : 'Create Estimate'}</span>
            )}
          </button>
        </div>
      </form>
    );
  };

  // Render estimate details
  const renderEstimateDetails = () => {
    if (!selectedEstimate) return null;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Estimate Number</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedEstimate.estimate_num}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Customer</h3>
            <p className="mt-1 text-sm text-gray-900">
              {(() => {
                if (!selectedEstimate.customer) return 'N/A';
                const customerId = selectedEstimate.customer.customer_id || selectedEstimate.customer.customer_number || selectedEstimate.customer.id;
                const fullName = selectedEstimate.customer.name || 
                                selectedEstimate.customer.full_name || 
                                (selectedEstimate.customer.first_name && selectedEstimate.customer.last_name ? `${selectedEstimate.customer.first_name} ${selectedEstimate.customer.last_name}` : '') ||
                                selectedEstimate.customer.customerName || 
                                selectedEstimate.customer.customer_name || 
                                selectedEstimate.customer.email || 
                                'Unknown Customer';
                return `${customerId}: ${fullName}`;
              })()}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Estimate Date</h3>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(selectedEstimate.estimate_date).toLocaleDateString()}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Expiry Date</h3>
            <p className="mt-1 text-sm text-gray-900">
              {selectedEstimate.expiry_date ? new Date(selectedEstimate.expiry_date).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              selectedEstimate.status === 'accepted' ? 'bg-green-100 text-green-800' :
              selectedEstimate.status === 'rejected' ? 'bg-red-100 text-red-800' :
              selectedEstimate.status === 'expired' ? 'bg-gray-100 text-gray-800' :
              selectedEstimate.status === 'sent' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {selectedEstimate.status?.charAt(0).toUpperCase() + selectedEstimate.status?.slice(1)}
            </span>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              ${parseFloat(selectedEstimate.total || selectedEstimate.totalAmount || 0).toFixed(2)}
            </p>
          </div>
        </div>
        
        {selectedEstimate.items && selectedEstimate.items.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedEstimate.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">${parseFloat(item.unit_price).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">${parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="3" className="px-4 py-2 text-sm font-medium text-gray-900 text-right">Subtotal:</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                      ${parseFloat(selectedEstimate.subtotal || 0).toFixed(2)}
                    </td>
                  </tr>
                  {selectedEstimate.discount > 0 && (
                    <tr>
                      <td colSpan="3" className="px-4 py-2 text-sm font-medium text-red-600 text-right">
                        Discount ({selectedEstimate.discount}%):
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-red-600 text-right">
                        -${((selectedEstimate.subtotal * selectedEstimate.discount) / 100).toFixed(2)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan="3" className="px-4 py-2 text-base font-semibold text-gray-900 text-right">Total:</td>
                    <td className="px-4 py-2 text-base font-semibold text-gray-900 text-right">
                      ${parseFloat(selectedEstimate.total || selectedEstimate.totalAmount || 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
        
        {selectedEstimate.notes && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Notes</h3>
            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedEstimate.notes}</p>
          </div>
        )}
        
        {selectedEstimate.terms && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Terms & Conditions</h3>
            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedEstimate.terms}</p>
          </div>
        )}
      </div>
    );
  };

  // Render estimates table
  const renderEstimatesTable = () => {
    if (isLoading) {
      return (
        <CenteredSpinner size="medium" text="Loading estimates..." />
      );
    }
    
    if (!filteredEstimates || filteredEstimates.length === 0) {
      return (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No estimates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search.' : 'Get started by creating a new estimate.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => {
                  setIsCreating(true);
                  setShowEstimateDetails(false);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Estimate
              </button>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Estimate #</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Customer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Expiry</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Document Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredEstimates.map((estimate) => (
            <tr key={estimate.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-black">{estimate.estimate_num}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">
                  {(() => {
                    if (!estimate.customer) return 'N/A';
                    const customerId = estimate.customer.customer_id || estimate.customer.customer_number || estimate.customer.id;
                    const fullName = estimate.customer.name || 
                                    estimate.customer.full_name || 
                                    (estimate.customer.first_name && estimate.customer.last_name ? `${estimate.customer.first_name} ${estimate.customer.last_name}` : '') ||
                                    estimate.customer.customerName || 
                                    estimate.customer.customer_name || 
                                    estimate.customer.email || 
                                    'Unknown Customer';
                    return `${fullName}: ${customerId}`;
                  })()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">
                  {new Date(estimate.estimate_date).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">
                  {estimate.expiry_date ? new Date(estimate.expiry_date).toLocaleDateString() : 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">
                  {currency} {parseFloat(estimate.total || estimate.totalAmount || 0).toFixed(2)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  estimate.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  estimate.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  estimate.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                  estimate.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {estimate.status?.charAt(0).toUpperCase() + estimate.status?.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  estimate.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                }`}>
                  {estimate.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => handleViewEstimate(estimate)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleEditEstimate(estimate)}
                  className="text-green-600 hover:text-green-900 mr-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleToggleEstimateStatus(estimate)}
                  className={`${
                    estimate.is_active !== false
                      ? 'text-orange-600 hover:text-orange-900'
                      : 'text-green-600 hover:text-green-900'
                  }`}
                  title={estimate.is_active !== false ? 'Deactivate' : 'Activate'}
                >
                  {estimate.is_active !== false ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Delete confirmation dialog
  const renderDeleteDialog = () => {
    if (!estimateToDelete) return null;
    
    const deletionCheck = canDeleteItem('estimates', estimateToDelete);
    
    return (
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setEstimateToDelete(null);
        }}
        onConfirm={handleDeleteEstimate}
        itemName={estimateToDelete.estimate_num}
        itemType="Estimate"
        isDeleting={isDeletingEstimate}
        customWarning={deletionCheck.warning}
        accountingRestriction={!deletionCheck.allowed ? deletionCheck.message : null}
        relatedRecordsMessage={deletionCheck.checkRelated ? 
          `This will also delete related: ${deletionCheck.checkRelated.join(', ')}` : 
          null}
      />
    );
  };

  return (
    <div className="p-6 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
          <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600 mr-2" />
          Estimate Management
        </h1>
        <p className="text-gray-600 text-sm">
          Create detailed quotes and estimates for potential customers. Set validity periods, track approval status, and convert accepted estimates into sales orders or invoices.
        </p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Estimates</h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">{estimates.length}</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Draft</h2>
          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {estimates.filter(e => e.status === 'draft').length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">Accepted</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {estimates.filter(e => e.status === 'accepted').length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">Total Value</h2>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            ${estimates.reduce((sum, e) => sum + parseFloat(e.total || e.totalAmount || 0), 0).toFixed(2)}
          </p>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search Estimates"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
            onClick={() => {
              console.log('[EstimateManagement] Filter clicked');
            }}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
          </button>
          <button
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => {
              console.log('[EstimateManagement] Add Estimate clicked');
              setIsCreating(true);
              setShowEstimateDetails(false);
              setSelectedEstimate(null);
              setIsEditing(false);
            }}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Estimate
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      {showEstimateDetails && selectedEstimate ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-black">
              {selectedEstimate.estimate_num} - {selectedEstimate.customer?.name}
            </h2>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        customer_id: '',
                        title: 'Estimate',
                        estimate_date: new Date().toISOString().split('T')[0],
                        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        status: 'draft',
                        discount: 0,
                        notes: '',
                        terms: '',
                        items: []
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleEditEstimate(selectedEstimate)}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      console.log('[EstimateManagement] Print clicked');
                      window.print();
                    }}
                    className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    Print
                  </button>
                  <button
                    onClick={() => {
                      setEstimateToDelete(selectedEstimate);
                      setDeleteDialogOpen(true);
                    }}
                    className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowEstimateDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
                  >
                    Back to List
                  </button>
                </>
              )}
            </div>
          </div>
          
          {isEditing ? renderEstimateForm() : renderEstimateDetails()}
        </div>
      ) : isCreating ? (
        <div className="bg-white shadow rounded-lg mt-6 p-6">
          <h2 className="text-xl font-bold text-black mb-6">Create New Estimate</h2>
          {renderEstimateForm()}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            {renderEstimatesTable()}
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      {renderDeleteDialog()}
    </div>
  );
};

export default EstimateManagement;