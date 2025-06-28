'use client';

import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { supplierApi } from '@/utils/apiClient';
import { logger } from '@/utils/logger';
import { TruckIcon } from '@heroicons/react/24/outline';
import { CenteredSpinner, ButtonSpinner } from '@/components/ui/StandardSpinner';

const SuppliersManagement = () => {
  // State management
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showSupplierDetails, setShowSupplierDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  
  // Refs
  const isMounted = useRef(true);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA',
    tax_id: '',
    payment_terms: '30',
    account_number: '',
    is_active: true,
    notes: ''
  });

  useEffect(() => {
    isMounted.current = true;
    fetchSuppliers();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[SuppliersManagement] Fetching suppliers...');
      
      // Use industry-standard proxy API that handles tenant isolation
      const data = await supplierApi.getAll();
      console.log('[SuppliersManagement] Raw API response:', data);
      console.log('[SuppliersManagement] Response type:', typeof data);
      console.log('[SuppliersManagement] Is array:', Array.isArray(data));
      console.log('[SuppliersManagement] Data keys:', data ? Object.keys(data) : 'null');
      console.log('[SuppliersManagement] Fetched suppliers:', data?.length || 0);
      
      if (isMounted.current) {
        // Handle different response formats (direct array or paginated)
        let suppliers = [];
        if (Array.isArray(data)) {
          suppliers = data;
        } else if (data && Array.isArray(data.results)) {
          // DRF paginated response
          suppliers = data.results;
        } else if (data && Array.isArray(data.data)) {
          // Alternative format
          suppliers = data.data;
        }
        console.log('[SuppliersManagement] Extracted suppliers array:', suppliers);
        setSuppliers(suppliers);
      }
    } catch (error) {
      console.error('[SuppliersManagement] Error:', error);
      if (isMounted.current) {
        setSuppliers([]);
        toast.error('Failed to load suppliers.');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Handle form changes
  const handleFormChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  // Handle create supplier
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    console.log('[SuppliersManagement] Creating supplier with data:', formData);
    
    try {
      setIsSubmitting(true);
      
      // Use industry-standard proxy API that handles tenant isolation
      const newSupplier = await supplierApi.create(formData);
      console.log('[SuppliersManagement] Supplier created:', newSupplier);
      
      toast.success(`Supplier "${formData.name}" created successfully!`);
      
      // Reset form and refresh list
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'USA',
        tax_id: '',
        payment_terms: '30',
        account_number: '',
        is_active: true,
        notes: ''
      });
      setIsCreating(false);
      fetchSuppliers();
    } catch (error) {
      console.error('[SuppliersManagement] Error creating supplier:', error);
      toast.error('Failed to create supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update supplier
  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    console.log('[SuppliersManagement] Updating supplier:', selectedSupplier?.id);
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/inventory/suppliers/${selectedSupplier.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update supplier: ${response.status}`);
      }
      
      const updatedSupplier = await response.json();
      console.log('[SuppliersManagement] Supplier updated:', updatedSupplier);
      
      toast.success('Supplier updated successfully!');
      
      setSuppliers(suppliers.map(s => s.id === selectedSupplier.id ? updatedSupplier : s));
      setIsEditing(false);
      setSelectedSupplier(updatedSupplier);
    } catch (error) {
      console.error('[SuppliersManagement] Error updating supplier:', error);
      toast.error('Failed to update supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete supplier
  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    
    console.log('[SuppliersManagement] Deleting supplier:', supplierToDelete.id);
    
    try {
      const response = await fetch(`/api/inventory/suppliers/${supplierToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete supplier: ${response.status}`);
      }
      
      console.log('[SuppliersManagement] Supplier deleted successfully');
      
      toast.success('Supplier deleted successfully!');
      setSuppliers(suppliers.filter(s => s.id !== supplierToDelete.id));
      setDeleteDialogOpen(false);
      setSupplierToDelete(null);
      
      if (selectedSupplier?.id === supplierToDelete.id) {
        setShowSupplierDetails(false);
        setSelectedSupplier(null);
      }
    } catch (error) {
      console.error('[SuppliersManagement] Error deleting supplier:', error);
      toast.error('Failed to delete supplier.');
    }
  };

  // Handle view supplier details
  const handleViewSupplier = useCallback((supplier) => {
    console.log('[SuppliersManagement] Viewing supplier:', supplier);
    setSelectedSupplier(supplier);
    setShowSupplierDetails(true);
    setIsCreating(false);
    setIsEditing(false);
  }, []);

  // Handle edit supplier
  const handleEditSupplier = useCallback((supplier) => {
    console.log('[SuppliersManagement] Editing supplier:', supplier);
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      website: supplier.website || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      zip_code: supplier.zip_code || '',
      country: supplier.country || 'USA',
      tax_id: supplier.tax_id || '',
      payment_terms: supplier.payment_terms || '30',
      account_number: supplier.account_number || '',
      is_active: supplier.is_active !== false,
      notes: supplier.notes || ''
    });
    setIsEditing(true);
    setShowSupplierDetails(true);
  }, []);

  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render supplier form
  const renderSupplierForm = () => {
    const isEditMode = isEditing && selectedSupplier;
    
    return (
      <form onSubmit={isEditMode ? handleUpdateSupplier : handleCreateSupplier} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter supplier name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person
            </label>
            <input
              type="text"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contact person name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="supplier@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://supplier.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax ID
            </label>
            <input
              type="text"
              name="tax_id"
              value={formData.tax_id}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tax identification number"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Terms (days)
            </label>
            <input
              type="number"
              name="payment_terms"
              value={formData.payment_terms}
              onChange={handleFormChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="30"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Supplier account number"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Street address"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="City"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="State"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip Code
              </label>
              <input
                type="text"
                name="zip_code"
                value={formData.zip_code}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="12345"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Country"
              />
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
            placeholder="Additional notes about the supplier..."
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            name="is_active"
            id="is_active"
            checked={formData.is_active}
            onChange={handleFormChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
            Active Supplier
          </label>
        </div>
        
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setShowSupplierDetails(false);
              setFormData({
                name: '',
                contact_person: '',
                email: '',
                phone: '',
                website: '',
                address: '',
                city: '',
                state: '',
                zip_code: '',
                country: 'USA',
                tax_id: '',
                payment_terms: '30',
                account_number: '',
                is_active: true,
                notes: ''
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
              <span>{isEditMode ? 'Update Supplier' : 'Create Supplier'}</span>
            )}
          </button>
        </div>
      </form>
    );
  };

  // Render supplier details
  const renderSupplierDetails = () => {
    if (!selectedSupplier) return null;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Supplier Name</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedSupplier.name}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Contact Person</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedSupplier.contact_person || 'Not specified'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedSupplier.email || 'Not provided'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Phone</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedSupplier.phone || 'Not provided'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Website</h3>
            {selectedSupplier.website ? (
              <a href={selectedSupplier.website} target="_blank" rel="noopener noreferrer" className="mt-1 text-sm text-blue-600 hover:underline">
                {selectedSupplier.website}
              </a>
            ) : (
              <p className="mt-1 text-sm text-gray-900">Not provided</p>
            )}
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Tax ID</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedSupplier.tax_id || 'Not provided'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Payment Terms</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedSupplier.payment_terms ? `${selectedSupplier.payment_terms} days` : 'Not specified'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Account Number</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedSupplier.account_number || 'Not provided'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              selectedSupplier.is_active !== false
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {selectedSupplier.is_active !== false ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        {(selectedSupplier.address || selectedSupplier.city || selectedSupplier.state || selectedSupplier.zip_code || selectedSupplier.country) && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Address</h3>
            <p className="mt-1 text-sm text-gray-900">
              {[selectedSupplier.address, selectedSupplier.city, selectedSupplier.state, selectedSupplier.zip_code, selectedSupplier.country]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        )}
        
        {selectedSupplier.notes && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Notes</h3>
            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedSupplier.notes}</p>
          </div>
        )}
        
        <div className="pt-6 border-t">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Supplier Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Total Orders</p>
              <p className="text-lg font-semibold">0</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Total Spent</p>
              <p className="text-lg font-semibold">$0.00</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Avg Order Value</p>
              <p className="text-lg font-semibold">$0.00</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Last Order</p>
              <p className="text-lg font-semibold">Never</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render suppliers table
  const renderSuppliersTable = () => {
    if (isLoading) {
      return (
        <CenteredSpinner size="medium" text="Loading suppliers..." />
      );
    }
    
    if (!filteredSuppliers || filteredSuppliers.length === 0) {
      return (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No suppliers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search.' : 'Get started by creating a new supplier.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => {
                  setIsCreating(true);
                  setShowSupplierDetails(false);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Supplier
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
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Contact</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Phone</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">City</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredSuppliers.map((supplier) => (
            <tr key={supplier.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-black">{supplier.name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{supplier.contact_person || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{supplier.email || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{supplier.phone || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{supplier.city || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  supplier.is_active !== false
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {supplier.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => handleViewSupplier(supplier)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleEditSupplier(supplier)}
                  className="text-green-600 hover:text-green-900 mr-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setSupplierToDelete(supplier);
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
                        Delete Supplier
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete <span className="font-medium">{supplierToDelete?.name}</span>? This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                    onClick={handleDeleteSupplier}
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
        <TruckIcon className="h-6 w-6 text-blue-600 mr-2" />
        Suppliers Management
      </h1>
      <p className="text-gray-600 text-sm mb-6">Manage your vendor relationships, track supplier information, and maintain purchase history.</p>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Suppliers</h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">{suppliers.length}</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Active Suppliers</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {suppliers.filter(s => s.is_active !== false).length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">Total Orders</h2>
          <p className="text-3xl font-bold text-purple-600 mt-2">0</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">Total Spent</h2>
          <p className="text-3xl font-bold text-orange-600 mt-2">$0.00</p>
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
            placeholder="Search Suppliers"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
            onClick={() => {
              console.log('[SuppliersManagement] Filter clicked');
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
              console.log('[SuppliersManagement] Add Supplier clicked');
              setIsCreating(true);
              setShowSupplierDetails(false);
              setSelectedSupplier(null);
              setIsEditing(false);
            }}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Supplier
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      {showSupplierDetails && selectedSupplier ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-black">{selectedSupplier.name}</h2>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: '',
                        contact_person: '',
                        email: '',
                        phone: '',
                        website: '',
                        address: '',
                        city: '',
                        state: '',
                        zip_code: '',
                        country: 'USA',
                        tax_id: '',
                        payment_terms: '30',
                        account_number: '',
                        is_active: true,
                        notes: ''
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
                    onClick={() => handleEditSupplier(selectedSupplier)}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setSupplierToDelete(selectedSupplier);
                      setDeleteDialogOpen(true);
                    }}
                    className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowSupplierDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
                  >
                    Back to List
                  </button>
                </>
              )}
            </div>
          </div>
          
          {isEditing ? renderSupplierForm() : renderSupplierDetails()}
        </div>
      ) : isCreating ? (
        <div className="bg-white shadow rounded-lg mt-6 p-6">
          <h2 className="text-xl font-bold text-black mb-6">Create New Supplier</h2>
          {renderSupplierForm()}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            {renderSuppliersTable()}
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      {renderDeleteDialog()}
    </div>
  );
};

export default SuppliersManagement;