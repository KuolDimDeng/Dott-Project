'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { 
  DocumentTextIcon, 
  QuestionMarkCircleIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import { billApi, vendorApi } from '@/utils/apiClient';
import DeleteConfirmationDialog from '@/components/ui/DeleteConfirmationDialog';
import { canDeleteItem } from '@/utils/accountingRestrictions';

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

const BillManagement = ({ newBill: isNewBill = false }) => {
  const [tabValue, setTabValue] = useState(isNewBill ? 0 : 2);
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [isDeletingBill, setIsDeletingBill] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantId, setTenantId] = useState(null);
  
  const [formData, setFormData] = useState({
    vendor_id: '',
    bill_number: '',
    currency: 'USD',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    po_number: '',
    total_amount: 0,
    notes: '',
    items: [],
    status: 'pending',
    payment_status: 'unpaid'
  });

  // Stats for summary cards
  const [stats, setStats] = useState({
    total: 0,
    unpaid: 0,
    overdue: 0,
    totalAmount: 0
  });

  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  const fetchBills = useCallback(async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await billApi.getAll();
      const billList = response.data || response || [];
      setBills(billList);
      
      // Calculate stats
      const total = billList.length;
      const unpaid = billList.filter(b => b.payment_status === 'unpaid' || !b.is_paid).length;
      const today = new Date();
      const overdue = billList.filter(b => {
        const dueDate = new Date(b.due_date);
        return (b.payment_status === 'unpaid' || !b.is_paid) && dueDate < today;
      }).length;
      const totalAmount = billList.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
      
      setStats({ total, unpaid, overdue, totalAmount });
      
      logger.info('[BillManagement] Bills loaded successfully');
    } catch (error) {
      logger.error('[BillManagement] Error fetching bills:', error);
      setError('Failed to load bills');
      setBills([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  const fetchVendors = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      const response = await vendorApi.getAll();
      setVendors(response.data || response || []);
    } catch (error) {
      logger.error('[BillManagement] Error fetching vendors:', error);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchBills();
    fetchVendors();
  }, [fetchBills, fetchVendors]);

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
    setSelectedBill(null);
    if (newValue === 0) {
      // Reset form when switching to create tab
      setFormData({
        vendor_id: '',
        bill_number: '',
        currency: 'USD',
        bill_date: new Date().toISOString().split('T')[0],
        due_date: '',
        po_number: '',
        total_amount: 0,
        notes: '',
        items: [],
        status: 'pending',
        payment_status: 'unpaid'
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

  const handleAddItem = () => {
    setFormData((prevData) => ({
      ...prevData,
      items: [
        ...prevData.items,
        { 
          description: '', 
          category: '', 
          quantity: 1, 
          unit_price: 0, 
          tax_rate: 0, 
          total_price: 0 
        }
      ]
    }));
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData((prevData) => ({ ...prevData, items: newItems }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    
    if (field === 'quantity' || field === 'unit_price' || field === 'tax_rate') {
      newItems[index][field] = parseFloat(value) || 0;
      // Calculate total price
      const quantity = parseFloat(newItems[index].quantity) || 0;
      const unitPrice = parseFloat(newItems[index].unit_price) || 0;
      const taxRate = parseFloat(newItems[index].tax_rate) || 0;
      newItems[index].total_price = quantity * unitPrice * (1 + taxRate / 100);
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
    
    const total = subtotal + taxAmount;
    
    return { subtotal, taxAmount, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { total } = calculateTotals();
      const billData = {
        ...formData,
        total_amount: total,
        items: formData.items.map(item => ({
          ...item,
          total_price: item.quantity * item.unit_price * (1 + item.tax_rate / 100)
        }))
      };

      if (selectedBill && tabValue === 0) {
        // Update existing bill
        await billApi.update(selectedBill.id, billData);
        logger.info('[BillManagement] Bill updated successfully');
        toast.success('Bill updated successfully!');
      } else {
        // Create new bill
        await billApi.create(billData);
        logger.info('[BillManagement] Bill created successfully');
        toast.success('Bill created successfully!');
      }
      
      await fetchBills();
      handleTabChange(2); // Switch to list view
    } catch (error) {
      logger.error('[BillManagement] Error saving bill:', error);
      setError(error.message || 'Failed to save bill');
      toast.error('Failed to save bill.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (bill) => {
    setSelectedBill(bill);
    setFormData({
      vendor_id: bill.vendor_id || bill.vendor || '',
      bill_number: bill.bill_number || '',
      currency: bill.currency || 'USD',
      bill_date: bill.bill_date || '',
      due_date: bill.due_date || '',
      po_number: bill.po_number || bill.poso_number || '',
      total_amount: bill.total_amount || 0,
      notes: bill.notes || '',
      items: bill.items || [],
      status: bill.status || 'pending',
      payment_status: bill.payment_status || 'unpaid'
    });
    setTabValue(0);
  };

  const handleView = (bill) => {
    setSelectedBill(bill);
    setTabValue(1);
  };

  const handleDeleteClick = (bill) => {
    setBillToDelete(bill);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!billToDelete) return;
    
    setIsDeletingBill(true);
    try {
      await billApi.delete(billToDelete.id);
      logger.info('[BillManagement] Bill deleted successfully');
      toast.success('Bill deleted successfully and archived in audit trail!');
      await fetchBills();
      setShowDeleteModal(false);
      setBillToDelete(null);
      
      // Clear selected bill if it was the one being deleted
      if (selectedBill?.id === billToDelete.id) {
        setSelectedBill(null);
      }
    } catch (error) {
      logger.error('[BillManagement] Error deleting bill:', error);
      setError('Failed to delete bill');
      toast.error('Failed to delete bill.');
    } finally {
      setIsDeletingBill(false);
    }
  };

  const filteredBills = bills.filter(bill => {
    const searchLower = searchTerm.toLowerCase();
    const vendorName = vendors.find(v => v.id === bill.vendor_id)?.name || bill.vendor_name || '';
    return (
      bill.bill_number?.toLowerCase().includes(searchLower) ||
      vendorName.toLowerCase().includes(searchLower) ||
      bill.po_number?.toLowerCase().includes(searchLower)
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
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
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
          <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
          Bill Management
        </h1>
        <p className="text-gray-600 text-sm">
          Track vendor bills, manage payables, and monitor expense obligations to maintain healthy cash flow.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Bills</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Unpaid</div>
          <div className="mt-1 text-3xl font-bold text-yellow-600">{stats.unpaid}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Overdue</div>
          <div className="mt-1 text-3xl font-bold text-red-600">{stats.overdue}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Amount</div>
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
              {selectedBill && tabValue === 0 ? 'Edit Bill' : 'Create Bill'}
            </button>
            <button
              onClick={() => handleTabChange(1)}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                tabValue === 1
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bill Details
            </button>
            <button
              onClick={() => handleTabChange(2)}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                tabValue === 2
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bill List
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
                    <FieldTooltip text="Select the vendor who sent this bill." />
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
                    Bill Number
                    <FieldTooltip text="The bill or invoice number from the vendor." />
                  </label>
                  <input
                    type="text"
                    name="bill_number"
                    value={formData.bill_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bill Date <span className="text-red-500">*</span>
                    <FieldTooltip text="The date on the vendor's bill." />
                  </label>
                  <input
                    type="date"
                    name="bill_date"
                    value={formData.bill_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                    <FieldTooltip text="When payment is due to the vendor." />
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Order #
                    <FieldTooltip text="Reference to related purchase order if applicable." />
                  </label>
                  <input
                    type="text"
                    name="po_number"
                    value={formData.po_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status
                    <FieldTooltip text="Current payment status of this bill." />
                  </label>
                  <select
                    name="payment_status"
                    value={formData.payment_status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partially Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Bill Items</h3>
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
                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 bg-gray-50 rounded-md">
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

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Category"
                          />
                        </div>

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

                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                            <input
                              type="text"
                              value={formatCurrency(item.total_price)}
                              readOnly
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-gray-100"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Bill Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(calculateTotals().subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">{formatCurrency(calculateTotals().taxAmount)}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-900 font-medium">Total:</span>
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(calculateTotals().total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                  <FieldTooltip text="Additional notes or comments about this bill." />
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
                  {isLoading ? 'Saving...' : selectedBill ? 'Update Bill' : 'Create Bill'}
                </button>
              </div>
            </form>
          )}

          {/* Bill Details View */}
          {tabValue === 1 && selectedBill && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Bill #{selectedBill.bill_number}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vendor</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {vendors.find(v => v.id === selectedBill.vendor_id)?.name || selectedBill.vendor_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Bill Date</p>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedBill.bill_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Due Date</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedBill.due_date ? new Date(selectedBill.due_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Purchase Order</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedBill.po_number || selectedBill.poso_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Payment Status</p>
                    <p className="mt-1">{getStatusBadge(selectedBill.payment_status || 'unpaid')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Amount</p>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedBill.total_amount)}</p>
                  </div>
                </div>
                
                {selectedBill.notes && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-500">Notes</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedBill.notes}</p>
                  </div>
                )}
              </div>

              {selectedBill.items && selectedBill.items.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Bill Items</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
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
                        {selectedBill.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.description || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.category || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(item.unit_price || item.price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(item.total_price || item.amount)}
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
                  onClick={() => handleEdit(selectedBill)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Bill List */}
          {tabValue === 2 && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search bills..."
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
                  Create Bill
                </button>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredBills.length === 0 ? (
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No bills found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bill Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bill Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
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
                      {filteredBills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {bill.bill_number || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vendors.find(v => v.id === bill.vendor_id)?.name || bill.vendor_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(bill.bill_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(bill.total_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(bill.payment_status || 'unpaid')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleView(bill)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(bill)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(bill)}
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

      {/* Delete Confirmation Dialog */}
      {showDeleteModal && billToDelete && (
        (() => {
          // Check if bill has accounting restrictions
          const billWithPaymentStatus = {
            ...billToDelete,
            status: billToDelete.status || 'pending',
            payment_made: billToDelete.payment_status === 'paid' || billToDelete.payment_status === 'partial'
          };
          
          const deletionCheck = canDeleteItem('bills', billWithPaymentStatus);
          
          // Build custom warning based on bill status
          let customWarning = null;
          if (billToDelete.payment_status === 'paid') {
            customWarning = "This bill has been paid. Consider voiding the payment first.";
          } else if (billToDelete.payment_status === 'partial') {
            customWarning = "This bill has partial payments. Consider voiding the payments first.";
          } else if (billToDelete.status === 'posted') {
            customWarning = "This bill has been posted and affects your financial records.";
          }
          
          const billDisplayName = billToDelete.bill_number || 
                                 `Bill from ${vendors.find(v => v.id === billToDelete.vendor_id)?.name || 'Unknown Vendor'}`;
          
          return (
            <DeleteConfirmationDialog
              isOpen={showDeleteModal}
              onClose={() => {
                setShowDeleteModal(false);
                setBillToDelete(null);
              }}
              onConfirm={handleDelete}
              itemName={billDisplayName}
              itemType="Bill"
              isDeleting={isDeletingBill}
              customWarning={customWarning}
              accountingRestriction={!deletionCheck.allowed ? deletionCheck.message : null}
            />
          );
        })()
      )}

      <div className="text-xs text-gray-500 text-center">
        Debug: Tenant ID: {tenantId} | Component: BillManagement
      </div>
    </div>
  );
};

export default BillManagement;