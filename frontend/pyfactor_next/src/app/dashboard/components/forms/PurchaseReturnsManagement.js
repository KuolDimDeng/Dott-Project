'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { 
  ArrowUturnLeftIcon, 
  QuestionMarkCircleIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import { purchaseReturnApi, purchaseOrderApi, vendorApi } from '@/utils/apiClient';

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

const PurchaseReturnsManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantId, setTenantId] = useState(null);
  
  const [formData, setFormData] = useState({
    purchase_order_id: '',
    return_date: new Date().toISOString().split('T')[0],
    reason: '',
    total_amount: 0,
    status: 'pending',
    items: [],
    notes: '',
    credit_note_number: '',
    refund_method: 'credit'
  });

  // Stats for summary cards
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    totalAmount: 0
  });

  // Return reasons
  const returnReasons = [
    'Damaged Goods',
    'Wrong Item Delivered',
    'Quality Issues',
    'Overstock',
    'Order Cancellation',
    'Price Adjustment',
    'Expired Products',
    'Other'
  ];

  const refundMethods = [
    { value: 'credit', label: 'Store Credit' },
    { value: 'cash', label: 'Cash Refund' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'replacement', label: 'Product Replacement' },
    { value: 'pending', label: 'Pending Decision' }
  ];

  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  const fetchPurchaseReturns = useCallback(async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await purchaseReturnApi.getAll();
      const returnList = response.data || response || [];
      setPurchaseReturns(returnList);
      
      // Calculate stats
      const total = returnList.length;
      const pending = returnList.filter(r => r.status === 'pending').length;
      const approved = returnList.filter(r => r.status === 'approved').length;
      const totalAmount = returnList.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
      
      setStats({ total, pending, approved, totalAmount });
      
      logger.info('[PurchaseReturnsManagement] Purchase returns loaded successfully');
    } catch (error) {
      logger.error('[PurchaseReturnsManagement] Error fetching purchase returns:', error);
      setError('Failed to load purchase returns');
      setPurchaseReturns([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  const fetchPurchaseOrders = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      const response = await purchaseOrderApi.getAll();
      setPurchaseOrders(response.data || response || []);
    } catch (error) {
      logger.error('[PurchaseReturnsManagement] Error fetching purchase orders:', error);
    }
  }, [tenantId]);

  const fetchVendors = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      const response = await vendorApi.getAll();
      setVendors(response.data || response || []);
    } catch (error) {
      logger.error('[PurchaseReturnsManagement] Error fetching vendors:', error);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchPurchaseReturns();
    fetchPurchaseOrders();
    fetchVendors();
  }, [fetchPurchaseReturns, fetchPurchaseOrders, fetchVendors]);

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
    setSelectedReturn(null);
    if (newValue === 0) {
      // Reset form when switching to create tab
      setFormData({
        purchase_order_id: '',
        return_date: new Date().toISOString().split('T')[0],
        reason: '',
        total_amount: 0,
        status: 'pending',
        items: [],
        notes: '',
        credit_note_number: '',
        refund_method: 'credit'
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handlePurchaseOrderChange = (e) => {
    const orderId = e.target.value;
    setFormData((prevData) => ({
      ...prevData,
      purchase_order_id: orderId
    }));

    // Load items from the selected purchase order
    const selectedOrder = purchaseOrders.find(po => po.id === orderId);
    if (selectedOrder && selectedOrder.items) {
      setFormData((prevData) => ({
        ...prevData,
        items: selectedOrder.items.map(item => ({
          ...item,
          return_quantity: 0,
          return_amount: 0
        }))
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    
    if (field === 'return_quantity') {
      const returnQty = parseFloat(value) || 0;
      const maxQty = parseFloat(newItems[index].quantity) || 0;
      
      // Don't allow returning more than ordered
      newItems[index].return_quantity = Math.min(returnQty, maxQty);
      newItems[index].return_amount = newItems[index].return_quantity * (newItems[index].unit_price || 0);
    }

    setFormData((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = newItems[index];
      
      // Calculate total return amount
      const totalAmount = updatedItems.reduce((sum, item) => sum + (item.return_amount || 0), 0);
      
      return {
        ...prev,
        items: updatedItems,
        total_amount: totalAmount
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const returnData = {
        ...formData,
        items: formData.items.filter(item => item.return_quantity > 0)
      };

      if (selectedReturn && tabValue === 0) {
        // Update existing return
        await purchaseReturnApi.update(selectedReturn.id, returnData);
        logger.info('[PurchaseReturnsManagement] Purchase return updated successfully');
      } else {
        // Create new return
        await purchaseReturnApi.create(returnData);
        logger.info('[PurchaseReturnsManagement] Purchase return created successfully');
      }
      
      await fetchPurchaseReturns();
      handleTabChange(2); // Switch to list view
    } catch (error) {
      logger.error('[PurchaseReturnsManagement] Error saving purchase return:', error);
      setError(error.message || 'Failed to save purchase return');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (purchaseReturn) => {
    setSelectedReturn(purchaseReturn);
    setFormData({
      purchase_order_id: purchaseReturn.purchase_order_id || purchaseReturn.purchase_order || '',
      return_date: purchaseReturn.return_date || purchaseReturn.date || '',
      reason: purchaseReturn.reason || '',
      total_amount: purchaseReturn.total_amount || 0,
      status: purchaseReturn.status || 'pending',
      items: purchaseReturn.items || [],
      notes: purchaseReturn.notes || '',
      credit_note_number: purchaseReturn.credit_note_number || '',
      refund_method: purchaseReturn.refund_method || 'credit'
    });
    setTabValue(0);
  };

  const handleView = (purchaseReturn) => {
    setSelectedReturn(purchaseReturn);
    setTabValue(1);
  };

  const handleDeleteClick = (purchaseReturn) => {
    setReturnToDelete(purchaseReturn);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!returnToDelete) return;
    
    setIsLoading(true);
    try {
      await purchaseReturnApi.delete(returnToDelete.id);
      logger.info('[PurchaseReturnsManagement] Purchase return deleted successfully');
      await fetchPurchaseReturns();
      setShowDeleteModal(false);
      setReturnToDelete(null);
    } catch (error) {
      logger.error('[PurchaseReturnsManagement] Error deleting purchase return:', error);
      setError('Failed to delete purchase return');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReturns = purchaseReturns.filter(purchaseReturn => {
    const searchLower = searchTerm.toLowerCase();
    const orderNumber = purchaseOrders.find(po => po.id === purchaseReturn.purchase_order_id)?.order_number || '';
    return (
      purchaseReturn.credit_note_number?.toLowerCase().includes(searchLower) ||
      purchaseReturn.reason?.toLowerCase().includes(searchLower) ||
      orderNumber.toLowerCase().includes(searchLower)
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
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <ArrowUturnLeftIcon className="h-6 w-6 text-blue-600 mr-2" />
          Purchase Returns Management
        </h1>
        <p className="text-gray-600 text-sm">
          Process returns to vendors, track credit notes, and manage refunds for quality issues or order discrepancies.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Returns</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Pending</div>
          <div className="mt-1 text-3xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Approved</div>
          <div className="mt-1 text-3xl font-bold text-green-600">{stats.approved}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Value</div>
          <div className="mt-1 text-3xl font-bold text-red-600">{formatCurrency(stats.totalAmount)}</div>
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
              {selectedReturn && tabValue === 0 ? 'Edit Return' : 'Create Return'}
            </button>
            <button
              onClick={() => handleTabChange(1)}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                tabValue === 1
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Return Details
            </button>
            <button
              onClick={() => handleTabChange(2)}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                tabValue === 2
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Returns List
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
                    Purchase Order <span className="text-red-500">*</span>
                    <FieldTooltip text="Select the purchase order you want to return items from." />
                  </label>
                  <select
                    name="purchase_order_id"
                    value={formData.purchase_order_id}
                    onChange={handlePurchaseOrderChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a purchase order</option>
                    {purchaseOrders.map(order => (
                      <option key={order.id} value={order.id}>
                        {order.order_number} - {vendors.find(v => v.id === order.vendor_id)?.name || 'Unknown Vendor'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Return Date <span className="text-red-500">*</span>
                    <FieldTooltip text="The date when this return is being processed." />
                  </label>
                  <input
                    type="date"
                    name="return_date"
                    value={formData.return_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Return Reason <span className="text-red-500">*</span>
                    <FieldTooltip text="Select the primary reason for returning these items." />
                  </label>
                  <select
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a reason</option>
                    {returnReasons.map(reason => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Note Number
                    <FieldTooltip text="Reference number for the credit note from the vendor." />
                  </label>
                  <input
                    type="text"
                    name="credit_note_number"
                    value={formData.credit_note_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refund Method
                    <FieldTooltip text="How you expect to be refunded for this return." />
                  </label>
                  <select
                    name="refund_method"
                    value={formData.refund_method}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {refundMethods.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                    <FieldTooltip text="Current status of this return request." />
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="processing">Processing</option>
                  </select>
                </div>
              </div>

              {formData.items.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Return Items</h3>
                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-md">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                          <p className="text-sm text-gray-900">{item.description || item.product_name || 'Unknown Item'}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Ordered Qty</label>
                          <p className="text-sm text-gray-900">{item.quantity}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Return Qty</label>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={item.return_quantity || 0}
                            onChange={(e) => handleItemChange(index, 'return_quantity', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Return Amount</label>
                          <p className="text-sm text-gray-900">{formatCurrency(item.return_amount || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-gray-900 font-medium">Total Return Amount:</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(formData.total_amount)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                  <FieldTooltip text="Additional notes or details about this return." />
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
                  disabled={isLoading || formData.items.every(item => !item.return_quantity)}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : selectedReturn ? 'Update Return' : 'Create Return'}
                </button>
              </div>
            </form>
          )}

          {/* Return Details View */}
          {tabValue === 1 && selectedReturn && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Return #{selectedReturn.credit_note_number || selectedReturn.id}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Purchase Order</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {purchaseOrders.find(po => po.id === selectedReturn.purchase_order_id)?.order_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Return Date</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedReturn.return_date || selectedReturn.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Reason</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedReturn.reason}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Refund Method</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {refundMethods.find(m => m.value === selectedReturn.refund_method)?.label || selectedReturn.refund_method}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="mt-1">{getStatusBadge(selectedReturn.status)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Amount</p>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedReturn.total_amount)}</p>
                  </div>
                </div>
                
                {selectedReturn.notes && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-500">Notes</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedReturn.notes}</p>
                  </div>
                )}
              </div>

              {selectedReturn.items && selectedReturn.items.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Return Items</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Return Quantity
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
                        {selectedReturn.items.filter(item => item.return_quantity > 0).map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.description || item.product_name || 'Unknown Item'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.return_quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(item.unit_price || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(item.return_amount || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => handleEdit(selectedReturn)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Returns List */}
          {tabValue === 2 && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search returns..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleTabChange(0)}
                  className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Return
                </button>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredReturns.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowUturnLeftIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No returns found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Return Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Credit Note #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Purchase Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reason
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
                      {filteredReturns.map((purchaseReturn) => (
                        <tr key={purchaseReturn.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(purchaseReturn.return_date || purchaseReturn.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {purchaseReturn.credit_note_number || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {purchaseOrders.find(po => po.id === purchaseReturn.purchase_order_id)?.order_number || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {purchaseReturn.reason}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(purchaseReturn.total_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(purchaseReturn.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleView(purchaseReturn)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(purchaseReturn)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(purchaseReturn)}
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
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Return</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this return? This action cannot be undone.
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
        Debug: Tenant ID: {tenantId} | Component: PurchaseReturnsManagement
      </div>
    </div>
  );
};

export default PurchaseReturnsManagement;