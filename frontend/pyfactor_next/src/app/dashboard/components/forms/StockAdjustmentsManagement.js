'use client';

import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { getCacheValue } from '@/utils/appCache';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import { CenteredSpinner, ButtonSpinner } from '@/components/ui/StandardSpinner';

const StockAdjustmentsManagement = () => {
  // State management
  const [adjustments, setAdjustments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showAdjustmentDetails, setShowAdjustmentDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adjustmentToDelete, setAdjustmentToDelete] = useState(null);
  
  // Dropdowns data
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  
  // Refs
  const isMounted = useRef(true);
  
  // Form state
  const [formData, setFormData] = useState({
    adjustment_date: new Date().toISOString().split('T')[0],
    type: 'addition',
    reason: '',
    notes: '',
    items: []
  });

  useEffect(() => {
    isMounted.current = true;
    fetchAdjustments();
    fetchProducts();
    fetchLocations();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchAdjustments = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[StockAdjustmentsManagement] Fetching adjustments...');
      
      if (!tenantId) {
        console.error('[StockAdjustmentsManagement] No tenant ID found');
        toast.error('Authentication required. Please log in again.');
        return;
      }
      
      const response = await fetch('/api/inventory/stock-adjustments', {
        headers: {
          'x-tenant-id': tenantId
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch adjustments: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[StockAdjustmentsManagement] Fetched adjustments:', data?.length || 0);
      
      if (isMounted.current) {
        setAdjustments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('[StockAdjustmentsManagement] Error:', error);
      if (isMounted.current) {
        setAdjustments([]);
        toast.error('Failed to load stock adjustments.');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/inventory/products', {
        headers: { 'x-tenant-id': tenantId }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('[StockAdjustmentsManagement] Error fetching products:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/inventory/locations', {
        headers: { 'x-tenant-id': tenantId }
      });
      if (response.ok) {
        const data = await response.json();
        setLocations(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('[StockAdjustmentsManagement] Error fetching locations:', error);
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
    
    // Update new quantity when adjustment quantity changes
    if (field === 'adjustment_quantity') {
      const product = products.find(p => p.id === newItems[index].product_id);
      const currentQty = parseInt(product?.stock_quantity || 0);
      const adjustmentQty = parseInt(value || 0);
      
      if (formData.type === 'addition') {
        newItems[index].new_quantity = currentQty + adjustmentQty;
      } else {
        newItems[index].new_quantity = currentQty - adjustmentQty;
      }
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
          product_id: '',
          location_id: '',
          current_quantity: 0,
          adjustment_quantity: 0,
          new_quantity: 0,
          cost: 0
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

  // Handle create adjustment
  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    console.log('[StockAdjustmentsManagement] Creating adjustment with data:', formData);
    
    if (!formData.reason) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }
    
    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/inventory/stock-adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create adjustment: ${response.status}`);
      }
      
      const newAdjustment = await response.json();
      console.log('[StockAdjustmentsManagement] Adjustment created:', newAdjustment);
      
      toast.success('Stock adjustment created successfully!');
      
      // Reset form and refresh list
      setFormData({
        adjustment_date: new Date().toISOString().split('T')[0],
        type: 'addition',
        reason: '',
        notes: '',
        items: []
      });
      setIsCreating(false);
      fetchAdjustments();
    } catch (error) {
      console.error('[StockAdjustmentsManagement] Error creating adjustment:', error);
      toast.error('Failed to create stock adjustment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete adjustment
  const handleDeleteAdjustment = async () => {
    if (!adjustmentToDelete) return;
    
    console.log('[StockAdjustmentsManagement] Deleting adjustment:', adjustmentToDelete.id);
    
    try {
      const response = await fetch(`/api/inventory/stock-adjustments/${adjustmentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenantId
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete adjustment: ${response.status}`);
      }
      
      console.log('[StockAdjustmentsManagement] Adjustment deleted successfully');
      
      toast.success('Stock adjustment deleted successfully!');
      setAdjustments(adjustments.filter(a => a.id !== adjustmentToDelete.id));
      setDeleteDialogOpen(false);
      setAdjustmentToDelete(null);
      
      if (selectedAdjustment?.id === adjustmentToDelete.id) {
        setShowAdjustmentDetails(false);
        setSelectedAdjustment(null);
      }
    } catch (error) {
      console.error('[StockAdjustmentsManagement] Error deleting adjustment:', error);
      toast.error('Failed to delete stock adjustment.');
    }
  };

  // Handle view adjustment details
  const handleViewAdjustment = useCallback((adjustment) => {
    console.log('[StockAdjustmentsManagement] Viewing adjustment:', adjustment);
    setSelectedAdjustment(adjustment);
    setShowAdjustmentDetails(true);
    setIsCreating(false);
  }, []);

  // Filter adjustments based on search
  const filteredAdjustments = adjustments.filter(adjustment => 
    adjustment.adjustment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adjustment.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adjustment.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render adjustment form
  const renderAdjustmentForm = () => {
    return (
      <form onSubmit={handleCreateAdjustment} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adjustment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="adjustment_date"
              value={formData.adjustment_date}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adjustment Type <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="addition">Addition</option>
              <option value="reduction">Reduction</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a reason</option>
              <option value="inventory_count">Inventory Count</option>
              <option value="damaged_goods">Damaged Goods</option>
              <option value="lost_goods">Lost Goods</option>
              <option value="expired_goods">Expired Goods</option>
              <option value="return">Return</option>
              <option value="other">Other</option>
            </select>
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
              {formData.items.map((item, index) => {
                const product = products.find(p => p.id === item.product_id);
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Product
                        </label>
                        <select
                          value={item.product_id}
                          onChange={(e) => {
                            const selectedProduct = products.find(p => p.id === e.target.value);
                            handleItemChange(index, 'product_id', e.target.value);
                            handleItemChange(index, 'current_quantity', selectedProduct?.stock_quantity || 0);
                            handleItemChange(index, 'cost', selectedProduct?.cost || 0);
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                        >
                          <option value="">Select product</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} (Current: {product.stock_quantity})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Location
                        </label>
                        <select
                          value={item.location_id}
                          onChange={(e) => handleItemChange(index, 'location_id', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                        >
                          <option value="">Select location</option>
                          {locations.map(location => (
                            <option key={location.id} value={location.id}>
                              {location.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Current Qty
                        </label>
                        <input
                          type="number"
                          value={item.current_quantity}
                          readOnly
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-gray-100"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {formData.type === 'addition' ? 'Add' : 'Remove'} Qty
                        </label>
                        <input
                          type="number"
                          value={item.adjustment_quantity}
                          onChange={(e) => handleItemChange(index, 'adjustment_quantity', e.target.value)}
                          min="0"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          New Qty
                        </label>
                        <div className="flex items-center">
                          <span className="flex-1 text-sm font-medium">{item.new_quantity || 0}</span>
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
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">No items added yet. Click "Add Item" to start.</p>
            </div>
          )}
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
            placeholder="Additional notes about this adjustment..."
          />
        </div>
        
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setFormData({
                adjustment_date: new Date().toISOString().split('T')[0],
                type: 'addition',
                reason: '',
                notes: '',
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
              <ButtonSpinner />
            ) : (
              <span>Create Adjustment</span>
            )}
          </button>
        </div>
      </form>
    );
  };

  // Render adjustment details
  const renderAdjustmentDetails = () => {
    if (!selectedAdjustment) return null;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Adjustment Number</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedAdjustment.adjustment_number}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Date</h3>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(selectedAdjustment.adjustment_date).toLocaleDateString()}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Type</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              selectedAdjustment.type === 'addition' 
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {selectedAdjustment.type?.charAt(0).toUpperCase() + selectedAdjustment.type?.slice(1)}
            </span>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Reason</h3>
            <p className="mt-1 text-sm text-gray-900">
              {selectedAdjustment.reason?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {selectedAdjustment.status || 'Completed'}
            </span>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Total Items</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedAdjustment.items?.length || 0}</p>
          </div>
        </div>
        
        {selectedAdjustment.items && selectedAdjustment.items.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Adjusted Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Previous Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Adjustment</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">New Qty</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedAdjustment.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.product?.name || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.location?.name || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.current_quantity}</td>
                      <td className="px-4 py-2 text-sm font-medium text-right">
                        <span className={selectedAdjustment.type === 'addition' ? 'text-green-600' : 'text-red-600'}>
                          {selectedAdjustment.type === 'addition' ? '+' : '-'}{item.adjustment_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">{item.new_quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {selectedAdjustment.notes && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Notes</h3>
            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedAdjustment.notes}</p>
          </div>
        )}
        
        <div className="pt-6 border-t">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Audit Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Created by:</span>
              <span className="ml-2 text-gray-900">{selectedAdjustment.created_by || 'System'}</span>
            </div>
            <div>
              <span className="text-gray-500">Created at:</span>
              <span className="ml-2 text-gray-900">
                {new Date(selectedAdjustment.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render adjustments table
  const renderAdjustmentsTable = () => {
    if (isLoading) {
      return (
        <CenteredSpinner size="medium" text="Loading stock adjustments..." />
      );
    }
    
    if (!filteredAdjustments || filteredAdjustments.length === 0) {
      return (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No stock adjustments found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search.' : 'Get started by creating a new stock adjustment.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => {
                  setIsCreating(true);
                  setShowAdjustmentDetails(false);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Adjustment
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
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Adjustment #</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Reason</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Items</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredAdjustments.map((adjustment) => (
            <tr key={adjustment.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-black">{adjustment.adjustment_number}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">
                  {new Date(adjustment.adjustment_date).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  adjustment.type === 'addition' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {adjustment.type?.charAt(0).toUpperCase() + adjustment.type?.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">
                  {adjustment.reason?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{adjustment.items?.length || 0}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {adjustment.status || 'Completed'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => handleViewAdjustment(adjustment)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setAdjustmentToDelete(adjustment);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-red-600 hover:text-red-900"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Delete confirmation dialog
  const renderDeleteDialog = () => (
    <Transition.Root show={deleteDialogOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={setDeleteDialogOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c0 1.378 1.068 2.508 2.428 2.574 1.351.066 2.7.103 4.051.103 2.787 0 5.532-.138 8.206-.361M12 9c-2.549 0-5.058.168-7.51.486M12 9l3.75-3.75M12 9l-3.75-3.75m9.344 10.301c1.36-.066 2.428-1.196 2.428-2.574V5.25m0 8.526c0 1.378-1.068 2.508-2.428 2.574M19.594 13.776V5.25m0 0a2.25 2.25 0 00-2.25-2.25h-10.5a2.25 2.25 0 00-2.25 2.25v8.526c0 1.378 1.068 2.508 2.428 2.574" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                        Delete Stock Adjustment
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete adjustment <span className="font-medium">{adjustmentToDelete?.adjustment_number}</span>? This will reverse the stock changes. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                    onClick={handleDeleteAdjustment}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={() => setDeleteDialogOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );

  return (
    <div className="p-6 bg-gray-50">
      <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
        <ArrowsUpDownIcon className="h-6 w-6 text-blue-600 mr-2" />
        Stock Adjustments
      </h1>
      <p className="text-gray-600 text-sm mb-6">Manage inventory levels by adding or reducing stock quantities with proper documentation and tracking.</p>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Adjustments</h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">{adjustments.length}</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Additions</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {adjustments.filter(a => a.type === 'addition').length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">Reductions</h2>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {adjustments.filter(a => a.type === 'reduction').length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">This Month</h2>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {adjustments.filter(a => {
              const adjustmentDate = new Date(a.adjustment_date);
              const now = new Date();
              return adjustmentDate.getMonth() === now.getMonth() && 
                     adjustmentDate.getFullYear() === now.getFullYear();
            }).length}
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
            placeholder="Search Adjustments"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
            onClick={() => {
              console.log('[StockAdjustmentsManagement] Filter clicked');
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
              console.log('[StockAdjustmentsManagement] Add Adjustment clicked');
              setIsCreating(true);
              setShowAdjustmentDetails(false);
              setSelectedAdjustment(null);
            }}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Adjustment
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      {showAdjustmentDetails && selectedAdjustment ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-black">
              Adjustment {selectedAdjustment.adjustment_number}
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setAdjustmentToDelete(selectedAdjustment);
                  setDeleteDialogOpen(true);
                }}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowAdjustmentDetails(false)}
                className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
              >
                Back to List
              </button>
            </div>
          </div>
          
          {renderAdjustmentDetails()}
        </div>
      ) : isCreating ? (
        <div className="bg-white shadow rounded-lg mt-6 p-6">
          <h2 className="text-xl font-bold text-black mb-6">Create Stock Adjustment</h2>
          {renderAdjustmentForm()}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            {renderAdjustmentsTable()}
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      {renderDeleteDialog()}
    </div>
  );
};

export default StockAdjustmentsManagement;