'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { TruckIcon, QuestionMarkCircleIcon, PlusIcon, PencilIcon, TrashIcon, EyeIcon, NoSymbolIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { vendorApi } from '@/utils/apiClient';

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

const VendorManagement = ({ newVendor: isNewVendor = false }) => {
  const [tabValue, setTabValue] = useState(isNewVendor ? 0 : 2);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantId, setTenantId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postcode: '',
    country: '',
    tax_id: '',
    payment_terms: '30',
    notes: '',
    is_active: true
  });

  // Stats for summary cards
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalPurchases: 0
  });

  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  const fetchVendors = useCallback(async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await vendorApi.getAll();
      
      // Handle different response structures
      logger.info('[VendorManagement] Raw response:', response);
      
      let vendorList = [];
      if (Array.isArray(response)) {
        vendorList = response;
      } else if (response && Array.isArray(response.data)) {
        vendorList = response.data;
      } else if (response && response.results && Array.isArray(response.results)) {
        vendorList = response.results;
      } else if (response && response.vendors && Array.isArray(response.vendors)) {
        vendorList = response.vendors;
      } else {
        logger.warn('[VendorManagement] Unexpected response structure:', response);
        // If response is a single object with vendor data, wrap it in an array
        if (response && typeof response === 'object' && response.id) {
          vendorList = [response];
        } else {
          vendorList = [];
        }
      }
      
      setVendors(vendorList);
      
      // Calculate stats
      const total = vendorList.length;
      const active = vendorList.filter(v => v.is_active !== false).length;
      const inactive = total - active;
      
      setStats({
        total,
        active,
        inactive,
        totalPurchases: vendorList.reduce((sum, v) => sum + (v.total_purchases || 0), 0)
      });
      
      logger.info('[VendorManagement] Vendors loaded successfully');
    } catch (error) {
      logger.error('[VendorManagement] Error fetching vendors:', error);
      setError('Failed to load vendors');
      setVendors([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

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
    setSelectedVendor(null);
    if (newValue === 0) {
      // Reset form when switching to create tab
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        postcode: '',
        country: '',
        tax_id: '',
        payment_terms: '30',
        notes: '',
        is_active: true
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Map frontend field names to backend field names
      const vendorData = {
        vendor_name: formData.name,
        contact_person: formData.contact_person,
        email: formData.email,
        phone: formData.phone,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        postcode: formData.postcode,
        country: formData.country,
        tax_id: formData.tax_id,
        payment_terms: formData.payment_terms,
        notes: formData.notes,
        is_active: formData.is_active
      };

      if (selectedVendor && tabValue === 0) {
        // Update existing vendor
        await vendorApi.update(selectedVendor.id, vendorData);
        logger.info('[VendorManagement] Vendor updated successfully');
      } else {
        // Create new vendor
        await vendorApi.create(vendorData);
        logger.info('[VendorManagement] Vendor created successfully');
      }
      
      await fetchVendors();
      handleTabChange(2); // Switch to list view
    } catch (error) {
      logger.error('[VendorManagement] Error saving vendor:', error);
      setError(error.message || 'Failed to save vendor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.vendor_name || vendor.name || '',
      contact_person: vendor.contact_person || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      street: vendor.street || '',
      city: vendor.city || '',
      state: vendor.state || '',
      postcode: vendor.postcode || '',
      country: vendor.country || '',
      tax_id: vendor.tax_id || '',
      payment_terms: vendor.payment_terms || '30',
      notes: vendor.notes || '',
      is_active: vendor.is_active !== false
    });
    setTabValue(0);
  };

  const handleView = (vendor) => {
    setSelectedVendor(vendor);
    setTabValue(1);
  };

  const handleDeleteClick = (vendor) => {
    setVendorToDelete(vendor);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!vendorToDelete) return;
    
    setIsLoading(true);
    try {
      await vendorApi.delete(vendorToDelete.id);
      logger.info('[VendorManagement] Vendor deleted successfully');
      await fetchVendors();
      setShowDeleteModal(false);
      setVendorToDelete(null);
    } catch (error) {
      logger.error('[VendorManagement] Error deleting vendor:', error);
      setError('Failed to delete vendor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (vendor) => {
    setIsLoading(true);
    try {
      await vendorApi.toggleStatus(vendor.id);
      logger.info('[VendorManagement] Vendor status toggled successfully');
      await fetchVendors();
    } catch (error) {
      logger.error('[VendorManagement] Error toggling vendor status:', error);
      setError('Failed to update vendor status');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor =>
    (vendor.vendor_name || vendor.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <TruckIcon className="h-6 w-6 text-blue-600 mr-2" />
          Vendor Management
        </h1>
        <p className="text-gray-600 text-sm">
          Manage your suppliers and vendors, track purchase history, and maintain vendor information.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Vendors</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Active</div>
          <div className="mt-1 text-3xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Inactive</div>
          <div className="mt-1 text-3xl font-bold text-gray-400">{stats.inactive}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Purchases</div>
          <div className="mt-1 text-3xl font-bold text-blue-600">{formatCurrency(stats.totalPurchases)}</div>
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
              {selectedVendor && tabValue === 0 ? 'Edit Vendor' : 'Create Vendor'}
            </button>
            <button
              onClick={() => handleTabChange(1)}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                tabValue === 1
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vendor Details
            </button>
            <button
              onClick={() => handleTabChange(2)}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                tabValue === 2
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vendor List
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
                    Vendor Name <span className="text-red-500">*</span>
                    <FieldTooltip text="Enter the official business name of your vendor or supplier." />
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                    <FieldTooltip text="Name of your primary contact at this vendor." />
                  </label>
                  <input
                    type="text"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                    <FieldTooltip text="Primary email address for purchase orders and communications." />
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                    <FieldTooltip text="Main phone number for this vendor." />
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax ID
                    <FieldTooltip text="Vendor's tax identification number for tax reporting purposes." />
                  </label>
                  <input
                    type="text"
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms (Days)
                    <FieldTooltip text="Number of days for payment terms (e.g., Net 30)." />
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                      <FieldTooltip text="Street address for this vendor's location." />
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                      <FieldTooltip text="City where this vendor is located." />
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State/Province
                      <FieldTooltip text="State or province where this vendor is located." />
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                      <FieldTooltip text="Postal or ZIP code for this vendor's address." />
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                      <FieldTooltip text="Country where this vendor is located." />
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                  <FieldTooltip text="Additional notes or comments about this vendor." />
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active Vendor</span>
                </label>
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
                  {isLoading ? 'Saving...' : selectedVendor ? 'Update Vendor' : 'Create Vendor'}
                </button>
              </div>
            </form>
          )}

          {/* Vendor Details View */}
          {tabValue === 1 && selectedVendor && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{selectedVendor.vendor_name || selectedVendor.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Contact Person</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedVendor.contact_person || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedVendor.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedVendor.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tax ID</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedVendor.tax_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Payment Terms</p>
                    <p className="mt-1 text-sm text-gray-900">Net {selectedVendor.payment_terms || '30'} days</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedVendor.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedVendor.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                </div>
                
                {(selectedVendor.street || selectedVendor.city || selectedVendor.state) && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {[selectedVendor.street, selectedVendor.city, selectedVendor.state, selectedVendor.postcode, selectedVendor.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                )}
                
                {selectedVendor.notes && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-500">Notes</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedVendor.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => handleEdit(selectedVendor)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Vendor List */}
          {tabValue === 2 && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search vendors..."
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
                  Add Vendor
                </button>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="text-center py-12">
                  <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No vendors found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
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
                      {filteredVendors.map((vendor) => (
                        <tr key={vendor.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {vendor.vendor_name || vendor.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vendor.contact_person || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vendor.email || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vendor.phone || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {vendor.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleView(vendor)}
                                className="text-blue-600 hover:text-blue-900"
                                title="View"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(vendor)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(vendor)}
                                className={vendor.is_active ? "text-yellow-600 hover:text-yellow-900" : "text-green-600 hover:text-green-900"}
                                title={vendor.is_active ? "Deactivate" : "Activate"}
                              >
                                {vendor.is_active ? (
                                  <NoSymbolIcon className="h-4 w-4" />
                                ) : (
                                  <CheckCircleIcon className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteClick(vendor)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Vendor</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete "{vendorToDelete?.vendor_name || vendorToDelete?.name}"? 
            </p>
            <p className="text-sm text-red-600 font-medium mb-4">
              Warning: This will permanently delete all related bills, purchase orders, procurements, and purchases. This action cannot be undone.
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
        Debug: Tenant ID: {tenantId} | Component: VendorManagement
      </div>
    </div>
  );
};

export default VendorManagement;