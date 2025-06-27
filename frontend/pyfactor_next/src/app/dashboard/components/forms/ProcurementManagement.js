'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { 
  ClipboardDocumentListIcon, 
  QuestionMarkCircleIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import { procurementApi, vendorApi, productApi } from '@/utils/apiClient';

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

const ProcurementManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [procurements, setProcurements] = useState([]);
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [procurementToDelete, setProcurementToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantId, setTenantId] = useState(null);
  
  const [formData, setFormData] = useState({
    request_date: new Date().toISOString().split('T')[0],
    required_by: '',
    department: '',
    priority: 'medium',
    status: 'draft',
    description: '',
    justification: '',
    budget_amount: '',
    items: [],
    notes: '',
    approval_status: 'pending'
  });

  // Stats for summary cards
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    totalBudget: 0
  });

  // Priority levels
  const priorityLevels = [
    { value: 'low', label: 'Low', color: 'gray' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'urgent', label: 'Urgent', color: 'red' }
  ];

  // Departments
  const departments = [
    'Administration',
    'Finance',
    'Operations',
    'Sales',
    'Marketing',
    'IT',
    'HR',
    'Production',
    'Warehouse',
    'Other'
  ];

  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  const fetchProcurements = useCallback(async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await procurementApi.getAll();
      const procurementList = response.data || response || [];
      setProcurements(procurementList);
      
      // Calculate stats
      const total = procurementList.length;
      const pending = procurementList.filter(p => p.approval_status === 'pending').length;
      const approved = procurementList.filter(p => p.approval_status === 'approved').length;
      const totalBudget = procurementList.reduce((sum, p) => sum + (parseFloat(p.budget_amount) || 0), 0);
      
      setStats({ total, pending, approved, totalBudget });
      
      logger.info('[ProcurementManagement] Procurements loaded successfully');
    } catch (error) {
      logger.error('[ProcurementManagement] Error fetching procurements:', error);
      setError('Failed to load procurement requests');
      setProcurements([]);
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
      logger.error('[ProcurementManagement] Error fetching vendors:', error);
    }
  }, [tenantId]);

  const fetchProducts = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      const response = await productApi.getAll();
      setProducts(response.data || response || []);
    } catch (error) {
      logger.error('[ProcurementManagement] Error fetching products:', error);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchProcurements();
    fetchVendors();
    fetchProducts();
  }, [fetchProcurements, fetchVendors, fetchProducts]);

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
    setSelectedProcurement(null);
    if (newValue === 0) {
      // Reset form when switching to create tab
      setFormData({
        request_date: new Date().toISOString().split('T')[0],
        required_by: '',
        department: '',
        priority: 'medium',
        status: 'draft',
        description: '',
        justification: '',
        budget_amount: '',
        items: [],
        notes: '',
        approval_status: 'pending'
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
          product_id: '', 
          description: '', 
          quantity: 1, 
          estimated_price: 0, 
          vendor_id: '',
          total: 0 
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
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product_id: value,
          description: product.name || product.description || '',
          estimated_price: parseFloat(product.price) || 0
        };
      }
    } else if (field === 'quantity' || field === 'estimated_price') {
      newItems[index][field] = parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }

    // Calculate total for the item
    newItems[index].total = newItems[index].quantity * newItems[index].estimated_price;

    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const calculateTotals = () => {
    const total = formData.items.reduce((sum, item) => {
      return sum + (item.quantity * item.estimated_price);
    }, 0);
    
    return total;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const procurementData = {
        ...formData,
        budget_amount: parseFloat(formData.budget_amount) || calculateTotals(),
        total_amount: calculateTotals()
      };

      if (selectedProcurement && tabValue === 0) {
        // Update existing procurement
        await procurementApi.update(selectedProcurement.id, procurementData);
        logger.info('[ProcurementManagement] Procurement updated successfully');
      } else {
        // Create new procurement
        await procurementApi.create(procurementData);
        logger.info('[ProcurementManagement] Procurement created successfully');
      }
      
      await fetchProcurements();
      handleTabChange(2); // Switch to list view
    } catch (error) {
      logger.error('[ProcurementManagement] Error saving procurement:', error);
      setError(error.message || 'Failed to save procurement request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (procurement) => {
    setSelectedProcurement(procurement);
    setFormData({
      request_date: procurement.request_date || procurement.date || '',
      required_by: procurement.required_by || '',
      department: procurement.department || '',
      priority: procurement.priority || 'medium',
      status: procurement.status || 'draft',
      description: procurement.description || '',
      justification: procurement.justification || '',
      budget_amount: procurement.budget_amount || '',
      items: procurement.items || [],
      notes: procurement.notes || '',
      approval_status: procurement.approval_status || 'pending'
    });
    setTabValue(0);
  };

  const handleView = (procurement) => {
    setSelectedProcurement(procurement);
    setTabValue(1);
  };

  const handleDeleteClick = (procurement) => {
    setProcurementToDelete(procurement);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!procurementToDelete) return;
    
    setIsLoading(true);
    try {
      await procurementApi.delete(procurementToDelete.id);
      logger.info('[ProcurementManagement] Procurement deleted successfully');
      await fetchProcurements();
      setShowDeleteModal(false);
      setProcurementToDelete(null);
    } catch (error) {
      logger.error('[ProcurementManagement] Error deleting procurement:', error);
      setError('Failed to delete procurement request');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProcurements = procurements.filter(procurement => {
    const searchLower = searchTerm.toLowerCase();
    return (
      procurement.description?.toLowerCase().includes(searchLower) ||
      procurement.department?.toLowerCase().includes(searchLower) ||
      procurement.justification?.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = priorityLevels.find(p => p.value === priority) || priorityLevels[1];
    const colorMap = {
      gray: 'bg-gray-100 text-gray-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      orange: 'bg-orange-100 text-orange-800',
      red: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[priorityConfig.color]}`}>
        {priorityConfig.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      ordered: 'bg-purple-100 text-purple-800'
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
          <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600 mr-2" />
          Procurement Management
        </h1>
        <p className="text-gray-600 text-sm">
          Manage procurement requests, track approvals, and streamline your purchasing workflow from requisition to order.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Requests</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Pending Approval</div>
          <div className="mt-1 text-3xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Approved</div>
          <div className="mt-1 text-3xl font-bold text-green-600">{stats.approved}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Budget</div>
          <div className="mt-1 text-3xl font-bold text-blue-600">{formatCurrency(stats.totalBudget)}</div>
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
              {selectedProcurement && tabValue === 0 ? 'Edit Request' : 'Create Request'}
            </button>
            <button
              onClick={() => handleTabChange(1)}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                tabValue === 1
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Request Details
            </button>
            <button
              onClick={() => handleTabChange(2)}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                tabValue === 2
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Request List
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
                    Request Date <span className="text-red-500">*</span>
                    <FieldTooltip text="The date when this procurement request is being created." />
                  </label>
                  <input
                    type="date"
                    name="request_date"
                    value={formData.request_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required By <span className="text-red-500">*</span>
                    <FieldTooltip text="The date when these items are needed." />
                  </label>
                  <input
                    type="date"
                    name="required_by"
                    value={formData.required_by}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                    <FieldTooltip text="The department making this procurement request." />
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                    <FieldTooltip text="The urgency level of this procurement request." />
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {priorityLevels.map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Amount
                    <FieldTooltip text="The allocated budget for this procurement request." />
                  </label>
                  <input
                    type="number"
                    name="budget_amount"
                    value={formData.budget_amount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                    <FieldTooltip text="Current status of this procurement request." />
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="ordered">Ordered</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                  <FieldTooltip text="Brief description of what is being requested." />
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Office supplies for Q1 2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Justification
                  <FieldTooltip text="Business justification for this procurement request." />
                </label>
                <textarea
                  name="justification"
                  value={formData.justification}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Explain why these items are needed..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Requested Items</h3>
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
                          <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                          <select
                            value={item.product_id}
                            onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select product or custom</option>
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
                          <label className="block text-xs font-medium text-gray-700 mb-1">Est. Price</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.estimated_price}
                            onChange={(e) => handleItemChange(index, 'estimated_price', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Vendor</label>
                          <select
                            value={item.vendor_id}
                            onChange={(e) => handleItemChange(index, 'vendor_id', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Any vendor</option>
                            {vendors.map(vendor => (
                              <option key={vendor.id} value={vendor.id}>
                                {vendor.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                            <p className="text-sm font-medium text-gray-900">{formatCurrency(item.total)}</p>
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

                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-gray-900 font-medium">Total Estimated Cost:</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(calculateTotals())}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                  <FieldTooltip text="Additional notes or special instructions for this procurement request." />
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
                  {isLoading ? 'Saving...' : selectedProcurement ? 'Update Request' : 'Create Request'}
                </button>
              </div>
            </form>
          )}

          {/* Request Details View */}
          {tabValue === 1 && selectedProcurement && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{selectedProcurement.description}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Request Date</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedProcurement.request_date || selectedProcurement.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Required By</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedProcurement.required_by ? new Date(selectedProcurement.required_by).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Department</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedProcurement.department}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Priority</p>
                    <p className="mt-1">{getPriorityBadge(selectedProcurement.priority)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="mt-1">{getStatusBadge(selectedProcurement.status)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Budget Amount</p>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedProcurement.budget_amount)}</p>
                  </div>
                </div>
                
                {selectedProcurement.justification && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-500">Justification</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedProcurement.justification}</p>
                  </div>
                )}
                
                {selectedProcurement.notes && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-500">Notes</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedProcurement.notes}</p>
                  </div>
                )}
              </div>

              {selectedProcurement.items && selectedProcurement.items.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Requested Items</h4>
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
                            Est. Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vendor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedProcurement.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.description || products.find(p => p.id === item.product_id)?.name || 'Unknown Item'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(item.estimated_price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {vendors.find(v => v.id === item.vendor_id)?.name || 'Any vendor'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(item.total || item.quantity * item.estimated_price)}
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
                  onClick={() => handleEdit(selectedProcurement)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Request List */}
          {tabValue === 2 && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search requests..."
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
                  Create Request
                </button>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredProcurements.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No procurement requests found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Budget
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
                      {filteredProcurements.map((procurement) => (
                        <tr key={procurement.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(procurement.request_date || procurement.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {procurement.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {procurement.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getPriorityBadge(procurement.priority)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(procurement.budget_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(procurement.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleView(procurement)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(procurement)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(procurement)}
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Request</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this procurement request? This action cannot be undone.
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
        Debug: Tenant ID: {tenantId} | Component: ProcurementManagement
      </div>
    </div>
  );
};

export default ProcurementManagement;